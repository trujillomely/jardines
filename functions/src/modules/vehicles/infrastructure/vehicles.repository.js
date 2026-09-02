const {db} = require("../../../config");

const reference = (id) => db.collection("vehicles").doc(id);
const findActiveByOwner = (ownerId) => db.collection("vehicles")
    .where("ownerId", "==", ownerId).where("status", "==", "active");

module.exports = {findActiveByOwner, reference};
