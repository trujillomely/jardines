const createVehicle = (data, validUntil, now, createdBy) => ({
  ownerId: data.ownerId,
  ownerType: data.ownerType,
  type: data.type,
  plate: data.plate,
  isAdditional: Boolean(data.isAdditional),
  permit: {
    requiresExtraPayment: Boolean(
        data.permit && data.permit.requiresExtraPayment),
    amountCents: data.permit && data.permit.amountCents || 0,
    validUntil,
  },
  status: "active",
  createdBy,
  createdAt: now,
  updatedBy: createdBy,
  updatedAt: now,
});

module.exports = {createVehicle};
