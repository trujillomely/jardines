const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const people = require("../../people/infrastructure/people.repository");
const invoices = require("../../invoices/infrastructure/invoices.repository");
const payments = require("../infrastructure/payments.repository");
const {
  createApplication, createPayment, hasUniqueInvoiceApplications,
  totalAppliedAmount,
} = require("../domain/payment.model");
const {applyPayment, canApplyPayment} =
    require("../../invoices/domain/invoice.model");

const execute = async (data, actorUid) => {
  if (["deposit", "transfer"].includes(data.method) &&
      (!data.bank || !data.reference)) {
    throw new HttpsError(
        "invalid-argument", "bank and reference are required.");
  }
  if (totalAppliedAmount(data.applications) !== data.totalAmountCents) {
    throw new HttpsError(
        "invalid-argument", "Applied amount must equal totalAmountCents.");
  }
  if (!hasUniqueInvoiceApplications(data.applications)) {
    throw new HttpsError(
        "invalid-argument", "Each invoice can be applied only once.");
  }

  const paymentReference = payments.reference(data.id);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    if ((await transaction.get(paymentReference)).exists) {
      throw new HttpsError(
          "already-exists", "A payment with this id already exists.");
    }
    const person = await transaction.get(people.reference(data.personId));
    if (!person.exists || person.data().type !== "resident") {
      throw new HttpsError(
          "failed-precondition", "personId must refer to a resident.");
    }
    const invoiceSnapshots = await Promise.all(data.applications.map(
        async (application) => {
          const reference = invoices.reference(application.invoiceId);
          const snapshot = await transaction.get(reference);
          return {application, reference, snapshot};
        }));
    for (const invoice of invoiceSnapshots) {
      if (!invoice.snapshot.exists) {
        throw new HttpsError("not-found", "An invoice does not exist.");
      }
      if (invoice.snapshot.data().personId !== data.personId ||
          !canApplyPayment(
              invoice.snapshot.data(), invoice.application.amountCents)) {
        throw new HttpsError(
            "failed-precondition", "Invalid invoice application.");
      }
    }
    transaction.create(paymentReference, createPayment(data, now, actorUid));
    invoiceSnapshots.forEach(({application, reference, snapshot}, index) => {
      transaction.update(reference, applyPayment(
          snapshot.data(), application.amountCents, now, actorUid));
      const applicationReference = payments.applications(paymentReference)
          .doc(String(index));
      transaction.create(applicationReference, createApplication(
          application.invoiceId, application.amountCents, now));
    });
  });
  return {id: paymentReference.id};
};

module.exports = {execute};
