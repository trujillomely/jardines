const {callable} = require("../../../shared/callable");
const {setActiveRate: parseSetActiveRate} = require("../../../shared/schemas");
const setActiveRate = require("../application/set-active-rate.use-case");

exports.setActiveRate = callable(["admin"], async (data, request) => {
  data = parseSetActiveRate(data);
  return setActiveRate.execute(data, request.auth.uid);
});
