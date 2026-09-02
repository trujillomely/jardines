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
  const residentAmountCents = rate.data().residentMonthlyAmountCents;
  const residentLateFeeCents = rate.data().residentLateFeeCents;
  const vendorAmountCents = rate.data().vendorMonthlyAmountCents;
  const vendorLateFeeCents = rate.data().vendorLateFeeCents;
  if (!Number.isSafeInteger(residentAmountCents) || residentAmountCents <= 0) {
    throw new Error("The active residentMonthlyAmountCents is invalid.");
  }
  if (!Number.isSafeInteger(residentLateFeeCents) || residentLateFeeCents < 0) {
    throw new Error("The active residentLateFeeCents is invalid.");
  }
  if (!Number.isSafeInteger(vendorAmountCents) || vendorAmountCents <= 0) {
    throw new Error("The active vendorMonthlyAmountCents is invalid.");
  }
  if (!Number.isSafeInteger(vendorLateFeeCents) || vendorLateFeeCents < 0) {
    throw new Error("The active vendorLateFeeCents is invalid.");
  }
  const dueDate = Timestamp.fromDate(new Date(`${period}-10T23:59:59-06:00`));
  const invoicesById = new Map();
  activeLots.docs.forEach((lot) => {
    const personId = lot.data().currentResidentId;
    if (!personId) return;
    const reference = invoices.referenceForMonthlyInvoice(personId, period);
    invoicesById.set(reference.id, {
      personId,
      reference,
      concept: "monthly_fee",
      amountCents: residentAmountCents,
      lateFeeCents: residentLateFeeCents,
    });
  });
  activeVendors.docs.forEach((vendor) => {
    const personId = vendor.id;
    const reference = invoices.referenceForMonthlyInvoice(personId, period);
    invoicesById.set(reference.id, {
      personId,
      reference,
      concept: "vendor_permit",
      amountCents: vendorAmountCents,
      lateFeeCents: vendorLateFeeCents,
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
      concept: invoice.concept,
      amountCents: invoice.amountCents,
      lateFeeCents: invoice.lateFeeCents,
      rateId: rate.id,
      dueDate,
      now,
    }),
  })));
  return {created: missingInvoices.length, period};
};

module.exports = {execute, periodFor};
