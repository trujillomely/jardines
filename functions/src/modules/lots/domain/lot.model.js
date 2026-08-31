const createLot = (data, now, createdBy) => ({
  number: data.number,
  address: data.address,
  status: data.status,
  currentResidentId: data.currentResidentId || null,
  createdBy,
  createdAt: now,
  updatedBy: createdBy,
  updatedAt: now,
});

module.exports = {createLot};
