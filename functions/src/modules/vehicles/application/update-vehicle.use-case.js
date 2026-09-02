const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const {timestampFromIsoDate} = require("../../../shared/firestore");
const firestore = require("../../../shared/firestore.repository");
const vehicles = require("../infrastructure/vehicles.repository");
const invoices = require("../../invoices/infrastructure/invoices.repository");
const {createMonthlyInvoice} = require("../../invoices/domain/invoice.model");

const execute = async (data, actorUid) => {
  const reference = vehicles.reference(data.vehicleId);
  const changes = Object.fromEntries(Object.entries(data).filter(
      ([key, value]) => key !== "vehicleId" && value !== undefined));
  if (changes.label) {
    changes.label = {
      ...changes.label,
      expiresOn: changes.label.expiresOn ? timestampFromIsoDate(
          changes.label.expiresOn, "label.expiresOn") : null,
    };
  }
  await firestore.runTransaction(async (transaction) => {
    const vehicle = await transaction.get(reference);
    if (!vehicle.exists) {
      throw new HttpsError("not-found", "Vehicle not found.");
    }
    const now = Timestamp.now();
    if (changes.label && changes.label.requiresExtraPayment) {
      if (!changes.label.expiresOn ||
          !Number.isSafeInteger(changes.label.amount) ||
          changes.label.amount <= 0) {
        throw new HttpsError("invalid-argument",
            "A paid label requires a positive amount and expiresOn.");
      }
      const previousLabel = vehicle.data().label || {};
      const renewed = !previousLabel.expiresOn ||
          previousLabel.expiresOn.toMillis() !==
            changes.label.expiresOn.toMillis();
      if (renewed) {
        const invoiceReference =
            invoices.referenceForVehiclePermit(
                reference.id, changes.label.expiresOn);
        transaction.create(invoiceReference, {
          ...createMonthlyInvoice({
            personId: vehicle.data().ownerId,
            personType: vehicle.data().ownerType,
            period: changes.label.expiresOn.toDate()
                .toISOString().slice(0, 7),
            description: "extra_vehicle",
            amount: changes.label.amount,
            lateFee: 0,
            rateId: null,
            dueDate: now,
            now,
          }),
          vehicleId: reference.id,
        });
      }
    }
    transaction.update(reference, {
      ...changes,
      updatedAt: now,
      updatedBy: actorUid,
    });
  });
  return {id: reference.id};
};

module.exports = {execute};
