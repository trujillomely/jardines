const {Timestamp} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const people = require("../infrastructure/people.repository");
const {createPerson} = require("../domain/person.model");

const execute = async (data, actorUid) => {
  const personReference = people.reference(data.id);
  if (data.authUid) await getAuth().getUser(data.authUid);
  const now = Timestamp.now();
  await people.create(
      data.authUid, personReference, createPerson(data, now, actorUid));
  return {id: personReference.id};
};

module.exports = {execute};
