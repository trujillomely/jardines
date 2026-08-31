const {Timestamp} = require("firebase-admin/firestore");

const timestampFromIsoDate = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid ISO date.`);
  }
  return Timestamp.fromDate(date);
};

module.exports = {timestampFromIsoDate};
