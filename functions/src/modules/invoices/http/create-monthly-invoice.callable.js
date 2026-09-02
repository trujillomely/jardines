const {callable} = require("../../../shared/callable");
const {createMonthlyInvoice: parseCreateMonthlyInvoice} =
    require("../../../shared/schemas");
const createMonthlyInvoice =
    require("../application/create-monthly-invoice.use-case");

exports.createMonthlyInvoice = callable(["admin"], async (data) => {
  data = parseCreateMonthlyInvoice(data);
  return createMonthlyInvoice.execute(data);
});
