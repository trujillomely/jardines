const {db} = require("../../../config");

const reference = (id) => db.collection("lots").doc(id);
const findActive = () => db.collection("lots").where("status", "==", "active")
    .get();
const findByResident = (personId) => db.collection("lots")
    .where("currentResidentId", "==", personId).limit(1);

module.exports = {findActive, findByResident, reference};
