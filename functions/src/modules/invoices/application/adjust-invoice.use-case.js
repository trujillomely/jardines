const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const invoices = require("../infrastructure/invoices.repository");
const {applyAdjustment, canApplyAdjustment} =
    require("../domain/invoice.model");

const execute = async (data, actorUid) => {
  const reference = invoices.reference(data.installmentId);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    const invoice = await transaction.get(reference);
    if (!invoice.exists) {
      throw new HttpsError("not-found", "Invoice not found.");
    }
    if (!canApplyAdjustment(invoice.data(), data.amount, data.type)) {
      throw new HttpsError("failed-precondition",
          "The adjustment exceeds the outstanding invoice balance.");
    }
    transaction.update(reference, applyAdjustment(
        invoice.data(), data.amount, data.type, now, actorUid));
    transaction.create(invoices.adjustments(reference).doc(), {
      amount: data.amount,
      type: data.type,
      reason: data.reason,
      createdAt: now,
      createdBy: actorUid,
    });
  });
  return {id: reference.id};
};

module.exports = {execute};
