const createPayment = (data, now, createdBy) => ({
  personId: data.personId,
  paymentDate: now,
  totalAmount: data.totalAmount,
  method: data.method,
  reference: data.reference || null,
  bank: data.bank || null,
  receiptUrl: data.receiptUrl || null,
  status: "confirmed",
  createdBy,
  createdAt: now,
});

const createApplication = (installmentId, amount, previousBalance, now) => ({
  installmentId,
  amount,
  previousBalance,
  newBalance: previousBalance - amount,
  createdAt: now,
});

const hasUniqueInvoiceApplications = (applications) => {
  const ids = applications.map((application) => application.installmentId);
  return new Set(ids).size === ids.length;
};

const totalAppliedAmount = (applications) => applications.reduce(
    (total, application) => total + application.amount, 0);

module.exports = {
  createApplication,
  createPayment,
  hasUniqueInvoiceApplications,
  totalAppliedAmount,
};
