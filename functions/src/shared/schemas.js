const {
  arrayOf, boolean, documentId, enumOf, nonNegativeInteger, nullable, object,
  optional, positiveInteger, text,
} = require("./validators");

const createPerson = (data) => object(data, {
  id: documentId,
  type: enumOf(["resident", "vendor"]),
  firstName: text(100),
  lastName: optional(nullable(text(100))),
  phone: text(30),
  authUid: optional(nullable(text(128))),
  serviceType: optional(nullable(text(100))),
});

const createLot = (data) => object(data, {
  id: documentId,
  number: text(50),
  address: text(250),
  status: enumOf(["active", "inactive"]),
  currentResidentId: optional(nullable(documentId)),
});

const registerVehicle = (data) => object(data, {
  id: documentId,
  ownerId: documentId,
  ownerType: enumOf(["resident", "vendor"]),
  type: enumOf(["car", "motorcycle"]),
  plate: text(20),
  isAdditional: optional(boolean),
  permit: optional(nullable((value, field) => object(value, {
    requiresExtraPayment: optional(boolean),
    amountCents: optional(nonNegativeInteger),
    validUntil: optional(nullable(text(40))),
  }, field))),
});

const paymentApplication = (value, field) => object(value, {
  invoiceId: documentId,
  amountCents: positiveInteger,
}, field);

const registerPayment = (data) => object(data, {
  id: documentId,
  personId: documentId,
  totalAmountCents: positiveInteger,
  method: enumOf(["cash", "deposit", "transfer"]),
  applications: arrayOf(paymentApplication, {min: 1, max: 100}),
  bank: optional(nullable(text(100))),
  reference: optional(nullable(text(100))),
  receiptUrl: optional(nullable(text(2048))),
});

const setActiveRate = (data) => object(data, {
  id: optional(documentId),
  residentMonthlyAmountCents: positiveInteger,
  residentLateFeeCents: nonNegativeInteger,
});

const setUserRole = (data) => object(data, {
  uid: text(128),
  role: enumOf(["admin", "treasurer", "resident"]),
});

const assignResidentToLot = (data) => object(data, {
  lotId: documentId,
  residentId: nullable(documentId),
});

const deactivatePerson = (data) => object(data, {
  personId: documentId,
  reason: text(500),
});

const deactivateVehicle = (data) => object(data, {
  vehicleId: documentId,
  reason: text(500),
});

const voidPayment = (data) => object(data, {
  paymentId: documentId,
  reason: text(500),
});

module.exports = {
  assignResidentToLot,
  createLot,
  createPerson,
  deactivatePerson,
  deactivateVehicle,
  registerPayment,
  registerVehicle,
  setActiveRate,
  setUserRole,
  voidPayment,
};
