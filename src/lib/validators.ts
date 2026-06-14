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
  timezone: z.string().optional(),
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
  highChair: z.boolean().default(false),
  birthday: z.boolean().default(false),
  romanticDinner: z.boolean().default(false),
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
  highChair: z.boolean().default(false),
  birthday: z.boolean().default(false),
  romanticDinner: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED")
});

export const updateReservationSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  notes: z.string().max(1000).nullable().optional(),
  tableId: z.string().trim().min(1).nullable().optional()
});

export const customerReservationUpdateSchema = z.object({
  date: dateStringSchema.optional(),
  startTime: timeStringSchema.optional(),
  numberOfGuests: z.coerce.number().int().min(1).max(40).optional(),
  tableId: z.string().trim().min(1).nullable().optional(),
  autoAssignTable: z.boolean().default(false).optional(),
  tablePreferences: z.array(z.enum(tableFeatures)).default([]).optional(),
  highChair: z.boolean().optional(),
  birthday: z.boolean().optional(),
  romanticDinner: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullable().optional()
});

export const createTableBlockSchema = z.object({
  date: dateStringSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  reason: z.enum(["MAINTENANCE", "ADMIN", "EVENT"]),
  customerFirstName: z.string().trim().max(80).optional(),
  customerLastName: z.string().trim().max(80).optional(),
  customerEmail: z.string().email().transform((email) => email.toLowerCase().trim()).optional(),
  customerPhone: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(1000).optional()
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  phone: z.string().trim().min(6).max(32),
  password: z.string().min(8).max(128)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase().trim())
});

export const resetPasswordSchema = forgotPasswordSchema.extend({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128)
});

export const guestReservationLookupSchema = z.object({
  referenceName: z.string().trim().min(2).max(180),
  phone: z.string().trim().min(6).max(32)
});

export const guestReservationRegisterSchema = guestReservationLookupSchema.extend({
  password: z.string().min(8).max(128)
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  phone: z.string().trim().min(6).max(32),
  birthDate: z.union([dateStringSchema, z.literal("")]).optional()
});

const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("data:image/") ||
      /^https?:\/\//.test(value),
    "Image must be a relative, data, or http URL."
  );

export const platformAdminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

export const platformBrandSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  logoUrl: imageUrlSchema,
  logoHeight: z.coerce.number().int().min(18).max(96).default(48),
  footerLogoUrl: imageUrlSchema,
  footerLogoHeight: z.coerce.number().int().min(18).max(96).default(32),
  marketingLogoUrl: imageUrlSchema,
  marketingLogoHeight: z.coerce.number().int().min(18).max(96).default(48),
  marketingFooterLogoUrl: imageUrlSchema,
  marketingFooterLogoHeight: z.coerce.number().int().min(18).max(96).default(32),
  loginVisualUrl: imageUrlSchema,
  faviconUrl: imageUrlSchema,
  logoAlt: z.string().trim().min(2).max(120),
  supportEmail: z
    .union([z.string().email().transform((email) => email.toLowerCase().trim()), z.literal("")])
    .optional()
});

const landingHrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("#") ||
      value.startsWith("mailto:") ||
      /^https?:\/\//.test(value),
    "Link must be an anchor, relative, mailto, or http URL."
  );

const platformLandingLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: landingHrefSchema
});

const landingImageSchema = z.union([imageUrlSchema, z.literal("")]);

const platformLandingTextBlockSchema = z.object({
  title: z.string().trim().min(1).max(160),
  text: z.string().trim().min(1).max(800),
  icon: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  order: z.coerce.number().int().min(1).max(999).optional(),
  visible: z.boolean().default(true).optional()
});

const platformLandingProofPointSchema = z.object({
  value: z.string().trim().min(1).max(24),
  label: z.string().trim().min(1).max(160)
});

const platformLandingPlanSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.string().trim().min(1).max(40),
  annualPrice: z.string().trim().min(1).max(40),
  highlight: z.string().trim().min(1).max(180),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  buttonLabel: z.string().trim().min(1).max(80).default("Demander une démo"),
  features: z.array(z.string().trim().min(1).max(160)).min(1).max(10)
});

