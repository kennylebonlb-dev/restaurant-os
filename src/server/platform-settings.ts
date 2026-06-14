import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlatformBrand = {
  siteName: string;
  logoUrl: string;
  logoHeight: number;
  footerLogoUrl: string;
  footerLogoHeight: number;
  loginVisualUrl: string;
  faviconUrl: string;
  logoAlt: string;
  supportEmail?: string;
};

const BRAND_KEY = "brand";
const LANDING_KEY = "landing";

export const defaultPlatformBrand: PlatformBrand = {
  siteName: "C’est ma table",
  logoUrl: "/cest-ma-table-logo.png",
  logoHeight: 48,
  footerLogoUrl: "/cest-ma-table-logo.png",
  footerLogoHeight: 32,
  loginVisualUrl: "/login-restaurant-visual.png",
  faviconUrl: "/cest-ma-table-favicon.png",
  logoAlt: "C’est ma table",
  supportEmail: ""
};

export type PlatformLandingLink = {
  label: string;
  href: string;
};

export type PlatformLandingTextBlock = {
  title: string;
  text: string;
};

export type PlatformLandingProofPoint = {
  value: string;
  label: string;
};

export type PlatformLandingPlan = {
  name: string;
  price: string;
  highlight: string;
  featured: boolean;
  features: string[];
};

export type PlatformLandingSettings = {
  brandName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  demoCtaLabel: string;
  demoCtaHref: string;
  proofPoints: PlatformLandingProofPoint[];
  solutionEyebrow: string;
  solutionTitle: string;
  workflow: string[];
  featuresEyebrow: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: PlatformLandingTextBlock[];
  dashboardEyebrow: string;
  dashboardTitle: string;
  dashboardCards: PlatformLandingTextBlock[];
  secondaryFeatures: PlatformLandingTextBlock[];
  pricingEyebrow: string;
  pricingTitle: string;
  pricingSubtitle: string;
  plans: PlatformLandingPlan[];
  demoEyebrow: string;
  demoTitle: string;
  demoSubtitle: string;
  demoSteps: string[];
  faqEyebrow: string;
  faqTitle: string;
  faqs: PlatformLandingTextBlock[];
  footerTagline: string;
  legalLinks: PlatformLandingLink[];
  solutionLinks: PlatformLandingLink[];
  companyLinks: PlatformLandingLink[];
};

