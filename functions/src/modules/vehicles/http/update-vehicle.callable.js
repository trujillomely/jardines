const {callable} = require("../../../shared/callable");
const {updateVehicle: parseUpdateVehicle} = require("../../../shared/schemas");
const updateVehicle = require("../application/update-vehicle.use-case");

exports.updateVehicle = callable(["admin"], async (data, request) => {
  data = parseUpdateVehicle(data);
  return updateVehicle.execute(data, request.auth.uid);
});