const colorSchema = z
  .string()
  .trim()
  .refine((value) => value === "transparent" || /^#[0-9a-fA-F]{3,8}$/.test(value), "Invalid color.");

const platformLandingAppearanceSchema = z.object({
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
  buttonColor: colorSchema,
  textColor: colorSchema,
  backgroundColor: colorSchema,
  headingFont: z.string().trim().min(1).max(80),
  bodyFont: z.string().trim().min(1).max(80),
  buttonRadius: z.coerce.number().int().min(0).max(32),
  stylePreset: z.enum(["MODERN", "PREMIUM", "SOBER", "WARM"])
});

const platformLandingTypographySchema = z.object({
  heroTitleSize: z.coerce.number().int().min(42).max(96),
  heroSubtitleSize: z.coerce.number().int().min(14).max(28),
  sectionTitleSize: z.coerce.number().int().min(28).max(72),
  sectionTextSize: z.coerce.number().int().min(13).max(24),
  cardTitleSize: z.coerce.number().int().min(14).max(34),
  cardTextSize: z.coerce.number().int().min(12).max(22)
});

const platformLandingHeaderSchema = z.object({
  logoPosition: z.enum(["LEFT", "CENTER"]),
  menuLinks: z.array(platformLandingLinkSchema).min(1).max(8),
  primaryButtonLabel: z.string().trim().min(1).max(80),
  primaryButtonHref: landingHrefSchema,
  backgroundColor: colorSchema,
  sticky: z.boolean(),
  mobileMenuLabel: z.string().trim().min(1).max(40),
  height: z.coerce.number().int().min(56).max(120),
  logoSpacing: z.coerce.number().int().min(0).max(40)
});

const platformLandingSeoSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  keywords: z.string().trim().max(240),
  shareImageUrl: landingImageSchema,
  customUrl: z.string().trim().min(1).max(240)
});

const platformLandingGeneralSchema = z.object({
  siteName: z.string().trim().min(1).max(80),
  contactEmail: z.union([z.string().email().transform((email) => email.toLowerCase().trim()), z.literal("")]),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(240),
  facebookUrl: z.union([z.string().url(), z.literal("")]),
  instagramUrl: z.union([z.string().url(), z.literal("")]),
  linkedinUrl: z.union([z.string().url(), z.literal("")]),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().trim().min(1).max(240)
});

const platformLandingVisibleSectionsSchema = z.object({
  solution: z.boolean(),
  features: z.boolean(),
  dashboard: z.boolean(),
  pricing: z.boolean(),
  demo: z.boolean(),
  faq: z.boolean(),
  customBlocks: z.boolean()
});

const platformLandingCustomBlockSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(["TEXT", "IMAGE_TEXT", "FEATURE_CARD", "TESTIMONIAL", "FAQ", "PLAN", "CTA", "GALLERY", "VIDEO", "FORM"]),
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(180),
  text: z.string().trim().max(1000),
  imageUrl: landingImageSchema,
  icon: z.string().trim().max(80),
  buttonLabel: z.string().trim().max(80),
  buttonHref: landingHrefSchema,
  backgroundColor: colorSchema,
  alignment: z.enum(["LEFT", "CENTER", "RIGHT"]),
  visible: z.boolean(),
  order: z.coerce.number().int().min(1).max(999)
});

export const platformLandingSchema = z.object({
  appearance: platformLandingAppearanceSchema,
  header: platformLandingHeaderSchema,
  seo: platformLandingSeoSchema,
  general: platformLandingGeneralSchema,
  visibleSections: platformLandingVisibleSectionsSchema,
  customBlocks: z.array(platformLandingCustomBlockSchema).max(24),
  brandName: z.string().trim().min(1).max(80),
  typography: platformLandingTypographySchema,
  heroImageUrl: landingImageSchema,
  heroEyebrow: z.string().trim().min(1).max(180),
  heroTitle: z.string().trim().min(1).max(180),
  heroSubtitle: z.string().trim().min(1).max(800),
  primaryCtaLabel: z.string().trim().min(1).max(80),
  primaryCtaHref: landingHrefSchema,
  secondaryCtaLabel: z.string().trim().min(1).max(80),
  secondaryCtaHref: landingHrefSchema,
  demoCtaLabel: z.string().trim().min(1).max(80),
  demoCtaHref: landingHrefSchema,
  proofPoints: z.array(platformLandingProofPointSchema).min(1).max(6),
  solutionEyebrow: z.string().trim().min(1).max(80),
  solutionTitle: z.string().trim().min(1).max(220),
  workflow: z.array(z.string().trim().min(1).max(180)).min(1).max(6),
  featuresEyebrow: z.string().trim().min(1).max(80),
  featuresTitle: z.string().trim().min(1).max(220),
  featuresSubtitle: z.string().trim().min(1).max(800),
  features: z.array(platformLandingTextBlockSchema).min(1).max(12),
  dashboardEyebrow: z.string().trim().min(1).max(80),
  dashboardTitle: z.string().trim().min(1).max(220),
  dashboardCards: z.array(platformLandingTextBlockSchema).min(1).max(8),
  secondaryFeatures: z.array(platformLandingTextBlockSchema).min(1).max(8),
  pricingEyebrow: z.string().trim().min(1).max(80),
  pricingTitle: z.string().trim().min(1).max(220),
  pricingSubtitle: z.string().trim().min(1).max(800),
  annualDiscountLabel: z.string().trim().min(1).max(80),
  plans: z.array(platformLandingPlanSchema).min(1).max(4),
  demoEyebrow: z.string().trim().min(1).max(80),
  demoTitle: z.string().trim().min(1).max(220),
  demoSubtitle: z.string().trim().min(1).max(800),
  demoSteps: z.array(z.string().trim().min(1).max(140)).min(1).max(8),
  faqEyebrow: z.string().trim().min(1).max(80),
  faqTitle: z.string().trim().min(1).max(220),
  faqs: z.array(platformLandingTextBlockSchema).min(1).max(12),
  footerTagline: z.string().trim().min(1).max(220),
  footerCopyright: z.string().trim().min(1).max(180),
  legalLinks: z.array(platformLandingLinkSchema).min(1).max(8),
  solutionLinks: z.array(platformLandingLinkSchema).min(1).max(16),
  companyLinks: z.array(platformLandingLinkSchema).min(1).max(16)
});

