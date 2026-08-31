const {callable} = require("../../../shared/callable");
const {createLot: parseCreateLot} = require("../../../shared/schemas");
const createLot = require("../application/create-lot.use-case");

exports.createLot = callable(["admin"], async (data, request) => {
  data = parseCreateLot(data);
  return createLot.execute(data, request.auth.uid);
});
