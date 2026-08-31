const {Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("../../../shared/callable");
const firestore = require("../../../shared/firestore.repository");
const {createRate} = require("../domain/rate.model");
const rates = require("../infrastructure/rates.repository");

const execute = async (data, actorUid) => {
  const reference = rates.reference(data.id);
  const now = Timestamp.now();
  await firestore.runTransaction(async (transaction) => {
    const [existingRate, activeRates] = await Promise.all([
      transaction.get(reference),
      transaction.get(rates.findAllActive()),
    ]);
    if (existingRate.exists) {
      throw new HttpsError(
          "already-exists", "A rate with this id already exists.");
    }
    activeRates.docs.forEach((rate) => {
      transaction.update(rate.ref, {status: "inactive", updatedAt: now});
    });
    transaction.create(reference, createRate(data, now, actorUid));
  });
  return {id: reference.id};
};

module.exports = {execute};
