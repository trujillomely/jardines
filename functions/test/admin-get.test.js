const assert = require("node:assert/strict");
const test = require("node:test");
const {serialize} = require("../src/shared/admin-get");

test("serializes Firestore timestamps for HTTP list responses", () => {
  const timestamp = {toDate: () => new Date("2026-09-02T12:00:00.000Z")};
  assert.deepEqual(serialize({createdAt: timestamp, nested: [timestamp]}), {
    createdAt: "2026-09-02T12:00:00.000Z",
    nested: ["2026-09-02T12:00:00.000Z"],
  });
});
