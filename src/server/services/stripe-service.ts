import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { NotFoundError } from "@/server/errors";

type JsonRecord = Record<string, unknown>;
type BillingCycle = "MONTHLY" | "QUARTERLY" | "ANNUAL";
type Commitment = "NONE" | "TWELVE_MONTHS";
type StripePlanName = "Essentiel" | "Pro" | "Signature";

const planCatalog: Record<StripePlanName, {
  description: string;
  features: string[];
  modelingFeeCents: number;
  prices: Record<BillingCycle, {
    amountCents: number;
    interval: "month" | "year";
    intervalCount: number;
  }>;
  pricesWithCommitment: Record<BillingCycle, {
    amountCents: number;
    interval: "month" | "year";
    intervalCount: number;
  }>;
}> = {
  Essentiel: {
    description: "Site restaurant, réservations en ligne 24/7 et confirmations email.",
    features: ["Site vitrine", "Réservations 24/7", "Intégration Google et réseaux", "Emails de confirmation"],
    modelingFeeCents: 39000,
    prices: {
      MONTHLY: { amountCents: 4900, interval: "month", intervalCount: 1 },
      QUARTERLY: { amountCents: 13500, interval: "month", intervalCount: 3 },
      ANNUAL: { amountCents: 46800, interval: "year", intervalCount: 1 }
    },
    pricesWithCommitment: {
      MONTHLY: { amountCents: 3900, interval: "month", intervalCount: 1 },
      QUARTERLY: { amountCents: 11700, interval: "month", intervalCount: 3 },
      ANNUAL: { amountCents: 46800, interval: "year", intervalCount: 1 }
    }
  },
  Pro: {
    description: "Plan 2D/3D, rappels SMS/email, CRM, waitlist et statistiques avancées.",
    features: ["Tout Essentiel", "Plan 2D/3D", "SMS et emails", "CRM clients", "Statistiques avancées"],
    modelingFeeCents: 59000,
    prices: {
      MONTHLY: { amountCents: 8900, interval: "month", intervalCount: 1 },
      QUARTERLY: { amountCents: 23700, interval: "month", intervalCount: 3 },
      ANNUAL: { amountCents: 82800, interval: "year", intervalCount: 1 }
    },
    pricesWithCommitment: {
      MONTHLY: { amountCents: 6900, interval: "month", intervalCount: 1 },
      QUARTERLY: { amountCents: 20700, interval: "month", intervalCount: 3 },
      ANNUAL: { amountCents: 82800, interval: "year", intervalCount: 1 }
    }
  },
  Signature: {
    description: "Pour groupes, multi-sites et besoins premium avec accompagnement dédié.",
    features: ["Multi-restaurants", "Reporting avancé", "Automatisations", "Accompagnement dédié"],
    modelingFeeCents: 0,
    prices: {
      MONTHLY: { amountCents: 14900, interval: "month", intervalCount: 1 },
      QUARTERLY: { amountCents: 40230, interval: "month", intervalCount: 3 },
      ANNUAL: { amountCents: 143040, interval: "year", intervalCount: 1 }
    },
    pricesWithCommitment: {
      MONTHLY: { amountCents: 14900, interval: "month", intervalCount: 1 },
      QUARTERLY: { amountCents: 40230, interval: "month", intervalCount: 3 },
      ANNUAL: { amountCents: 143040, interval: "year", intervalCount: 1 }
    }
  }
};

const defaultMonthlyAmountCents = 7900;
const defaultAnnualDiscount = 0.15;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function amountToCents(value: unknown, cycle: BillingCycle) {
  const parsed = readNumber(value);

  if (parsed !== null) {
    return Math.max(100, Math.round(parsed * 100));
  }

  if (cycle === "ANNUAL") {
    return Math.round(defaultMonthlyAmountCents * 12 * (1 - defaultAnnualDiscount));
  }

  return defaultMonthlyAmountCents;
}