export const defaultPlatformLandingSettings: PlatformLandingSettings = {
  brandName: "ToqueTop",
  heroEyebrow: "Site, réservations et plan de salle pour restaurants ambitieux",
  heroTitle: "Remplissez vos tables sans perdre le contrôle de votre salle.",
  heroSubtitle:
    "ToqueTop crée votre site restaurant et centralise les réservations, le plan de salle, les disponibilités, les préférences clients et les statistiques dans un espace fluide, premium et temps réel.",
  primaryCtaLabel: "Voir les forfaits",
  primaryCtaHref: "#forfaits",
  secondaryCtaLabel: "Démo gratuite sans inscription",
  secondaryCtaHref: "/reservation",
  demoCtaLabel: "Demander une démo",
  demoCtaHref: "#demo",
  proofPoints: [
    { value: "0%", label: "commission sur vos réservations directes" },
    { value: "15 min", label: "créneaux configurables pour chaque service" },
    { value: "2D + 3D", label: "plans de salle pensés pour convertir" },
    { value: "24/7", label: "prise de réservation même quand l’équipe est occupée" }
  ],
  solutionEyebrow: "Une plateforme complète",
  solutionTitle: "Tout ce qu’un restaurant doit piloter, dans un seul cockpit.",
  workflow: [
    "On crée votre site et votre identité de réservation.",
    "Vous placez vos tables, services, horaires et règles métier.",
    "Vos clients réservent en ligne, vous gardez le contrôle en direct."
  ],
  featuresEyebrow: "Fonctionnalités",
  featuresTitle: "La réservation directe, mais avec une vraie vision de salle.",
  featuresSubtitle:
    "Inspiré des meilleurs outils de réservation, ToqueTop met l’accent sur la relation directe, l’expérience client visuelle et la simplicité d’exploitation au quotidien.",
  features: [
    {
      title: "Réservations sans friction",
      text: "Vos clients choisissent un créneau, leurs préférences et leur table depuis une expérience visuelle claire."
    },
    {
      title: "Plan de salle vivant",
      text: "Plan 2D/3D, tables, capacités, zones, blocages, rotations et disponibilités synchronisées en temps réel."
    },
    {
      title: "Fichier client utile",
      text: "Nom, contact, notes, anniversaires, demandes spéciales et historique pour reconnaître les habitués."
    },
    {
      title: "Pilotage opérationnel",
      text: "Occupation, services, tables libres, réservations du jour et indicateurs simples pour mieux remplir."
    },
    {
      title: "Site restaurant inclus",
      text: "Un site rapide, moderne et adapté à votre identité, connecté directement à votre moteur de réservation."
    },
    {
      title: "Prêt à évoluer",
      text: "Architecture pensée pour les futures intégrations : IA, fidélité, automatisations, CRM et multi-sites."
    }
  ],
  dashboardEyebrow: "Vue restaurateur",
  dashboardTitle: "Un dashboard pensé pour les services réels, pas pour les tableurs.",
  dashboardCards: [
    { title: "Réservations du jour", text: "12:30 · 4 couverts · anniversaire" },
    { title: "Occupation", text: "68% au déjeuner · 81% au dîner" },
    { title: "Tables disponibles", text: "2 places: 4 · 4 places: 3 · 6+: 1" },
    { title: "Alertes", text: "Table VIP bloquée à 20:00" }
  ],
  secondaryFeatures: [
    { title: "Plans 2D et 3D", text: "Offrez une sélection de table plus rassurante, visuelle et différenciante." },
    {
      title: "Règles métier",
      text: "Minimum avant réservation, durée de service, tables bloquées, vacances et restrictions de capacité."
    },
    { title: "Expérience client", text: "Demandes PMR, chaise haute, dîner romantique, anniversaire, notes et préférences." },
    { title: "Notifications", text: "Confirmation d’inscription, réservation, annulation et messages transactionnels." }
  ],
  pricingEyebrow: "Forfaits",
  pricingTitle: "Une offre lisible, sans commission cachée.",
  pricingSubtitle:
    "Les forfaits peuvent être adaptés selon le nombre d’établissements, le niveau de personnalisation et l’accompagnement souhaité.",
  plans: [
    {
      name: "Essentiel",
      price: "49€",
      highlight: "Pour lancer la réservation en ligne",
      featured: false,
      features: ["Site vitrine ToqueTop", "Module de réservation", "Plan de salle 2D", "E-mails de confirmation", "Support de démarrage"]
    },
    {
      name: "Pro",
      price: "89€",
      highlight: "Le meilleur choix pour un restaurant actif",
      featured: true,
      features: [
        "Tout Essentiel",
        "Plan 3D immersif",
        "Dashboard temps réel",
        "Blocages et services avancés",
        "Personnalisation de marque",
        "Statistiques d’occupation"
      ]
    },
    {
      name: "Signature",
      price: "Sur mesure",
      highlight: "Pour groupes, lieux premium et multi-sites",
      featured: false,
      features: ["Multi-restaurants", "Accompagnement prioritaire", "Design sur mesure", "Automatisations avancées", "Préparation IA et CRM", "Stratégie conversion"]
    }
  ],
  demoEyebrow: "Lancer ToqueTop",
  demoTitle: "Prêt à transformer votre réservation directe ?",
  demoSubtitle:
    "On peut préparer une première version de votre site, votre plan de salle et vos règles de réservation pour vous montrer concrètement le rendu.",
  demoSteps: ["Audit rapide du site actuel", "Configuration des horaires et services", "Intégration du plan de salle", "Mise en ligne et formation"],
  faqEyebrow: "Questions fréquentes",
  faqTitle: "Simple à comprendre, solide à exploiter.",
  faqs: [
    {
      title: "Est-ce que ToqueTop remplace mon site actuel ?",
      text: "Oui si vous le souhaitez. ToqueTop peut devenir votre site principal, ou simplement ajouter une réservation moderne à votre site existant."
    },
    {
      title: "Puis-je garder la main sur les horaires et les tables ?",
      text: "Oui. Vous gérez les services, vacances, blocages, capacités, préférences de tables et règles de réservation depuis l’espace admin."
    },
    {
      title: "Le client peut-il choisir sa table ?",
      text: "Oui. Vous pouvez proposer une sélection visuelle, laisser le restaurant choisir, ou utiliser une attribution automatique selon vos règles."
    },
    {
      title: "Est-ce adapté à plusieurs restaurants ?",
      text: "La base est prête pour le multi-sites : chaque restaurant peut avoir ses informations, son plan, ses horaires et ses réservations."
    }
  ],
  footerTagline: "Sites, réservations directes et outils de croissance pour restaurants.",
  legalLinks: [
    { label: "Conditions Générales d’Utilisation", href: "/legal/conditions-generales-utilisation" },
    { label: "Mentions Légales", href: "/legal/mentions-legales" },
    { label: "Politique de protection des données", href: "/legal/protection-donnees" },
    { label: "Politique en matière de cookies", href: "/legal/cookies" }
  ],
  solutionLinks: [
    { label: "Réservations", href: "#fonctionnalites" },
    { label: "Paiement", href: "#fonctionnalites" },
    { label: "Fidélisation", href: "#fonctionnalites" },
    { label: "Application de gestion", href: "#fonctionnalites" },
    { label: "Menu digital", href: "#fonctionnalites" },
    { label: "Site internet", href: "#fonctionnalites" },
    { label: "Liste d’attente", href: "#fonctionnalites" },
    { label: "Avis clients", href: "#fonctionnalites" },
    { label: "Solutions IA", href: "#fonctionnalites" }
  ],
  companyLinks: [
    { label: "Qui sommes-nous", href: "#solution" },
    { label: "Témoignages", href: "#demo" },
    { label: "Rejoignez-nous", href: "mailto:contact@toquetop.com?subject=Rejoindre ToqueTop" },
    { label: "Intégrations", href: "#fonctionnalites" },
    { label: "Commencer", href: "#demo" },
    { label: "Contacter", href: "mailto:contact@toquetop.com" },
    { label: "Notes de version", href: "#faq" }
  ]
};

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeStringList(value: unknown, fallback: string[], minLength = 1) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return list.length >= minLength ? list : fallback;
}

