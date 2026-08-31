const assert = require("node:assert/strict");
const test = require("node:test");
const {periodFor} =
    require("../src/modules/invoices/application/" +
        "generate-monthly-invoices.use-case");

test("monthly invoice period uses the scheduler instant consistently", () => {
  assert.equal(periodFor(new Date("2026-08-01T06:00:00.000Z")), "2026-08");
});