const platformEmailTemplateSchema = z.object({
  enabled: z.boolean(),
  subject: z.string().trim().min(1).max(180),
  preheader: z.string().trim().max(220),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(3000),
  buttonLabel: z.string().trim().max(80),
  footerText: z.string().trim().max(500)
});

export const platformEmailSettingsSchema = z.object({
  senderName: z.string().trim().min(1).max(80),
  replyTo: z.union([z.string().email().transform((email) => email.toLowerCase().trim()), z.literal("")]),
  logoUrl: imageUrlSchema,
  logoHeight: z.coerce.number().int().min(18).max(120),
  backgroundColor: colorSchema,
  cardColor: colorSchema,
  accentColor: colorSchema,
  textColor: colorSchema,
  buttonTextColor: colorSchema,
  borderRadius: z.coerce.number().int().min(0).max(32),
  templates: z.object({
    registration: platformEmailTemplateSchema,
    passwordReset: platformEmailTemplateSchema,
    reservationConfirmation: platformEmailTemplateSchema,
    reservationUpdate: platformEmailTemplateSchema,
    reservationCancellation: platformEmailTemplateSchema,
    reservationReminder: platformEmailTemplateSchema
  })
});

export const createManagedRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(240).optional(),
  phone: z.string().trim().max(32).optional(),
  ownerEmail: z
    .union([z.string().email().transform((email) => email.toLowerCase().trim()), z.literal("")])
    .optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).optional()
});

export const updateManagedRestaurantSchema = createManagedRestaurantSchema.partial().extend({
  ownerFirstName: z.string().trim().max(80).optional(),
  ownerLastName: z.string().trim().max(80).optional(),
  ownerPhone: z.string().trim().max(32).optional(),
  ownerAddress: z.string().trim().max(240).optional(),
  subscriptionPlan: z.string().trim().max(80).optional(),
  subscriptionStatus: z.enum(["TRIAL", "ACTIVE", "PAUSED", "CANCELLED"]).optional(),
  subscriptionBilling: z.enum(["MONTHLY", "ANNUAL"]).optional(),
  subscriptionAmount: z.string().trim().max(40).optional(),
  subscriptionNextBillingDate: z.string().trim().max(40).optional(),
  billingStatus: z.enum(["PAID", "PENDING", "LATE", "FREE"]).optional(),
  billingPaidUntil: z.string().trim().max(40).optional(),
  billingLastPaymentDate: z.string().trim().max(40).optional(),
  billingNotes: z.string().trim().max(1000).optional(),
  platformUsers: z
    .array(
      z.object({
        role: z.enum(["OWNER", "MANAGER", "FLOOR_MANAGER", "WAITER"]),
        firstName: z.string().trim().max(80).optional(),
        lastName: z.string().trim().max(80).optional(),
        email: z
          .union([z.string().email().transform((email) => email.toLowerCase().trim()), z.literal("")])
          .optional(),
        phone: z.string().trim().max(32).optional()
      })
    )
    .max(24)
    .optional()
});
