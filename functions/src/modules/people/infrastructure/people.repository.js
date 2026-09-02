const {db} = require("../../../config");
const {HttpsError} = require("../../../shared/callable");

const reference = (id) => db.collection("people").doc(id);
const findActiveVendors = () => db.collection("people")
    .where("type", "==", "vendor")
    .where("status", "==", "active").get();

const create = async (personReference, data) => {
  await db.runTransaction(async (transaction) => {
    const existingPerson = await transaction.get(personReference);
    if (existingPerson.exists) {
      throw new HttpsError(
          "already-exists", "A person with this id already exists.");
    }
    transaction.create(personReference, data);
  });
};

module.exports = {create, findActiveVendors, reference};
