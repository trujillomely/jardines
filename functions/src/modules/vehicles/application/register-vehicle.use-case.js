const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const {timestampFromIsoDate} = require("../../../shared/firestore");
const {createVehicle} = require("../domain/vehicle.model");
const vehicles = require("../infrastructure/vehicles.repository");
const people = require("../../people/infrastructure/people.repository");

const execute = async (data, actorUid) => {
  const reference = vehicles.reference(data.id);
  const ownerReference = people.reference(data.ownerId);
  const now = Timestamp.now();
  const validUntil = data.permit && data.permit.validUntil ?
    timestampFromIsoDate(data.permit.validUntil, "permit.validUntil") : null;
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
        reference, createVehicle(data, validUntil, now, actorUid));
  });
  return {id: reference.id};
};

module.exports = {execute};
