const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createMonthlyInvoice, createPerson, registerPayment, updateLot, updatePerson,
  updateVehicle,
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

test("updates require an identifier and at least one editable field", () => {
  assert.doesNotThrow(() => updatePerson({
    personId: "resident-1", phone: "5550102",
  }));
  assert.throws(() => updatePerson({personId: "resident-1"}));
  assert.doesNotThrow(() => updateLot({lotId: "lot-1", address: "Main"}));
  assert.throws(() => updateLot({lotId: "lot-1"}));
  assert.doesNotThrow(() => updateVehicle({
    vehicleId: "vehicle-1", plate: "P-123ABC",
  }));
  assert.throws(() => updateVehicle({vehicleId: "vehicle-1"}));
});

test("monthly invoices require a calendar period", () => {
  assert.doesNotThrow(() => createMonthlyInvoice({
    personId: "resident-1", period: "2026-09",
  }));
  assert.throws(() => createMonthlyInvoice({
    personId: "resident-1", period: "2026-13",
  }));
});
