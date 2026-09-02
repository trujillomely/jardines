const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyAdjustment, applyLateFee, applyPayment, canApplyAdjustment,
  canApplyPayment, canReversePayment,
  createMonthlyInvoice, reversePayment,
} = require("../src/modules/invoices/domain/invoice.model");

const now = {toMillis: () => 200};
const dueDate = {toMillis: () => 100};

test("invoice model creates an immutable rate snapshot", () => {
  const invoice = createMonthlyInvoice({
    personId: "resident-1",
    period: "2026-08",
    personType: "resident", amount: 10000, lateFee: 500,
    rateId: "rate-2026",
    dueDate,
    now,
  });
  assert.equal(invoice.rateId, "rate-2026");
  assert.equal(invoice.lateFee, 500);
  assert.equal(invoice.outstandingBalance, 10000);
});

test("invoice model preserves the vendor sticker description", () => {
  const invoice = createMonthlyInvoice({
    personId: "vendor-1",
    period: "2026-08",
    personType: "vendor", description: "sticker", amount: 5000, lateFee: 250,
    rateId: "rate-2026",
    dueDate,
    now,
  });
  assert.equal(invoice.description, "sticker");
  assert.equal(invoice.lateFee, 250);
});

test("invoice model applies and reverses a payment " +
    "without losing balances", () => {
  const invoice = {
    amountPaid: 0, outstandingBalance: 10000,
    status: "pending",
  };
  assert.equal(canApplyPayment(invoice, 10000), true);
  const paid = {...invoice, ...applyPayment(invoice, 10000, now, "admin")};
  assert.equal(paid.status, "paid");
  assert.equal(canReversePayment(paid, 10000), true);
  const restored = {...paid, ...reversePayment(paid, 10000, now, "admin")};
  assert.equal(restored.amountPaid, 0);
  assert.equal(restored.outstandingBalance, 10000);
  assert.equal(restored.status, "pending");
});

test("invoice model rejects invalid payment operations defensively", () => {
  const pendingInvoice = {
    amountPaid: 0, outstandingBalance: 10000,
    status: "pending",
  };
  const paidInvoice = {
    amountPaid: 10000, outstandingBalance: 0,
    status: "paid",
  };

  assert.equal(canApplyPayment(pendingInvoice, 10.5), false);
  assert.equal(canApplyPayment({...pendingInvoice, amountPaid: -1}, 100),
      false);
  assert.equal(canReversePayment(paidInvoice, 10.5), false);
  assert.equal(canReversePayment({...paidInvoice, status: "pending"}, 100),
      false);
});

test("invoice model applies a late fee to the outstanding balance", () => {
  const invoice = {originalAmount: 10000, outstandingBalance: 2500};
  const updated = applyLateFee(invoice, 500, now);
  assert.equal(updated.originalAmount, 10500);
  assert.equal(updated.outstandingBalance, 3000);
});

test("invoice adjustments reduce the balance and retain audit totals", () => {
  const invoice = createMonthlyInvoice({
    personId: "resident-1", personType: "resident", period: "2026-09",
    amount: 1000, lateFee: 50, rateId: "rate-1", dueDate, now,
  });
  assert.equal(canApplyAdjustment(invoice, 300, "discount"), true);
  const adjusted = applyAdjustment(
      invoice, 300, "discount", now, "admin-1");
  assert.equal(adjusted.outstandingBalance, 700);
  assert.equal(adjusted.adjustedAmount, 300);
  assert.equal(adjusted.status, "pending");
  assert.equal(canApplyAdjustment(invoice, 50, "late_fee_waiver"), false);
});
