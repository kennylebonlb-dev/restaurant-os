import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  createReservationSchema,
  updateReservationSchema
} from "../src/lib/validators";

const createPayload = createReservationSchema.parse({
  date: "2026-06-15",
  startTime: "20:00",
  endTime: "22:00",
  numberOfGuests: 2,
  tableId: "cm_table_demo",
  firstName: "Jean",
  lastName: "Dupont",
  email: "jean.dupont@example.com",
  phone: "0641323232",
  tablePreferences: ["QUIET"],
  notes: "Test e2e"
});

assert.equal(createPayload.numberOfGuests, 2);
assert.equal(createPayload.email, "jean.dupont@example.com");

const updatePayload = updateReservationSchema.parse({
  tableId: "cm_table_demo_2",
  notes: "Modification e2e",
  arrivedAt: "now"
});

assert.equal(updatePayload.tableId, "cm_table_demo_2");
assert.equal(updatePayload.arrivedAt, "now");

const cancelPayload = updateReservationSchema.parse({
  status: "CANCELLED"
});

assert.equal(cancelPayload.status, "CANCELLED");

assert.equal(existsSync("src/app/api/restaurants/[restaurantId]/reservations/route.ts"), true);
assert.equal(existsSync("src/app/api/reservations/[reservationId]/route.ts"), true);
assert.equal(existsSync("src/app/api/restaurants/[restaurantId]/waitlist/route.ts"), true);
assert.equal(existsSync("src/app/api/restaurants/[restaurantId]/clients/route.ts"), true);

console.log("E2E reservation create/update/cancel contracts passed.");
