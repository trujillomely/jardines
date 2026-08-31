const {callable} = require("../../../shared/callable");
const {assignResidentToLot: parseAssignResidentToLot} =
    require("../../../shared/schemas");
const assignResidentToLot =
    require("../application/assign-resident-to-lot.use-case");

exports.assignResidentToLot = callable(["admin"], async (data, request) => {
  data = parseAssignResidentToLot(data);
  return assignResidentToLot.execute(data, request.auth.uid);
});
