const {callable} = require("../../../shared/callable");
const {deactivatePerson: parseDeactivatePerson} =
    require("../../../shared/schemas");
const deactivatePerson = require("../application/deactivate-person.use-case");

exports.deactivatePerson = callable(["admin"], async (data, request) => {
  data = parseDeactivatePerson(data);
  return deactivatePerson.execute(data, request.auth.uid);
});
