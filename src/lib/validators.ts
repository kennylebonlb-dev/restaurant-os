import { z } from "zod";
import { tableFeatures } from "@/lib/domain";

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must use YYYY-MM-DD format."
});

export const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  message: "Time must use HH:mm format."
});

export const jsonObjectSchema = z
  .record(z.unknown())
  .default({})
  .catch({});

export const openingHoursSchema = z.record(
  z.object({
    open: timeStringSchema,
    close: timeStringSchema,
    closed: z.boolean().optional(),
    secondServiceEnabled: z.boolean().optional(),
    secondOpen: timeStringSchema.optional(),
    secondClose: timeStringSchema.optional()
  })
);

export const createRestaurantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default("Europe/Paris"),
  openingHours: openingHoursSchema,
  settings: z.record(z.unknown()).default({}),
  menu: z.array(z.record(z.unknown())).default([])
});

export const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  layoutLocked: z.boolean().optional(),
  imageKey: z.string().nullable().optional()
});

export const createTableSchema = z.object({
  label: z.string().min(1).max(24),
  capacity: z.coerce.number().int().min(1).max(40),
  zone: z.enum(["INDOOR", "TERRACE", "VIP"]).default("INDOOR"),
  positionX: z.coerce.number().min(0).default(120),
  positionY: z.coerce.number().min(0).default(120),
  rotation: z.coerce.number().min(0).max(359).default(0),
  active: z.boolean().default(true)
});

export const updateTableSchema = createTableSchema.partial();

export const availabilitySchema = z.object({
  date: dateStringSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema.optional(),
  numberOfGuests: z.coerce.number().int().min(1).max(40),
  tablePreferences: z.array(z.enum(tableFeatures)).default([])
});

export const createReservationSchema = availabilitySchema.extend({
  tableId: z.string().trim().min(1).optional(),
  autoAssignTable: z.boolean().default(false),
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  phone: z.string().trim().min(6, "Phone is required.").max(32),
  notes: z.string().trim().max(1000).optional()
});

export const createAdminReservationSchema = availabilitySchema.extend({
  userId: z.string().cuid(),
  tableId: z.string().trim().min(1).optional(),
  autoAssignTable: z.boolean().default(false),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().email().transform((email) => email.toLowerCase().trim()).optional(),
  phone: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED")
});

export const updateReservationSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  notes: z.string().max(1000).nullable().optional(),
  tableId: z.string().trim().min(1).nullable().optional()
});

export const createTableBlockSchema = z.object({
  date: dateStringSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  reason: z.enum(["MAINTENANCE", "ADMIN", "EVENT"])
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  phone: z.string().trim().min(6).max(32),
  password: z.string().min(8).max(128)
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  phone: z.string().trim().min(6).max(32)
});
