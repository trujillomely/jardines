const {HttpsError} = require("./callable");

const invalid = (field, message) => {
  throw new HttpsError("invalid-argument", `${field} ${message}.`);
};

const object = (value, fields, field = "data") => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    invalid(field, "must be an object");
  }
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(fields, key)) invalid(`${field}.${key}`, "is unknown");
  }
  return Object.fromEntries(Object.entries(fields).map(([key, validator]) => {
    return [key, validator(value[key], `${field}.${key}`)];
  }));
};

const optional = (validator) => (value, field) => {
  return value === undefined ? undefined : validator(value, field);
};

const nullable = (validator) => (value, field) => {
  return value === null ? null : validator(value, field);
};

const text = (maxLength = 500) => (value, field) => {
  if (typeof value !== "string" || value.trim() === "" ||
      value.length > maxLength) invalid(field, "is invalid");
  return value.trim();
};

const documentId = (value, field) => {
  if (typeof value !== "string" || value.trim() === "" ||
      value.trim() !== value || value.includes("/") || value.length > 1500) {
    invalid(field, "is invalid");
  }
  return value;
};

const yearMonth = (value, field) => {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    invalid(field, "must use YYYY-MM format");
  }
  return value;
};

const enumOf = (values) => (value, field) => {
  if (!values.includes(value)) invalid(field, "is invalid");
  return value;
};

const positiveInteger = (value, field) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    invalid(field, "must be a positive integer");
  }
  return value;
};

const nonNegativeInteger = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    invalid(field, "must be a non-negative integer");
  }
  return value;
};

const dayOfMonth = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > 28) {
    invalid(field, "must be an integer between 1 and 28");
  }
  return value;
};

const boolean = (value, field) => {
  if (typeof value !== "boolean") invalid(field, "must be a boolean");
  return value;
};

const arrayOf = (validator, {min = 0, max = 100} = {}) => (value, field) => {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    invalid(field, "has an invalid number of elements");
  }
  return value.map((item, index) => validator(item, `${field}[${index}]`));
};

const atLeastOne = (keys) => (value, field) => {
  if (!keys.some((key) => value[key] !== undefined)) {
    invalid(field, "must include at least one editable field");
  }
  return value;
};

module.exports = {
  atLeastOne,
  arrayOf,
  boolean,
  documentId,
  dayOfMonth,
  enumOf,
  nonNegativeInteger,
  nullable,
  object,
  optional,
  positiveInteger,
  text,
  yearMonth,
};
