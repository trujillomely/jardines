const {db} = require("../config");

const runTransaction = (handler) => db.runTransaction(handler);

module.exports = {runTransaction};
