const {db} = require("../../../config");

const reference = (id) => db.collection("payments").doc(id);
const applications = (paymentReference) =>
  paymentReference.collection("applications");

module.exports = {applications, reference};