function billingCycleFromSettings(subscription: JsonRecord, settings: JsonRecord): BillingCycle {
  const rawCycle = readString(subscription.billing) || readString(settings.billingCycle);
  const normalized = rawCycle.toUpperCase();

  if (normalized.includes("TRIM") || normalized.includes("QUART") || normalized === "QUARTERLY") {
    return "QUARTERLY";
  }

  return normalized.includes("ANNU") || normalized === "YEARLY" ? "ANNUAL" : "MONTHLY";
}

function normalizeStripePlanName(planName: string): StripePlanName {
  const normalized = planName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("essentiel")) {
    return "Essentiel";
  }

  if (normalized.includes("signature")) {
    return "Signature";
  }

  return "Pro";
}

function planFromSettings(settings: JsonRecord) {
  const subscription = isRecord(settings.subscription) ? settings.subscription : {};
  const planName =
    readString(subscription.plan) ||
    readString(settings.subscriptionPlan) ||
    "ToqueTop Pro";
  const billingCycle = billingCycleFromSettings(subscription, settings);
  const normalizedPlanName = normalizeStripePlanName(planName);
  const catalogPlan = planCatalog[normalizedPlanName];
  const catalogPrice = catalogPlan.prices[billingCycle];
  const amountCents = catalogPrice?.amountCents ?? amountToCents(subscription.amount ?? settings.subscriptionAmount, billingCycle);

  return {
    amountCents,
    billingCycle,
    interval: catalogPrice?.interval ?? (billingCycle === "ANNUAL" ? "year" as const : "month" as const),
    intervalCount: catalogPrice?.intervalCount ?? (billingCycle === "QUARTERLY" ? 3 : 1),
    lookupKey: stripePriceLookupKey(planName, billingCycle),
    planName: normalizedPlanName,
    subscription
  };
}

function stripePlanSlug(planName: string) {
  const normalized = planName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("essentiel")) {
    return "essentiel";
  }

  if (normalized.includes("pro")) {
    return "pro";
  }

  if (normalized.includes("signature")) {
    return "signature";
  }

  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "pro";
}

function stripePriceLookupKey(planName: string, billingCycle: BillingCycle, commitment: Commitment = "NONE") {
  const cycle = billingCycle === "ANNUAL" ? "annual" : billingCycle === "QUARTERLY" ? "quarterly" : "monthly";
  const suffix = commitment === "TWELVE_MONTHS" ? "_12m" : "";

  return `toquetop_${stripePlanSlug(planName)}_${cycle}${suffix}`;
}

async function findConfiguredStripePrice(stripe: Stripe, lookupKey: string) {
  const prices = await stripe.prices.list({
    active: true,
    limit: 1,
    lookup_keys: [lookupKey]
  });

  return prices.data[0] ?? null;
}

function planSelection(input: {
  billingCycle?: BillingCycle;
  commitment?: Commitment;
  planName?: StripePlanName;
}, fallbackSettings?: JsonRecord) {
  const fallbackPlan = fallbackSettings ? planFromSettings(fallbackSettings) : null;
  const planName = input.planName ?? fallbackPlan?.planName ?? "Pro";
  const billingCycle = input.billingCycle ?? fallbackPlan?.billingCycle ?? "MONTHLY";
  const commitment = input.commitment ?? "NONE";

  const catalog = planCatalog[planName];
  const price = commitment === "TWELVE_MONTHS"
    ? catalog.pricesWithCommitment[billingCycle]
    : catalog.prices[billingCycle];

  return {
    billingCycle,
    commitment,
    description: catalog.description,
    interval: price.interval,
    intervalCount: price.intervalCount,
    lookupKey: stripePriceLookupKey(planName, billingCycle, commitment),
    modelingFeeCents: commitment === "TWELVE_MONTHS" ? 0 : catalog.modelingFeeCents,
    planName,
    recurringAmountCents: price.amountCents
  };
}

