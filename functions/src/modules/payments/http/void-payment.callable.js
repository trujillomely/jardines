const {callable} = require("../../../shared/callable");
const {voidPayment: parseVoidPayment} = require("../../../shared/schemas");
const voidPayment = require("../application/void-payment.use-case");

exports.voidPayment = callable(["admin"], async (data, request) => {
  data = parseVoidPayment(data);
  return voidPayment.execute(data, request.auth.uid);
});
