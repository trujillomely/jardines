const createRate = (data, now, createdBy) => ({
  status: "active",
  effectiveFrom: data.effectiveFrom,
  residentFee: data.residentFee,
  extraVehicle: data.extraVehicle,
  supplierSticker: data.supplierSticker,
  residentLateFee: data.residentLateFee,
  supplierLateFee: data.supplierLateFee,
  paymentDueDate: data.paymentDueDate,
  createdBy,
  createdAt: now,
  updatedAt: now,
});

module.exports = {createRate};