async function lineItemsForPlan(input: {
  billingCycle?: BillingCycle;
  commitment?: Commitment;
  planName?: StripePlanName;
  restaurantId: string;
  settings?: JsonRecord;
  stripe: Stripe;
}) {
  const selectedPlan = planSelection(input, input.settings);
  const configuredPrice = selectedPlan.lookupKey
    ? await findConfiguredStripePrice(input.stripe, selectedPlan.lookupKey)
    : null;

  const recurringLineItem: Stripe.Checkout.SessionCreateParams.LineItem = configuredPrice
    ? {
        price: configuredPrice.id,
        quantity: 1
      }
    : {
        price_data: {
          currency: "eur",
          product_data: {
            metadata: {
              restaurantId: input.restaurantId,
              toquetopPlan: selectedPlan.planName
            },
            name: `ToqueTop - ${selectedPlan.planName}`
          },
          recurring: {
            interval: selectedPlan.interval,
            interval_count: selectedPlan.intervalCount
          },
          unit_amount: selectedPlan.recurringAmountCents
        },
        quantity: 1
      };
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [recurringLineItem];

  if (selectedPlan.modelingFeeCents > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          metadata: {
            restaurantId: input.restaurantId,
            toquetopFee: "modeling"
          },
          name: `Frais de modélisation 2D/3D - ${selectedPlan.planName}`
        },
        unit_amount: selectedPlan.modelingFeeCents
      },
      quantity: 1
    });
  }

  return {
    lineItems,
    selectedPlan
  };
}

function isMissingStripeCustomer(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    param?: unknown;
    statusCode?: unknown;
  };
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const missingCustomer = message.includes("No such customer");

  return (
    missingCustomer ||
    (candidate.code === "resource_missing" && (candidate.param === "customer" || candidate.param === "id"))
  );
}

async function retrieveReusableStripeCustomer(stripe: Stripe, customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);

    if ("deleted" in customer && customer.deleted) {
      return null;
    }

    return customer;
  } catch (error) {
    if (isMissingStripeCustomer(error)) {
      return null;
    }

    throw error;
  }
}

function splitStripeFeatures(value: unknown, fallback: string[]) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value
    .split(/[|\n;]/)
    .map((feature) => feature.trim())
    .filter(Boolean);
}

type StripeCatalogPrice = {
  amountCents: number;
  currency: string;
  interval: string;
  intervalCount: number;
  lookupKey: string;
  stripePriceId: string | null;
};

export async function getStripePlanCatalog() {
  const stripe = getStripeClient();
  const plans = await Promise.all((Object.keys(planCatalog) as StripePlanName[]).map(async (planName) => {
    const fallback = planCatalog[planName];
    const productSearch = await stripe.products.list({
      active: true,
      limit: 100
    });
    const product = productSearch.data.find((candidate) => {
      const planMetadata = candidate.metadata?.toquetop_plan || candidate.metadata?.toquetopPlan || "";
      return normalizeStripePlanName(planMetadata || candidate.name || "") === planName;
    }) ?? null;
    const prices: Record<Commitment, Record<BillingCycle, StripeCatalogPrice>> = {
      NONE: {} as Record<BillingCycle, StripeCatalogPrice>,
      TWELVE_MONTHS: {} as Record<BillingCycle, StripeCatalogPrice>
    };

    for (const commitment of ["NONE", "TWELVE_MONTHS"] as Commitment[]) {
      for (const billingCycle of ["MONTHLY", "QUARTERLY", "ANNUAL"] as BillingCycle[]) {
        const lookupKey = stripePriceLookupKey(planName, billingCycle, commitment);
        const stripePrice = await findConfiguredStripePrice(stripe, lookupKey);
        const fallbackPrice = commitment === "TWELVE_MONTHS"
          ? fallback.pricesWithCommitment[billingCycle]
          : fallback.prices[billingCycle];

        prices[commitment][billingCycle] = {
          amountCents: stripePrice?.unit_amount ?? fallbackPrice.amountCents,
          currency: stripePrice?.currency ?? "eur",
          interval: stripePrice?.recurring?.interval ?? fallbackPrice.interval,
          intervalCount: stripePrice?.recurring?.interval_count ?? fallbackPrice.intervalCount,
          lookupKey,
          stripePriceId: stripePrice?.id ?? null
        };
      }
    }

    return {
      description: product?.description || fallback.description,
      displayName: product?.name || `ToqueTop ${planName}`,
      features: splitStripeFeatures(product?.metadata?.features, fallback.features),
      modelingFeeCents: fallback.modelingFeeCents,
      name: planName,
      prices,
      stripeProductId: product?.id ?? null
    };
  }));

  return plans;
}

