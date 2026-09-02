const {Timestamp} = require("firebase-admin/firestore");
const firestore = require("../../../shared/firestore.repository");
const invoices = require("../infrastructure/invoices.repository");
const rates = require("../../rates/infrastructure/rates.repository");
const {applyLateFee, canApplyLateFee} =
    require("../domain/invoice.model");

const validLateFee = (value) => Number.isSafeInteger(value) && value >= 0;

const execute = async (now = Timestamp.now()) => {
  const [rate, overdueInvoices] = await Promise.all([
    rates.findActive(),
    invoices.findOverdue(now),
  ]);
  const residentLateFee = rate ? rate.data().residentLateFee : null;
  const vendorLateFee = rate ? rate.data().supplierLateFee : null;
  if (residentLateFee !== null && !validLateFee(residentLateFee)) {
    throw new Error("The active residentLateFee is invalid.");
  }
  if (vendorLateFee !== null && !validLateFee(vendorLateFee)) {
    throw new Error("The active supplierLateFee is invalid.");
  }
  let applied = 0;
  const applyFee = async (reference) => firestore.runTransaction(
      async (transaction) => {
        const invoice = await transaction.get(reference);
        if (!invoice.exists || !canApplyLateFee(invoice.data(), now)) {
          return false;
        }
        const current = invoice.data();
        const fallbackLateFee = current.description === "sticker" ?
          vendorLateFee : residentLateFee;
        const fee = current.lateFee === undefined ?
          fallbackLateFee : current.lateFee;
        if (!validLateFee(fee)) {
          throw new Error("Invoice has no valid late-fee snapshot.");
        }
        transaction.update(reference, applyLateFee(current, fee, now));
        return true;
      });
  for (let index = 0; index < overdueInvoices.docs.length; index += 20) {
    const group = overdueInvoices.docs.slice(index, index + 20);
    const results = await Promise.all(
        group.map((invoice) => applyFee(invoice.ref)));
    applied += results.filter(Boolean).length;
  }
  return {applied};
};

module.exports = {execute};
