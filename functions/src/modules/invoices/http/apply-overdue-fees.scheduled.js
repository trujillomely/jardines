const {onSchedule} = require("firebase-functions/v2/scheduler");
const applyOverdueFees =
    require("../application/apply-overdue-fees.use-case");

exports.applyOverdueFees = onSchedule({
  schedule: "15 0 * * *",
  timeZone: "America/Guatemala",
}, () => applyOverdueFees.execute());
