import assert from "node:assert/strict";
import {
  clientSchema,
  notificationTemplateSchema,
  updateReservationSchema,
  waitlistEntrySchema
} from "../src/lib/validators";

const client = clientSchema.parse({
  firstName: "Jean",
  lastName: "Dupont",
  email: "JEAN@example.com",
  phone: "0641323232",
  birthday: "1990-06-15",
  allergies: "Arachides",
  preferences: ["Terrasse"],
  vip: true,
  noShowRisk: 20
});

assert.equal(client.email, "jean@example.com");
assert.equal(client.vip, true);

const waitlistEntry = waitlistEntrySchema.parse({
  date: "2026-06-15",
  requestedTime: "20:15",
  numberOfGuests: 4,
  firstName: "Nora",
  lastName: "Petit",
  email: "",
  phone: "0641323232",
  tablePreferences: ["QUIET"]
});

assert.equal(waitlistEntry.requestedTime, "20:15");
assert.deepEqual(waitlistEntry.tablePreferences, ["QUIET"]);

const template = notificationTemplateSchema.parse({
  key: "reservationConfirmation",
  channel: "EMAIL",
  subject: "Confirmation {{reservationReference}}",
  body: "Bonjour {{customerName}}",
  variables: ["customerName", "reservationReference"]
});

assert.equal(template.channel, "EMAIL");
assert.equal(template.enabled, true);

assert.equal(updateReservationSchema.parse({ arrivedAt: "now", noShow: false }).arrivedAt, "now");

console.log("Dashboard Live validators passed.");
