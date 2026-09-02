const {
  arrayOf, atLeastOne, boolean, documentId, enumOf, nonNegativeInteger,
  nullable, object,
  optional, positiveInteger, text,
} = require("./validators");

const createPerson = (data) => object(data, {
  id: documentId,
  type: enumOf(["resident", "vendor"]),
  firstName: text(100),
  lastName: optional(nullable(text(100))),
  phone: text(30),
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
  vendorMonthlyAmountCents: positiveInteger,
  vendorLateFeeCents: nonNegativeInteger,
});

const assignResidentToLot = (data) => object(data, {
  lotId: documentId,
  residentId: nullable(documentId),
});

const deactivatePerson = (data) => object(data, {
  personId: documentId,
  reason: text(500),
});

const updatePerson = (data) => atLeastOne([
  "firstName", "lastName", "phone", "serviceType",
])(object(data, {
  personId: documentId,
  firstName: optional(text(100)),
  lastName: optional(nullable(text(100))),
  phone: optional(text(30)),
  serviceType: optional(nullable(text(100))),
}, "data"), "data");

const updateLot = (data) => atLeastOne(["number", "address", "status"])(
    object(data, {
      lotId: documentId,
      number: optional(text(50)),
      address: optional(text(250)),
      status: optional(enumOf(["active", "inactive"])),
    }, "data"), "data");

const updateVehicle = (data) => atLeastOne([
  "type", "plate", "isAdditional", "permit",
])(object(data, {
  vehicleId: documentId,
  type: optional(enumOf(["car", "motorcycle"])),
  plate: optional(text(20)),
  isAdditional: optional(boolean),
  permit: optional((value, field) => object(value, {
    requiresExtraPayment: boolean,
    amountCents: nonNegativeInteger,
    validUntil: nullable(text(40)),
  }, field)),
}, "data"), "data");

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
  updateLot,
  updatePerson,
  updateVehicle,
  voidPayment,
};
