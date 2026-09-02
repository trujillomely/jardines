const {callable} = require("../../../shared/callable");
const {updateLot: parseUpdateLot} = require("../../../shared/schemas");
const updateLot = require("../application/update-lot.use-case");

exports.updateLot = callable(["admin"], async (data, request) => {
  data = parseUpdateLot(data);
  return updateLot.execute(data, request.auth.uid);
});
