const {db} = require("../../../config");

const findActive = async () => {
  const snapshot = await db.collection("rates")
      .where("status", "==", "active").limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
};

const findAllActive = () => db.collection("rates")
    .where("status", "==", "active");
const reference = (id) => id ? db.collection("rates").doc(id) :
  db.collection("rates").doc();

module.exports = {findActive, findAllActive, reference};
