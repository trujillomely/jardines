const assert = require("node:assert/strict");
const test = require("node:test");

const hasEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5002";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9100";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8081";

const callable = async (name, token, data) => {
  const url = `http://${functionsHost}/jardines-de-minerva/us-central1/${name}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({data}),
  });
  return {status: response.status, body: await response.json()};
};

const signIn = async (email, password) => {
  const url = `http://${authHost}/identitytoolkit.googleapis.com/v1/` +
      "accounts:signInWithPassword?key=fake-api-key";
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, password, returnSecureToken: true}),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.idToken;
};

test("callable API enforces roles and commits payments atomically", {
  skip: !hasEmulators,
  timeout: 30000,
}, async () => {
  const {getAuth} = require("firebase-admin/auth");
  const {db} = require("../src/config");
  const auth = getAuth();
  const password = "correct-horse-battery-staple";
  const admin = await auth.createUser({
    uid: "admin-user", email: "admin@example.test", password,
  });
  const resident = await auth.createUser({
    uid: "resident-user", email: "resident@example.test", password,
  });
  const outsider = await auth.createUser({
    uid: "outsider-user", email: "outsider@example.test", password,
  });
  await auth.setCustomUserClaims(admin.uid, {role: "admin"});

  const adminToken = await signIn(admin.email, password);
  const setRole = await callable("setUserRole", adminToken, {
    uid: resident.uid,
    role: "resident",
  });
  assert.equal(setRole.status, 200);
  const residentToken = await signIn(resident.email, password);
  const outsiderToken = await signIn(outsider.email, password);

  const forbiddenRate = await callable("setActiveRate", residentToken, {
    residentMonthlyAmountCents: 10000,
    residentLateFeeCents: 500,
  });
  assert.equal(forbiddenRate.status, 403);

  const rate = await callable("setActiveRate", adminToken, {
    id: "standard-2026",
    residentMonthlyAmountCents: 10000,
    residentLateFeeCents: 500,
  });
  assert.equal(rate.status, 200);
  const duplicateRate = await callable("setActiveRate", adminToken, {
    id: "standard-2026",
    residentMonthlyAmountCents: 20000,
    residentLateFeeCents: 1000,
  });
  assert.equal(duplicateRate.status, 409);
  const savedRate = await db.collection("rates").doc("standard-2026").get();
  assert.equal(savedRate.data().residentMonthlyAmountCents, 10000);

  const person = await callable("createPerson", adminToken, {
    id: "resident-1",
    type: "resident",
    firstName: "Ada",
    phone: "5550101",
    authUid: resident.uid,
  });
  assert.equal(person.status, 200);
  assert.equal((await db.collection("people").doc("resident-1").get())
      .data().createdBy, admin.uid);
  const duplicateAuthUid = await callable("createPerson", adminToken, {
    id: "resident-2",
    type: "resident",
    firstName: "Grace",
    phone: "5550102",
    authUid: resident.uid,
  });
  assert.equal(duplicateAuthUid.status, 409);
  assert.equal((await db.collection("people").doc("resident-2").get()).exists,
      false);
  const lot = await callable("createLot", adminToken, {
    id: "lot-1",
    number: "1",
    address: "Main Street",
    status: "active",
    currentResidentId: "resident-1",
  });
  assert.equal(lot.status, 200);
  assert.equal((await db.collection("lots").doc("lot-1").get())
      .data().createdBy, admin.uid);
  const duplicateAssignment = await callable("createLot", adminToken, {
    id: "lot-2",
    number: "2",
    address: "Second Street",
    status: "active",
    currentResidentId: "resident-1",
  });
  assert.equal(duplicateAssignment.status, 400);
  assert.equal((await db.collection("lots").doc("lot-2").get()).exists, false);

  await db.collection("invoices").doc("invoice-1").set({
    personId: "resident-1",
    originalAmountCents: 10000,
    paidAmountCents: 0,
    outstandingAmountCents: 10000,
    status: "pending",
  });
  const payment = await callable("registerPayment", adminToken, {
    id: "payment-1",
    personId: "resident-1",
    totalAmountCents: 10000,
    method: "cash",
    applications: [{invoiceId: "invoice-1", amountCents: 10000}],
  });
  assert.equal(payment.status, 200);
  const invoice = await db.collection("invoices").doc("invoice-1").get();
  assert.equal(invoice.data().outstandingAmountCents, 0);
  assert.equal(invoice.data().status, "paid");
  assert.equal((await db.collection("payments").doc("payment-1").get()).exists,
      true);

  const voided = await callable("voidPayment", adminToken, {
    paymentId: "payment-1",
    reason: "Duplicate receipt",
  });
  assert.equal(voided.status, 200);
  const restoredInvoice = await db.collection("invoices").doc("invoice-1")
      .get();
  assert.equal(restoredInvoice.data().outstandingAmountCents, 10000);
  assert.equal(restoredInvoice.data().status, "pending");

  const unassigned = await callable("assignResidentToLot", adminToken, {
    lotId: "lot-1",
    residentId: null,
  });
  assert.equal(unassigned.status, 200);
  const deactivated = await callable("deactivatePerson", adminToken, {
    personId: "resident-1",
    reason: "Moved away",
  });
  assert.equal(deactivated.status, 200);
  const inactiveResidentLot = await callable("createLot", adminToken, {
    id: "lot-3",
    number: "3",
    address: "Third Street",
    status: "active",
    currentResidentId: "resident-1",
  });
  assert.equal(inactiveResidentLot.status, 400);
  const inactiveOwnerVehicle = await callable("registerVehicle", adminToken, {
    id: "vehicle-1",
    ownerId: "resident-1",
    ownerType: "resident",
    type: "car",
    plate: "P-123ABC",
  });
  assert.equal(inactiveOwnerVehicle.status, 400);

  const documentUrl = `http://${firestoreHost}/v1/projects/` +
      "jardines-de-minerva/databases/(default)/documents/invoices/invoice-1";
  const ownerRead = await fetch(documentUrl, {
    headers: {Authorization: `Bearer ${residentToken}`},
  });
  const outsiderRead = await fetch(documentUrl, {
    headers: {Authorization: `Bearer ${outsiderToken}`},
  });
  assert.equal(ownerRead.status, 200);
  assert.equal(outsiderRead.status, 403);
});
