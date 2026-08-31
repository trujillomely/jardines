const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const people = require("../infrastructure/people.repository");
const lots = require("../../lots/infrastructure/lots.repository");

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
