const isMoney = (value) => Number.isSafeInteger(value) && value >= 0;

const createMonthlyInvoice = ({
  personId, period, concept = "monthly_fee", amountCents, lateFeeCents,
  rateId, dueDate, now,
}) => ({
  personId,
  period,
  concept,
  rateId,
  originalAmountCents: amountCents,
  paidAmountCents: 0,
  outstandingAmountCents: amountCents,
  lateFeeCents,
  status: "pending",
  dueDate,
  lateFeeApplied: false,
  paidInFullAt: null,
  createdAt: now,
  updatedAt: now,
});

const canApplyPayment = (invoice, amountCents) => {
  return isMoney(invoice.paidAmountCents) &&
      isMoney(invoice.outstandingAmountCents) &&
      Number.isSafeInteger(amountCents) && amountCents > 0 &&
      amountCents <= invoice.outstandingAmountCents &&
      ["pending", "partial"].includes(invoice.status);
};

const applyPayment = (invoice, amountCents, now, updatedBy) => {
  const outstandingAmountCents = invoice.outstandingAmountCents - amountCents;
  return {
    paidAmountCents: invoice.paidAmountCents + amountCents,
    outstandingAmountCents,
    status: outstandingAmountCents === 0 ? "paid" : "partial",
    paidInFullAt: outstandingAmountCents === 0 ? now : null,
    updatedAt: now,
    updatedBy,
  };
};

const canReversePayment = (invoice, amountCents) => {
  return isMoney(invoice.paidAmountCents) &&
      isMoney(invoice.outstandingAmountCents) &&
      Number.isSafeInteger(amountCents) && amountCents > 0 &&
      amountCents <= invoice.paidAmountCents &&
      ["partial", "paid"].includes(invoice.status);
};

const reversePayment = (invoice, amountCents, now, updatedBy) => {
  const paidAmountCents = invoice.paidAmountCents - amountCents;
  return {
    paidAmountCents,
    outstandingAmountCents: invoice.outstandingAmountCents + amountCents,
    status: paidAmountCents === 0 ? "pending" : "partial",
    paidInFullAt: null,
    updatedAt: now,
    updatedBy,
  };
};

const canApplyLateFee = (invoice, now) => {
  return ["pending", "partial"].includes(invoice.status) &&
      !invoice.lateFeeApplied && invoice.dueDate &&
      invoice.dueDate.toMillis() < now.toMillis();
};

const applyLateFee = (invoice, lateFeeCents, now) => ({
  originalAmountCents: invoice.originalAmountCents + lateFeeCents,
  outstandingAmountCents: invoice.outstandingAmountCents + lateFeeCents,
  lateFeeApplied: true,
  updatedAt: now,
});

module.exports = {
  applyLateFee,
  applyPayment,
  canApplyLateFee,
  canApplyPayment,
  canReversePayment,
  createMonthlyInvoice,
  reversePayment,
};
