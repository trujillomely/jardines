const isMoney = (value) => Number.isSafeInteger(value) && value >= 0;

const createMonthlyInvoice = ({
  personId, personType, period, description = "monthly_installment", amount,
  lateFee,
  rateId, dueDate, now,
}) => ({
  personId,
  personType,
  period,
  description,
  rateId,
  originalAmount: amount,
  amountPaid: 0,
  adjustedAmount: 0,
  lateFeeWaivedAmount: 0,
  outstandingBalance: amount,
  lateFee,
  status: "pending",
  dueDate,
  lateFeeApplied: false,
  fullPaymentDate: null,
  createdAt: now,
  updatedAt: now,
});

const canApplyPayment = (invoice, amount) => {
  return isMoney(invoice.amountPaid) && isMoney(invoice.outstandingBalance) &&
      Number.isSafeInteger(amount) && amount > 0 &&
      amount <= invoice.outstandingBalance &&
      ["pending", "partial", "overdue"].includes(invoice.status);
};

const applyPayment = (invoice, amount, now, updatedBy) => {
  const outstandingBalance = invoice.outstandingBalance - amount;
  return {
    amountPaid: invoice.amountPaid + amount,
    outstandingBalance,
    status: outstandingBalance === 0 ? "paid" : "partial",
    fullPaymentDate: outstandingBalance === 0 ? now : null,
    updatedAt: now,
    updatedBy,
  };
};

const canReversePayment = (invoice, amount) => {
  return isMoney(invoice.amountPaid) && isMoney(invoice.outstandingBalance) &&
      Number.isSafeInteger(amount) && amount > 0 &&
      amount <= invoice.amountPaid &&
      ["partial", "paid", "overdue"].includes(invoice.status);
};

const reversePayment = (invoice, amount, now, updatedBy) => {
  const amountPaid = invoice.amountPaid - amount;
  return {
    amountPaid,
    outstandingBalance: invoice.outstandingBalance + amount,
    status: amountPaid === 0 ? "pending" : "partial",
    fullPaymentDate: null,
    updatedAt: now,
    updatedBy,
  };
};

const canApplyLateFee = (invoice, now) => {
  return ["pending", "partial"].includes(invoice.status) &&
      !invoice.lateFeeApplied && invoice.dueDate &&
      invoice.dueDate.toMillis() < now.toMillis();
};

const applyLateFee = (invoice, lateFee, now) => ({
  originalAmount: invoice.originalAmount + lateFee,
  outstandingBalance: invoice.outstandingBalance + lateFee,
  lateFeeApplied: true,
  status: "overdue",
  updatedAt: now,
});

const canApplyAdjustment = (invoice, amount, type) => {
  return isMoney(invoice.outstandingBalance) &&
      Number.isSafeInteger(amount) && amount > 0 &&
      amount <= invoice.outstandingBalance &&
      (type !== "late_fee_waiver" || (invoice.lateFeeApplied &&
        (invoice.lateFeeWaivedAmount || 0) + amount <= invoice.lateFee)) &&
      ["pending", "partial", "overdue"].includes(invoice.status);
};

const applyAdjustment = (invoice, amount, type, now, updatedBy) => {
  const outstandingBalance = invoice.outstandingBalance - amount;
  return {
    adjustedAmount: (invoice.adjustedAmount || 0) + amount,
    lateFeeWaivedAmount: type === "late_fee_waiver" ?
      (invoice.lateFeeWaivedAmount || 0) + amount :
      (invoice.lateFeeWaivedAmount || 0),
    outstandingBalance,
    status: outstandingBalance === 0 && type === "write_off" ? "canceled" :
      outstandingBalance === 0 ? "paid" :
      (invoice.amountPaid > 0 ? "partial" : "pending"),
    updatedAt: now,
    updatedBy,
  };
};

module.exports = {
  applyAdjustment,
  applyLateFee,
  applyPayment,
  canApplyAdjustment,
  canApplyLateFee,
  canApplyPayment,
  canReversePayment,
  createMonthlyInvoice,
  reversePayment,
};
