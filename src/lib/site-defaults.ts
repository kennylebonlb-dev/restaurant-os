import type { OpeningHours } from "@/lib/domain";

export function defaultOpeningHours(): OpeningHours {
  return {
    monday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    tuesday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    wednesday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    thursday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    friday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "23:00" },
    saturday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "23:00" },
    sunday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "21:00" }
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildRestaurantSlug(name: string, fallback?: string) {
  return slugify(name) || fallback || "restaurant";
}

export const defaultRestaurantSettings = {
  reservationDurationMinutes: 120,
  minimumLeadTimeEnabled: true,
  oneReservationPerTablePerService: true,
  strictCapacityMatching: true,
  layoutGridSize: 32
};
