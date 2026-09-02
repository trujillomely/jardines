const {setGlobalOptions} = require("firebase-functions/v2");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  timeoutSeconds: 60,
});

const {createPerson} =
    require("./src/modules/people/http/create-person.callable");
const {createLot} = require("./src/modules/lots/http/create-lot.callable");
const {assignResidentToLot} =
    require("./src/modules/lots/http/assign-resident-to-lot.callable");
const {registerVehicle} =
    require("./src/modules/vehicles/http/register-vehicle.callable");
const {deactivateVehicle} =
    require("./src/modules/vehicles/http/deactivate-vehicle.callable");
const {registerPayment} =
    require("./src/modules/payments/http/register-payment.callable");
const {voidPayment} =
    require("./src/modules/payments/http/void-payment.callable");
const {deactivatePerson} =
    require("./src/modules/people/http/deactivate-person.callable");
const {updatePerson} =
    require("./src/modules/people/http/update-person.callable");
const {updateLot} = require("./src/modules/lots/http/update-lot.callable");
const {updateVehicle} =
    require("./src/modules/vehicles/http/update-vehicle.callable");
const {setActiveRate} =
    require("./src/modules/rates/http/set-active-rate.callable");
const {generateMonthlyInvoices} =
    require("./src/modules/invoices/http/generate-monthly-invoices.scheduled");
const {applyOverdueFees} =
    require("./src/modules/invoices/http/apply-overdue-fees.scheduled");
const {createMonthlyInvoice} =
    require("./src/modules/invoices/http/create-monthly-invoice.callable");
const {adjustInvoice} =
    require("./src/modules/invoices/http/adjust-invoice.callable");
const {
  listInvoices, listLots, listPayments, listPeople, listRates, listVehicles,
} = require("./src/modules/admin/http/list.http");

exports.createPerson = createPerson;
exports.createLot = createLot;
exports.assignResidentToLot = assignResidentToLot;
exports.registerVehicle = registerVehicle;
exports.deactivateVehicle = deactivateVehicle;
exports.registerPayment = registerPayment;
exports.voidPayment = voidPayment;
exports.deactivatePerson = deactivatePerson;
exports.updatePerson = updatePerson;
exports.updateLot = updateLot;
exports.updateVehicle = updateVehicle;
exports.setActiveRate = setActiveRate;
exports.generateMonthlyInvoices = generateMonthlyInvoices;
exports.applyOverdueFees = applyOverdueFees;
exports.createMonthlyInvoice = createMonthlyInvoice;
exports.adjustInvoice = adjustInvoice;
exports.listPeople = listPeople;
exports.listLots = listLots;
exports.listVehicles = listVehicles;
exports.listInvoices = listInvoices;
exports.listPayments = listPayments;
exports.listRates = listRates;
