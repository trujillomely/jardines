const createPayment = (data, now, createdBy) => ({
  personId: data.personId,
  paidAt: now,
  totalAmountCents: data.totalAmountCents,
  method: data.method,
  reference: data.reference || null,
  bank: data.bank || null,
  receiptUrl: data.receiptUrl || null,
  status: "confirmed",
  createdBy,
  createdAt: now,
});

const createApplication = (invoiceId, amountCents, now) => ({
  invoiceId,
  amountCents,
  createdAt: now,
});

const hasUniqueInvoiceApplications = (applications) => {
  const ids = applications.map((application) => application.invoiceId);
  return new Set(ids).size === ids.length;
};

const totalAppliedAmount = (applications) => applications.reduce(
    (total, application) => total + application.amountCents, 0);

module.exports = {
  createApplication,
  createPayment,
  hasUniqueInvoiceApplications,
  totalAppliedAmount,
};
