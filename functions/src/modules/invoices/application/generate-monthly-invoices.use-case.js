const {Timestamp} = require("firebase-admin/firestore");
const lots = require("../../lots/infrastructure/lots.repository");
const rates = require("../../rates/infrastructure/rates.repository");
const invoices = require("../infrastructure/invoices.repository");
const {createMonthlyInvoice} = require("../domain/invoice.model");

const periodFor = (date) => date.toISOString().slice(0, 7);

const execute = async (now = Timestamp.now()) => {
  const period = periodFor(now.toDate());
  const [rate, activeLots] = await Promise.all([
    rates.findActive(),
    lots.findActive(),
  ]);
  if (!rate) throw new Error("No active rate is configured.");
  const amountCents = rate.data().residentMonthlyAmountCents;
  const lateFeeCents = rate.data().residentLateFeeCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("The active residentMonthlyAmountCents is invalid.");
  }
  if (!Number.isSafeInteger(lateFeeCents) || lateFeeCents < 0) {
    throw new Error("The active residentLateFeeCents is invalid.");
  }
  const dueDate = Timestamp.fromDate(new Date(`${period}-10T23:59:59-06:00`));
  const invoicesById = new Map();
  activeLots.docs.forEach((lot) => {
    const personId = lot.data().currentResidentId;
    if (!personId) return;
    const reference = invoices.referenceForMonthlyInvoice(personId, period);
    invoicesById.set(reference.id, {personId, reference});
  });
  const candidates = [...invoicesById.values()];
  if (candidates.length === 0) return {created: 0, period};
  const missingInvoices = await invoices.findMissing(candidates);
  await invoices.createMany(missingInvoices.map((invoice) => ({
    reference: invoice.reference,
    data: createMonthlyInvoice({
      personId: invoice.personId,
      period,
      amountCents,
      lateFeeCents,
      rateId: rate.id,
      dueDate,
      now,
    }),
  })));
  return {created: missingInvoices.length, period};
};

module.exports = {execute, periodFor};
