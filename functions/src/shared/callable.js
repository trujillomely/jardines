const {onCall, HttpsError} = require("firebase-functions/v2/https");

const requireRole = (request, allowedRoles) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  const role = request.auth.token.role;
  if (!allowedRoles.includes(role)) {
    throw new HttpsError("permission-denied", "Insufficient permissions.");
  }
};

const allowsInsecureLocalCalls = () =>
  process.env.FUNCTIONS_EMULATOR === "true" &&
  process.env.ALLOW_INSECURE_LOCAL_CALLS === "true";

const callable = (allowedRoles, handler) => onCall(async (request) => {
  const localRequest = allowsInsecureLocalCalls() && !request.auth ? {
    ...request,
    auth: {
      uid: "local-test-admin",
      token: {role: "admin"},
    },
  } : request;
  requireRole(localRequest, allowedRoles);
  if (!localRequest.data || Array.isArray(localRequest.data) ||
      typeof localRequest.data !== "object") {
    throw new HttpsError("invalid-argument", "data must be an object.");
  }
  return handler(localRequest.data, localRequest);
});

module.exports = {allowsInsecureLocalCalls, callable, HttpsError};
