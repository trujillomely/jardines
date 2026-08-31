const {callable} = require("../../../shared/callable");
const {registerVehicle: parseRegisterVehicle} =
    require("../../../shared/schemas");
const registerVehicle = require("../application/register-vehicle.use-case");

exports.registerVehicle = callable(
    ["admin", "treasurer"], async (data, request) => {
      data = parseRegisterVehicle(data);
      return registerVehicle.execute(data, request.auth.uid);
    });
