import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlatformBrand = {
  siteName: string;
  logoUrl: string;
  logoHeight: number;
  footerLogoUrl: string;
  footerLogoHeight: number;
  marketingLogoUrl: string;
  marketingLogoHeight: number;
  marketingFooterLogoUrl: string;
  marketingFooterLogoHeight: number;
  loginVisualUrl: string;
  faviconUrl: string;
  logoAlt: string;
  supportEmail?: string;
};

const BRAND_KEY = "brand";
const LANDING_KEY = "landing";
const EMAIL_SETTINGS_KEY = "email-settings";

export const defaultPlatformBrand: PlatformBrand = {
  siteName: "C’est ma table",
  logoUrl: "/cest-ma-table-logo.png",
  logoHeight: 48,
  footerLogoUrl: "/cest-ma-table-logo.png",
  footerLogoHeight: 32,
  marketingLogoUrl: "/cest-ma-table-logo.png",
  marketingLogoHeight: 48,
  marketingFooterLogoUrl: "/cest-ma-table-logo.png",
  marketingFooterLogoHeight: 32,
  loginVisualUrl: "/login-restaurant-visual.png",
  faviconUrl: "/cest-ma-table-favicon.png",
  logoAlt: "C’est ma table",
  supportEmail: ""
};

export type PlatformEmailTemplateKey =
  | "registration"
  | "passwordReset"
  | "reservationConfirmation"
  | "reservationUpdate"
  | "reservationCancellation"
  | "reservationReminder";

export type PlatformEmailTemplate = {
  enabled: boolean;
  subject: string;
  preheader: string;
  title: string;
  body: string;
  buttonLabel: string;
  footerText: string;
};

export type PlatformEmailSettings = {
  senderName: string;
  replyTo: string;
  logoUrl: string;
  logoHeight: number;
  backgroundColor: string;
  cardColor: string;
  accentColor: string;
  textColor: string;
  buttonTextColor: string;
  borderRadius: number;
  templates: Record<PlatformEmailTemplateKey, PlatformEmailTemplate>;
};

export const emailTemplateKeys: PlatformEmailTemplateKey[] = [
  "registration",
  "passwordReset",
  "reservationConfirmation",
  "reservationUpdate",
  "reservationCancellation",
  "reservationReminder"
];

export const defaultPlatformEmailSettings: PlatformEmailSettings = {
  senderName: "ToqueTop",
  replyTo: "contact@toquetop.com",
  logoUrl: "/cest-ma-table-logo.png",
  logoHeight: 44,
  backgroundColor: "#f7f1e8",
  cardColor: "#ffffff",
  accentColor: "#14735d",
  textColor: "#16201d",
  buttonTextColor: "#ffffff",
  borderRadius: 8,
  templates: {
    registration: {
      enabled: true,
      subject: "Bienvenue chez {{siteName}}",
      preheader: "Votre compte a bien été créé.",
      title: "Inscription confirmée",
      body:
        "Bonjour {{customerName}},\n\nVotre compte a bien été créé. Vous pouvez maintenant réserver une table, suivre vos réservations et annuler une réservation depuis votre espace.",
      buttonLabel: "Accéder à mon espace",
      footerText: "Si vous n’êtes pas à l’origine de cette inscription, vous pouvez ignorer cet e-mail."
    },
    passwordReset: {
      enabled: true,
      subject: "Réinitialisation de votre mot de passe {{siteName}}",
      preheader: "Choisissez un nouveau mot de passe.",
      title: "Réinitialisation du mot de passe",
      body:
        "Bonjour {{customerName}},\n\nCliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire le {{expiration}}.",
      buttonLabel: "Réinitialiser mon mot de passe",
      footerText: "Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail."
    },
    reservationConfirmation: {
      enabled: true,
      subject: "Réservation confirmée chez {{restaurantName}}",
      preheader: "Votre table est réservée.",
      title: "Réservation confirmée",
      body:
        "Bonjour {{customerName}},\n\nVotre réservation chez {{restaurantName}} est confirmée.\n\nDate : {{reservationDate}}\nHeure : {{reservationTime}}\nCouverts : {{guests}}\nTable : {{tableLabel}}\nRéférence : {{reservationReference}}",
      buttonLabel: "Voir ma réservation",
      footerText: "Merci pour votre réservation."
    },
    reservationUpdate: {
      enabled: true,
      subject: "Réservation modifiée chez {{restaurantName}}",
      preheader: "Votre réservation a été mise à jour.",
      title: "Réservation modifiée",
      body:
        "Bonjour {{customerName}},\n\nVotre réservation chez {{restaurantName}} a été mise à jour.\n\nDate : {{reservationDate}}\nHeure : {{reservationTime}}\nCouverts : {{guests}}\nTable : {{tableLabel}}\nRéférence : {{reservationReference}}",
      buttonLabel: "Voir ma réservation",
      footerText: "Vous pouvez retrouver les détails depuis votre espace."
    },
    reservationCancellation: {
      enabled: true,
      subject: "Réservation annulée chez {{restaurantName}}",
      preheader: "Votre réservation a été annulée.",
      title: "Réservation annulée",
      body:
        "Bonjour {{customerName}},\n\nVotre réservation chez {{restaurantName}} a bien été annulée.\n\nRéférence : {{reservationReference}}",
      buttonLabel: "Réserver à nouveau",
      footerText: "Nous espérons vous revoir bientôt."
    },
    reservationReminder: {
      enabled: true,
      subject: "Rappel de réservation chez {{restaurantName}}",
      preheader: "Votre réservation approche.",
      title: "Votre réservation approche",
      body:
        "Bonjour {{customerName}},\n\nPetit rappel : votre réservation chez {{restaurantName}} est prévue le {{reservationDate}} à {{reservationTime}}.\n\nCouverts : {{guests}}\nTable : {{tableLabel}}\nRéférence : {{reservationReference}}",
      buttonLabel: "Voir ma réservation",
      footerText: "À très vite."
    }
  }
};

