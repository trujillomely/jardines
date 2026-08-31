const {db} = require("../../../config");
const {HttpsError} = require("../../../shared/callable");

const reference = (id) => db.collection("people").doc(id);

const create = async (authUid, personReference, data) => {
  await db.runTransaction(async (transaction) => {
    const reads = [transaction.get(personReference)];
    if (authUid) {
      reads.push(transaction.get(
          db.collection("people").where("authUid", "==", authUid).limit(1)));
    }
    const [existingPerson, existingAuthUid] = await Promise.all(reads);
    if (existingPerson.exists) {
      throw new HttpsError(
          "already-exists", "A person with this id already exists.");
    }
    if (existingAuthUid && !existingAuthUid.empty) {
      throw new HttpsError(
          "already-exists", "authUid is already linked to another person.");
    }
    transaction.create(personReference, data);
  });
};

module.exports = {create, reference};
