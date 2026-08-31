const {getAuth} = require("firebase-admin/auth");
const {callable} = require("../../../shared/callable");
const {setUserRole: parseSetUserRole} = require("../../../shared/schemas");

exports.setUserRole = callable(["admin"], async (data) => {
  data = parseSetUserRole(data);
  await getAuth().getUser(data.uid);
  await getAuth().setCustomUserClaims(data.uid, {role: data.role});
  return {uid: data.uid, role: data.role};
});
