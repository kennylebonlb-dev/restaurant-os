import assert from "node:assert/strict";
import { assertValidTimeRange, overlaps } from "../../lib/time";
import { createReservationSchema, updateReservationSchema } from "../../lib/validators";

assert.equal(overlaps("19:00", "21:00", "20:00", "22:00"), true);
assert.equal(overlaps("19:00", "21:00", "17:00", "19:00"), false);
assert.equal(overlaps("19:00", "21:00", "21:00", "22:00"), false);
assert.equal(overlaps("19:00", "21:00", "18:00", "20:00"), true);
assert.equal(overlaps("19:00", "21:00", "19:00", "21:00"), true);
assert.throws(() => assertValidTimeRange("21:00", "19:00"), /End time/);
assert.equal(
  createReservationSchema.parse({
    date: "2026-06-15",
    startTime: "20:00",
    numberOfGuests: 2,
    tableId: "seed_table_t1",
    firstName: "Client",
    lastName: "Demo",
    email: "client@example.com",
    phone: "+33600000000"
  }).tableId,
  "seed_table_t1"
);
assert.equal(updateReservationSchema.parse({ tableId: "seed_table_t1" }).tableId, "seed_table_t1");

console.log("Reservation overlap logic passed.");