export type PlatformLandingLink = {
  label: string;
  href: string;
};

export type PlatformLandingTextBlock = {
  title: string;
  text: string;
  icon?: string;
  category?: string;
  order?: number;
  visible?: boolean;
};

export type PlatformLandingProofPoint = {
  value: string;
  label: string;
};

export type PlatformLandingPlan = {
  name: string;
  price: string;
  annualPrice: string;
  highlight: string;
  featured: boolean;
  active: boolean;
  buttonLabel: string;
  features: string[];
};

export type PlatformLandingTypography = {
  heroTitleSize: number;
  heroSubtitleSize: number;
  sectionTitleSize: number;
  sectionTextSize: number;
  cardTitleSize: number;
  cardTextSize: number;
};

export type PlatformLandingAppearance = {
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  textColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
  buttonRadius: number;
  stylePreset: "MODERN" | "PREMIUM" | "SOBER" | "WARM";
};

export type PlatformLandingHeader = {
  logoPosition: "LEFT" | "CENTER";
  menuLinks: PlatformLandingLink[];
  primaryButtonLabel: string;
  primaryButtonHref: string;
  backgroundColor: string;
  sticky: boolean;
  mobileMenuLabel: string;
  height: number;
  logoSpacing: number;
};

export type PlatformLandingSeo = {
  title: string;
  description: string;
  keywords: string;
  shareImageUrl: string;
  customUrl: string;
};

