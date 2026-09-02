const createPerson = (data, now, createdBy) => ({
  type: data.type,
  firstName: data.firstName,
  lastName: data.lastName || null,
  phoneNumber: data.phoneNumber,
  address: data.address || null,
  lotId: null,
  serviceType: data.serviceType || null,
  status: "active",
  createdBy,
  createdAt: now,
  updatedBy: createdBy,
  updatedAt: now,
});

module.exports = {createPerson};
