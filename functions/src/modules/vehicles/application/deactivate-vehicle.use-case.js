const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const vehicles = require("../infrastructure/vehicles.repository");

const execute = async (data, actorUid) => {
  const reference = vehicles.reference(data.vehicleId);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    const vehicle = await transaction.get(reference);
    if (!vehicle.exists) {
      throw new HttpsError("not-found", "Vehicle not found.");
    }
    if (vehicle.data().status === "inactive") return;
    transaction.update(reference, {
      status: "inactive",
      deactivatedAt: now,
      deactivatedBy: actorUid,
      deactivationReason: data.reason,
      updatedAt: now,
      updatedBy: actorUid,
    });
  });
  return {id: reference.id, status: "inactive"};
};

module.exports = {execute};