export type PlatformLandingGeneral = {
  siteName: string;
  contactEmail: string;
  phone: string;
  address: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

export type PlatformLandingVisibleSections = {
  solution: boolean;
  features: boolean;
  dashboard: boolean;
  pricing: boolean;
  demo: boolean;
  faq: boolean;
  customBlocks: boolean;
};

export type PlatformLandingCustomBlock = {
  id: string;
  type: "TEXT" | "IMAGE_TEXT" | "FEATURE_CARD" | "TESTIMONIAL" | "FAQ" | "PLAN" | "CTA" | "GALLERY" | "VIDEO" | "FORM";
  title: string;
  subtitle: string;
  text: string;
  imageUrl: string;
  icon: string;
  buttonLabel: string;
  buttonHref: string;
  backgroundColor: string;
  alignment: "LEFT" | "CENTER" | "RIGHT";
  visible: boolean;
  order: number;
};

export type PlatformLandingSettings = {
  appearance: PlatformLandingAppearance;
  header: PlatformLandingHeader;
  seo: PlatformLandingSeo;
  general: PlatformLandingGeneral;
  visibleSections: PlatformLandingVisibleSections;
  customBlocks: PlatformLandingCustomBlock[];
  brandName: string;
  typography: PlatformLandingTypography;
  heroImageUrl: string;
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
  annualDiscountLabel: string;
  plans: PlatformLandingPlan[];
  demoEyebrow: string;
  demoTitle: string;
  demoSubtitle: string;
  demoSteps: string[];
  faqEyebrow: string;
  faqTitle: string;
  faqs: PlatformLandingTextBlock[];
  footerTagline: string;
  footerCopyright: string;
  legalLinks: PlatformLandingLink[];
  solutionLinks: PlatformLandingLink[];
  companyLinks: PlatformLandingLink[];
};

export const defaultPlatformLandingSettings: PlatformLandingSettings = {
  appearance: {
    primaryColor: "#1d2521",
    secondaryColor: "#ead6bd",
    buttonColor: "#ead6bd",
    textColor: "#1f2228",
    backgroundColor: "#fbf8f2",
    headingFont: "Inter",
    bodyFont: "Inter",
    buttonRadius: 8,
    stylePreset: "PREMIUM"
  },
  header: {
    logoPosition: "LEFT",
    menuLinks: [
      { label: "Solutions", href: "#solution" },
      { label: "Fonctionnalités", href: "#fonctionnalites" },
      { label: "Forfaits", href: "#forfaits" },
      { label: "FAQ", href: "#faq" }
    ],
    primaryButtonLabel: "Demander une démo",
    primaryButtonHref: "#demo",
    backgroundColor: "transparent",
    sticky: false,
    mobileMenuLabel: "Menu",
    height: 80,
    logoSpacing: 12
  },
  seo: {
    title: "ToqueTop - Sites et réservations pour restaurants",
    description:
      "ToqueTop crée votre site restaurant et centralise réservations, plan de salle, disponibilités et préférences clients.",
    keywords: "restaurant, réservation, site restaurant, plan de salle, ToqueTop",
    shareImageUrl: "/login-restaurant-visual.png",
    customUrl: "https://www.toquetop.com"
  },
  general: {
    siteName: "ToqueTop",
    contactEmail: "contact@toquetop.com",
    phone: "",
    address: "",
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    maintenanceMode: false,
    maintenanceMessage: "Le site est momentanément en maintenance."
  },
  visibleSections: {
    solution: true,
    features: true,
    dashboard: true,
    pricing: true,
    demo: true,
    faq: true,
    customBlocks: true
  },
  customBlocks: [
    {
      id: "conversion",
      type: "CTA",
      title: "Une démo gratuite, sans inscription",
      subtitle: "Testez l’expérience client en quelques secondes.",
      text: "Vos visiteurs peuvent réserver, explorer un plan de salle et comprendre la valeur de ToqueTop immédiatement.",
      imageUrl: "",
      icon: "Sparkles",
      buttonLabel: "Lancer la démo",
      buttonHref: "/reservation",
      backgroundColor: "#ffffff",
      alignment: "CENTER",
      visible: true,
      order: 1
    }
  ],
  brandName: "ToqueTop",
  typography: {
    heroTitleSize: 72,
    heroSubtitleSize: 18,
    sectionTitleSize: 48,
    sectionTextSize: 16,
    cardTitleSize: 20,
    cardTextSize: 14
  },
  heroImageUrl: "/login-restaurant-visual.png",
  heroEyebrow: "Réservations 24/7, rappels automatiques et site restaurant prêt en moins de 5 minutes",
  heroTitle: "Gagnez du temps en salle et réduisez les no-shows jusqu’à 35%.",
  heroSubtitle:
    "ToqueTop crée votre site, centralise les réservations, automatise les rappels SMS et e-mail, connecte vos réseaux sociaux et Google, et donne à vos équipes un cockpit simple pour piloter chaque service.",
  primaryCtaLabel: "Commencer 30 jours gratuits",
  primaryCtaHref: "#forfaits",
  secondaryCtaLabel: "Démo gratuite sans inscription",
  secondaryCtaHref: "/reservation",
  demoCtaLabel: "Passez à ToqueTop",
  demoCtaHref: "/passer-a-toquetop",
  proofPoints: [
    { value: "-35%", label: "de no-shows grâce aux rappels automatiques" },
    { value: "24/7", label: "réservations en ligne même quand l’équipe est occupée" },
    { value: "5 min", label: "pour lancer un site ToqueTop opérationnel" },
    { value: "30 j", label: "gratuits, sans carte bancaire, annulable à tout moment" }
  ],
  solutionEyebrow: "Une plateforme complète",
  solutionTitle: "Tout ce qui fait gagner du temps à vos équipes, dans un seul cockpit.",
  workflow: [
    "Lancez votre site ToqueTop en moins de 5 minutes.",
    "Connectez réservations, Google, réseaux sociaux, rappels et fidélité.",
    "Suivez vos services, rapports, no-shows et performances en temps réel."
  ],
  featuresEyebrow: "Fonctionnalités",
  featuresTitle: "Une réservation directe qui travaille aussi pour vos équipes.",
  featuresSubtitle:
    "Réservations 24/7, rappels automatiques, analyses, fidélité, comptabilité et intégrations sociales : ToqueTop transforme chaque réservation en outil de croissance.",
  features: [
    {
      title: "Réservations en ligne 24/7",
      text: "Vos clients réservent à tout moment depuis votre site, Google, Instagram ou vos réseaux sociaux, sans interrompre le service."
    },
    {
      title: "Rappels automatiques",
      text: "Réduisez les no-shows jusqu’à 35% grâce aux rappels SMS et e-mail envoyés automatiquement avant chaque réservation."
    },
    {
      title: "Analyses et rapports",
      text: "Suivez remplissage, annulations, no-shows, services, tables et performances pour prendre de meilleures décisions."
    },
    {
      title: "Comptabilité et pilotage",
      text: "Centralisez les informations utiles et préparez une lecture claire de votre activité, service après service."
    },
    {
      title: "Service de fidélité",
      text: "Construisez une relation durable avec vos clients grâce à l’historique, aux préférences et aux actions de fidélisation."
    },
    {
      title: "Assistance 24h/24 7j/7",
      text: "Gardez une solution fiable, accompagnée et prête à évoluer avec vos besoins opérationnels."
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
    { title: "Intégrations Google et réseaux", text: "Ajoutez votre module de réservation sur Google, Instagram, Facebook et vos liens de bio." },
    { title: "Notifications", text: "Confirmations, rappels, annulations et messages transactionnels envoyés automatiquement." }
  ],
  pricingEyebrow: "Forfaits",
  pricingTitle: "Mensuel ou annuel, choisissez le rythme qui vous convient.",
  pricingSubtitle:
    "Profitez d’une réduction sur le plan annuel, avec 30 jours gratuits, sans carte bancaire et annulable à tout moment.",
  annualDiscountLabel: "-15% de réduction",
  plans: [
    {
      name: "Essentiel",
      price: "49€",
      annualPrice: "39€",
      highlight: "Pour lancer la réservation en ligne",
      featured: false,
      active: true,
      buttonLabel: "Commencer gratuitement",
      features: ["Site vitrine ToqueTop", "Réservations en ligne 24/7", "Intégration Google et réseaux sociaux", "E-mails de confirmation", "Support de démarrage"]
    },
    {
      name: "Pro",
      price: "89€",
      annualPrice: "69€",
      highlight: "Le meilleur choix pour un restaurant actif",
      featured: true,
      active: true,
      buttonLabel: "Essayer Pro gratuitement",
      features: [
        "Tout Essentiel",
        "Plan 3D immersif",
        "Rappels SMS et e-mail",
        "Réduction des no-shows jusqu’à 35%",
        "Analyses et rapports",
        "Service de fidélité"
      ]
    },
    {
      name: "Signature",
      price: "Sur mesure",
      annualPrice: "Sur mesure",
      highlight: "Pour groupes, lieux premium et multi-sites",
      featured: false,
      active: true,
      buttonLabel: "Nous contacter",
      features: ["Multi-restaurants", "Accompagnement prioritaire", "Comptabilité et reporting avancé", "Automatisations avancées", "Préparation IA et CRM", "Assistance 24h/24 7j/7"]
    }
  ],
  demoEyebrow: "Migration accompagnée",
  demoTitle: "Changez pour ToqueTop, on s’occupe de tout !",
  demoSubtitle:
    "Grâce à une migration simple, reprenez le contrôle de vos réservations et ne payez plus de commission sur vos propres clients. Passez de TheFork, ZenChef, OpenTable ou d’autres systèmes de réservation vers ToqueTop sans interruption de service.",
  demoSteps: [
    "Parlez à un expert ToqueTop : nous analysons votre système actuel et vos besoins.",
    "Migration des données : vos clients et réservations existantes sont transférés en sécurité.",
    "Configuration : site web, réservations et plan 2D de votre établissement sont préparés.",
    "Lancement accompagné : nous vous guidons à chaque étape.",
    "Régalez vos clients avec ToqueTop !"
  ],
  faqEyebrow: "Questions fréquentes",
  faqTitle: "Questions fréquentes",
  faqs: [
    {
      title: "Vais-je perdre mes réservations actuelles ?",
      text: "Non, on récupère vos réservations en cours pour une transition sans interruption."
    },
    {
      title: "Vais-je repartir de zéro ?",
      text: "Non. Nous nous occupons de migrer chaque élément sur votre nouvel espace ToqueTop : menu, plan de table et avis."
    },
    {
      title: "L’outil est-il adapté à mon établissement ?",
      text: "ToqueTop s’adapte à tous types de restaurants, du bistrot au gastronomique."
    },
    {
      title: "Changer de solution va-t-il interrompre mon service ?",
      text: "Non. La migration est fluide, rapide et encadrée par une équipe experte pendant que vous restez concentré sur votre service."
    }
  ],
  footerTagline: "Sites, réservations directes et outils de croissance pour restaurants.",
  footerCopyright: "© 2026 ToqueTop by UCOM4YOU. Tous droits réservés.",
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
    { label: "Passez à ToqueTop", href: "/passer-a-toquetop" },
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

function normalizeNumber(value: unknown, fallback: number, min: number, max: number) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(numberValue) ? Math.min(max, Math.max(min, Math.round(numberValue))) : fallback;
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) || trimmed === "transparent" ? trimmed : fallback;
}

function normalizeEnum<T extends string>(value: unknown, fallback: T, options: readonly T[]) {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

function normalizeLinks(value: unknown, fallback: PlatformLandingLink[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value
    .map((item, index) => {
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
    .map((item, index): PlatformLandingTextBlock | undefined => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const text = typeof record.text === "string" ? record.text.trim() : "";

      return title && text
        ? {
            title,
            text,
            icon: typeof record.icon === "string" ? record.icon.trim() : "",
            category: typeof record.category === "string" ? record.category.trim() : "",
            order: normalizeNumber(record.order, index + 1, 1, 999),
            visible: typeof record.visible === "boolean" ? record.visible : true
          }
        : undefined;
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
      const annualPrice = typeof record.annualPrice === "string" ? record.annualPrice.trim() : "";
      const highlight = typeof record.highlight === "string" ? record.highlight.trim() : "";
      const features = normalizeStringList(record.features, []);

      return name && price && highlight && features.length
        ? {
            name,
            price,
            annualPrice: annualPrice || price,
            highlight,
            featured: Boolean(record.featured),
            active: typeof record.active === "boolean" ? record.active : true,
            buttonLabel:
              typeof record.buttonLabel === "string" && record.buttonLabel.trim()
                ? record.buttonLabel.trim()
                : "Demander une démo",
            features
          }
        : undefined;
    })
    .filter((item): item is PlatformLandingPlan => Boolean(item));

  return list.length ? list : fallback;
}

function normalizeAppearance(value: unknown, fallback = defaultPlatformLandingSettings.appearance): PlatformLandingAppearance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    primaryColor: normalizeColor(record.primaryColor, fallback.primaryColor),
    secondaryColor: normalizeColor(record.secondaryColor, fallback.secondaryColor),
    buttonColor: normalizeColor(record.buttonColor, fallback.buttonColor),
    textColor: normalizeColor(record.textColor, fallback.textColor),
    backgroundColor: normalizeColor(record.backgroundColor, fallback.backgroundColor),
    headingFont: normalizeString(record.headingFont, fallback.headingFont),
    bodyFont: normalizeString(record.bodyFont, fallback.bodyFont),
    buttonRadius: normalizeNumber(record.buttonRadius, fallback.buttonRadius, 0, 32),
    stylePreset: normalizeEnum(record.stylePreset, fallback.stylePreset, ["MODERN", "PREMIUM", "SOBER", "WARM"] as const)
  };
}

function normalizeTypography(value: unknown, fallback = defaultPlatformLandingSettings.typography): PlatformLandingTypography {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    heroTitleSize: normalizeNumber(record.heroTitleSize, fallback.heroTitleSize, 42, 96),
    heroSubtitleSize: normalizeNumber(record.heroSubtitleSize, fallback.heroSubtitleSize, 14, 28),
    sectionTitleSize: normalizeNumber(record.sectionTitleSize, fallback.sectionTitleSize, 28, 72),
    sectionTextSize: normalizeNumber(record.sectionTextSize, fallback.sectionTextSize, 13, 24),
    cardTitleSize: normalizeNumber(record.cardTitleSize, fallback.cardTitleSize, 14, 34),
    cardTextSize: normalizeNumber(record.cardTextSize, fallback.cardTextSize, 12, 22)
  };
}

function normalizeHeader(value: unknown, fallback = defaultPlatformLandingSettings.header): PlatformLandingHeader {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    logoPosition: normalizeEnum(record.logoPosition, fallback.logoPosition, ["LEFT", "CENTER"] as const),
    menuLinks: normalizeLinks(record.menuLinks, fallback.menuLinks),
    primaryButtonLabel: normalizeString(record.primaryButtonLabel, fallback.primaryButtonLabel),
    primaryButtonHref: normalizeString(record.primaryButtonHref, fallback.primaryButtonHref),
    backgroundColor: normalizeColor(record.backgroundColor, fallback.backgroundColor),
    sticky: typeof record.sticky === "boolean" ? record.sticky : fallback.sticky,
    mobileMenuLabel: normalizeString(record.mobileMenuLabel, fallback.mobileMenuLabel),
    height: normalizeNumber(record.height, fallback.height, 56, 120),
    logoSpacing: normalizeNumber(record.logoSpacing, fallback.logoSpacing, 0, 40)
  };
}

