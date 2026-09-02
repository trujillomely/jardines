const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const people = require("../infrastructure/people.repository");

const execute = async (data, actorUid) => {
  const reference = people.reference(data.personId);
  const changes = Object.fromEntries(Object.entries(data).filter(
      ([key, value]) => key !== "personId" && value !== undefined));
  await firestore.runTransaction(async (transaction) => {
    if (!(await transaction.get(reference)).exists) {
      throw new HttpsError("not-found", "Person not found.");
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
