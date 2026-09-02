const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const people = require("../infrastructure/people.repository");
const lots = require("../../lots/infrastructure/lots.repository");
const vehicles = require("../../vehicles/infrastructure/vehicles.repository");

const execute = async (data, actorUid) => {
  const reference = people.reference(data.personId);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    const person = await transaction.get(reference);
    if (!person.exists) throw new HttpsError("not-found", "Person not found.");
    if (person.data().status === "inactive") return;
    const lotId = person.data().lotId;
    if (lotId) {
      const lot = await transaction.get(lots.reference(lotId));
      if (lot.exists && lot.data().currentResidentId === reference.id) {
        throw new HttpsError("failed-precondition",
            "Unassign the resident from the lot before deactivating.");
      }
    }
    const activeVehicles = await transaction.get(
        vehicles.findActiveByOwner(reference.id));
    transaction.update(reference, {
      status: "inactive",
      deactivatedAt: now,
      deactivatedBy: actorUid,
      deactivationReason: data.reason,
      updatedAt: now,
      updatedBy: actorUid,
    });
    activeVehicles.docs.forEach((vehicle) => {
      transaction.update(vehicle.ref, {
        status: "inactive",
        deactivatedAt: now,
        deactivatedBy: actorUid,
        deactivationReason: "Owner was deactivated.",
        updatedAt: now,
        updatedBy: actorUid,
      });
    });
  });
  return {id: reference.id, status: "inactive"};
};

module.exports = {execute};