function normalizeSeo(value: unknown, fallback = defaultPlatformLandingSettings.seo): PlatformLandingSeo {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    title: normalizeString(record.title, fallback.title),
    description: normalizeString(record.description, fallback.description),
    keywords: typeof record.keywords === "string" ? record.keywords : fallback.keywords,
    shareImageUrl: typeof record.shareImageUrl === "string" && record.shareImageUrl.trim() ? record.shareImageUrl : fallback.shareImageUrl,
    customUrl: typeof record.customUrl === "string" && record.customUrl.trim() ? record.customUrl : fallback.customUrl
  };
}

function normalizeGeneral(value: unknown, fallback = defaultPlatformLandingSettings.general): PlatformLandingGeneral {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    siteName: normalizeString(record.siteName, fallback.siteName),
    contactEmail: typeof record.contactEmail === "string" ? record.contactEmail : fallback.contactEmail,
    phone: typeof record.phone === "string" ? record.phone : fallback.phone,
    address: typeof record.address === "string" ? record.address : fallback.address,
    facebookUrl: typeof record.facebookUrl === "string" ? record.facebookUrl : fallback.facebookUrl,
    instagramUrl: typeof record.instagramUrl === "string" ? record.instagramUrl : fallback.instagramUrl,
    linkedinUrl: typeof record.linkedinUrl === "string" ? record.linkedinUrl : fallback.linkedinUrl,
    maintenanceMode: typeof record.maintenanceMode === "boolean" ? record.maintenanceMode : fallback.maintenanceMode,
    maintenanceMessage: normalizeString(record.maintenanceMessage, fallback.maintenanceMessage)
  };
}

