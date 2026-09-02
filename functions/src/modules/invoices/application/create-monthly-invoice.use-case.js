const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const lots = require("../../lots/infrastructure/lots.repository");
const people = require("../../people/infrastructure/people.repository");
const rates = require("../../rates/infrastructure/rates.repository");
const invoices = require("../infrastructure/invoices.repository");
const {createMonthlyInvoice} = require("../domain/invoice.model");

const dueDateForPeriod = (period, paymentDueDate) => Timestamp.fromDate(
    new Date(`${period}-${String(paymentDueDate).padStart(2, "0")}` +
      "T23:59:59-06:00"));

const validAmount = (value) => Number.isSafeInteger(value) && value > 0;
const validLateFee = (value) => Number.isSafeInteger(value) && value >= 0;
const validDueDay = (value) => Number.isSafeInteger(value) &&
  value >= 1 && value <= 28;

const billingDetails = (person, rate) => {
  if (person.type === "resident") {
    return {
      description: "monthly_installment",
      amount: rate.residentFee,
      lateFee: rate.residentLateFee,
    };
  }
  if (person.type === "vendor") {
    return {
      description: "sticker",
      amount: rate.supplierSticker,
      lateFee: rate.supplierLateFee,
    };
  }
  throw new HttpsError("failed-precondition", "Person type is invalid.");
};

const execute = async (data) => {
  const personReference = people.reference(data.personId);
  const invoiceReference = invoices.referenceForMonthlyInvoice(
      data.personId, data.period);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    const [person, activeRates, existingInvoice] = await Promise.all([
      transaction.get(personReference),
      transaction.get(rates.findAllActive()),
      transaction.get(invoiceReference),
    ]);
    if (!person.exists || person.data().status !== "active") {
      throw new HttpsError("failed-precondition",
          "personId must refer to an active person.");
    }
    if (existingInvoice.exists) {
      throw new HttpsError("already-exists",
          "A monthly invoice already exists for this person and period.");
    }
    if (activeRates.empty || activeRates.size !== 1) {
      throw new HttpsError("failed-precondition",
          "Exactly one active rate must be configured.");
    }
    const personData = person.data();
    if (personData.type === "resident") {
      if (!personData.lotId) {
        throw new HttpsError("failed-precondition",
            "A resident must be assigned to an active lot.");
      }
      const lot = await transaction.get(lots.reference(personData.lotId));
      if (!lot.exists || lot.data().status !== "active" ||
          lot.data().currentResidentId !== personReference.id) {
        throw new HttpsError("failed-precondition",
            "The resident-lot relationship is invalid.");
      }
    }
    const rate = activeRates.docs[0];
    const details = billingDetails(personData, rate.data());
    if (!validAmount(details.amount) || !validLateFee(details.lateFee) ||
        !validDueDay(rate.data().paymentDueDate)) {
      throw new HttpsError("failed-precondition",
          "The active rate is invalid for this person type.");
    }
    transaction.create(invoiceReference, createMonthlyInvoice({
      personId: personReference.id,
      period: data.period,
      personType: personData.type,
      description: details.description,
      amount: details.amount,
      lateFee: details.lateFee,
      rateId: rate.id,
      dueDate: dueDateForPeriod(data.period, rate.data().paymentDueDate),
      now,
    }));
  });
  return {id: invoiceReference.id};
};

module.exports = {dueDateForPeriod, execute};
