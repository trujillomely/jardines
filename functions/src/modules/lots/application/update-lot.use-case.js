const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const lots = require("../infrastructure/lots.repository");

const execute = async (data, actorUid) => {
  const reference = lots.reference(data.lotId);
  const changes = Object.fromEntries(Object.entries(data).filter(
      ([key, value]) => key !== "lotId" && value !== undefined));
  await firestore.runTransaction(async (transaction) => {
    const lot = await transaction.get(reference);
    if (!lot.exists) throw new HttpsError("not-found", "Lot not found.");
    if (changes.status === "inactive" && lot.data().currentResidentId) {
      throw new HttpsError("failed-precondition",
          "Unassign the resident before deactivating a lot.");
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