function normalizeVisibleSections(value: unknown, fallback = defaultPlatformLandingSettings.visibleSections): PlatformLandingVisibleSections {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    solution: typeof record.solution === "boolean" ? record.solution : fallback.solution,
    features: typeof record.features === "boolean" ? record.features : fallback.features,
    dashboard: typeof record.dashboard === "boolean" ? record.dashboard : fallback.dashboard,
    pricing: typeof record.pricing === "boolean" ? record.pricing : fallback.pricing,
    demo: typeof record.demo === "boolean" ? record.demo : fallback.demo,
    faq: typeof record.faq === "boolean" ? record.faq : fallback.faq,
    customBlocks: typeof record.customBlocks === "boolean" ? record.customBlocks : fallback.customBlocks
  };
}

function normalizeCustomBlocks(value: unknown, fallback: PlatformLandingCustomBlock[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";

      return title
        ? {
            id:
              typeof record.id === "string" && record.id.trim()
                ? record.id.trim()
                : `block-${index + 1}`,
            type: normalizeEnum(
              record.type,
              "TEXT",
              ["TEXT", "IMAGE_TEXT", "FEATURE_CARD", "TESTIMONIAL", "FAQ", "PLAN", "CTA", "GALLERY", "VIDEO", "FORM"] as const
            ),
            title,
            subtitle: typeof record.subtitle === "string" ? record.subtitle.trim() : "",
            text: typeof record.text === "string" ? record.text.trim() : "",
            imageUrl: typeof record.imageUrl === "string" ? record.imageUrl.trim() : "",
            icon: typeof record.icon === "string" ? record.icon.trim() : "",
            buttonLabel: typeof record.buttonLabel === "string" ? record.buttonLabel.trim() : "",
            buttonHref: typeof record.buttonHref === "string" ? record.buttonHref.trim() : "#",
            backgroundColor: normalizeColor(record.backgroundColor, "#ffffff"),
            alignment: normalizeEnum(record.alignment, "LEFT", ["LEFT", "CENTER", "RIGHT"] as const),
            visible: typeof record.visible === "boolean" ? record.visible : true,
            order: normalizeNumber(record.order, index + 1, 1, 999)
          }
        : undefined;
    })
    .filter((item): item is PlatformLandingCustomBlock => Boolean(item))
    .sort((first, second) => first.order - second.order);

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
    marketingLogoUrl:
      typeof record.marketingLogoUrl === "string" && record.marketingLogoUrl.trim()
        ? record.marketingLogoUrl
        : typeof record.logoUrl === "string" && record.logoUrl.trim()
          ? record.logoUrl
          : defaultPlatformBrand.marketingLogoUrl,
    marketingLogoHeight: normalizeImageHeight(
      record.marketingLogoHeight,
      normalizeImageHeight(record.logoHeight, defaultPlatformBrand.marketingLogoHeight)
    ),
    marketingFooterLogoUrl:
      typeof record.marketingFooterLogoUrl === "string" && record.marketingFooterLogoUrl.trim()
        ? record.marketingFooterLogoUrl
        : typeof record.footerLogoUrl === "string" && record.footerLogoUrl.trim()
          ? record.footerLogoUrl
          : defaultPlatformBrand.marketingFooterLogoUrl,
    marketingFooterLogoHeight: normalizeImageHeight(
      record.marketingFooterLogoHeight,
      normalizeImageHeight(record.footerLogoHeight, defaultPlatformBrand.marketingFooterLogoHeight)
    ),
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
    appearance: normalizeAppearance(record.appearance),
    header: normalizeHeader(record.header),
    seo: normalizeSeo(record.seo),
    general: normalizeGeneral(record.general),
    visibleSections: normalizeVisibleSections(record.visibleSections),
    customBlocks: normalizeCustomBlocks(record.customBlocks, defaultPlatformLandingSettings.customBlocks),
    brandName: normalizeString(record.brandName, defaultPlatformLandingSettings.brandName),
    typography: normalizeTypography(record.typography),
    heroImageUrl: typeof record.heroImageUrl === "string" && record.heroImageUrl.trim()
      ? record.heroImageUrl.trim()
      : defaultPlatformLandingSettings.heroImageUrl,
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
    annualDiscountLabel: normalizeString(record.annualDiscountLabel, defaultPlatformLandingSettings.annualDiscountLabel),
    plans: normalizePlans(record.plans, defaultPlatformLandingSettings.plans),
    demoEyebrow: normalizeString(record.demoEyebrow, defaultPlatformLandingSettings.demoEyebrow),
    demoTitle: normalizeString(record.demoTitle, defaultPlatformLandingSettings.demoTitle),
    demoSubtitle: normalizeString(record.demoSubtitle, defaultPlatformLandingSettings.demoSubtitle),
    demoSteps: normalizeStringList(record.demoSteps, defaultPlatformLandingSettings.demoSteps),
    faqEyebrow: normalizeString(record.faqEyebrow, defaultPlatformLandingSettings.faqEyebrow),
    faqTitle: normalizeString(record.faqTitle, defaultPlatformLandingSettings.faqTitle),
    faqs: normalizeTextBlocks(record.faqs, defaultPlatformLandingSettings.faqs),
    footerTagline: normalizeString(record.footerTagline, defaultPlatformLandingSettings.footerTagline),
    footerCopyright: normalizeString(record.footerCopyright, defaultPlatformLandingSettings.footerCopyright),
    legalLinks: normalizeLinks(record.legalLinks, defaultPlatformLandingSettings.legalLinks),
    solutionLinks: normalizeLinks(record.solutionLinks, defaultPlatformLandingSettings.solutionLinks),
    companyLinks: normalizeLinks(record.companyLinks, defaultPlatformLandingSettings.companyLinks)
  };
}

