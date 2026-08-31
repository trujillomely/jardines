const {db} = require("../../../config");

const reference = (id) => db.collection("vehicles").doc(id);

module.exports = {reference};
