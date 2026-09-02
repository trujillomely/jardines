const {getAuth} = require("firebase-admin/auth");
const {FieldPath} = require("firebase-admin/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const {db} = require("../config");
const {allowsInsecureLocalCalls} = require("./callable");

const serialize = (value) => {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      return [key, serialize(item)];
    }));
  }
  return value;
};

const limitFrom = (value) => {
  if (value === undefined) return 50;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  return limit;
};

const authenticateAdmin = async (request) => {
  if (allowsInsecureLocalCalls()) return;
  const authorization = request.get("authorization") || "";
  const match = /^Bearer (.+)$/.exec(authorization);
  if (!match) {
    const error = new Error("Authentication is required.");
    error.status = 401;
    throw error;
  }
  const decoded = await getAuth().verifyIdToken(match[1]);
  if (decoded.role !== "admin") {
    const error = new Error("Insufficient permissions.");
    error.status = 403;
    throw error;
  }
};

const listCollection = async (collection, filters, request) => {
  let query = db.collection(collection);
  filters.forEach(({parameter, field}) => {
    const value = request.query[parameter];
    if (typeof value === "string" && value !== "") {
      query = query.where(field, "==", value);
    }
  });
  query = query.orderBy(FieldPath.documentId());
  const pageToken = request.query.pageToken;
  if (typeof pageToken === "string" && pageToken !== "") {
    query = query.startAfter(pageToken);
  }
  const limit = limitFrom(request.query.limit);
  const snapshot = await query.limit(limit + 1).get();
  const documents = snapshot.docs.slice(0, limit).map((document) => ({
    id: document.id,
    ...serialize(document.data()),
  }));
  return {
    documents,
    nextPageToken: snapshot.size > limit ? documents[documents.length - 1].id :
      null,
  };
};

const adminGet = (collection, filters) => onRequest(
    async (request, response) => {
      if (request.method !== "GET") {
        response.status(405).json({error: "Method must be GET."});
        return;
      }
      try {
        await authenticateAdmin(request);
        response.json(await listCollection(collection, filters, request));
      } catch (error) {
        response.status(error.status || 400).json({error: error.message});
      }
    });

module.exports = {adminGet, serialize};
