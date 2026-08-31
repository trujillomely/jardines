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

const callable = (allowedRoles, handler) => onCall(async (request) => {
  requireRole(request, allowedRoles);
  if (!request.data || Array.isArray(request.data) ||
      typeof request.data !== "object") {
    throw new HttpsError("invalid-argument", "data must be an object.");
  }
  return handler(request.data, request);
});

module.exports = {callable, HttpsError};
