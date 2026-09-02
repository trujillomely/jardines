const {Timestamp} = require("firebase-admin/firestore");
const people = require("../infrastructure/people.repository");
const {createPerson} = require("../domain/person.model");

const execute = async (data, actorUid) => {
  const personReference = people.reference(data.id);
  const now = Timestamp.now();
  await people.create(personReference, createPerson(data, now, actorUid));
  return {id: personReference.id};
};

module.exports = {execute};
