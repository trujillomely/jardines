const {callable} = require("../../../shared/callable");
const {createPerson: parseCreatePerson} = require("../../../shared/schemas");
const createPerson = require("../application/create-person.use-case");

exports.createPerson = callable(["admin"], async (data, request) => {
  data = parseCreatePerson(data);
  return createPerson.execute(data, request.auth.uid);
});
