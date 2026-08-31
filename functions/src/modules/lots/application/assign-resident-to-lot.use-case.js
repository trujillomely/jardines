const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const lots = require("../infrastructure/lots.repository");
const people = require("../../people/infrastructure/people.repository");

const execute = async (data, actorUid) => {
  const lotReference = lots.reference(data.lotId);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    const lot = await transaction.get(lotReference);
    if (!lot.exists || lot.data().status !== "active") {
      throw new HttpsError("failed-precondition", "lotId must be active.");
    }
    const previousResidentId = lot.data().currentResidentId;
    let residentReference = null;
    let previousLotReference = null;
    if (data.residentId) {
      residentReference = people.reference(data.residentId);
      const resident = await transaction.get(residentReference);
      if (!resident.exists || resident.data().type !== "resident" ||
          resident.data().status !== "active") {
        throw new HttpsError(
            "failed-precondition", "residentId must be an active resident.");
      }
      const previousLotId = resident.data().lotId;
      if (previousLotId && previousLotId !== data.lotId) {
        previousLotReference = lots.reference(previousLotId);
        const previousLot = await transaction.get(previousLotReference);
        if (!previousLot.exists ||
            previousLot.data().currentResidentId !== data.residentId) {
          throw new HttpsError(
              "failed-precondition", "The resident-lot link is inconsistent.");
        }
      }
    }
    let previousResidentReference = null;
    if (previousResidentId && previousResidentId !== data.residentId) {
      previousResidentReference = people.reference(previousResidentId);
      if (!(await transaction.get(previousResidentReference)).exists) {
        throw new HttpsError(
            "failed-precondition", "The lot-resident link is inconsistent.");
      }
    }
    transaction.update(lotReference, {
      currentResidentId: data.residentId,
      updatedAt: now,
      updatedBy: actorUid,
    });
    if (previousLotReference) {
      transaction.update(previousLotReference, {
        currentResidentId: null,
        updatedAt: now,
        updatedBy: actorUid,
      });
    }
    if (previousResidentReference) {
      transaction.update(previousResidentReference, {
        lotId: null,
        updatedAt: now,
        updatedBy: actorUid,
      });
    }
    if (residentReference) {
      transaction.update(residentReference, {
        lotId: lotReference.id,
        updatedAt: now,
        updatedBy: actorUid,
      });
    }
  });
  return {lotId: lotReference.id, residentId: data.residentId};
};

module.exports = {execute};
