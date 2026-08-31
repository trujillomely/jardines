const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createPerson, registerPayment, setUserRole,
} = require("../src/shared/schemas");

const validPayment = {
  id: "payment-1",
  personId: "resident-1",
  totalAmountCents: 100,
  method: "cash",
  applications: [{invoiceId: "invoice-1", amountCents: 100}],
};

test("accepts an amount expressed in cents", () => {
  assert.doesNotThrow(() => registerPayment(validPayment));
});

test("rejects decimal and non-positive monetary amounts", () => {
  assert.throws(() => registerPayment({
    ...validPayment,
    totalAmountCents: 12.5,
  }));
  assert.throws(() => registerPayment({
    ...validPayment,
    totalAmountCents: 0,
  }));
});

test("accepts safe Firestore document IDs only", () => {
  assert.doesNotThrow(() => createPerson({
    id: "resident-1",
    type: "resident",
    firstName: "Ada",
    phone: "5550101",
  }));
  assert.throws(() => createPerson({
    id: "resident/1",
    type: "resident",
    firstName: "Ada",
    phone: "5550101",
  }));
});

test("rejects blank business strings", () => {
  assert.throws(() => createPerson({
    id: "resident-1",
    type: "resident",
    firstName: "  ",
    phone: "5550101",
  }));
});

test("rejects malformed nested data", () => {
  assert.throws(() => registerPayment({
    ...validPayment,
    applications: null,
  }));
  assert.throws(() => registerPayment({
    ...validPayment,
    applications: [null],
  }));
});

test("schema rejects unexpected fields and malformed applications", () => {
  assert.doesNotThrow(() => registerPayment(validPayment));
  assert.throws(() => registerPayment({...validPayment, bypass: true}));
  assert.throws(() => registerPayment({
    ...validPayment,
    applications: [{invoiceId: "invoice-1", amountCents: 100, extra: true}],
  }));
});

test("a person cannot be assigned to a lot during creation", () => {
  assert.throws(() => createPerson({
    id: "resident-1",
    type: "resident",
    firstName: "Ada",
    phone: "5550101",
    lotId: "lot-1",
  }));
});

test("role changes reject unknown fields", () => {
  assert.doesNotThrow(() => setUserRole({
    uid: "user-1",
    role: "treasurer",
  }));
  assert.throws(() => setUserRole({
    uid: "user-1",
    role: "treasurer",
    elevated: true,
  }));
});
