const assert = require("node:assert/strict");
const test = require("node:test");

const hasEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5002";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9100";

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

test("administrative callable API commits payments atomically", {
  skip: !hasEmulators,
  timeout: 30000,
}, async () => {
  const {getAuth} = require("firebase-admin/auth");
  const {Timestamp} = require("firebase-admin/firestore");
  const {db} = require("../src/config");
  const applyOverdueFees = require(
      "../src/modules/invoices/application/apply-overdue-fees.use-case");
  const auth = getAuth();
  const password = "correct-horse-battery-staple";
  const admin = await auth.createUser({
    uid: "admin-user", email: "admin@example.test", password,
  });
  await auth.setCustomUserClaims(admin.uid, {role: "admin"});

  const adminToken = await signIn(admin.email, password);

  const rate = await callable("setActiveRate", adminToken, {
    id: "standard-2026",
    effectiveFrom: "2026-09-01", residentFee: 10000, extraVehicle: 1000,
    supplierSticker: 5000, residentLateFee: 500, supplierLateFee: 250,
    paymentDueDate: 10,
  });
  assert.equal(rate.status, 200);
  const duplicateRate = await callable("setActiveRate", adminToken, {
    id: "standard-2026",
    effectiveFrom: "2026-10-01", residentFee: 20000, extraVehicle: 2000,
    supplierSticker: 8000, residentLateFee: 1000, supplierLateFee: 400,
    paymentDueDate: 10,
  });
  assert.equal(duplicateRate.status, 409);
  const savedRate = await db.collection("rates").doc("standard-2026").get();
  assert.equal(savedRate.data().residentFee, 10000);

  const person = await callable("createPerson", adminToken, {
    id: "resident-1",
    type: "resident",
    firstName: "Ada",
    phoneNumber: "5550101",
  });
  assert.equal(person.status, 200);
  assert.equal((await db.collection("people").doc("resident-1").get())
      .data().createdBy, admin.uid);
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

  const overdueInvoice = await callable("createMonthlyInvoice", adminToken, {
    personId: "resident-1",
    period: "2026-08",
  });
  assert.equal(overdueInvoice.status, 200);
  const fees = await applyOverdueFees.execute(
      Timestamp.fromDate(new Date("2026-08-15T12:00:00.000Z")));
  assert.equal(fees.applied, 1);
  const overdue = await db.collection("invoices").doc("resident-1_2026-08")
      .get();
  assert.equal(overdue.data().status, "overdue");
  assert.equal(overdue.data().outstandingBalance, 10500);

  const vehicle = await callable("registerVehicle", adminToken, {
    id: "vehicle-1",
    ownerId: "resident-1",
    ownerType: "resident",
    type: "car",
    licensePlate: "P-123ABC",
    isExtra: true,
    label: {
      requiresExtraPayment: true,
      amount: 1000,
      expiresOn: "2026-12-31T00:00:00.000Z",
    },
  });
  assert.equal(vehicle.status, 200);
  const vehicleInvoice = await db.collection("invoices")
      .doc("vehicle-1_permit_1798675200000").get();
  assert.equal(vehicleInvoice.data().description, "extra_vehicle");
  assert.equal(vehicleInvoice.data().outstandingBalance, 1000);

  const invoice = await callable("createMonthlyInvoice", adminToken, {
    personId: "resident-1",
    period: "2026-09",
  });
  assert.equal(invoice.status, 200);
  assert.equal(invoice.body.data.id, "resident-1_2026-09");
  const adjustment = await callable("adjustInvoice", adminToken, {
    installmentId: "resident-1_2026-09",
    amount: 1000,
    type: "discount",
    reason: "Approved exception",
  });
  assert.equal(adjustment.status, 200);
  const payment = await callable("registerPayment", adminToken, {
    id: "payment-1",
    personId: "resident-1",
    totalAmount: 9000,
    method: "cash",
    applications: [{installmentId: "resident-1_2026-09", amount: 9000}],
  });
  assert.equal(payment.status, 200);
  const paidInvoice = await db.collection("invoices")
      .doc("resident-1_2026-09").get();
  assert.equal(paidInvoice.data().outstandingBalance, 0);
  assert.equal(paidInvoice.data().status, "paid");
  assert.equal((await db.collection("payments").doc("payment-1").get()).exists,
      true);
  const application = await db.collection("payments").doc("payment-1")
      .collection("applications").doc("0").get();
  assert.equal(application.data().previousBalance, 9000);
  assert.equal(application.data().newBalance, 0);

  const voided = await callable("voidPayment", adminToken, {
    paymentId: "payment-1",
    reason: "Duplicate receipt",
  });
  assert.equal(voided.status, 200);
  const restoredInvoice = await db.collection("invoices")
      .doc("resident-1_2026-09")
      .get();
  assert.equal(restoredInvoice.data().outstandingBalance, 9000);
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
  const deactivatedVehicle = await db.collection("vehicles").doc("vehicle-1")
      .get();
  assert.equal(deactivatedVehicle.data().status, "inactive");
  const inactiveResidentLot = await callable("createLot", adminToken, {
    id: "lot-3",
    number: "3",
    address: "Third Street",
    status: "active",
    currentResidentId: "resident-1",
  });
  assert.equal(inactiveResidentLot.status, 400);
  const inactiveOwnerVehicle = await callable("registerVehicle", adminToken, {
    id: "vehicle-2",
    ownerId: "resident-1",
    ownerType: "resident",
    type: "car",
    licensePlate: "P-123ABC",
  });
  assert.equal(inactiveOwnerVehicle.status, 400);
});
