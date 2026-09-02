const createVehicle = (data, validUntil, now, createdBy) => ({
  ownerId: data.ownerId,
  ownerType: data.ownerType,
  type: data.type,
  licensePlate: data.licensePlate,
  isExtra: Boolean(data.isExtra),
  label: {
    requiresExtraPayment: Boolean(
        data.label && data.label.requiresExtraPayment),
    amount: data.label && data.label.amount || 0,
    expiresOn: validUntil,
  },
  status: "active",
  createdBy,
  createdAt: now,
  updatedBy: createdBy,
  updatedAt: now,
});

module.exports = {createVehicle};
