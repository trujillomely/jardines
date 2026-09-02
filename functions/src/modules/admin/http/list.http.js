const {adminGet} = require("../../../shared/admin-get");

exports.listPeople = adminGet("people", [
  {parameter: "type", field: "type"},
  {parameter: "status", field: "status"},
]);

exports.listLots = adminGet("lots", [
  {parameter: "status", field: "status"},
  {parameter: "residentId", field: "currentResidentId"},
]);

exports.listVehicles = adminGet("vehicles", [
  {parameter: "ownerId", field: "ownerId"},
  {parameter: "ownerType", field: "ownerType"},
  {parameter: "status", field: "status"},
]);

exports.listInvoices = adminGet("invoices", [
  {parameter: "personId", field: "personId"},
  {parameter: "period", field: "period"},
  {parameter: "status", field: "status"},
  {parameter: "concept", field: "concept"},
]);

exports.listPayments = adminGet("payments", [
  {parameter: "personId", field: "personId"},
  {parameter: "status", field: "status"},
]);

exports.listRates = adminGet("rates", [
  {parameter: "status", field: "status"},
]);