function publicAppUrl(requestUrl?: string) {
  if (requestUrl) {
    const requestOrigin = new URL(requestUrl).origin;

    if (!requestOrigin.includes("localhost")) {
      return requestOrigin;
    }
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

function stripeStatusToAppStatus(status?: string | null) {
  if (status === "active" || status === "trialing" || status === "complete" || status === "paid") {
    return "ACTIVE";
  }

  if (status === "past_due" || status === "unpaid") {
    return "PAST_DUE";
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return "CANCELED";
  }

  return status ? status.toUpperCase() : "PENDING";
}

function isoDateFromUnixSeconds(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString().slice(0, 10)
    : null;
}

function addMonthsToIsoDate(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate.toISOString().slice(0, 10);
}

function commitmentEndDateFromMetadata(commitment?: string | null, createdAt?: number | null) {
  if (commitment !== "TWELVE_MONTHS") {
    return null;
  }

  return addMonthsToIsoDate(createdAt ? new Date(createdAt * 1000) : new Date(), 12);
}

async function updateRestaurantSettings(restaurantId: string, updater: (settings: JsonRecord) => JsonRecord) {
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: restaurantId
    },
    select: {
      settings: true
    }
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant not found.");
  }

  const settings = isRecord(restaurant.settings) ? restaurant.settings : {};
  const nextSettings = updater(settings);

  await prisma.restaurant.update({
    where: {
      id: restaurantId
    },
    data: {
      settings: nextSettings as Prisma.InputJsonValue
    }
  });

  return nextSettings;
}

async function findRestaurantByStripeCustomer(customerId: string) {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      settings: true
    }
  });

  return restaurants.find((restaurant) => {
    const settings = isRecord(restaurant.settings) ? restaurant.settings : {};
    const subscription = isRecord(settings.subscription) ? settings.subscription : {};

    return readString(subscription.stripeCustomerId) === customerId;
  });
}

export async function ensureStripeCustomer(restaurantId: string) {
  const stripe = getStripeClient();
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: restaurantId
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      settings: true,
      owner: {
        select: {
          contactEmail: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          phone: true
        }
      }
    }
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant not found.");
  }

  const settings = isRecord(restaurant.settings) ? restaurant.settings : {};
  const subscription = isRecord(settings.subscription) ? settings.subscription : {};
  const existingCustomerId = readString(subscription.stripeCustomerId);

  if (existingCustomerId) {
    const existingCustomer = await retrieveReusableStripeCustomer(stripe, existingCustomerId);

    if (existingCustomer) {
      return existingCustomerId;
    }
  }

  const ownerName =
    [restaurant.owner?.firstName, restaurant.owner?.lastName].filter(Boolean).join(" ").trim() ||
    restaurant.owner?.name ||
    restaurant.name;
  const customer = await stripe.customers.create({
    email: restaurant.owner?.contactEmail || restaurant.owner?.email || undefined,
    metadata: {
      restaurantId: restaurant.id
    },
    name: ownerName,
    phone: restaurant.owner?.phone || restaurant.phone || undefined
  });

  await updateRestaurantSettings(restaurantId, (currentSettings) => {
    const currentSubscription = isRecord(currentSettings.subscription) ? currentSettings.subscription : {};
    const { stripeSubscriptionId: _stripeSubscriptionId, ...subscriptionWithoutPreviousStripeSubscription } = currentSubscription;

    return {
      ...currentSettings,
      subscription: {
        ...subscriptionWithoutPreviousStripeSubscription,
        stripeCustomerId: customer.id
      }
    };
  });

  return customer.id;
}

