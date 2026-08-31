const {onSchedule} = require("firebase-functions/v2/scheduler");
const generateMonthlyInvoices =
    require("../application/generate-monthly-invoices.use-case");

exports.generateMonthlyInvoices = onSchedule({
  schedule: "0 0 1 * *",
  timeZone: "America/Guatemala",
}, () => generateMonthlyInvoices.execute());
