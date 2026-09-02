const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const {timestampFromIsoDate} = require("../../../shared/firestore");
const firestore = require("../../../shared/firestore.repository");
const vehicles = require("../infrastructure/vehicles.repository");

const execute = async (data, actorUid) => {
  const reference = vehicles.reference(data.vehicleId);
  const changes = Object.fromEntries(Object.entries(data).filter(
      ([key, value]) => key !== "vehicleId" && value !== undefined));
  if (changes.permit) {
    changes.permit = {
      ...changes.permit,
      validUntil: changes.permit.validUntil ? timestampFromIsoDate(
          changes.permit.validUntil, "permit.validUntil") : null,
    };
  }
  await firestore.runTransaction(async (transaction) => {
    if (!(await transaction.get(reference)).exists) {
      throw new HttpsError("not-found", "Vehicle not found.");
    }
    transaction.update(reference, {
      ...changes,
      updatedAt: Timestamp.now(),
      updatedBy: actorUid,
    });
  });
  return {id: reference.id};
};

module.exports = {execute};
