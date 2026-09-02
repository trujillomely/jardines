const {callable} = require("../../../shared/callable");
const {updatePerson: parseUpdatePerson} = require("../../../shared/schemas");
const updatePerson = require("../application/update-person.use-case");

exports.updatePerson = callable(["admin"], async (data, request) => {
  data = parseUpdatePerson(data);
  return updatePerson.execute(data, request.auth.uid);
});
