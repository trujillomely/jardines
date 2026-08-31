const {callable} = require("../../../shared/callable");
const {registerPayment: parseRegisterPayment} =
    require("../../../shared/schemas");
const registerPayment = require("../application/register-payment.use-case");

exports.registerPayment = callable(
    ["admin", "treasurer"], async (data, request) => {
      data = parseRegisterPayment(data);
      return registerPayment.execute(data, request.auth.uid);
    });
