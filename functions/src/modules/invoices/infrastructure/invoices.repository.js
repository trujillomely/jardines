const {db} = require("../../../config");

const reference = (id) => db.collection("invoices").doc(id);
const referenceForMonthlyInvoice = (personId, period) =>
  reference(`${personId}_${period}`);

const findOverdue = (now) => db.collection("invoices")
    .where("status", "in", ["pending", "partial"])
    .where("dueDate", "<", now).get();

const findMissing = async (entries) => {
  const snapshots = await db.getAll(...entries.map((entry) => entry.reference));
  return entries.filter((entry, index) => !snapshots[index].exists);
};

const createMany = async (entries) => {
  let batch = db.batch();
  let operations = 0;
  const commit = async () => {
    if (operations > 0) await batch.commit();
    batch = db.batch();
    operations = 0;
  };
  for (const entry of entries) {
    batch.create(entry.reference, entry.data);
    operations += 1;
    if (operations === 450) await commit();
  }
  await commit();
};

module.exports = {
  createMany,
  findMissing,
  findOverdue,
  reference,
  referenceForMonthlyInvoice,
};
