const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const {timestampFromIsoDate} = require("../../../shared/firestore");
const {createVehicle} = require("../domain/vehicle.model");
const vehicles = require("../infrastructure/vehicles.repository");
const people = require("../../people/infrastructure/people.repository");
const invoices = require("../../invoices/infrastructure/invoices.repository");
const {createMonthlyInvoice} = require("../../invoices/domain/invoice.model");

const execute = async (data, actorUid) => {
  const reference = vehicles.reference(data.id);
  const ownerReference = people.reference(data.ownerId);
  const now = Timestamp.now();
  const expiresOn = data.label && data.label.expiresOn ?
    timestampFromIsoDate(data.label.expiresOn, "label.expiresOn") : null;
  if (data.label && data.label.requiresExtraPayment && !expiresOn) {
    throw new HttpsError("invalid-argument",
        "label.expiresOn is required when an extra payment is required.");
  }
  if (data.label && data.label.requiresExtraPayment &&
      (!Number.isSafeInteger(data.label.amount) || data.label.amount <= 0)) {
    throw new HttpsError("invalid-argument",
        "label.amount must be positive for a paid label.");
  }
  const permitInvoiceReference = data.label && data.label.requiresExtraPayment ?
    invoices.referenceForVehiclePermit(data.id, expiresOn) : null;
  await firestore.runTransaction(async (transaction) => {
    const [vehicle, owner] = await Promise.all([
      transaction.get(reference),
      transaction.get(ownerReference),
    ]);
    if (vehicle.exists) {
      throw new HttpsError(
          "already-exists", "A vehicle with this id already exists.");
    }
    if (!owner.exists || owner.data().type !== data.ownerType ||
        owner.data().status !== "active") {
      throw new HttpsError("failed-precondition",
          "ownerId must refer to an active owner of the specified ownerType.");
    }
    transaction.create(
        reference, createVehicle(data, expiresOn, now, actorUid));
    if (permitInvoiceReference) {
      transaction.create(permitInvoiceReference, {
        ...createMonthlyInvoice({
          personId: data.ownerId,
          personType: data.ownerType,
          period: expiresOn.toDate().toISOString().slice(0, 7),
          description: "extra_vehicle",
          amount: data.label.amount,
          lateFee: 0,
          rateId: null,
          dueDate: now,
          now,
        }),
        vehicleId: reference.id,
      });
    }
  });
  return {id: reference.id};
};

module.exports = {execute};
