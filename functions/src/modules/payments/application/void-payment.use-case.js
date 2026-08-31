const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const invoices = require("../../invoices/infrastructure/invoices.repository");
const payments = require("../infrastructure/payments.repository");
const {canReversePayment, reversePayment} =
    require("../../invoices/domain/invoice.model");

const execute = async (data, actorUid) => {
  const paymentReference = payments.reference(data.paymentId);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    const payment = await transaction.get(paymentReference);
    if (!payment.exists) {
      throw new HttpsError("not-found", "Payment not found.");
    }
    if (payment.data().status === "voided") return;
    if (payment.data().status !== "confirmed") {
      throw new HttpsError(
          "failed-precondition", "Payment cannot be voided.");
    }
    const applications = await transaction.get(payments.applications(
        paymentReference));
    if (applications.empty) {
      throw new HttpsError(
          "failed-precondition", "Payment has no applications.");
    }
    const invoiceSnapshots = await Promise.all(applications.docs.map(
        async (application) => {
          const reference = invoices.reference(application.data().invoiceId);
          const snapshot = await transaction.get(reference);
          return {application, reference, snapshot};
        }));
    for (const invoice of invoiceSnapshots) {
      if (!invoice.snapshot.exists || !canReversePayment(
          invoice.snapshot.data(), invoice.application.data().amountCents)) {
        throw new HttpsError(
            "failed-precondition", "Payment applications are inconsistent.");
      }
    }
    invoiceSnapshots.forEach(({application, reference, snapshot}) => {
      transaction.update(reference, reversePayment(
          snapshot.data(), application.data().amountCents, now, actorUid));
    });
    transaction.update(paymentReference, {
      status: "voided",
      voidedAt: now,
      voidedBy: actorUid,
      voidReason: data.reason,
      updatedAt: now,
    });
  });
  return {id: paymentReference.id, status: "voided"};
};

module.exports = {execute};
