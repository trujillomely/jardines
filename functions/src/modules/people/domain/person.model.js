const createPerson = (data, now, createdBy) => ({
  type: data.type,
  firstName: data.firstName,
  lastName: data.lastName || null,
  phone: data.phone,
  authUid: data.authUid || null,
  lotId: null,
  serviceType: data.serviceType || null,
  status: "active",
  createdBy,
  createdAt: now,
  updatedBy: createdBy,
  updatedAt: now,
});

module.exports = {createPerson};