export async function createSubscriptionCheckoutSession(input: {
  billingCycle?: BillingCycle;
  commitment?: Commitment;
  planName?: StripePlanName;
  restaurantId: string;
  requestUrl: string;
}) {
  const stripe = getStripeClient();
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: input.restaurantId
    },
    select: {
      id: true,
      name: true,
      settings: true
    }
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant not found.");
  }

  const settings = isRecord(restaurant.settings) ? restaurant.settings : {};
  const customerId = await ensureStripeCustomer(restaurant.id);
  const appUrl = publicAppUrl(input.requestUrl);
  const { lineItems, selectedPlan } = await lineItemsForPlan({
    billingCycle: input.billingCycle,
    commitment: input.commitment,
    planName: input.planName,
    restaurantId: restaurant.id,
    settings,
    stripe
  });

  const session = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    cancel_url: `${appUrl}/admin?section=subscription&stripe=cancelled`,
    customer: customerId,
    line_items: lineItems,
    metadata: {
      billingCycle: selectedPlan.billingCycle,
      commitment: selectedPlan.commitment,
      planName: selectedPlan.planName,
      restaurantId: restaurant.id
    },
    mode: "subscription",
    subscription_data: {
      metadata: {
        billingCycle: selectedPlan.billingCycle,
        commitment: selectedPlan.commitment,
        planName: selectedPlan.planName,
        restaurantId: restaurant.id
      }
    },
    success_url: `${appUrl}/admin?section=subscription&stripe=success&session_id={CHECKOUT_SESSION_ID}`
  });

  return {
    url: session.url
  };
}

export async function createEmbeddedSubscriptionCheckoutSession(input: {
  billingCycle?: BillingCycle;
  commitment?: Commitment;
  planName?: StripePlanName;
  restaurantId: string;
  requestUrl: string;
}) {
  const stripe = getStripeClient();
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: input.restaurantId
    },
    select: {
      id: true,
      settings: true
    }
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant not found.");
  }

  const settings = isRecord(restaurant.settings) ? restaurant.settings : {};
  const customerId = await ensureStripeCustomer(restaurant.id);
  const appUrl = publicAppUrl(input.requestUrl);
  const { lineItems, selectedPlan } = await lineItemsForPlan({
    billingCycle: input.billingCycle,
    commitment: input.commitment,
    planName: input.planName,
    restaurantId: restaurant.id,
    settings,
    stripe
  });

  const session = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer: customerId,
    line_items: lineItems,
    metadata: {
      billingCycle: selectedPlan.billingCycle,
      commitment: selectedPlan.commitment,
      planName: selectedPlan.planName,
      restaurantId: restaurant.id
    },
    mode: "subscription",
    return_url: `${appUrl}/admin?section=subscription&stripe=embedded-success&session_id={CHECKOUT_SESSION_ID}`,
    subscription_data: {
      metadata: {
        billingCycle: selectedPlan.billingCycle,
        commitment: selectedPlan.commitment,
        planName: selectedPlan.planName,
        restaurantId: restaurant.id
      }
    },
    ui_mode: "embedded_page"
  });

  return {
    clientSecret: session.client_secret
  };
}

export async function createBillingPortalSession(input: {
  restaurantId: string;
  requestUrl: string;
}) {
  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer(input.restaurantId);
  const appUrl = publicAppUrl(input.requestUrl);
  const configuration = readString(process.env.STRIPE_PORTAL_CONFIGURATION_ID);
  const session = await stripe.billingPortal.sessions.create({
    ...(configuration ? { configuration } : {}),
    customer: customerId,
    return_url: `${appUrl}/admin?section=subscription&stripe=portal`
  });

  return {
    url: session.url
  };
}