function normalizeLinks(value: unknown, fallback: PlatformLandingLink[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const href = typeof record.href === "string" ? record.href.trim() : "";

      return label && href ? { label, href } : undefined;
    })
    .filter((item): item is PlatformLandingLink => Boolean(item));

  return list.length ? list : fallback;
}

function normalizeTextBlocks(value: unknown, fallback: PlatformLandingTextBlock[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const text = typeof record.text === "string" ? record.text.trim() : "";

      return title && text ? { title, text } : undefined;
    })
    .filter((item): item is PlatformLandingTextBlock => Boolean(item));

  return list.length ? list : fallback;
}

function normalizeProofPoints(value: unknown, fallback: PlatformLandingProofPoint[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const proofValue = typeof record.value === "string" ? record.value.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";

      return proofValue && label ? { value: proofValue, label } : undefined;
    })
    .filter((item): item is PlatformLandingProofPoint => Boolean(item));

  return list.length ? list : fallback;
}

function normalizePlans(value: unknown, fallback: PlatformLandingPlan[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const price = typeof record.price === "string" ? record.price.trim() : "";
      const highlight = typeof record.highlight === "string" ? record.highlight.trim() : "";
      const features = normalizeStringList(record.features, []);

      return name && price && highlight && features.length
        ? {
            name,
            price,
            highlight,
            featured: Boolean(record.featured),
            features
          }
        : undefined;
    })
    .filter((item): item is PlatformLandingPlan => Boolean(item));

  return list.length ? list : fallback;
}

