const {adjustInvoice: parseAdjustInvoice} = require("../../../shared/schemas");
const {callable} = require("../../../shared/callable");
const adjustInvoice = require("../application/adjust-invoice.use-case");

exports.adjustInvoice = callable(["admin"], async (data, request) => {
  parseAdjustInvoice(data);
  return adjustInvoice.execute(data, request.auth.uid);
});
