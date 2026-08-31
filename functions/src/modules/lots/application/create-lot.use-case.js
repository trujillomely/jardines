const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const {createLot} = require("../domain/lot.model");
const lots = require("../infrastructure/lots.repository");
const people = require("../../people/infrastructure/people.repository");

const execute = async (data, actorUid) => {
  const reference = lots.reference(data.id);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    if ((await transaction.get(reference)).exists) {
      throw new HttpsError(
          "already-exists", "A lot with this id already exists.");
    }
    let residentReference = null;
    if (data.currentResidentId) {
      residentReference = people.reference(data.currentResidentId);
      const resident = await transaction.get(residentReference);
      if (!resident.exists || resident.data().type !== "resident" ||
          resident.data().status !== "active") {
        throw new HttpsError("failed-precondition",
            "currentResidentId must be an active resident.");
      }
      const currentLot = await transaction.get(lots.findByResident(
          residentReference.id));
      if (resident.data().lotId || !currentLot.empty) {
        throw new HttpsError("failed-precondition",
            "The resident is already assigned to a lot.");
      }
    }
    transaction.create(reference, createLot(data, now, actorUid));
    if (residentReference) {
      transaction.update(residentReference, {
        lotId: reference.id,
        updatedAt: now,
        updatedBy: actorUid,
      });
    }
  });
  return {id: reference.id};
};

module.exports = {execute};
