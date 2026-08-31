const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyLateFee, applyPayment, canApplyPayment, canReversePayment,
  createMonthlyInvoice, reversePayment,
} = require("../src/modules/invoices/domain/invoice.model");

const now = {toMillis: () => 200};
const dueDate = {toMillis: () => 100};

test("invoice model creates an immutable rate snapshot", () => {
  const invoice = createMonthlyInvoice({
    personId: "resident-1",
    period: "2026-08",
    amountCents: 10000,
    lateFeeCents: 500,
    rateId: "rate-2026",
    dueDate,
    now,
  });
  assert.equal(invoice.rateId, "rate-2026");
  assert.equal(invoice.lateFeeCents, 500);
  assert.equal(invoice.outstandingAmountCents, 10000);
});

test("invoice model applies and reverses a payment " +
    "without losing balances", () => {
  const invoice = {
    paidAmountCents: 0,
    outstandingAmountCents: 10000,
    status: "pending",
  };
  assert.equal(canApplyPayment(invoice, 10000), true);
  const paid = {...invoice, ...applyPayment(invoice, 10000, now, "admin")};
  assert.equal(paid.status, "paid");
  assert.equal(canReversePayment(paid, 10000), true);
  const restored = {...paid, ...reversePayment(paid, 10000, now, "admin")};
  assert.equal(restored.paidAmountCents, 0);
  assert.equal(restored.outstandingAmountCents, 10000);
  assert.equal(restored.status, "pending");
});

test("invoice model rejects invalid payment operations defensively", () => {
  const pendingInvoice = {
    paidAmountCents: 0,
    outstandingAmountCents: 10000,
    status: "pending",
  };
  const paidInvoice = {
    paidAmountCents: 10000,
    outstandingAmountCents: 0,
    status: "paid",
  };

  assert.equal(canApplyPayment(pendingInvoice, 10.5), false);
  assert.equal(canApplyPayment({...pendingInvoice, paidAmountCents: -1}, 100),
      false);
  assert.equal(canReversePayment(paidInvoice, 10.5), false);
  assert.equal(canReversePayment({...paidInvoice, status: "pending"}, 100),
      false);
});

test("invoice model applies a late fee to the outstanding balance", () => {
  const invoice = {originalAmountCents: 10000, outstandingAmountCents: 2500};
  const updated = applyLateFee(invoice, 500, now);
  assert.equal(updated.originalAmountCents, 10500);
  assert.equal(updated.outstandingAmountCents, 3000);
});
