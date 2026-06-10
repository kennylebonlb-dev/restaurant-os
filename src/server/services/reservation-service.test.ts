import assert from "node:assert/strict";
import { assertValidTimeRange, overlaps } from "../../lib/time";

assert.equal(overlaps("19:00", "21:00", "20:00", "22:00"), true);
assert.equal(overlaps("19:00", "21:00", "17:00", "19:00"), false);
assert.equal(overlaps("19:00", "21:00", "21:00", "22:00"), false);
assert.equal(overlaps("19:00", "21:00", "18:00", "20:00"), true);
assert.equal(overlaps("19:00", "21:00", "19:00", "21:00"), true);
assert.throws(() => assertValidTimeRange("21:00", "19:00"), /End time/);

console.log("Reservation overlap logic passed.");