function normalizeEmailTemplate(
  value: unknown,
  fallback: PlatformEmailTemplate
): PlatformEmailTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    subject: normalizeString(record.subject, fallback.subject),
    preheader: typeof record.preheader === "string" ? record.preheader : fallback.preheader,
    title: normalizeString(record.title, fallback.title),
    body: normalizeString(record.body, fallback.body),
    buttonLabel: typeof record.buttonLabel === "string" ? record.buttonLabel : fallback.buttonLabel,
    footerText: typeof record.footerText === "string" ? record.footerText : fallback.footerText
  };
}

function normalizePlatformEmailSettings(value: unknown): PlatformEmailSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultPlatformEmailSettings;
  }

  const record = value as Record<string, unknown>;
  const templatesRecord =
    record.templates && typeof record.templates === "object" && !Array.isArray(record.templates)
      ? (record.templates as Record<string, unknown>)
      : {};

  return {
    senderName: normalizeString(record.senderName, defaultPlatformEmailSettings.senderName),
    replyTo: typeof record.replyTo === "string" ? record.replyTo : defaultPlatformEmailSettings.replyTo,
    logoUrl: typeof record.logoUrl === "string" && record.logoUrl.trim()
      ? record.logoUrl.trim()
      : defaultPlatformEmailSettings.logoUrl,
    logoHeight: normalizeNumber(record.logoHeight, defaultPlatformEmailSettings.logoHeight, 18, 120),
    backgroundColor: normalizeColor(record.backgroundColor, defaultPlatformEmailSettings.backgroundColor),
    cardColor: normalizeColor(record.cardColor, defaultPlatformEmailSettings.cardColor),
    accentColor: normalizeColor(record.accentColor, defaultPlatformEmailSettings.accentColor),
    textColor: normalizeColor(record.textColor, defaultPlatformEmailSettings.textColor),
    buttonTextColor: normalizeColor(record.buttonTextColor, defaultPlatformEmailSettings.buttonTextColor),
    borderRadius: normalizeNumber(record.borderRadius, defaultPlatformEmailSettings.borderRadius, 0, 32),
    templates: emailTemplateKeys.reduce(
      (templates, key) => ({
        ...templates,
        [key]: normalizeEmailTemplate(templatesRecord[key], defaultPlatformEmailSettings.templates[key])
      }),
      {} as Record<PlatformEmailTemplateKey, PlatformEmailTemplate>
    )
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

export async function getPlatformEmailSettings() {
  const setting = await prisma.platformSetting.findUnique({
    where: {
      key: EMAIL_SETTINGS_KEY
    }
  });

  return normalizePlatformEmailSettings(setting?.value);
}

export async function updatePlatformEmailSettings(settings: PlatformEmailSettings) {
  const setting = await prisma.platformSetting.upsert({
    where: {
      key: EMAIL_SETTINGS_KEY
    },
    update: {
      value: settings as unknown as Prisma.InputJsonValue
    },
    create: {
      key: EMAIL_SETTINGS_KEY,
      value: settings as unknown as Prisma.InputJsonValue
    }
  });

  return normalizePlatformEmailSettings(setting.value);
}