function normalizeImageHeight(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(96, Math.max(18, Math.round(value)))
    : fallback;
}

function normalizePlatformBrand(value: unknown): PlatformBrand {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultPlatformBrand;
  }

  const record = value as Record<string, unknown>;

  return {
    siteName: typeof record.siteName === "string" && record.siteName.trim() ? record.siteName : defaultPlatformBrand.siteName,
    logoUrl: typeof record.logoUrl === "string" && record.logoUrl.trim() ? record.logoUrl : defaultPlatformBrand.logoUrl,
    logoHeight: normalizeImageHeight(record.logoHeight, defaultPlatformBrand.logoHeight),
    footerLogoUrl:
      typeof record.footerLogoUrl === "string" && record.footerLogoUrl.trim()
        ? record.footerLogoUrl
        : typeof record.logoUrl === "string" && record.logoUrl.trim()
          ? record.logoUrl
          : defaultPlatformBrand.footerLogoUrl,
    footerLogoHeight: normalizeImageHeight(record.footerLogoHeight, defaultPlatformBrand.footerLogoHeight),
    loginVisualUrl:
      typeof record.loginVisualUrl === "string" && record.loginVisualUrl.trim()
        ? record.loginVisualUrl
        : defaultPlatformBrand.loginVisualUrl,
    faviconUrl:
      typeof record.faviconUrl === "string" && record.faviconUrl.trim()
        ? record.faviconUrl
        : defaultPlatformBrand.faviconUrl,
    logoAlt: typeof record.logoAlt === "string" && record.logoAlt.trim() ? record.logoAlt : defaultPlatformBrand.logoAlt,
    supportEmail: typeof record.supportEmail === "string" ? record.supportEmail : ""
  };
}