export async function listStripeInvoices(restaurantId: string) {
  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer(restaurantId);
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 12
  });

  return invoices.data.map((invoice) => ({
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    id: invoice.id,
    invoicePdf: invoice.invoice_pdf,
    number: invoice.number,
    status: invoice.status
  }));
}

async function updateSubscriptionFromStripe(input: {
  billingCycle?: string;
  commitment?: string;
  commitmentEndDate?: string | null;
  customerId?: string | null;
  nextBillingDate?: string | null;
  planName?: string | null;
  restaurantId: string;
  status?: string | null;
  subscriptionId?: string | null;
}) {
  await updateRestaurantSettings(input.restaurantId, (settings) => {
    const subscription = isRecord(settings.subscription) ? settings.subscription : {};

    return {
      ...settings,
      subscription: {
        ...subscription,
        ...(input.billingCycle ? { billing: input.billingCycle } : {}),
        ...(input.commitment ? { commitment: input.commitment } : {}),
        ...(input.commitmentEndDate ? { commitmentEndDate: input.commitmentEndDate } : {}),
        ...(input.customerId ? { stripeCustomerId: input.customerId } : {}),
        ...(input.nextBillingDate ? { nextBillingDate: input.nextBillingDate } : {}),
        ...(input.planName ? { plan: input.planName } : {}),
        ...(input.subscriptionId ? { stripeSubscriptionId: input.subscriptionId } : {}),
        ...(input.status ? { status: stripeStatusToAppStatus(input.status), stripeStatus: input.status } : {})
      },
      billing: {
        ...(isRecord(settings.billing) ? settings.billing : {}),
        ...(input.status ? { status: input.status === "active" || input.status === "trialing" ? "PAID" : "PENDING" } : {})
      }
    };
  });
}

export async function handleStripeWebhook(input: {
  body: string;
  signature: string | null;
}) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is missing.");
  }

  if (!input.signature) {
    throw new Error("Missing Stripe signature.");
  }

  const event = stripe.webhooks.constructEvent(input.body, input.signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const restaurantId = session.metadata?.restaurantId;

      if (restaurantId) {
        await updateSubscriptionFromStripe({
          billingCycle: session.metadata?.billingCycle,
          commitment: session.metadata?.commitment,
          commitmentEndDate: commitmentEndDateFromMetadata(session.metadata?.commitment, session.created),
          customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          planName: session.metadata?.planName,
          restaurantId,
          status: session.payment_status === "paid" ? "paid" : session.status,
          subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id
        });
      }

      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const restaurantId = subscription.metadata?.restaurantId;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const restaurant = restaurantId
        ? { id: restaurantId }
        : customerId
          ? await findRestaurantByStripeCustomer(customerId)
          : null;

      if (restaurant?.id) {
        await updateSubscriptionFromStripe({
          billingCycle: subscription.metadata?.billingCycle,
          commitment: subscription.metadata?.commitment,
          commitmentEndDate: commitmentEndDateFromMetadata(subscription.metadata?.commitment, subscription.created),
          customerId,
          nextBillingDate: isoDateFromUnixSeconds((subscription as { current_period_end?: unknown }).current_period_end),
          planName: subscription.metadata?.planName,
          restaurantId: restaurant.id,
          status: subscription.status,
          subscriptionId: subscription.id
        });
      }

      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const restaurant = customerId ? await findRestaurantByStripeCustomer(customerId) : null;

      if (restaurant?.id) {
        await updateRestaurantSettings(restaurant.id, (settings) => ({
          ...settings,
          billing: {
            ...(isRecord(settings.billing) ? settings.billing : {}),
            lastPaymentDate: new Date().toISOString().slice(0, 10),
            status: "PAID"
          }
        }));
      }

      break;
    }
    default:
      break;
  }

  return event;
}
