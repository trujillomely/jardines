const createRate = (data, now, createdBy) => ({
  status: "active",
  residentMonthlyAmountCents: data.residentMonthlyAmountCents,
  residentLateFeeCents: data.residentLateFeeCents,
  vendorMonthlyAmountCents: data.vendorMonthlyAmountCents,
  vendorLateFeeCents: data.vendorLateFeeCents,
  createdBy,
  createdAt: now,
  updatedAt: now,
});

module.exports = {createRate};
