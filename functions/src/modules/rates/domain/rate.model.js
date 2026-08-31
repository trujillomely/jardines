const createRate = (data, now, createdBy) => ({
  status: "active",
  residentMonthlyAmountCents: data.residentMonthlyAmountCents,
  residentLateFeeCents: data.residentLateFeeCents,
  createdBy,
  createdAt: now,
  updatedAt: now,
});

module.exports = {createRate};
