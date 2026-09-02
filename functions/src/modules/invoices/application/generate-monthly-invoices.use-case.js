const {Timestamp} = require("firebase-admin/firestore");
const lots = require("../../lots/infrastructure/lots.repository");
const people = require("../../people/infrastructure/people.repository");
const rates = require("../../rates/infrastructure/rates.repository");
const invoices = require("../infrastructure/invoices.repository");
const {createMonthlyInvoice} = require("../domain/invoice.model");

const periodFor = (date) => date.toISOString().slice(0, 7);

const execute = async (now = Timestamp.now()) => {
  const period = periodFor(now.toDate());
  const [rate, activeLots, activeVendors] = await Promise.all([
    rates.findActive(),
    lots.findActive(),
    people.findActiveVendors(),
  ]);
  if (!rate) throw new Error("No active rate is configured.");
  const residentAmount = rate.data().residentFee;
  const residentLateFee = rate.data().residentLateFee;
  const vendorAmount = rate.data().supplierSticker;
  const vendorLateFee = rate.data().supplierLateFee;
  const paymentDueDate = rate.data().paymentDueDate;
  if (!Number.isSafeInteger(residentAmount) || residentAmount <= 0) {
    throw new Error("The active residentFee is invalid.");
  }
  if (!Number.isSafeInteger(residentLateFee) || residentLateFee < 0) {
    throw new Error("The active residentLateFee is invalid.");
  }
  if (!Number.isSafeInteger(vendorAmount) || vendorAmount <= 0) {
    throw new Error("The active supplierSticker is invalid.");
  }
  if (!Number.isSafeInteger(vendorLateFee) || vendorLateFee < 0) {
    throw new Error("The active supplierLateFee is invalid.");
  }
  if (!Number.isSafeInteger(paymentDueDate) || paymentDueDate < 1 ||
      paymentDueDate > 28) {
    throw new Error("The active paymentDueDate is invalid.");
  }
  const dueDate = Timestamp.fromDate(new Date(
      `${period}-${String(paymentDueDate).padStart(2, "0")}T23:59:59-06:00`));
  const invoicesById = new Map();
  activeLots.docs.forEach((lot) => {
    const personId = lot.data().currentResidentId;
    if (!personId) return;
    const reference = invoices.referenceForMonthlyInvoice(personId, period);
    invoicesById.set(reference.id, {
      personId,
      reference,
      personType: "resident", description: "monthly_installment",
      amount: residentAmount, lateFee: residentLateFee,
    });
  });
  activeVendors.docs.forEach((vendor) => {
    const personId = vendor.id;
    const reference = invoices.referenceForMonthlyInvoice(personId, period);
    invoicesById.set(reference.id, {
      personId,
      reference,
      personType: "vendor", description: "sticker",
      amount: vendorAmount, lateFee: vendorLateFee,
    });
  });
  const candidates = [...invoicesById.values()];
  if (candidates.length === 0) return {created: 0, period};
  const missingInvoices = await invoices.findMissing(candidates);
  await invoices.createMany(missingInvoices.map((invoice) => ({
    reference: invoice.reference,
    data: createMonthlyInvoice({
      personId: invoice.personId,
      period,
      personType: invoice.personType,
      description: invoice.description,
      amount: invoice.amount,
      lateFee: invoice.lateFee,
      rateId: rate.id,
      dueDate,
      now,
    }),
  })));
  return {created: missingInvoices.length, period};
};

module.exports = {execute, periodFor};