function normalizePlatformLandingSettings(value: unknown): PlatformLandingSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultPlatformLandingSettings;
  }

  const record = value as Record<string, unknown>;

  return {
    brandName: normalizeString(record.brandName, defaultPlatformLandingSettings.brandName),
    heroEyebrow: normalizeString(record.heroEyebrow, defaultPlatformLandingSettings.heroEyebrow),
    heroTitle: normalizeString(record.heroTitle, defaultPlatformLandingSettings.heroTitle),
    heroSubtitle: normalizeString(record.heroSubtitle, defaultPlatformLandingSettings.heroSubtitle),
    primaryCtaLabel: normalizeString(record.primaryCtaLabel, defaultPlatformLandingSettings.primaryCtaLabel),
    primaryCtaHref: normalizeString(record.primaryCtaHref, defaultPlatformLandingSettings.primaryCtaHref),
    secondaryCtaLabel: normalizeString(record.secondaryCtaLabel, defaultPlatformLandingSettings.secondaryCtaLabel),
    secondaryCtaHref: normalizeString(record.secondaryCtaHref, defaultPlatformLandingSettings.secondaryCtaHref),
    demoCtaLabel: normalizeString(record.demoCtaLabel, defaultPlatformLandingSettings.demoCtaLabel),
    demoCtaHref: normalizeString(record.demoCtaHref, defaultPlatformLandingSettings.demoCtaHref),
    proofPoints: normalizeProofPoints(record.proofPoints, defaultPlatformLandingSettings.proofPoints),
    solutionEyebrow: normalizeString(record.solutionEyebrow, defaultPlatformLandingSettings.solutionEyebrow),
    solutionTitle: normalizeString(record.solutionTitle, defaultPlatformLandingSettings.solutionTitle),
    workflow: normalizeStringList(record.workflow, defaultPlatformLandingSettings.workflow, 3),
    featuresEyebrow: normalizeString(record.featuresEyebrow, defaultPlatformLandingSettings.featuresEyebrow),
    featuresTitle: normalizeString(record.featuresTitle, defaultPlatformLandingSettings.featuresTitle),
    featuresSubtitle: normalizeString(record.featuresSubtitle, defaultPlatformLandingSettings.featuresSubtitle),
    features: normalizeTextBlocks(record.features, defaultPlatformLandingSettings.features),
    dashboardEyebrow: normalizeString(record.dashboardEyebrow, defaultPlatformLandingSettings.dashboardEyebrow),
    dashboardTitle: normalizeString(record.dashboardTitle, defaultPlatformLandingSettings.dashboardTitle),
    dashboardCards: normalizeTextBlocks(record.dashboardCards, defaultPlatformLandingSettings.dashboardCards),
    secondaryFeatures: normalizeTextBlocks(record.secondaryFeatures, defaultPlatformLandingSettings.secondaryFeatures),
    pricingEyebrow: normalizeString(record.pricingEyebrow, defaultPlatformLandingSettings.pricingEyebrow),
    pricingTitle: normalizeString(record.pricingTitle, defaultPlatformLandingSettings.pricingTitle),
    pricingSubtitle: normalizeString(record.pricingSubtitle, defaultPlatformLandingSettings.pricingSubtitle),
    plans: normalizePlans(record.plans, defaultPlatformLandingSettings.plans),
    demoEyebrow: normalizeString(record.demoEyebrow, defaultPlatformLandingSettings.demoEyebrow),
    demoTitle: normalizeString(record.demoTitle, defaultPlatformLandingSettings.demoTitle),
    demoSubtitle: normalizeString(record.demoSubtitle, defaultPlatformLandingSettings.demoSubtitle),
    demoSteps: normalizeStringList(record.demoSteps, defaultPlatformLandingSettings.demoSteps),
    faqEyebrow: normalizeString(record.faqEyebrow, defaultPlatformLandingSettings.faqEyebrow),
    faqTitle: normalizeString(record.faqTitle, defaultPlatformLandingSettings.faqTitle),
    faqs: normalizeTextBlocks(record.faqs, defaultPlatformLandingSettings.faqs),
    footerTagline: normalizeString(record.footerTagline, defaultPlatformLandingSettings.footerTagline),
    legalLinks: normalizeLinks(record.legalLinks, defaultPlatformLandingSettings.legalLinks),
    solutionLinks: normalizeLinks(record.solutionLinks, defaultPlatformLandingSettings.solutionLinks),
    companyLinks: normalizeLinks(record.companyLinks, defaultPlatformLandingSettings.companyLinks)
  };
}

export async function getPlatformBrand() {
  const setting = await prisma.platformSetting.findUnique({
    where: {
      key: BRAND_KEY
    }
  });

  return normalizePlatformBrand(setting?.value);
}

export async function updatePlatformBrand(brand: PlatformBrand) {
  const setting = await prisma.platformSetting.upsert({
    where: {
      key: BRAND_KEY
    },
    update: {
      value: brand as unknown as Prisma.InputJsonValue
    },
    create: {
      key: BRAND_KEY,
      value: brand as unknown as Prisma.InputJsonValue
    }
  });

  return normalizePlatformBrand(setting.value);
}

export async function getPlatformLandingSettings() {
  const setting = await prisma.platformSetting.findUnique({
    where: {
      key: LANDING_KEY
    }
  });

  return normalizePlatformLandingSettings(setting?.value);
}

export async function updatePlatformLandingSettings(settings: PlatformLandingSettings) {
  const setting = await prisma.platformSetting.upsert({
    where: {
      key: LANDING_KEY
    },
    update: {
      value: settings as unknown as Prisma.InputJsonValue
    },
    create: {
      key: LANDING_KEY,
      value: settings as unknown as Prisma.InputJsonValue
    }
  });

  return normalizePlatformLandingSettings(setting.value);
}
