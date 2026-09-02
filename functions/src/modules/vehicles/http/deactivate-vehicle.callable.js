const {callable} = require("../../../shared/callable");
const {deactivateVehicle: parseDeactivateVehicle} =
    require("../../../shared/schemas");
const deactivateVehicle =
    require("../application/deactivate-vehicle.use-case");

exports.deactivateVehicle = callable(["admin"], async (data, request) => {
  data = parseDeactivateVehicle(data);
  return deactivateVehicle.execute(data, request.auth.uid);
});
