"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BadgeEuro,
  BarChart3,
  Blocks,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  GripVertical,
  History,
  ImageIcon,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  MonitorSmartphone,
  Moon,
  Palette,
  PanelBottom,
  PanelTop,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound
} from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/hooks/use-api";
import {
  defaultPlatformAdminLoginSettings,
  defaultPlatformEmailSettings,
  defaultPlatformSmsSettings,
  emailTemplateKeys,
  smsTemplateKeys
} from "@/server/platform-settings";
import type {
  PlatformBrand,
  PlatformAdminLoginSettings,
  PlatformEmailSettings,
  PlatformEmailTemplateKey,
  PlatformLandingCustomBlock,
  PlatformLandingHeader,
  PlatformLandingLink,
  PlatformLandingPlan,
  PlatformLandingSettings,
  PlatformLandingTextBlock,
  PlatformSmsSettings,
  PlatformSmsTemplateKey
} from "@/server/platform-settings";

type ManagedRestaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
  _count: {
    tables: number;
    reservations: number;
  };
  metrics?: {
    reservationsToday: number;
    reservationsWeek: number;
    reservationsMonth: number;
    occupancyRate: number;
    peakHours: string;
    performance: string;
    visitors: number;
    conversionRate: number;
  };
};

type SiteEditForm = {
  name: string;
  description: string;
  address: string;
  phone: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone: string;
  ownerAddress: string;
  subscriptionPlan: string;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "PAUSED" | "CANCELLED";
  subscriptionBilling: "MONTHLY" | "ANNUAL";
  subscriptionAmount: string;
  subscriptionNextBillingDate: string;
  billingStatus: "PAID" | "PENDING" | "LATE" | "FREE";
  billingPaidUntil: string;
  billingLastPaymentDate: string;
  billingNotes: string;
  smsServiceEnabled: boolean;
  smsCreditsRemaining: number;
  smsSentCount: number;
  smsLowCreditThreshold: number;
  smsPriceCents: number;
  platformUsers: PlatformRestaurantUser[];
};

type PlatformRestaurantUser = {
  role: "OWNER" | "MANAGER" | "FLOOR_MANAGER" | "WAITER";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type SiteSortMode = "recent" | "name" | "subscriptionDue";

type BrandResponse = {
  brand: PlatformBrand;
};

type LandingResponse = {
  landing: PlatformLandingSettings;
};

type EmailSettingsResponse = {
  emailSettings: PlatformEmailSettings;
};

type SmsSettingsResponse = {
  smsSettings: PlatformSmsSettings;
};

type AdminLoginSettingsResponse = {
  adminLogin: PlatformAdminLoginSettings;
};

type SitesResponse = {
  restaurants: ManagedRestaurant[];
};

type AdminSection =
  | "dashboard"
  | "appearance"
  | "header"
  | "assets"
  | "adminLogin"
  | "content"
  | "blocks"
  | "plans"
  | "features"
  | "seo"
  | "mailing"
  | "sms"
  | "footer"
  | "general"
  | "restaurants";

type PreviewDevice = "desktop" | "tablet" | "mobile";

type TextBlockArrayKey = "features" | "dashboardCards" | "secondaryFeatures" | "faqs";
type LinkArrayKey = "legalLinks" | "solutionLinks" | "companyLinks";
type StringListKey = "workflow" | "demoSteps";

const initialBrandForm: PlatformBrand = {
  siteName: "ToqueTop",
  logoUrl: "/toquetop-logo.svg",
  logoHeight: 48,
  footerLogoUrl: "/toquetop-logo.svg",
  footerLogoHeight: 32,
  marketingLogoUrl: "/toquetop-logo.svg",
  marketingLogoHeight: 48,
  marketingFooterLogoUrl: "/toquetop-logo.svg",
  marketingFooterLogoHeight: 32,
  loginVisualUrl: "/login-restaurant-visual.png",
  adminLoginVisualUrl: "/admin-login-visual-default.svg",
  faviconUrl: "/cest-ma-table-favicon.png",
  logoAlt: "ToqueTop",
  supportEmail: ""
};

const initialLandingForm: PlatformLandingSettings = {
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
    description: "ToqueTop crée votre site restaurant et centralise réservations, plan de salle, disponibilités et préférences clients.",
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
    sectionTitleMaxWidth: 900,
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
    { title: "Réservations en ligne 24/7", text: "Vos clients réservent à tout moment depuis votre site, Google, Instagram ou vos réseaux sociaux, sans interrompre le service.", icon: "Calendar", category: "Réservations", order: 1, visible: true },
    { title: "Rappels automatiques", text: "Réduisez les no-shows jusqu’à 35% grâce aux rappels SMS et e-mail envoyés automatiquement avant chaque réservation.", icon: "Bell", category: "Automatisation", order: 2, visible: true },
    { title: "Analyses et rapports", text: "Suivez remplissage, annulations, no-shows, services, tables et performances pour prendre de meilleures décisions.", icon: "Chart", category: "Pilotage", order: 3, visible: true },
    { title: "Comptabilité et pilotage", text: "Centralisez les informations utiles et préparez une lecture claire de votre activité, service après service.", icon: "Calculator", category: "Gestion", order: 4, visible: true },
    { title: "Service de fidélité", text: "Construisez une relation durable avec vos clients grâce à l’historique, aux préférences et aux actions de fidélisation.", icon: "Heart", category: "Fidélité", order: 5, visible: true },
    { title: "Assistance 24h/24 7j/7", text: "Gardez une solution fiable, accompagnée et prête à évoluer avec vos besoins opérationnels.", icon: "Headset", category: "Support", order: 6, visible: true }
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
    { title: "Règles métier", text: "Minimum avant réservation, durée de service, tables bloquées, vacances et restrictions de capacité." }
  ],
  pricingEyebrow: "Forfaits",
  pricingTitle: "Mensuel ou annuel, choisissez le rythme qui vous convient.",
  pricingSubtitle: "Profitez d’une réduction sur le plan annuel, avec 30 jours gratuits, sans carte bancaire et annulable à tout moment.",
  annualDiscountLabel: "-15% de réduction",
  plans: [
    { name: "Essentiel", price: "49€", annualPrice: "39€", highlight: "Pour lancer la réservation en ligne", featured: false, active: true, buttonLabel: "Commencer gratuitement", features: ["Site vitrine ToqueTop", "Réservations en ligne 24/7", "Intégration Google et réseaux sociaux"] },
    { name: "Pro", price: "89€", annualPrice: "69€", highlight: "Le meilleur choix pour un restaurant actif", featured: true, active: true, buttonLabel: "Essayer Pro gratuitement", features: ["Tout Essentiel", "Plan 3D immersif", "Rappels SMS et e-mail", "Réduction des no-shows jusqu’à 35%"] },
    { name: "Signature", price: "Sur mesure", annualPrice: "Sur mesure", highlight: "Pour groupes, lieux premium et multi-sites", featured: false, active: true, buttonLabel: "Nous contacter", features: ["Multi-restaurants", "Comptabilité et reporting avancé", "Automatisations avancées", "Assistance 24h/24 7j/7"] }
  ],
  demoEyebrow: "Migration accompagnée",
  demoTitle: "Changez pour ToqueTop, on s’occupe de tout !",
  demoSubtitle: "Grâce à une migration simple, reprenez le contrôle de vos réservations et ne payez plus de commission sur vos propres clients. Passez de TheFork, ZenChef, OpenTable ou d’autres systèmes de réservation vers ToqueTop sans interruption de service.",
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
    { title: "Vais-je perdre mes réservations actuelles ?", text: "Non, on récupère vos réservations en cours pour une transition sans interruption." },
    { title: "Vais-je repartir de zéro ?", text: "Non. Nous nous occupons de migrer chaque élément sur votre nouvel espace ToqueTop : menu, plan de table et avis." },
    { title: "L’outil est-il adapté à mon établissement ?", text: "ToqueTop s’adapte à tous types de restaurants, du bistrot au gastronomique." },
    { title: "Changer de solution va-t-il interrompre mon service ?", text: "Non. La migration est fluide, rapide et encadrée par une équipe experte pendant que vous restez concentré sur votre service." }
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

const sections: Array<{ id: AdminSection; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Tableau de bord", description: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "appearance", label: "Graphisme", description: "Couleurs et style", icon: Palette },
  { id: "header", label: "Header", description: "Navigation du site", icon: PanelTop },
  { id: "assets", label: "Logo et favicon", description: "Images de marque", icon: ImageIcon },
  { id: "adminLogin", label: "Page connexion", description: "Connexion restaurant", icon: KeyRound },
  { id: "content", label: "Pages & contenus", description: "Textes principaux", icon: FileText },
  { id: "blocks", label: "Blocs du site", description: "Sections modulaires", icon: Blocks },
  { id: "plans", label: "Forfaits", description: "Offres affichées", icon: BadgeEuro },
  { id: "features", label: "Fonctionnalités", description: "Cartes visibles", icon: ListChecks },
  { id: "seo", label: "SEO", description: "Référencement", icon: Search },
  { id: "mailing", label: "Mailing", description: "Emails envoyés", icon: Mail },
  { id: "sms", label: "SMS", description: "Messages envoyés", icon: MonitorSmartphone },
  { id: "footer", label: "Footer", description: "Bas de page", icon: PanelBottom },
  { id: "general", label: "Paramètres", description: "Coordonnées", icon: Settings },
  { id: "restaurants", label: "Restaurants", description: "Sites clients", icon: Building2 }
];

const blockTypes = [
  "TEXT",
  "IMAGE_TEXT",
  "FEATURE_CARD",
  "TESTIMONIAL",
  "FAQ",
  "PLAN",
  "CTA",
  "GALLERY",
  "VIDEO",
  "FORM"
] as const;

const fontOptions = [
  { label: "Inter — ancienne version", value: "Inter" },
  { label: "Poppins — moderne", value: "Poppins" },
  { label: "Montserrat — premium", value: "Montserrat" },
  { label: "Manrope — SaaS", value: "Manrope" },
  { label: "Playfair Display — élégant", value: "Playfair Display" },
  { label: "Raleway — sobre", value: "Raleway" }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return fallback;
}

function readPlatformUsers(value: unknown): PlatformRestaurantUser[] {
  if (!Array.isArray(value)) {
    return [
      { role: "OWNER", firstName: "", lastName: "", email: "", phone: "" },
      { role: "MANAGER", firstName: "", lastName: "", email: "", phone: "" },
      { role: "FLOOR_MANAGER", firstName: "", lastName: "", email: "", phone: "" },
      { role: "WAITER", firstName: "", lastName: "", email: "", phone: "" }
    ];
  }

  return value
    .filter(isRecord)
    .map((user) => ({
      role:
        user.role === "OWNER" ||
        user.role === "MANAGER" ||
        user.role === "FLOOR_MANAGER" ||
        user.role === "WAITER"
          ? user.role
          : "WAITER",
      firstName: readString(user.firstName),
      lastName: readString(user.lastName),
      email: readString(user.email),
      phone: readString(user.phone)
    }));
}

function siteEditFormFromRestaurant(site?: ManagedRestaurant): SiteEditForm {
  const settings = isRecord(site?.settings) ? site.settings : {};
  const subscription = isRecord(settings.subscription) ? settings.subscription : {};
  const owner = isRecord(settings.owner) ? settings.owner : {};
  const billing = isRecord(settings.billing) ? settings.billing : {};
  const smsService = isRecord(settings.smsService) ? settings.smsService : {};

  return {
    name: site?.name ?? "",
    description: site?.description ?? "",
    address: site?.address ?? "",
    phone: site?.phone ?? "",
    ownerEmail: readString(owner.email) || readString(settings.ownerEmail),
    ownerFirstName: readString(owner.firstName),
    ownerLastName: readString(owner.lastName),
    ownerPhone: readString(owner.phone),
    ownerAddress: readString(owner.address),
    subscriptionPlan: readString(subscription.plan) || "Essentiel",
    subscriptionStatus:
      subscription.status === "ACTIVE" ||
      subscription.status === "PAUSED" ||
      subscription.status === "CANCELLED"
        ? subscription.status
        : "TRIAL",
    subscriptionBilling: subscription.billing === "ANNUAL" ? "ANNUAL" : "MONTHLY",
    subscriptionAmount: readString(subscription.amount),
    subscriptionNextBillingDate: readString(subscription.nextBillingDate),
    billingStatus:
      billing.status === "PAID" ||
      billing.status === "LATE" ||
      billing.status === "FREE"
        ? billing.status
        : "PENDING",
    billingPaidUntil: readString(billing.paidUntil),
    billingLastPaymentDate: readString(billing.lastPaymentDate),
    billingNotes: readString(billing.notes),
    smsServiceEnabled: smsService.enabled === true,
    smsCreditsRemaining: readNumber(smsService.creditsRemaining ?? settings.smsBalance ?? settings.smsRemaining, 0),
    smsSentCount: readNumber(smsService.sentCount ?? settings.smsSent ?? settings.smsSentCount, 0),
    smsLowCreditThreshold: readNumber(smsService.lowCreditThreshold, 10),
    smsPriceCents: readNumber(smsService.priceCents ?? settings.smsPriceCents, 12),
    platformUsers: readPlatformUsers(settings.platformUsers)
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Fichier invalide."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Fichier invalide."));
    reader.readAsDataURL(file);
  });
}

async function imageInputToDataUrl(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  return file ? readFileAsDataUrl(file) : undefined;
}

function withOrderedBlocks(blocks: PlatformLandingCustomBlock[]) {
  return blocks.map((block, index) => ({ ...block, order: index + 1 }));
}

export function PlatformAdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [darkAdmin, setDarkAdmin] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>();
  const [lastSavedAt, setLastSavedAt] = useState<string>();
  const [draggedBlockId, setDraggedBlockId] = useState<string>();
  const [brandForm, setBrandForm] = useState<PlatformBrand>(initialBrandForm);
  const [adminLoginForm, setAdminLoginForm] = useState<PlatformAdminLoginSettings>(defaultPlatformAdminLoginSettings);
  const [landingForm, setLandingForm] = useState<PlatformLandingSettings>(initialLandingForm);
  const [emailForm, setEmailForm] = useState<PlatformEmailSettings>(defaultPlatformEmailSettings);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<PlatformEmailTemplateKey>("reservationConfirmation");
  const [smsForm, setSmsForm] = useState<PlatformSmsSettings>(defaultPlatformSmsSettings);
  const [selectedSmsTemplate, setSelectedSmsTemplate] = useState<PlatformSmsTemplateKey>("reservationConfirmation");
  const [siteForm, setSiteForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    ownerEmail: "",
    ownerPassword: ""
  });
  const [selectedSiteId, setSelectedSiteId] = useState<string>();
  const [siteEditForm, setSiteEditForm] = useState<SiteEditForm>(() => siteEditFormFromRestaurant());
  const [siteSearch, setSiteSearch] = useState("");
  const [siteSort, setSiteSort] = useState<SiteSortMode>("recent");
  const [sitePage, setSitePage] = useState(1);
  const [clientPanelOpen, setClientPanelOpen] = useState(false);

  const brandQuery = useQuery({
    queryKey: ["platform-admin", "brand"],
    queryFn: () => apiFetch<BrandResponse>("/api/platform-admin/settings")
  });

  const landingQuery = useQuery({
    queryKey: ["platform-admin", "landing"],
    queryFn: () => apiFetch<LandingResponse>("/api/platform-admin/landing")
  });

  const adminLoginQuery = useQuery({
    queryKey: ["platform-admin", "admin-login"],
    queryFn: () => apiFetch<AdminLoginSettingsResponse>("/api/platform-admin/admin-login")
  });

  const emailSettingsQuery = useQuery({
    queryKey: ["platform-admin", "email-settings"],
    queryFn: () => apiFetch<EmailSettingsResponse>("/api/platform-admin/email-settings")
  });

  const smsSettingsQuery = useQuery({
    queryKey: ["platform-admin", "sms-settings"],
    queryFn: () => apiFetch<SmsSettingsResponse>("/api/platform-admin/sms-settings")
  });

  const sitesQuery = useQuery({
    queryKey: ["platform-admin", "sites"],
    queryFn: () => apiFetch<SitesResponse>("/api/platform-admin/sites")
  });

  useEffect(() => {
    if (brandQuery.data?.brand) {
      setBrandForm(brandQuery.data.brand);
    }
  }, [brandQuery.data?.brand]);

  useEffect(() => {
    if (landingQuery.data?.landing) {
      setLandingForm(landingQuery.data.landing);
    }
  }, [landingQuery.data?.landing]);

  useEffect(() => {
    if (adminLoginQuery.data?.adminLogin) {
      setAdminLoginForm(adminLoginQuery.data.adminLogin);
    }
  }, [adminLoginQuery.data?.adminLogin]);

  useEffect(() => {
    if (emailSettingsQuery.data?.emailSettings) {
      setEmailForm(emailSettingsQuery.data.emailSettings);
    }
  }, [emailSettingsQuery.data?.emailSettings]);

  useEffect(() => {
    if (smsSettingsQuery.data?.smsSettings) {
      setSmsForm(smsSettingsQuery.data.smsSettings);
    }
  }, [smsSettingsQuery.data?.smsSettings]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  const saveBrandMutation = useMutation({
    mutationFn: () =>
      apiFetch<BrandResponse>("/api/platform-admin/settings", {
        method: "PATCH",
        body: JSON.stringify(brandForm)
      })
  });

  const saveLandingMutation = useMutation({
    mutationFn: () =>
      apiFetch<LandingResponse>("/api/platform-admin/landing", {
        method: "PATCH",
        body: JSON.stringify(landingForm)
      })
  });

  const saveAdminLoginMutation = useMutation({
    mutationFn: () =>
      apiFetch<AdminLoginSettingsResponse>("/api/platform-admin/admin-login", {
        method: "PATCH",
        body: JSON.stringify(adminLoginForm)
      })
  });

  const saveEmailSettingsMutation = useMutation({
    mutationFn: () =>
      apiFetch<EmailSettingsResponse>("/api/platform-admin/email-settings", {
        method: "PATCH",
        body: JSON.stringify(emailForm)
      })
  });

  const saveSmsSettingsMutation = useMutation({
    mutationFn: () =>
      apiFetch<SmsSettingsResponse>("/api/platform-admin/sms-settings", {
        method: "PATCH",
        body: JSON.stringify(smsForm)
      })
  });

  const createSiteMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ restaurant: ManagedRestaurant }>("/api/platform-admin/sites", {
        method: "POST",
        body: JSON.stringify({
          name: siteForm.name,
          description: siteForm.description || undefined,
          address: siteForm.address || undefined,
          phone: siteForm.phone || undefined,
          ownerEmail: siteForm.ownerEmail || undefined,
          ownerPassword: siteForm.ownerPassword || undefined
        })
      }),
    onSuccess: (data) => {
      setMessage(`Site créé : ${data.restaurant.name}`);
      setSiteForm({ name: "", description: "", address: "", phone: "", ownerEmail: "", ownerPassword: "" });
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      window.setTimeout(() => setMessage(undefined), 3500);
    }
  });

  const updateSiteMutation = useMutation({
    mutationFn: () => {
      if (!selectedSiteId) {
        throw new Error("Aucun restaurant sélectionné.");
      }

      return apiFetch<{ restaurant: ManagedRestaurant }>(`/api/platform-admin/sites/${selectedSiteId}`, {
        method: "PATCH",
        body: JSON.stringify(siteEditForm)
      });
    },
    onSuccess: (data) => {
      setMessage(`Restaurant modifié : ${data.restaurant.name}`);
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "sites"] });
      window.setTimeout(() => setMessage(undefined), 3500);
    }
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (restaurantId: string) =>
      apiFetch<void>(`/api/platform-admin/sites/${restaurantId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      setMessage("Restaurant supprimé");
      setSelectedSiteId(undefined);
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      window.setTimeout(() => setMessage(undefined), 3500);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ authenticated: boolean }>("/api/platform-admin/logout", {
        method: "POST"
      }),
    onSuccess: () => router.push("/cmt-admin/login")
  });

  const sites = sitesQuery.data?.restaurants ?? [];
  const selectedSite = sites.find((site) => site.id === selectedSiteId);
  const filteredSites = useMemo(() => {
    const query = siteSearch.trim().toLowerCase();
    const matches = sites.filter((site) => {
      if (!query) {
        return true;
      }

      return [site.name, site.slug, site.address, site.phone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });

    return [...matches].sort((first, second) => {
      if (siteSort === "name") {
        return first.name.localeCompare(second.name, "fr");
      }

      if (siteSort === "subscriptionDue") {
        const firstForm = siteEditFormFromRestaurant(first);
        const secondForm = siteEditFormFromRestaurant(second);

        return (firstForm.subscriptionNextBillingDate || "9999-12-31").localeCompare(
          secondForm.subscriptionNextBillingDate || "9999-12-31"
        );
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }, [siteSearch, siteSort, sites]);
  const sitePageSize = 10;
  const sitePageCount = Math.max(1, Math.ceil(filteredSites.length / sitePageSize));
  const paginatedSites = filteredSites.slice((sitePage - 1) * sitePageSize, sitePage * sitePageSize);
  const activePlans = landingForm.plans.filter((plan) => plan.active);
  const visibleFeatures = landingForm.features.filter((feature) => feature.visible !== false);
  const currentSection = sections.find((section) => section.id === activeSection) ?? sections[0];

  const stats = useMemo(
    () => [
      { label: "Restaurants inscrits", value: sites.length.toString(), detail: "sites en gestion" },
      { label: "Statut du site", value: landingForm.general.maintenanceMode ? "Maintenance" : "En ligne", detail: landingForm.general.maintenanceMode ? "visible avec message" : "accessible publiquement" },
      { label: "Blocs actifs", value: landingForm.customBlocks.filter((block) => block.visible).length.toString(), detail: "sections personnalisées" },
      { label: "Forfaits visibles", value: activePlans.length.toString(), detail: "offres actives" }
    ],
    [activePlans.length, landingForm.customBlocks, landingForm.general.maintenanceMode, sites.length]
  );

  useEffect(() => {
    if (!selectedSite && sites[0]) {
      setSelectedSiteId(sites[0].id);
    }
  }, [selectedSite, sites]);

  useEffect(() => {
    setSiteEditForm(siteEditFormFromRestaurant(selectedSite));
    setClientPanelOpen(false);
  }, [selectedSite?.id]);

  useEffect(() => {
    setSitePage(1);
  }, [siteSearch, siteSort]);

  function markDirty() {
    setDirty(true);
  }

  function updateBrand<K extends keyof PlatformBrand>(key: K, value: PlatformBrand[K]) {
    setBrandForm((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  function updateAdminLogin<K extends keyof PlatformAdminLoginSettings>(key: K, value: PlatformAdminLoginSettings[K]) {
    setAdminLoginForm((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  function updateLandingField<K extends keyof PlatformLandingSettings>(key: K, value: PlatformLandingSettings[K]) {
    setLandingForm((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  function updateAppearance<K extends keyof PlatformLandingSettings["appearance"]>(key: K, value: PlatformLandingSettings["appearance"][K]) {
    setLandingForm((current) => ({ ...current, appearance: { ...current.appearance, [key]: value } }));
    markDirty();
  }

  function updateTypography<K extends keyof PlatformLandingSettings["typography"]>(key: K, value: PlatformLandingSettings["typography"][K]) {
    setLandingForm((current) => ({ ...current, typography: { ...current.typography, [key]: value } }));
    markDirty();
  }

  function updateHeader<K extends keyof PlatformLandingHeader>(key: K, value: PlatformLandingHeader[K]) {
    setLandingForm((current) => ({ ...current, header: { ...current.header, [key]: value } }));
    markDirty();
  }

  function updateSeo<K extends keyof PlatformLandingSettings["seo"]>(key: K, value: PlatformLandingSettings["seo"][K]) {
    setLandingForm((current) => ({ ...current, seo: { ...current.seo, [key]: value } }));
    markDirty();
  }

  function updateGeneral<K extends keyof PlatformLandingSettings["general"]>(key: K, value: PlatformLandingSettings["general"][K]) {
    setLandingForm((current) => ({ ...current, general: { ...current.general, [key]: value } }));
    markDirty();
  }

  function updateEmailField<K extends keyof Omit<PlatformEmailSettings, "templates">>(
    key: K,
    value: PlatformEmailSettings[K]
  ) {
    setEmailForm((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  function updateEmailTemplate<K extends keyof PlatformEmailSettings["templates"][PlatformEmailTemplateKey]>(
    templateKey: PlatformEmailTemplateKey,
    field: K,
    value: PlatformEmailSettings["templates"][PlatformEmailTemplateKey][K]
  ) {
    setEmailForm((current) => ({
      ...current,
      templates: {
        ...current.templates,
        [templateKey]: {
          ...current.templates[templateKey],
          [field]: value
        }
      }
    }));
    markDirty();
  }

  function updateSmsField<K extends keyof Omit<PlatformSmsSettings, "templates">>(
    key: K,
    value: PlatformSmsSettings[K]
  ) {
    setSmsForm((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  function updateSmsTemplate<K extends keyof PlatformSmsSettings["templates"][PlatformSmsTemplateKey]>(
    templateKey: PlatformSmsTemplateKey,
    field: K,
    value: PlatformSmsSettings["templates"][PlatformSmsTemplateKey][K]
  ) {
    setSmsForm((current) => ({
      ...current,
      templates: {
        ...current.templates,
        [templateKey]: {
          ...current.templates[templateKey],
          [field]: value
        }
      }
    }));
    markDirty();
  }

  function updateVisibleSection<K extends keyof PlatformLandingSettings["visibleSections"]>(key: K, value: boolean) {
    setLandingForm((current) => ({ ...current, visibleSections: { ...current.visibleSections, [key]: value } }));
    markDirty();
  }

  function updateStringList(key: StringListKey, index: number, value: string) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
    markDirty();
  }

  function addStringListItem(key: StringListKey) {
    setLandingForm((current) => ({ ...current, [key]: [...current[key], "Nouvel élément"] }));
    markDirty();
  }

  function removeStringListItem(key: StringListKey, index: number) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index)
    }));
    markDirty();
  }

  function updateTextBlock(key: TextBlockArrayKey, index: number, field: keyof PlatformLandingTextBlock, value: string | number | boolean) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
    markDirty();
  }

  function addTextBlock(key: TextBlockArrayKey) {
    setLandingForm((current) => ({
      ...current,
      [key]: [...current[key], { title: "Nouveau titre", text: "Texte à compléter.", visible: true, order: current[key].length + 1 }]
    }));
    markDirty();
  }

  function removeTextBlock(key: TextBlockArrayKey, index: number) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index)
    }));
    markDirty();
  }

  function updateProofPoint(index: number, field: "value" | "label", value: string) {
    setLandingForm((current) => ({
      ...current,
      proofPoints: current.proofPoints.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
    markDirty();
  }

  function addProofPoint() {
    setLandingForm((current) => ({
      ...current,
      proofPoints: [...current.proofPoints, { value: "1", label: "Nouvel indicateur" }]
    }));
    markDirty();
  }

  function removeProofPoint(index: number) {
    setLandingForm((current) => ({
      ...current,
      proofPoints: current.proofPoints.filter((_, itemIndex) => itemIndex !== index)
    }));
    markDirty();
  }

  function updatePlan(index: number, field: keyof PlatformLandingPlan, value: string | boolean | string[]) {
    setLandingForm((current) => ({
      ...current,
      plans: current.plans.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
    markDirty();
  }

  function updatePlanFeatures(index: number, value: string) {
    updatePlan(
      index,
      "features",
      value
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean)
    );
  }

  function addPlan() {
    setLandingForm((current) => ({
      ...current,
      plans: [
        ...current.plans,
        { name: "Nouveau forfait", price: "Sur mesure", annualPrice: "Sur mesure", highlight: "Description du forfait", featured: false, active: true, buttonLabel: "Demander une démo", features: ["Fonctionnalité à compléter"] }
      ]
    }));
    markDirty();
  }

  function removePlan(index: number) {
    setLandingForm((current) => ({
      ...current,
      plans: current.plans.filter((_, itemIndex) => itemIndex !== index)
    }));
    markDirty();
  }

  function updateLink(key: LinkArrayKey, index: number, field: "label" | "href", value: string) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
    markDirty();
  }

  function addLink(key: LinkArrayKey) {
    setLandingForm((current) => ({
      ...current,
      [key]: [...current[key], { label: "Nouveau lien", href: "#" }]
    }));
    markDirty();
  }

  function removeLink(key: LinkArrayKey, index: number) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index)
    }));
    markDirty();
  }

  function updateHeaderLink(index: number, field: keyof PlatformLandingLink, value: string) {
    setLandingForm((current) => ({
      ...current,
      header: {
        ...current.header,
        menuLinks: current.header.menuLinks.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
      }
    }));
    markDirty();
  }

  function addHeaderLink() {
    setLandingForm((current) => ({
      ...current,
      header: {
        ...current.header,
        menuLinks: [...current.header.menuLinks, { label: "Nouveau lien", href: "#" }]
      }
    }));
    markDirty();
  }

  function removeHeaderLink(index: number) {
    setLandingForm((current) => ({
      ...current,
      header: {
        ...current.header,
        menuLinks: current.header.menuLinks.filter((_, itemIndex) => itemIndex !== index)
      }
    }));
    markDirty();
  }

  function moveHeaderLink(index: number, direction: -1 | 1) {
    setLandingForm((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.header.menuLinks.length) {
        return current;
      }

      const menuLinks = [...current.header.menuLinks];
      const [item] = menuLinks.splice(index, 1);
      menuLinks.splice(targetIndex, 0, item);

      return { ...current, header: { ...current.header, menuLinks } };
    });
    markDirty();
  }

  function addCustomBlock() {
    setLandingForm((current) => ({
      ...current,
      customBlocks: [
        ...current.customBlocks,
        {
          id: `block-${Date.now()}`,
          type: "TEXT",
          title: "Nouveau bloc",
          subtitle: "",
          text: "Texte à compléter.",
          imageUrl: "",
          icon: "Sparkles",
          buttonLabel: "",
          buttonHref: "#",
          backgroundColor: "#ffffff",
          alignment: "LEFT",
          visible: true,
          order: current.customBlocks.length + 1
        }
      ]
    }));
    markDirty();
  }

  function updateCustomBlock(index: number, field: keyof PlatformLandingCustomBlock, value: string | number | boolean) {
    setLandingForm((current) => ({
      ...current,
      customBlocks: current.customBlocks.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
    markDirty();
  }

  function removeCustomBlock(index: number) {
    setLandingForm((current) => ({
      ...current,
      customBlocks: withOrderedBlocks(current.customBlocks.filter((_, itemIndex) => itemIndex !== index))
    }));
    markDirty();
  }

  function moveCustomBlock(index: number, direction: -1 | 1) {
    setLandingForm((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.customBlocks.length) {
        return current;
      }

      const blocks = [...current.customBlocks];
      const [item] = blocks.splice(index, 1);
      blocks.splice(targetIndex, 0, item);

      return { ...current, customBlocks: withOrderedBlocks(blocks) };
    });
    markDirty();
  }

  function dropCustomBlock(targetIndex: number) {
    if (!draggedBlockId) {
      return;
    }

    setLandingForm((current) => {
      const sourceIndex = current.customBlocks.findIndex((block) => block.id === draggedBlockId);

      if (sourceIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }

      const blocks = [...current.customBlocks];
      const [item] = blocks.splice(sourceIndex, 1);
      blocks.splice(targetIndex, 0, item);

      return { ...current, customBlocks: withOrderedBlocks(blocks) };
    });
    setDraggedBlockId(undefined);
    markDirty();
  }

  async function updateLogo(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("logoUrl", dataUrl);
    }
  }

  async function updateFavicon(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("faviconUrl", dataUrl);
    }
  }

  async function updateFooterLogo(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("footerLogoUrl", dataUrl);
    }
  }

  async function updateMarketingLogo(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("marketingLogoUrl", dataUrl);
      setBrandForm((current) => ({
        ...current,
        logoUrl: current.logoUrl === "/toquetop-logo.svg" ? dataUrl : current.logoUrl
      }));
    }
  }

  async function updateMarketingFooterLogo(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("marketingFooterLogoUrl", dataUrl);
    }
  }

  async function updateLoginVisual(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("loginVisualUrl", dataUrl);
    }
  }

  async function updateAdminLoginVisual(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("adminLoginVisualUrl", dataUrl);
    }
  }

  async function updateHeroVisual(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateLandingField("heroImageUrl", dataUrl);
    }
  }

  async function updateEmailLogo(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateEmailField("logoUrl", dataUrl);
    }
  }

  async function saveAll() {
    try {
      const [brandData, adminLoginData, landingData, emailData, smsData] = await Promise.all([
        saveBrandMutation.mutateAsync(),
        saveAdminLoginMutation.mutateAsync(),
        saveLandingMutation.mutateAsync(),
        saveEmailSettingsMutation.mutateAsync(),
        saveSmsSettingsMutation.mutateAsync()
      ]);
      setBrandForm(brandData.brand);
      setAdminLoginForm(adminLoginData.adminLogin);
      setLandingForm(landingData.landing);
      setEmailForm(emailData.emailSettings);
      setSmsForm(smsData.smsSettings);
      setDirty(false);
      setLastSavedAt(new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date()));
      setMessage("Modification effectuée");
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "brand"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "admin-login"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "landing"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "email-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "sms-settings"] });
      router.refresh();
      window.setTimeout(() => setMessage(undefined), 3500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’enregistrer.");
    }
  }

  function submitSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createSiteMutation.mutate();
  }

  function updatePlatformUser(index: number, field: keyof PlatformRestaurantUser, value: string) {
    setSiteEditForm((current) => ({
      ...current,
      platformUsers: current.platformUsers.map((user, userIndex) =>
        userIndex === index ? { ...user, [field]: value } : user
      )
    }));
  }

  function addPlatformUser() {
    setSiteEditForm((current) => ({
      ...current,
      platformUsers: [
        ...current.platformUsers,
        { role: "WAITER", firstName: "", lastName: "", email: "", phone: "" }
      ]
    }));
  }

  function removePlatformUser(index: number) {
    setSiteEditForm((current) => ({
      ...current,
      platformUsers: current.platformUsers.filter((_, userIndex) => userIndex !== index)
    }));
  }

  const shellClass = darkAdmin
    ? "min-h-screen bg-[#111514] text-white"
    : "min-h-screen bg-[#f4efe7] text-ink";
  const panelClass = darkAdmin ? "border-white/10 bg-white/[0.06] text-white" : "border-ink/10 bg-white text-ink";
  const mutedText = darkAdmin ? "text-white/60" : "text-ink/60";

  return (
    <div className={shellClass}>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-72 border-r p-4 lg:block ${darkAdmin ? "border-white/10 bg-[#151a18]" : "border-ink/10 bg-white"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#ead6bd] text-ink">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-moss">ToqueTop</p>
              <p className={`text-xs font-bold ${mutedText}`}>Admin plateforme</p>
            </div>
          </div>

          <nav className="mt-5 grid gap-1 overflow-y-auto pr-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-left transition ${
                    active
                      ? "bg-[#ead6bd] text-ink shadow-sm"
                      : darkAdmin
                        ? "text-white/70 hover:bg-white/10 hover:text-white"
                        : "text-ink/70 hover:bg-linen hover:text-ink"
                  }`}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{section.label}</span>
                    <span className="block truncate text-xs font-semibold opacity-65">{section.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto grid gap-2 pt-4">
            <Link className="secondary-button justify-center" href="/" target="_blank">
              <ExternalLink className="h-4 w-4" />
              Voir le site
            </Link>
            <button className="secondary-button justify-center" type="button" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className={`sticky top-0 z-30 border-b px-4 py-4 backdrop-blur xl:px-8 ${darkAdmin ? "border-white/10 bg-[#111514]/85" : "border-ink/10 bg-[#f4efe7]/85"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-xs font-black uppercase ${mutedText}`}>Section</p>
              <h1 className="mt-1 text-2xl font-black">{currentSection.label}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {message ? <span className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-black text-moss">{message}</span> : null}
              {dirty ? <span className="rounded-md bg-amber-100 px-3 py-2 text-xs font-black text-amber-800">Modifications non enregistrées</span> : null}
              <button className="secondary-button" type="button" onClick={() => setDarkAdmin((current) => !current)}>
                <Moon className="h-4 w-4" />
                Mode sombre
              </button>
              <Link className="secondary-button" href="/" target="_blank">
                <Eye className="h-4 w-4" />
                Voir le site
              </Link>
              <button className="primary-button" type="button" onClick={saveAll} disabled={saveBrandMutation.isPending || saveAdminLoginMutation.isPending || saveLandingMutation.isPending || saveEmailSettingsMutation.isPending || saveSmsSettingsMutation.isPending}>
                <Save className="h-4 w-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </header>

        <div className={`grid gap-6 px-4 py-6 xl:px-8 ${activeSection === "restaurants" ? "" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
          <div className="min-w-0">
            {activeSection === "dashboard" ? (
              <AdminSectionLayout
                description="Pilote rapidement l’état du site, les restaurants connectés et les réglages importants."
                icon={<LayoutDashboard className="h-5 w-5" />}
                panelClass={panelClass}
                title="Vue d’ensemble du site"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className={`rounded-md border p-4 ${panelClass}`}>
                      <p className={`text-xs font-black uppercase ${mutedText}`}>{stat.label}</p>
                      <p className="mt-3 text-3xl font-black">{stat.value}</p>
                      <p className={`mt-1 text-sm font-semibold ${mutedText}`}>{stat.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                  <div className={`rounded-md border p-4 ${panelClass}`}>
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-moss" />
                      <h3 className="text-lg font-black">Dernières modifications</h3>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <TimelineItem title="Configuration chargée" text="Les réglages vitrine, marque et restaurants sont synchronisés." />
                      <TimelineItem title="Dernière sauvegarde" text={lastSavedAt ?? "Aucune sauvegarde depuis l’ouverture de cette session."} />
                      <TimelineItem title="Statut" text={landingForm.general.maintenanceMode ? landingForm.general.maintenanceMessage : "Le site est en ligne."} />
                    </div>
                  </div>

                  <div className={`rounded-md border p-4 ${panelClass}`}>
                    <h3 className="text-lg font-black">Accès rapides</h3>
                    <div className="mt-4 grid gap-2">
                      {sections.slice(1, 6).map((section) => (
                        <button key={section.id} className="secondary-button justify-between" type="button" onClick={() => setActiveSection(section.id)}>
                          {section.label}
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "appearance" ? (
              <AdminSectionLayout description="Modifie l’identité visuelle globale avec une prévisualisation immédiate." icon={<Palette className="h-5 w-5" />} panelClass={panelClass} title="Graphisme">
                <div className="grid gap-4 lg:grid-cols-2">
                  <ColorField label="Couleur principale" value={landingForm.appearance.primaryColor} onChange={(value) => updateAppearance("primaryColor", value)} />
                  <ColorField label="Couleur secondaire" value={landingForm.appearance.secondaryColor} onChange={(value) => updateAppearance("secondaryColor", value)} />
                  <ColorField label="Couleur des boutons" value={landingForm.appearance.buttonColor} onChange={(value) => updateAppearance("buttonColor", value)} />
                  <ColorField label="Couleur du texte" value={landingForm.appearance.textColor} onChange={(value) => updateAppearance("textColor", value)} />
                  <ColorField label="Couleur de fond" value={landingForm.appearance.backgroundColor} onChange={(value) => updateAppearance("backgroundColor", value)} />
                  <FontSelect label="Police des titres" value={landingForm.appearance.headingFont} onChange={(value) => updateAppearance("headingFont", value)} />
                  <FontSelect label="Police des textes" value={landingForm.appearance.bodyFont} onChange={(value) => updateAppearance("bodyFont", value)} />
                  <label className="text-sm font-semibold">
                    Arrondis des boutons : {landingForm.appearance.buttonRadius}px
                    <input className="mt-3 w-full accent-moss" type="range" min={0} max={32} value={landingForm.appearance.buttonRadius} onChange={(event) => updateAppearance("buttonRadius", Number(event.target.value))} />
                  </label>
                  <label className="text-sm font-semibold">
                    Style général
                    <select className="control mt-1 w-full" value={landingForm.appearance.stylePreset} onChange={(event) => updateAppearance("stylePreset", event.target.value as PlatformLandingSettings["appearance"]["stylePreset"])}>
                      <option value="MODERN">Moderne</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="SOBER">Sobre</option>
                      <option value="WARM">Chaleureux</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <RangeField label="Taille du titre principal" max={96} min={42} value={landingForm.typography.heroTitleSize} onChange={(value) => updateTypography("heroTitleSize", value)} />
                  <RangeField label="Taille du sous-titre principal" max={28} min={14} value={landingForm.typography.heroSubtitleSize} onChange={(value) => updateTypography("heroSubtitleSize", value)} />
                  <RangeField label="Taille des titres de section" max={72} min={28} value={landingForm.typography.sectionTitleSize} onChange={(value) => updateTypography("sectionTitleSize", value)} />
                  <RangeField label="Largeur des titres de section" max={1200} min={420} value={landingForm.typography.sectionTitleMaxWidth} onChange={(value) => updateTypography("sectionTitleMaxWidth", value)} />
                  <RangeField label="Taille des textes de section" max={24} min={13} value={landingForm.typography.sectionTextSize} onChange={(value) => updateTypography("sectionTextSize", value)} />
                  <RangeField label="Taille des titres de cartes" max={34} min={14} value={landingForm.typography.cardTitleSize} onChange={(value) => updateTypography("cardTitleSize", value)} />
                  <RangeField label="Taille des textes de cartes" max={22} min={12} value={landingForm.typography.cardTextSize} onChange={(value) => updateTypography("cardTextSize", value)} />
                </div>

                <LiveStylePreview landing={landingForm} brand={brandForm} />
              </AdminSectionLayout>
            ) : null}

            {activeSection === "header" ? (
              <AdminSectionLayout description="Configure le haut de page, les liens, le bouton principal et le comportement mobile." icon={<PanelTop className="h-5 w-5" />} panelClass={panelClass} title="Header / En-tête">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Position du logo
                    <select className="control mt-1 w-full" value={landingForm.header.logoPosition} onChange={(event) => updateHeader("logoPosition", event.target.value as PlatformLandingHeader["logoPosition"])}>
                      <option value="LEFT">Gauche</option>
                      <option value="CENTER">Centré</option>
                    </select>
                  </label>
                  <ColorField label="Couleur du header" allowTransparent value={landingForm.header.backgroundColor} onChange={(value) => updateHeader("backgroundColor", value)} />
                  <Field label="Bouton principal du header" value={landingForm.header.primaryButtonLabel} onChange={(value) => updateHeader("primaryButtonLabel", value)} />
                  <Field label="Lien du bouton principal" value={landingForm.header.primaryButtonHref} onChange={(value) => updateHeader("primaryButtonHref", value)} />
                  <Field label="Libellé menu mobile" value={landingForm.header.mobileMenuLabel} onChange={(value) => updateHeader("mobileMenuLabel", value)} />
                  <label className="text-sm font-semibold">
                    Hauteur de l’en-tête : {landingForm.header.height}px
                    <input className="mt-3 w-full accent-moss" type="range" min={56} max={120} value={landingForm.header.height} onChange={(event) => updateHeader("height", Number(event.target.value))} />
                  </label>
                  <Toggle label="Header fixe au scroll" checked={landingForm.header.sticky} onChange={(value) => updateHeader("sticky", value)} />
                </div>

                <EditableLinks
                  items={landingForm.header.menuLinks}
                  title="Texte du menu et ordre des liens"
                  onAdd={addHeaderLink}
                  onMove={moveHeaderLink}
                  onRemove={removeHeaderLink}
                  onUpdate={updateHeaderLink}
                />
              </AdminSectionLayout>
            ) : null}

            {activeSection === "assets" ? (
              <AdminSectionLayout description="Gère séparément les logos du site vitrine, des sites de réservation, le favicon et le visuel de connexion." icon={<ImageIcon className="h-5 w-5" />} panelClass={panelClass} title="Logo et favicon">
                <div className="grid gap-4 lg:grid-cols-2">
                  <AssetCard
                    alt={brandForm.logoAlt}
                    accept="image/svg+xml,.svg"
                    buttonLabel="Importer le logo SVG ToqueTop"
                    description="Format accepté : SVG. L’URL /toquetop-logo.svg servira toujours ce logo."
                    height={brandForm.marketingLogoHeight}
                    image={brandForm.marketingLogoUrl}
                    title="Logo SVG ToqueTop"
                    onUpload={updateMarketingLogo}
                  />
                  <AssetCard alt={brandForm.logoAlt} buttonLabel="Remplacer le logo footer vitrine" height={brandForm.marketingFooterLogoHeight} image={brandForm.marketingFooterLogoUrl} title="Logo footer vitrine" onUpload={updateMarketingFooterLogo} />
                  <AssetCard alt={brandForm.logoAlt} buttonLabel="Remplacer le logo réservation" height={brandForm.logoHeight} image={brandForm.logoUrl} title="Logo site de réservation" onUpload={updateLogo} />
                  <AssetCard alt={brandForm.logoAlt} buttonLabel="Remplacer le logo footer réservation" height={brandForm.footerLogoHeight} image={brandForm.footerLogoUrl} title="Logo footer réservation" onUpload={updateFooterLogo} />
                  <AssetCard alt="Favicon" buttonLabel="Remplacer le favicon" height={56} image={brandForm.faviconUrl} title="Favicon" onUpload={updateFavicon} />
                  <AssetCard alt="Visuel de connexion client" buttonLabel="Remplacer le visuel client" image={brandForm.loginVisualUrl} imageClassName="aspect-[4/5] h-auto w-full object-cover" title="Visuel page connexion client" onUpload={updateLoginVisual} />
                  <AssetCard alt="Visuel de connexion Dashboard Live" buttonLabel="Remplacer le visuel Dashboard" image={brandForm.adminLoginVisualUrl} imageClassName="aspect-[4/5] h-auto w-full object-cover" title="Visuel connexion Dashboard Live" onUpload={updateAdminLoginVisual} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Nom du site" value={brandForm.siteName} onChange={(value) => updateBrand("siteName", value)} />
                  <Field label="Texte alternatif du logo" value={brandForm.logoAlt} onChange={(value) => updateBrand("logoAlt", value)} />
                  <label className="text-sm font-semibold">
                    Taille du logo vitrine : {brandForm.marketingLogoHeight}px
                    <input className="mt-3 w-full accent-moss" type="range" min={18} max={96} value={brandForm.marketingLogoHeight} onChange={(event) => updateBrand("marketingLogoHeight", Number(event.target.value))} />
                  </label>
                  <label className="text-sm font-semibold">
                    Taille du logo réservation : {brandForm.logoHeight}px
                    <input className="mt-3 w-full accent-moss" type="range" min={18} max={96} value={brandForm.logoHeight} onChange={(event) => updateBrand("logoHeight", Number(event.target.value))} />
                  </label>
                  <label className="text-sm font-semibold">
                    Espacement autour du logo : {landingForm.header.logoSpacing}px
                    <input className="mt-3 w-full accent-moss" type="range" min={0} max={40} value={landingForm.header.logoSpacing} onChange={(event) => updateHeader("logoSpacing", Number(event.target.value))} />
                  </label>
                  <label className="text-sm font-semibold">
                    Taille du logo footer vitrine : {brandForm.marketingFooterLogoHeight}px
                    <input className="mt-3 w-full accent-moss" type="range" min={18} max={96} value={brandForm.marketingFooterLogoHeight} onChange={(event) => updateBrand("marketingFooterLogoHeight", Number(event.target.value))} />
                  </label>
                  <label className="text-sm font-semibold">
                    Taille du logo footer réservation : {brandForm.footerLogoHeight}px
                    <input className="mt-3 w-full accent-moss" type="range" min={18} max={96} value={brandForm.footerLogoHeight} onChange={(event) => updateBrand("footerLogoHeight", Number(event.target.value))} />
                  </label>
                  <button className="secondary-button self-end" type="button" onClick={() => updateBrand("marketingFooterLogoUrl", brandForm.marketingLogoUrl)}>
                    Utiliser le logo vitrine en footer vitrine
                  </button>
                  <button className="secondary-button self-end" type="button" onClick={() => updateBrand("footerLogoUrl", brandForm.logoUrl)}>
                    Utiliser le logo réservation en footer réservation
                  </button>
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "adminLogin" ? (
              <AdminSectionLayout
                description="Modifie les textes affichés sur la page de connexion des restaurateurs."
                icon={<KeyRound className="h-5 w-5" />}
                panelClass={panelClass}
                title="Page connexion"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className={`rounded-md border p-4 ${panelClass}`}>
                    <div className="mb-4">
                      <p className="text-xs font-black uppercase text-moss">Connexion Dashboard Live</p>
                      <h3 className="mt-1 text-xl font-black">Textes du visuel gauche</h3>
                      <p className={`mt-2 text-sm font-semibold leading-6 ${mutedText}`}>
                        Utilise <span className="font-black text-moss">{"{{restaurantName}}"}</span> pour intégrer automatiquement le nom du restaurant sur ses sous-domaines.
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <Field label="Pastille" value={adminLoginForm.badge} onChange={(value) => updateAdminLogin("badge", value)} />
                      <Field label="Titre principal" value={adminLoginForm.title} onChange={(value) => updateAdminLogin("title", value)} />
                      <Textarea label="Description" value={adminLoginForm.description} onChange={(value) => updateAdminLogin("description", value)} />
                    </div>
                  </div>

                  <div className={`overflow-hidden rounded-md border ${panelClass}`}>
                    <div className="relative min-h-[520px] bg-ink text-white">
                      <img
                        alt="Aperçu connexion Dashboard Live"
                        className="absolute inset-0 h-full w-full object-cover"
                        src="/admin-login-visual"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/75" />
                      <div className="relative flex min-h-[520px] flex-col justify-between p-8">
                        <img alt={brandForm.logoAlt} className="h-12 w-auto max-w-[220px] object-contain drop-shadow" src="/toquetop-logo.svg" />
                        <div>
                          <p className="mb-4 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
                            {adminLoginForm.badge.replace(/\{\{\s*restaurantName\s*\}\}/g, "Au Bureau")}
                          </p>
                          <h3 className="text-4xl font-black leading-[0.96]">
                            {adminLoginForm.title.replace(/\{\{\s*restaurantName\s*\}\}/g, "Au Bureau")}
                          </h3>
                          <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-white/78">
                            {adminLoginForm.description.replace(/\{\{\s*restaurantName\s*\}\}/g, "Au Bureau")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "content" ? (
              <AdminSectionLayout description="Modifie le contenu principal de la page vitrine, les CTA et l’ordre visible des grandes sections." icon={<FileText className="h-5 w-5" />} panelClass={panelClass} title="Pages & contenus">
                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <AssetCard alt="Visuel de première page" buttonLabel="Remplacer le visuel" image={landingForm.heroImageUrl} imageClassName="aspect-video h-auto w-full object-cover" title="Photo / visuel de première page" onUpload={updateHeroVisual} />
                  <div className="rounded-md border border-ink/10 bg-linen p-4 text-ink">
                    <Field label="URL du visuel de première page" value={landingForm.heroImageUrl} onChange={(value) => updateLandingField("heroImageUrl", value)} />
                    <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">
                      Tu peux importer une image ou renseigner une URL. Ce visuel est utilisé en arrière-plan de la première section du site.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Nom affiché" value={landingForm.brandName} onChange={(value) => updateLandingField("brandName", value)} />
                  <Field label="Titre principal" value={landingForm.heroTitle} onChange={(value) => updateLandingField("heroTitle", value)} />
                  <Field label="Sous-titre court" value={landingForm.heroEyebrow} onChange={(value) => updateLandingField("heroEyebrow", value)} />
                  <Textarea label="Description courte" value={landingForm.heroSubtitle} onChange={(value) => updateLandingField("heroSubtitle", value)} />
                  <Field label="Texte bouton principal" value={landingForm.primaryCtaLabel} onChange={(value) => updateLandingField("primaryCtaLabel", value)} />
                  <Field label="Lien bouton principal" value={landingForm.primaryCtaHref} onChange={(value) => updateLandingField("primaryCtaHref", value)} />
                  <Field label="Texte bouton secondaire" value={landingForm.secondaryCtaLabel} onChange={(value) => updateLandingField("secondaryCtaLabel", value)} />
                  <Field label="Lien bouton secondaire" value={landingForm.secondaryCtaHref} onChange={(value) => updateLandingField("secondaryCtaHref", value)} />
                  <Field label="Texte bouton démo" value={landingForm.demoCtaLabel} onChange={(value) => updateLandingField("demoCtaLabel", value)} />
                  <Field label="Lien bouton démo" value={landingForm.demoCtaHref} onChange={(value) => updateLandingField("demoCtaHref", value)} />
                </div>

                <Checklist title="Sections visibles ou masquées">
                  {Object.entries(landingForm.visibleSections).map(([key, value]) => (
                    <Toggle key={key} label={sectionLabel(key)} checked={value} onChange={(checked) => updateVisibleSection(key as keyof PlatformLandingSettings["visibleSections"], checked)} />
                  ))}
                </Checklist>

                <EditableProofPoints items={landingForm.proofPoints} onAdd={addProofPoint} onRemove={removeProofPoint} onUpdate={updateProofPoint} />
                <div className={`rounded-md border p-4 ${panelClass}`}>
                  <div>
                    <p className="text-sm font-black uppercase text-moss">Étapes Solutions</p>
                    <p className="mt-1 text-sm font-semibold opacity-65">
                      Modifie le bloc “Une plateforme complète” de la page d’accueil.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <Field label="Petit titre" value={landingForm.solutionEyebrow} onChange={(value) => updateLandingField("solutionEyebrow", value)} />
                    <Textarea label="Titre du bloc" value={landingForm.solutionTitle} onChange={(value) => updateLandingField("solutionTitle", value)} />
                  </div>
                  <div className="mt-5">
                    <EditableStringList title="Étapes Solutions" items={landingForm.workflow} onAdd={() => addStringListItem("workflow")} onRemove={(index) => removeStringListItem("workflow", index)} onUpdate={(index, value) => updateStringList("workflow", index, value)} />
                  </div>
                </div>
                <EditableStringList title="Étapes Démo" items={landingForm.demoSteps} onAdd={() => addStringListItem("demoSteps")} onRemove={(index) => removeStringListItem("demoSteps", index)} onUpdate={(index, value) => updateStringList("demoSteps", index, value)} />
              </AdminSectionLayout>
            ) : null}

            {activeSection === "blocks" ? (
              <AdminSectionLayout description="Ajoute, réordonne ou masque les blocs personnalisés de la page vitrine." icon={<Blocks className="h-5 w-5" />} panelClass={panelClass} title="Blocs du site">
                <div className="flex justify-end">
                  <button className="primary-button" type="button" onClick={addCustomBlock}>
                    <Plus className="h-4 w-4" />
                    Ajouter un bloc
                  </button>
                </div>
                <div className="grid gap-4">
                  {landingForm.customBlocks.map((block, index) => (
                    <div
                      key={block.id}
                      className={`rounded-md border p-4 ${panelClass}`}
                      draggable
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={() => setDraggedBlockId(block.id)}
                      onDrop={() => dropCustomBlock(index)}
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-moss" />
                          <p className="font-black">Bloc #{index + 1}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <IconButton label="Monter" onClick={() => moveCustomBlock(index, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
                          <IconButton label="Descendre" onClick={() => moveCustomBlock(index, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
                          <IconButton label="Supprimer" onClick={() => removeCustomBlock(index)}><Trash2 className="h-4 w-4" /></IconButton>
                        </div>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <label className="text-sm font-semibold">
                          Type de bloc
                          <select className="control mt-1 w-full" value={block.type} onChange={(event) => updateCustomBlock(index, "type", event.target.value)}>
                            {blockTypes.map((type) => <option key={type} value={type}>{blockTypeLabel(type)}</option>)}
                          </select>
                        </label>
                        <Field label="Titre" value={block.title} onChange={(value) => updateCustomBlock(index, "title", value)} />
                        <Field label="Sous-titre" value={block.subtitle} onChange={(value) => updateCustomBlock(index, "subtitle", value)} />
                        <Field label="Icône" value={block.icon} onChange={(value) => updateCustomBlock(index, "icon", value)} />
                        <Textarea label="Texte" value={block.text} onChange={(value) => updateCustomBlock(index, "text", value)} />
                        <Field label="Image" value={block.imageUrl} onChange={(value) => updateCustomBlock(index, "imageUrl", value)} />
                        <Field label="Bouton" value={block.buttonLabel} onChange={(value) => updateCustomBlock(index, "buttonLabel", value)} />
                        <Field label="Lien du bouton" value={block.buttonHref} onChange={(value) => updateCustomBlock(index, "buttonHref", value || "#")} />
                        <ColorField label="Couleur de fond" value={block.backgroundColor} onChange={(value) => updateCustomBlock(index, "backgroundColor", value)} />
                        <label className="text-sm font-semibold">
                          Alignement
                          <select className="control mt-1 w-full" value={block.alignment} onChange={(event) => updateCustomBlock(index, "alignment", event.target.value)}>
                            <option value="LEFT">Gauche</option>
                            <option value="CENTER">Centré</option>
                            <option value="RIGHT">Droite</option>
                          </select>
                        </label>
                        <Toggle label="Bloc visible" checked={block.visible} onChange={(value) => updateCustomBlock(index, "visible", value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "plans" ? (
              <AdminSectionLayout description="Crée les offres, active les forfaits et choisis celui mis en avant." icon={<BadgeEuro className="h-5 w-5" />} panelClass={panelClass} title="Forfaits">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Eyebrow" value={landingForm.pricingEyebrow} onChange={(value) => updateLandingField("pricingEyebrow", value)} />
                  <Field label="Titre de section" value={landingForm.pricingTitle} onChange={(value) => updateLandingField("pricingTitle", value)} />
                  <Field label="Libellé réduction annuelle" value={landingForm.annualDiscountLabel} onChange={(value) => updateLandingField("annualDiscountLabel", value)} />
                  <Textarea label="Description" value={landingForm.pricingSubtitle} onChange={(value) => updateLandingField("pricingSubtitle", value)} />
                </div>
                <div className="flex justify-end">
                  <button className="primary-button" type="button" onClick={addPlan}>
                    <Plus className="h-4 w-4" />
                    Ajouter un forfait
                  </button>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {landingForm.plans.map((plan, index) => (
                    <div key={`${plan.name}-${index}`} className={`rounded-md border p-4 ${panelClass}`}>
                      <Field label="Nom" value={plan.name} onChange={(value) => updatePlan(index, "name", value)} />
                      <Field label="Prix mensuel" value={plan.price} onChange={(value) => updatePlan(index, "price", value)} />
                      <Field label="Prix annuel / mois" value={plan.annualPrice} onChange={(value) => updatePlan(index, "annualPrice", value)} />
                      <Field label="Texte du bouton" value={plan.buttonLabel} onChange={(value) => updatePlan(index, "buttonLabel", value)} />
                      <Textarea label="Description" value={plan.highlight} onChange={(value) => updatePlan(index, "highlight", value)} />
                      <Toggle label="Mettre ce forfait en avant" checked={plan.featured} onChange={(value) => updatePlan(index, "featured", value)} />
                      <Toggle label="Forfait actif" checked={plan.active} onChange={(value) => updatePlan(index, "active", value)} />
                      <Textarea label="Options, une par ligne" value={plan.features.join("\n")} onChange={(value) => updatePlanFeatures(index, value)} />
                      <button className="secondary-button mt-3 w-full" type="button" onClick={() => removePlan(index)}>
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "features" ? (
              <AdminSectionLayout description="Organise les fonctionnalités affichées, leur catégorie, icône et ordre d’affichage." icon={<ListChecks className="h-5 w-5" />} panelClass={panelClass} title="Fonctionnalités">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Eyebrow" value={landingForm.featuresEyebrow} onChange={(value) => updateLandingField("featuresEyebrow", value)} />
                  <Field label="Titre" value={landingForm.featuresTitle} onChange={(value) => updateLandingField("featuresTitle", value)} />
                  <Textarea label="Description" value={landingForm.featuresSubtitle} onChange={(value) => updateLandingField("featuresSubtitle", value)} />
                </div>
                <EditableTextBlocks
                  addLabel="Ajouter une fonctionnalité"
                  featureMode
                  items={landingForm.features}
                  onAdd={() => addTextBlock("features")}
                  onRemove={(index) => removeTextBlock("features", index)}
                  onUpdate={(index, field, value) => updateTextBlock("features", index, field, value)}
                  title="Fonctionnalités affichées"
                />
                <EditableTextBlocks
                  addLabel="Ajouter une carte dashboard"
                  items={landingForm.dashboardCards}
                  onAdd={() => addTextBlock("dashboardCards")}
                  onRemove={(index) => removeTextBlock("dashboardCards", index)}
                  onUpdate={(index, field, value) => updateTextBlock("dashboardCards", index, field, value)}
                  title="Cartes dashboard"
                />
                <EditableTextBlocks
                  addLabel="Ajouter un bloc secondaire"
                  items={landingForm.secondaryFeatures}
                  onAdd={() => addTextBlock("secondaryFeatures")}
                  onRemove={(index) => removeTextBlock("secondaryFeatures", index)}
                  onUpdate={(index, field, value) => updateTextBlock("secondaryFeatures", index, field, value)}
                  title="Blocs secondaires"
                />
              </AdminSectionLayout>
            ) : null}

            {activeSection === "seo" ? (
              <AdminSectionLayout description="Prépare le référencement naturel et les aperçus de partage." icon={<Search className="h-5 w-5" />} panelClass={panelClass} title="SEO">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Titre SEO" value={landingForm.seo.title} onChange={(value) => updateSeo("title", value)} />
                  <Field label="URL personnalisée" value={landingForm.seo.customUrl} onChange={(value) => updateSeo("customUrl", value)} />
                  <Textarea label="Meta description" value={landingForm.seo.description} onChange={(value) => updateSeo("description", value)} />
                  <Textarea label="Mots-clés" value={landingForm.seo.keywords} onChange={(value) => updateSeo("keywords", value)} />
                  <Field label="Image de partage" value={landingForm.seo.shareImageUrl} onChange={(value) => updateSeo("shareImageUrl", value)} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <SeoPreview title="Aperçu Google" url={landingForm.seo.customUrl} heading={landingForm.seo.title} description={landingForm.seo.description} />
                  <SocialPreview landing={landingForm} />
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "mailing" ? (
              <AdminSectionLayout description="Modifie les emails envoyés automatiquement : inscription, mot de passe oublié, réservations, rappels et annulations." icon={<Mail className="h-5 w-5" />} panelClass={panelClass} title="Mailing">
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="grid gap-4">
                    <AssetCard alt="Logo email" buttonLabel="Remplacer le logo email" height={emailForm.logoHeight} image={emailForm.logoUrl} title="Logo des emails" onUpload={updateEmailLogo} />
                    <div className="grid gap-4 rounded-md border border-ink/10 bg-linen p-4 text-ink">
                      <Field label="Nom d’expéditeur affiché" value={emailForm.senderName} onChange={(value) => updateEmailField("senderName", value)} />
                      <Field label="Adresse de réponse" type="email" value={emailForm.replyTo} onChange={(value) => updateEmailField("replyTo", value)} />
                      <RangeField label="Taille du logo email" max={120} min={18} value={emailForm.logoHeight} onChange={(value) => updateEmailField("logoHeight", value)} />
                      <RangeField label="Arrondi du bloc email" max={32} min={0} value={emailForm.borderRadius} onChange={(value) => updateEmailField("borderRadius", value)} />
                      <ColorField label="Fond email" value={emailForm.backgroundColor} onChange={(value) => updateEmailField("backgroundColor", value)} />
                      <ColorField label="Bloc email" value={emailForm.cardColor} onChange={(value) => updateEmailField("cardColor", value)} />
                      <ColorField label="Couleur accent / bouton" value={emailForm.accentColor} onChange={(value) => updateEmailField("accentColor", value)} />
                      <ColorField label="Couleur du texte" value={emailForm.textColor} onChange={(value) => updateEmailField("textColor", value)} />
                      <ColorField label="Texte du bouton" value={emailForm.buttonTextColor} onChange={(value) => updateEmailField("buttonTextColor", value)} />
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2 rounded-md border border-ink/10 bg-linen p-3 text-ink sm:grid-cols-2">
                      {emailTemplateKeys.map((templateKey) => (
                        <button
                          key={templateKey}
                          className={`rounded-md px-3 py-2 text-left text-sm font-black transition ${
                            selectedEmailTemplate === templateKey ? "bg-[#ead6bd] text-ink" : "bg-white text-ink/70 hover:text-ink"
                          }`}
                          type="button"
                          onClick={() => setSelectedEmailTemplate(templateKey)}
                        >
                          {emailTemplateLabel(templateKey)}
                        </button>
                      ))}
                    </div>

                    <div className={`rounded-md border p-4 ${panelClass}`}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase text-moss">Modèle</p>
                          <h3 className="text-lg font-black">{emailTemplateLabel(selectedEmailTemplate)}</h3>
                        </div>
                        <Toggle
                          label="Actif"
                          checked={emailForm.templates[selectedEmailTemplate].enabled}
                          onChange={(value) => updateEmailTemplate(selectedEmailTemplate, "enabled", value)}
                        />
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Field label="Objet du mail" value={emailForm.templates[selectedEmailTemplate].subject} onChange={(value) => updateEmailTemplate(selectedEmailTemplate, "subject", value)} />
                        <Field label="Pré-header" value={emailForm.templates[selectedEmailTemplate].preheader} onChange={(value) => updateEmailTemplate(selectedEmailTemplate, "preheader", value)} />
                        <Field label="Titre" value={emailForm.templates[selectedEmailTemplate].title} onChange={(value) => updateEmailTemplate(selectedEmailTemplate, "title", value)} />
                        <Field label="Texte du bouton" value={emailForm.templates[selectedEmailTemplate].buttonLabel} onChange={(value) => updateEmailTemplate(selectedEmailTemplate, "buttonLabel", value)} />
                        <Textarea label="Corps du mail" value={emailForm.templates[selectedEmailTemplate].body} onChange={(value) => updateEmailTemplate(selectedEmailTemplate, "body", value)} />
                        <Textarea label="Texte discret de bas de mail" value={emailForm.templates[selectedEmailTemplate].footerText} onChange={(value) => updateEmailTemplate(selectedEmailTemplate, "footerText", value)} />
                      </div>
                    </div>

                    <div className="rounded-md border border-ink/10 bg-linen p-4 text-ink">
                      <p className="text-sm font-black">Variables disponibles</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
                        {"{{siteName}}, {{customerName}}, {{customerEmail}}, {{restaurantName}}, {{restaurantAddress}}, {{reservationReference}}, {{reservationDate}}, {{reservationTime}}, {{reservationEndTime}}, {{guests}}, {{tableLabel}}, {{reservationUrl}}, {{resetUrl}}, {{loginUrl}}, {{expiration}}"}
                      </p>
                    </div>

                    <EmailTemplatePreview emailSettings={emailForm} templateKey={selectedEmailTemplate} brand={brandForm} />
                  </div>
                </div>

              </AdminSectionLayout>
            ) : null}

            {activeSection === "sms" ? (
              <AdminSectionLayout description="Configure les SMS envoyés automatiquement : confirmations, modifications, annulations et rappels de réservation." icon={<MonitorSmartphone className="h-5 w-5" />} panelClass={panelClass} title="SMS">
                <div className="grid gap-4 rounded-md border border-ink/10 bg-white p-4 text-ink lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="grid gap-4">
                    <div>
                      <p className="text-xs font-black uppercase text-moss">SMS transactionnels</p>
                      <h3 className="mt-1 text-xl font-black">Service SMS</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
                        Configure les SMS envoyés lors des confirmations, modifications, annulations et rappels de réservation.
                      </p>
                    </div>
                    <Toggle
                      label="Activer l’envoi de SMS"
                      checked={smsForm.enabled}
                      onChange={(value) => updateSmsField("enabled", value)}
                    />
                    <Field label="Nom d’expéditeur SMS" value={smsForm.senderName} onChange={(value) => updateSmsField("senderName", value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11))} />
                    <div className={`rounded-md border p-4 ${smsForm.creditsRemaining <= smsForm.lowCreditThreshold ? "border-amber-300 bg-amber-50" : "border-ink/10 bg-linen"}`}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-semibold">
                          SMS disponibles
                          <input
                            className="control mt-1 w-full"
                            min={0}
                            type="number"
                            value={smsForm.creditsRemaining}
                            onChange={(event) => updateSmsField("creditsRemaining", Number(event.target.value))}
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Alerte stock faible
                          <input
                            className="control mt-1 w-full"
                            min={0}
                            type="number"
                            value={smsForm.lowCreditThreshold}
                            onChange={(event) => updateSmsField("lowCreditThreshold", Number(event.target.value))}
                          />
                        </label>
                      </div>
                      {smsForm.creditsRemaining <= smsForm.lowCreditThreshold ? (
                        <p className="mt-3 text-sm font-black text-amber-800">
                          Attention : il reste peu de SMS disponibles.
                        </p>
                      ) : null}
                    </div>
                    <label className="text-sm font-semibold">
                      Rappel avant réservation : {smsForm.reminderMinutesBefore} minutes
                      <input
                        className="control mt-1 w-full"
                        min={15}
                        max={2880}
                        type="number"
                        value={smsForm.reminderMinutesBefore}
                        onChange={(event) => updateSmsField("reminderMinutesBefore", Number(event.target.value))}
                      />
                    </label>
                    <div className="rounded-md border border-ink/10 bg-linen p-4">
                      <p className="text-sm font-black">Activer chaque SMS</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {smsTemplateKeys.map((templateKey) => (
                          <Toggle
                            key={templateKey}
                            label={smsTemplateLabel(templateKey)}
                            checked={smsForm.templates[templateKey].enabled}
                            onChange={(value) => updateSmsTemplate(templateKey, "enabled", value)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-ink/10 bg-linen p-4">
                      <p className="text-sm font-black">Variables SMS</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
                        {"{{siteName}}, {{customerName}}, {{restaurantName}}, {{restaurantAddress}}, {{reservationReference}}, {{reservationDate}}, {{reservationTime}}, {{reservationEndTime}}, {{guests}}, {{tableLabel}}"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2 rounded-md border border-ink/10 bg-linen p-3 text-ink sm:grid-cols-2">
                      {smsTemplateKeys.map((templateKey) => (
                        <button
                          key={templateKey}
                          className={`rounded-md px-3 py-2 text-left text-sm font-black transition ${
                            selectedSmsTemplate === templateKey ? "bg-[#ead6bd] text-ink" : "bg-white text-ink/70 hover:text-ink"
                          }`}
                          type="button"
                          onClick={() => setSelectedSmsTemplate(templateKey)}
                        >
                          {smsTemplateLabel(templateKey)}
                        </button>
                      ))}
                    </div>
                    <div className={`rounded-md border p-4 ${panelClass}`}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase text-moss">Modèle SMS</p>
                          <h3 className="text-lg font-black">{smsTemplateLabel(selectedSmsTemplate)}</h3>
                        </div>
                        <Toggle
                          label="Actif"
                          checked={smsForm.templates[selectedSmsTemplate].enabled}
                          onChange={(value) => updateSmsTemplate(selectedSmsTemplate, "enabled", value)}
                        />
                      </div>
                      <Textarea
                        label="Message SMS"
                        value={smsForm.templates[selectedSmsTemplate].message}
                        onChange={(value) => updateSmsTemplate(selectedSmsTemplate, "message", value.slice(0, 480))}
                      />
                      <p className={`mt-2 text-xs font-bold ${mutedText}`}>
                        {smsForm.templates[selectedSmsTemplate].message.length}/480 caractères
                      </p>
                    </div>
                    <SmsTemplatePreview smsSettings={smsForm} templateKey={selectedSmsTemplate} />
                  </div>
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "footer" ? (
              <AdminSectionLayout description="Configure les logos, slogans, liens et informations du bas de page." icon={<PanelBottom className="h-5 w-5" />} panelClass={panelClass} title="Footer">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Slogan du footer" value={landingForm.footerTagline} onChange={(value) => updateLandingField("footerTagline", value)} />
                  <Field label="Copyright" value={landingForm.footerCopyright} onChange={(value) => updateLandingField("footerCopyright", value)} />
                  <Field label="Email de contact" value={landingForm.general.contactEmail} onChange={(value) => updateGeneral("contactEmail", value)} />
                  <ColorField label="Couleur du footer" value={landingForm.appearance.primaryColor} onChange={(value) => updateAppearance("primaryColor", value)} />
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  <EditableFooterLinks items={landingForm.legalLinks} onAdd={() => addLink("legalLinks")} onRemove={(index) => removeLink("legalLinks", index)} onUpdate={(index, field, value) => updateLink("legalLinks", index, field, value)} title="Légal" />
                  <EditableFooterLinks items={landingForm.solutionLinks} onAdd={() => addLink("solutionLinks")} onRemove={(index) => removeLink("solutionLinks", index)} onUpdate={(index, field, value) => updateLink("solutionLinks", index, field, value)} title="Solutions ToqueTop" />
                  <EditableFooterLinks items={landingForm.companyLinks} onAdd={() => addLink("companyLinks")} onRemove={(index) => removeLink("companyLinks", index)} onUpdate={(index, field, value) => updateLink("companyLinks", index, field, value)} title="L’entreprise" />
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "general" ? (
              <AdminSectionLayout description="Renseigne les informations de contact, réseaux sociaux et le mode maintenance." icon={<Settings className="h-5 w-5" />} panelClass={panelClass} title="Paramètres généraux">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Nom du site" value={landingForm.general.siteName} onChange={(value) => updateGeneral("siteName", value)} />
                  <Field label="Email de contact" value={landingForm.general.contactEmail} onChange={(value) => updateGeneral("contactEmail", value)} />
                  <Field label="Téléphone" value={landingForm.general.phone} onChange={(value) => updateGeneral("phone", value)} />
                  <Field label="Adresse" value={landingForm.general.address} onChange={(value) => updateGeneral("address", value)} />
                  <Field label="Facebook" value={landingForm.general.facebookUrl} onChange={(value) => updateGeneral("facebookUrl", value)} />
                  <Field label="Instagram" value={landingForm.general.instagramUrl} onChange={(value) => updateGeneral("instagramUrl", value)} />
                  <Field label="LinkedIn" value={landingForm.general.linkedinUrl} onChange={(value) => updateGeneral("linkedinUrl", value)} />
                  <Toggle label="Mode maintenance" checked={landingForm.general.maintenanceMode} onChange={(value) => updateGeneral("maintenanceMode", value)} />
                  <Textarea label="Message de maintenance" value={landingForm.general.maintenanceMessage} onChange={(value) => updateGeneral("maintenanceMessage", value)} />
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "restaurants" ? (
              <AdminSectionLayout description="Crée, modifie et pilote les restaurants clients rattachés à la plateforme." icon={<Building2 className="h-5 w-5" />} panelClass={panelClass} title="Restaurants">
                <form className={`rounded-md border p-4 ${panelClass}`} onSubmit={submitSite}>
                  <h3 className="text-lg font-black">Créer un nouveau site restaurant</h3>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <Field label="Nom du restaurant" required value={siteForm.name} onChange={(value) => setSiteForm((current) => ({ ...current, name: value }))} />
                    <Field label="Identifiant administrateur" type="email" value={siteForm.ownerEmail} onChange={(value) => setSiteForm((current) => ({ ...current, ownerEmail: value }))} />
                    <Field label="Mot de passe administrateur" type="password" value={siteForm.ownerPassword} onChange={(value) => setSiteForm((current) => ({ ...current, ownerPassword: value }))} />
                    <Field label="Téléphone" value={siteForm.phone} onChange={(value) => setSiteForm((current) => ({ ...current, phone: value }))} />
                    <Field label="Adresse" value={siteForm.address} onChange={(value) => setSiteForm((current) => ({ ...current, address: value }))} />
                    <Textarea label="Description courte" value={siteForm.description} onChange={(value) => setSiteForm((current) => ({ ...current, description: value }))} />
                  </div>
                  {createSiteMutation.error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{createSiteMutation.error.message}</p> : null}
                  <button className="primary-button mt-4" type="submit" disabled={createSiteMutation.isPending}>
                    <Building2 className="h-4 w-4" />
                    Générer le site
                  </button>
                </form>

                <div className="grid gap-4">
                  <div className={`rounded-md border p-4 ${panelClass}`}>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">Liste des restaurants</h3>
                        <p className={`mt-1 text-sm font-semibold ${mutedText}`}>
                          10 restaurants par page, recherche et tri par création ou échéance d’abonnement.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="min-w-[240px] text-sm font-semibold">
                          Recherche par nom
                          <input
                            className="control mt-1 w-full"
                            placeholder="Nom, slug, adresse..."
                            value={siteSearch}
                            onChange={(event) => setSiteSearch(event.target.value)}
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Affichage
                          <select className="control mt-1 w-full" value={siteSort} onChange={(event) => setSiteSort(event.target.value as SiteSortMode)}>
                            <option value="recent">Derniers restaurants</option>
                            <option value="name">Nom du restaurant</option>
                            <option value="subscriptionDue">Échéance d’abonnement</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-md border border-ink/10">
                      <div className="grid grid-cols-[minmax(220px,1.2fr)_150px_150px_120px_130px] gap-3 bg-linen px-3 py-2 text-xs font-black uppercase text-ink/55">
                        <span>Restaurant</span>
                        <span>Forfait</span>
                        <span>Échéance</span>
                        <span>Tables</span>
                        <span>Réservations</span>
                      </div>
                      {paginatedSites.map((site) => {
                        const selected = selectedSiteId === site.id;
                        const siteFormValue = siteEditFormFromRestaurant(site);

                        return (
                          <button
                            key={site.id}
                            className={`grid w-full grid-cols-[minmax(220px,1.2fr)_150px_150px_120px_130px] gap-3 border-t border-ink/10 px-3 py-3 text-left text-sm font-semibold transition ${
                              selected
                                ? "bg-[#ead6bd]/45"
                                : darkAdmin
                                  ? "hover:bg-white/10"
                                  : "hover:bg-white"
                            }`}
                            type="button"
                            onClick={() => setSelectedSiteId(site.id)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-black">{site.name}</span>
                              <span className={`mt-1 block truncate text-xs font-medium ${mutedText}`}>
                                {site.address || "Adresse à compléter"}
                              </span>
                              <span className="mt-1 block truncate text-xs font-bold text-moss">
                                {site.slug}.toquetop.com
                              </span>
                            </span>
                            <span>{siteFormValue.subscriptionPlan}</span>
                            <span>{siteFormValue.subscriptionNextBillingDate || "À définir"}</span>
                            <span>{site._count.tables}</span>
                            <span>{site._count.reservations}</span>
                          </button>
                        );
                      })}
                      {filteredSites.length === 0 ? <p className={`border-t px-3 py-8 text-center text-sm font-semibold ${mutedText}`}>Aucun restaurant ne correspond à la recherche.</p> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className={`text-sm font-semibold ${mutedText}`}>
                        {filteredSites.length} restaurant{filteredSites.length > 1 ? "s" : ""} · page {sitePage}/{sitePageCount}
                      </p>
                      <div className="flex gap-2">
                        <button className="secondary-button h-9" type="button" disabled={sitePage <= 1} onClick={() => setSitePage((page) => Math.max(1, page - 1))}>
                          <ChevronLeft className="h-4 w-4" />
                          Précédent
                        </button>
                        <button className="secondary-button h-9" type="button" disabled={sitePage >= sitePageCount} onClick={() => setSitePage((page) => Math.min(sitePageCount, page + 1))}>
                          Suivant
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-md border p-4 ${panelClass}`}>
                    {selectedSite ? (
                      <div className="grid gap-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className={`text-xs font-black uppercase ${mutedText}`}>Gestion du restaurant</p>
                            <h3 className="mt-1 text-xl font-black">{selectedSite.name}</h3>
                            <p className={`mt-1 text-sm font-semibold ${mutedText}`}>
                              Créé le {new Intl.DateTimeFormat("fr-FR").format(new Date(selectedSite.createdAt))}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link className="secondary-button" href={`/sites/${selectedSite.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                              Voir
                            </Link>
                            <Link className="secondary-button" href="/admin" target="_blank">
                              <Settings className="h-4 w-4" />
                              Gérer
                            </Link>
                            <Link className="secondary-button" href={`/cmt-admin/restaurants/${selectedSite.id}/plans`} target="_blank">
                              <MonitorSmartphone className="h-4 w-4" />
                              Plans 2D / 3D
                            </Link>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <Field label="Nom du restaurant" required value={siteEditForm.name} onChange={(value) => setSiteEditForm((current) => ({ ...current, name: value }))} />
                          <Field label="E-mail du restaurant" type="email" value={siteEditForm.ownerEmail} onChange={(value) => setSiteEditForm((current) => ({ ...current, ownerEmail: value }))} />
                          <Field label="Téléphone" value={siteEditForm.phone} onChange={(value) => setSiteEditForm((current) => ({ ...current, phone: value }))} />
                          <Field label="Adresse" value={siteEditForm.address} onChange={(value) => setSiteEditForm((current) => ({ ...current, address: value }))} />
                          <Textarea label="Description courte" value={siteEditForm.description} onChange={(value) => setSiteEditForm((current) => ({ ...current, description: value }))} />
                        </div>

                        <div className="rounded-md border border-ink/10 bg-linen p-4 text-ink">
                          <button
                            className="secondary-button mb-4"
                            type="button"
                            onClick={() => setClientPanelOpen((current) => !current)}
                          >
                            <UserRound className="h-4 w-4" />
                            Client propriétaire
                          </button>
                          {clientPanelOpen ? (
                            <div className="mb-4 grid gap-4 rounded-md border border-ink/10 bg-white p-4 lg:grid-cols-2">
                              <Field label="Prénom du client" value={siteEditForm.ownerFirstName} onChange={(value) => setSiteEditForm((current) => ({ ...current, ownerFirstName: value }))} />
                              <Field label="Nom du client" value={siteEditForm.ownerLastName} onChange={(value) => setSiteEditForm((current) => ({ ...current, ownerLastName: value }))} />
                              <Field label="Adresse mail du client" type="email" value={siteEditForm.ownerEmail} onChange={(value) => setSiteEditForm((current) => ({ ...current, ownerEmail: value }))} />
                              <Field label="Numéro du client" value={siteEditForm.ownerPhone} onChange={(value) => setSiteEditForm((current) => ({ ...current, ownerPhone: value }))} />
                              <Textarea label="Adresse du client" value={siteEditForm.ownerAddress} onChange={(value) => setSiteEditForm((current) => ({ ...current, ownerAddress: value }))} />
                            </div>
                          ) : null}

                          <div className="mb-4 flex items-center gap-2">
                            <BadgeEuro className="h-5 w-5 text-moss" />
                            <h4 className="text-lg font-black">Abonnement</h4>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <label className="text-sm font-semibold">
                              Forfait
                              <select className="control mt-1 w-full" value={siteEditForm.subscriptionPlan} onChange={(event) => setSiteEditForm((current) => ({ ...current, subscriptionPlan: event.target.value }))}>
                                {[...landingForm.plans.map((plan) => plan.name), "Essentiel", "Pro", "Signature"].filter((plan, index, values) => values.indexOf(plan) === index).map((plan) => (
                                  <option key={plan} value={plan}>{plan}</option>
                                ))}
                              </select>
                            </label>
                            <Field label="Montant" value={siteEditForm.subscriptionAmount} onChange={(value) => setSiteEditForm((current) => ({ ...current, subscriptionAmount: value }))} />
                            <label className="text-sm font-semibold">
                              Statut
                              <select className="control mt-1 w-full" value={siteEditForm.subscriptionStatus} onChange={(event) => setSiteEditForm((current) => ({ ...current, subscriptionStatus: event.target.value as SiteEditForm["subscriptionStatus"] }))}>
                                <option value="TRIAL">Essai</option>
                                <option value="ACTIVE">Actif</option>
                                <option value="PAUSED">En pause</option>
                                <option value="CANCELLED">Annulé</option>
                              </select>
                            </label>
                            <label className="text-sm font-semibold">
                              Facturation
                              <select className="control mt-1 w-full" value={siteEditForm.subscriptionBilling} onChange={(event) => setSiteEditForm((current) => ({ ...current, subscriptionBilling: event.target.value as SiteEditForm["subscriptionBilling"] }))}>
                                <option value="MONTHLY">Mensuelle</option>
                                <option value="ANNUAL">Annuelle</option>
                              </select>
                            </label>
                            <Field label="Prochaine échéance" type="date" value={siteEditForm.subscriptionNextBillingDate} onChange={(value) => setSiteEditForm((current) => ({ ...current, subscriptionNextBillingDate: value }))} />
                          </div>
                        </div>

                        <div className="rounded-md border border-ink/10 bg-white/50 p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-moss" />
                            <h4 className="text-lg font-black">Facturation client</h4>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <label className="text-sm font-semibold">
                              Statut du paiement
                              <select className="control mt-1 w-full" value={siteEditForm.billingStatus} onChange={(event) => setSiteEditForm((current) => ({ ...current, billingStatus: event.target.value as SiteEditForm["billingStatus"] }))}>
                                <option value="PAID">Payé</option>
                                <option value="PENDING">En attente</option>
                                <option value="LATE">En retard</option>
                                <option value="FREE">Offert</option>
                              </select>
                            </label>
                            <Field label="Payé jusqu’au" type="date" value={siteEditForm.billingPaidUntil} onChange={(value) => setSiteEditForm((current) => ({ ...current, billingPaidUntil: value }))} />
                            <Field label="Dernier paiement" type="date" value={siteEditForm.billingLastPaymentDate} onChange={(value) => setSiteEditForm((current) => ({ ...current, billingLastPaymentDate: value }))} />
                            <Textarea label="Notes de facturation" value={siteEditForm.billingNotes} onChange={(value) => setSiteEditForm((current) => ({ ...current, billingNotes: value }))} />
                          </div>
                        </div>

                        <div className="rounded-md border border-ink/10 bg-white/50 p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <MonitorSmartphone className="h-5 w-5 text-moss" />
                            <h4 className="text-lg font-black">Service SMS du restaurant</h4>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <Toggle
                              label="Option SMS activée"
                              checked={siteEditForm.smsServiceEnabled}
                              onChange={(value) => setSiteEditForm((current) => ({ ...current, smsServiceEnabled: value }))}
                            />
                            <label className="text-sm font-semibold">
                              SMS restants
                              <input
                                className="control mt-1 w-full"
                                min={0}
                                type="number"
                                value={siteEditForm.smsCreditsRemaining}
                                onChange={(event) => setSiteEditForm((current) => ({ ...current, smsCreditsRemaining: Number(event.target.value) || 0 }))}
                              />
                            </label>
                            <label className="text-sm font-semibold">
                              SMS envoyés
                              <input
                                className="control mt-1 w-full"
                                min={0}
                                type="number"
                                value={siteEditForm.smsSentCount}
                                onChange={(event) => setSiteEditForm((current) => ({ ...current, smsSentCount: Number(event.target.value) || 0 }))}
                              />
                            </label>
                            <label className="text-sm font-semibold">
                              Alerte stock faible
                              <input
                                className="control mt-1 w-full"
                                min={0}
                                type="number"
                                value={siteEditForm.smsLowCreditThreshold}
                                onChange={(event) => setSiteEditForm((current) => ({ ...current, smsLowCreditThreshold: Number(event.target.value) || 0 }))}
                              />
                            </label>
                            <label className="text-sm font-semibold">
                              Prix par SMS (centimes)
                              <input
                                className="control mt-1 w-full"
                                min={0}
                                type="number"
                                value={siteEditForm.smsPriceCents}
                                onChange={(event) => setSiteEditForm((current) => ({ ...current, smsPriceCents: Number(event.target.value) || 0 }))}
                              />
                            </label>
                          </div>
                          {siteEditForm.smsCreditsRemaining <= siteEditForm.smsLowCreditThreshold ? (
                            <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-black text-amber-800">
                              Alerte : ce restaurant arrive bientôt à court de SMS.
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-md border border-ink/10 bg-white/50 p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-moss" />
                            <h4 className="text-lg font-black">Statistiques</h4>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                          <MetricCard label="Réservations" value={selectedSite._count.reservations.toString()} />
                          <MetricCard label="Aujourd’hui" value={(selectedSite.metrics?.reservationsToday ?? 0).toString()} />
                          <MetricCard label="Semaine" value={(selectedSite.metrics?.reservationsWeek ?? 0).toString()} />
                          <MetricCard label="Mois" value={(selectedSite.metrics?.reservationsMonth ?? 0).toString()} />
                          <MetricCard label="Occupation" value={`${selectedSite.metrics?.occupancyRate ?? 0}%`} />
                          <MetricCard label="Heures de pointe" value={selectedSite.metrics?.peakHours ?? "À analyser"} />
                          <MetricCard label="Performance" value={selectedSite.metrics?.performance ?? "À analyser"} />
                          <MetricCard label="Visiteurs" value={(selectedSite.metrics?.visitors ?? 0).toString()} />
                          <MetricCard label="Conversion" value={`${selectedSite.metrics?.conversionRate ?? 0}%`} />
                          <MetricCard label="Tables" value={selectedSite._count.tables.toString()} />
                          <MetricCard label="Fuseau horaire" value={selectedSite.timezone} />
                          </div>
                        </div>

                        <div className="rounded-md border border-ink/10 bg-white/50 p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <UsersRound className="h-5 w-5 text-moss" />
                              <h4 className="text-lg font-black">Gestion des utilisateurs</h4>
                            </div>
                            <button className="secondary-button" type="button" onClick={addPlatformUser}>
                              <Plus className="h-4 w-4" />
                              Ajouter un utilisateur
                            </button>
                          </div>
                          <div className="grid gap-3">
                            {siteEditForm.platformUsers.map((user, index) => (
                              <div key={`${user.role}-${index}`} className="grid gap-3 rounded-md border border-ink/10 bg-white p-3 lg:grid-cols-[150px_1fr_1fr_1.2fr_1fr_44px]">
                                <label className="text-xs font-black uppercase text-ink/50">
                                  Rôle
                                  <select className="control mt-1 w-full" value={user.role} onChange={(event) => updatePlatformUser(index, "role", event.target.value)}>
                                    <option value="OWNER">Propriétaire</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="FLOOR_MANAGER">Responsable de salle</option>
                                    <option value="WAITER">Serveur</option>
                                  </select>
                                </label>
                                <Field label="Prénom" value={user.firstName} onChange={(value) => updatePlatformUser(index, "firstName", value)} />
                                <Field label="Nom" value={user.lastName} onChange={(value) => updatePlatformUser(index, "lastName", value)} />
                                <Field label="E-mail" type="email" value={user.email} onChange={(value) => updatePlatformUser(index, "email", value)} />
                                <Field label="Téléphone" value={user.phone} onChange={(value) => updatePlatformUser(index, "phone", value)} />
                                <button className="icon-button self-end" type="button" title="Supprimer" onClick={() => removePlatformUser(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {(updateSiteMutation.error || deleteSiteMutation.error) ? (
                          <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
                            {updateSiteMutation.error?.message ?? deleteSiteMutation.error?.message}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap justify-between gap-3">
                          <button className="primary-button" type="button" disabled={updateSiteMutation.isPending} onClick={() => updateSiteMutation.mutate()}>
                            <Save className="h-4 w-4" />
                            Enregistrer le restaurant
                          </button>
                          <button
                            className="danger-button"
                            type="button"
                            disabled={deleteSiteMutation.isPending}
                            onClick={() => {
                              if (window.confirm("Supprimer ce restaurant ? Cette action supprimera aussi ses tables, réservations et blocages.")) {
                                deleteSiteMutation.mutate(selectedSite.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer le restaurant
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`py-8 text-center text-sm font-semibold ${mutedText}`}>Sélectionne un restaurant pour accéder à sa gestion.</p>
                    )}
                  </div>
                </div>
              </AdminSectionLayout>
            ) : null}
          </div>

          {activeSection === "restaurants" ? null : (
            <aside className="min-w-0 xl:sticky xl:top-28 xl:self-start">
              <PreviewPanel
                brand={brandForm}
                device={previewDevice}
                landing={landingForm}
                onDeviceChange={setPreviewDevice}
                panelClass={panelClass}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminSectionLayout({
  children,
  description,
  icon,
  panelClass,
  title
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  panelClass: string;
  title: string;
}) {
  return (
    <section className={`rounded-lg border p-5 shadow-soft ${panelClass}`}>
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#ead6bd] text-ink">{icon}</span>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold opacity-65">{description}</p>
        </div>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  onChange,
  required,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input className="control mt-1 w-full" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-3 text-ink">
      <p className="text-xs font-black uppercase text-ink/45">{label}</p>
      <p className="mt-2 break-words text-lg font-black">{value}</p>
    </div>
  );
}

function Textarea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="text-sm font-semibold lg:col-span-2">
      {label}
      <textarea className="control mt-1 min-h-24 w-full py-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RangeField({
  label,
  max,
  min,
  onChange,
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="text-sm font-semibold">
      {label} : {value}px
      <input
        className="mt-3 w-full accent-moss"
        max={max}
        min={min}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ColorField({
  allowTransparent,
  label,
  onChange,
  value
}: {
  allowTransparent?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <span className="mt-1 grid grid-cols-[48px_1fr] gap-2">
        <input
          className="h-10 w-12 rounded-md border border-ink/10 bg-white p-1"
          type="color"
          value={value === "transparent" ? "#ffffff" : value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input className="control w-full" value={value} onChange={(event) => onChange(event.target.value)} placeholder={allowTransparent ? "transparent ou #000000" : "#000000"} />
      </span>
    </label>
  );
}

function FontSelect({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select className="control mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        {fontOptions.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-ink/10 bg-white/50 px-3 py-3 text-sm font-bold">
      <span>{label}</span>
      <input className="h-5 w-5 accent-moss" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="secondary-button h-9 px-3" title={label} type="button" onClick={onClick}>
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function Checklist({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4">
      <h3 className="text-base font-black text-ink">{title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function AssetCard({
  alt,
  accept = "image/svg+xml,.svg,image/png,image/jpeg,image/webp,image/*",
  buttonLabel,
  description,
  height,
  image,
  imageClassName,
  onUpload,
  title
}: {
  alt: string;
  accept?: string;
  buttonLabel: string;
  description?: string;
  height?: number;
  image: string;
  imageClassName?: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  title: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4 text-sm font-semibold text-ink">
      <p>{title}</p>
      {description ? <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">{description}</p> : null}
      <span className="mt-3 flex min-h-32 items-center justify-center overflow-hidden rounded-md bg-white p-3">
        <img src={image} alt={alt} className={imageClassName ?? "max-w-full object-contain"} style={height ? { height } : undefined} />
      </span>
      <label className="secondary-button mt-3 w-full cursor-pointer">
        <ImagePlus className="h-4 w-4" />
        {buttonLabel}
        <input className="sr-only" type="file" accept={accept} onChange={onUpload} />
      </label>
    </div>
  );
}

function EditableLinks({
  items,
  onAdd,
  onMove,
  onRemove,
  onUpdate,
  title
}: {
  items: PlatformLandingLink[];
  onAdd: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof PlatformLandingLink, value: string) => void;
  title: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-ink">{title}</h3>
        <button className="secondary-button h-9" type="button" onClick={onAdd}>Ajouter</button>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid gap-2 rounded-md border border-ink/10 bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
            <input className="control w-full" value={item.label} onChange={(event) => onUpdate(index, "label", event.target.value)} />
            <input className="control w-full" value={item.href} onChange={(event) => onUpdate(index, "href", event.target.value)} />
            <span className="flex gap-2">
              <IconButton label="Monter" onClick={() => onMove(index, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
              <IconButton label="Descendre" onClick={() => onMove(index, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
              <IconButton label="Supprimer" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></IconButton>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableProofPoints({
  items,
  onAdd,
  onRemove,
  onUpdate
}: {
  items: Array<{ value: string; label: string }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: "value" | "label", value: string) => void;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-ink">Indicateurs</h3>
        <button className="secondary-button h-9" type="button" onClick={onAdd}>Ajouter</button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map((point, index) => (
          <div key={`${point.value}-${index}`} className="grid gap-2 rounded-md border border-ink/10 bg-white p-3 md:grid-cols-[100px_1fr_auto]">
            <input className="control w-full" value={point.value} onChange={(event) => onUpdate(index, "value", event.target.value)} />
            <input className="control w-full" value={point.label} onChange={(event) => onUpdate(index, "label", event.target.value)} />
            <IconButton label="Supprimer" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableStringList({
  items,
  onAdd,
  onRemove,
  onUpdate,
  title
}: {
  items: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
  title: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-ink">{title}</h3>
        <button className="secondary-button h-9" type="button" onClick={onAdd}>Ajouter</button>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className="control w-full" value={item} onChange={(event) => onUpdate(index, event.target.value)} />
            <button className="secondary-button" type="button" onClick={() => onRemove(index)}>Retirer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableTextBlocks({
  addLabel,
  featureMode,
  items,
  onAdd,
  onRemove,
  onUpdate,
  title
}: {
  addLabel: string;
  featureMode?: boolean;
  items: PlatformLandingTextBlock[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof PlatformLandingTextBlock, value: string | number | boolean) => void;
  title: string;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-linen p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-ink">{title}</h3>
        <button className="secondary-button h-9" type="button" onClick={onAdd}>{addLabel}</button>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-md border border-ink/10 bg-white p-3 text-ink">
            <Field label="Titre" value={item.title} onChange={(value) => onUpdate(index, "title", value)} />
            <Textarea label="Texte" value={item.text} onChange={(value) => onUpdate(index, "text", value)} />
            {featureMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Icône" value={item.icon ?? ""} onChange={(value) => onUpdate(index, "icon", value)} />
                <Field label="Catégorie" value={item.category ?? ""} onChange={(value) => onUpdate(index, "category", value)} />
                <Field label="Ordre" type="number" value={String(item.order ?? index + 1)} onChange={(value) => onUpdate(index, "order", Number(value))} />
                <Toggle label="Visible" checked={item.visible !== false} onChange={(value) => onUpdate(index, "visible", value)} />
              </div>
            ) : null}
            <button className="secondary-button mt-3 w-full" type="button" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
              Retirer
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditableFooterLinks({
  items,
  onAdd,
  onRemove,
  onUpdate,
  title
}: {
  items: PlatformLandingLink[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: "label" | "href", value: string) => void;
  title: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-3 text-ink">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-black">{title}</h4>
        <button className="secondary-button h-9" type="button" onClick={onAdd}>Ajouter</button>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="rounded-md border border-ink/10 bg-white p-2">
            <input className="control w-full" value={item.label} onChange={(event) => onUpdate(index, "label", event.target.value)} />
            <input className="control mt-2 w-full" value={item.href} onChange={(event) => onUpdate(index, "href", event.target.value)} />
            <button className="secondary-button mt-2 h-9 w-full" type="button" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
              Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveStylePreview({ brand, landing }: { brand: PlatformBrand; landing: PlatformLandingSettings }) {
  return (
    <div
      className="overflow-hidden rounded-md border border-ink/10 p-5"
      style={{
        backgroundColor: landing.appearance.backgroundColor,
        color: landing.appearance.textColor,
        fontFamily: landing.appearance.bodyFont
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <img src={brand.marketingLogoUrl} alt={brand.logoAlt} className="max-w-[180px] object-contain" style={{ height: brand.marketingLogoHeight }} />
        <button
          className="px-4 py-2 text-sm font-black"
          style={{
            backgroundColor: landing.appearance.buttonColor,
            borderRadius: landing.appearance.buttonRadius,
            color: landing.appearance.primaryColor
          }}
          type="button"
        >
          {landing.header.primaryButtonLabel}
        </button>
      </div>
      <p className="mt-8 text-sm font-black uppercase" style={{ color: landing.appearance.secondaryColor }}>{landing.heroEyebrow}</p>
      <h3 className="mt-3 text-3xl font-black leading-tight" style={{ fontFamily: landing.appearance.headingFont }}>{landing.heroTitle}</h3>
      <p className="mt-3 max-w-2xl text-sm font-semibold opacity-70">{landing.heroSubtitle}</p>
    </div>
  );
}

function PreviewPanel({
  brand,
  device,
  landing,
  onDeviceChange,
  panelClass
}: {
  brand: PlatformBrand;
  device: PreviewDevice;
  landing: PlatformLandingSettings;
  onDeviceChange: (device: PreviewDevice) => void;
  panelClass: string;
}) {
  const widthClass = device === "mobile" ? "max-w-[220px]" : device === "tablet" ? "max-w-[300px]" : "max-w-full";

  return (
    <section className={`rounded-lg border p-4 shadow-soft ${panelClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase opacity-60">Prévisualisation</p>
          <h2 className="mt-1 text-lg font-black">Desktop / tablette / mobile</h2>
        </div>
        <MonitorSmartphone className="h-5 w-5 text-moss" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["desktop", "tablet", "mobile"] as const).map((item) => (
          <button key={item} className={`rounded-md px-3 py-2 text-xs font-black ${device === item ? "bg-[#ead6bd] text-ink" : "border border-ink/10 bg-white text-ink"}`} type="button" onClick={() => onDeviceChange(item)}>
            {item === "desktop" ? "Desktop" : item === "tablet" ? "Tablette" : "Mobile"}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center rounded-md bg-ink/5 p-3">
        <div
          className={`overflow-hidden rounded-md border border-ink/10 bg-white shadow-sm transition-all ${widthClass}`}
          style={{ backgroundColor: landing.appearance.backgroundColor, color: landing.appearance.textColor }}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-3" style={{ backgroundColor: landing.header.backgroundColor === "transparent" ? "#1d2521" : landing.header.backgroundColor }}>
            <img src={brand.marketingLogoUrl} alt={brand.logoAlt} className="max-w-[120px] object-contain" style={{ height: Math.min(brand.marketingLogoHeight, 36) }} />
            <span className="rounded bg-white px-2 py-1 text-[10px] font-black text-ink">{landing.header.primaryButtonLabel}</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-black uppercase" style={{ color: landing.appearance.secondaryColor }}>{landing.heroEyebrow}</p>
            <h3 className="mt-2 text-xl font-black leading-tight">{landing.heroTitle}</h3>
            <p className="mt-2 line-clamp-3 text-xs font-semibold opacity-70">{landing.heroSubtitle}</p>
            <div className="mt-3 grid gap-2">
              {visiblePreviewItems(landing).map((item) => (
                <span key={item} className="rounded border border-ink/10 bg-white/70 px-3 py-2 text-xs font-bold">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SeoPreview({ description, heading, title, url }: { description: string; heading: string; title: string; url: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-4 text-ink">
      <h3 className="text-sm font-black">{title}</h3>
      <p className="mt-4 text-sm text-[#1a0dab]">{heading}</p>
      <p className="mt-1 text-xs text-[#006621]">{url}</p>
      <p className="mt-1 text-sm leading-6 text-ink/65">{description}</p>
    </div>
  );
}

function SocialPreview({ landing }: { landing: PlatformLandingSettings }) {
  return (
    <div className="overflow-hidden rounded-md border border-ink/10 bg-white text-ink">
      {landing.seo.shareImageUrl ? <img src={landing.seo.shareImageUrl} alt="" className="aspect-video w-full object-cover" /> : null}
      <div className="p-4">
        <h3 className="text-sm font-black">Aperçu réseaux sociaux</h3>
        <p className="mt-2 text-base font-black">{landing.seo.title}</p>
        <p className="mt-1 text-sm leading-6 text-ink/60">{landing.seo.description}</p>
      </div>
    </div>
  );
}

function replacePreviewVariables(value: string) {
  const variables: Record<string, string> = {
    siteName: "ToqueTop",
    customerName: "Jean Dupont",
    customerEmail: "jean.dupont@email.fr",
    restaurantName: "Al Gusto",
    restaurantAddress: "902 rue de Bailleul, Nieppe",
    reservationReference: "TT8K4M7P",
    reservationDate: "samedi 20 juin 2026",
    reservationTime: "20:15",
    reservationEndTime: "22:15",
    guests: "2",
    tableLabel: "Table 12",
    reservationUrl: "https://www.toquetop.com/my-reservations",
    resetUrl: "https://www.toquetop.com/login?resetToken=...",
    loginUrl: "https://www.toquetop.com/login",
    expiration: "20/06/2026 20:45"
  };

  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");
}

function EmailTemplatePreview({
  brand,
  emailSettings,
  templateKey
}: {
  brand: PlatformBrand;
  emailSettings: PlatformEmailSettings;
  templateKey: PlatformEmailTemplateKey;
}) {
  const template = emailSettings.templates[templateKey];
  const body = replacePreviewVariables(template.body);

  return (
    <div className="overflow-hidden rounded-md border border-ink/10 text-ink">
      <div className="border-b border-ink/10 bg-white px-4 py-3">
        <p className="text-xs font-black uppercase text-ink/45">Aperçu email</p>
        <p className="mt-1 text-sm font-bold">{replacePreviewVariables(template.subject)}</p>
      </div>
      <div style={{ backgroundColor: emailSettings.backgroundColor }} className="p-4">
        <div
          className="mx-auto max-w-xl border border-ink/10 p-6"
          style={{
            backgroundColor: emailSettings.cardColor,
            borderRadius: emailSettings.borderRadius,
            color: emailSettings.textColor
          }}
        >
          <img
            src={emailSettings.logoUrl || brand.logoUrl}
            alt={brand.logoAlt}
            className="mb-5 max-w-[220px] object-contain"
            style={{ height: emailSettings.logoHeight }}
          />
          <h3 className="text-2xl font-black leading-tight">{replacePreviewVariables(template.title)}</h3>
          <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-7 opacity-80">{body}</p>
          {template.buttonLabel ? (
            <span
              className="mt-5 inline-flex rounded px-4 py-3 text-sm font-black"
              style={{
                backgroundColor: emailSettings.accentColor,
                color: emailSettings.buttonTextColor
              }}
            >
              {replacePreviewVariables(template.buttonLabel)}
            </span>
          ) : null}
          {template.footerText ? (
            <p className="mt-5 whitespace-pre-line text-xs font-semibold leading-5 opacity-55">
              {replacePreviewVariables(template.footerText)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SmsTemplatePreview({
  smsSettings,
  templateKey
}: {
  smsSettings: PlatformSmsSettings;
  templateKey: PlatformSmsTemplateKey;
}) {
  const template = smsSettings.templates[templateKey];
  const message = replacePreviewVariables(template.message);

  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4 text-ink">
      <p className="text-xs font-black uppercase text-ink/45">Aperçu SMS</p>
      <div className="mt-3 max-w-md rounded-[20px] bg-[#14735d] px-4 py-3 text-sm font-semibold leading-6 text-white shadow-sm">
        {message}
      </div>
      <p className="mt-3 text-xs font-bold text-ink/50">
        Expéditeur : {smsSettings.senderName}
      </p>
    </div>
  );
}

function TimelineItem({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white/50 p-3">
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-sm font-semibold opacity-60">{text}</p>
    </div>
  );
}

function emailTemplateLabel(key: PlatformEmailTemplateKey) {
  const labels: Record<PlatformEmailTemplateKey, string> = {
    registration: "Inscription",
    passwordReset: "Mot de passe oublié",
    reservationConfirmation: "Confirmation réservation",
    reservationUpdate: "Modification réservation",
    reservationCancellation: "Annulation réservation",
    reservationReminder: "Rappel réservation"
  };

  return labels[key];
}

function smsTemplateLabel(key: PlatformSmsTemplateKey) {
  const labels: Record<PlatformSmsTemplateKey, string> = {
    reservationConfirmation: "Confirmation réservation",
    reservationUpdate: "Modification réservation",
    reservationCancellation: "Annulation réservation",
    reservationReminder: "Rappel réservation"
  };

  return labels[key];
}

function sectionLabel(key: string) {
  const labels: Record<string, string> = {
    solution: "Solutions",
    features: "Fonctionnalités",
    dashboard: "Dashboard",
    pricing: "Forfaits",
    demo: "Démo",
    faq: "FAQ",
    customBlocks: "Blocs personnalisés"
  };

  return labels[key] ?? key;
}

function blockTypeLabel(type: PlatformLandingCustomBlock["type"]) {
  const labels: Record<PlatformLandingCustomBlock["type"], string> = {
    TEXT: "Texte simple",
    IMAGE_TEXT: "Image + texte",
    FEATURE_CARD: "Carte fonctionnalité",
    TESTIMONIAL: "Témoignage",
    FAQ: "FAQ",
    PLAN: "Forfait",
    CTA: "Appel à l’action",
    GALLERY: "Galerie",
    VIDEO: "Vidéo",
    FORM: "Formulaire"
  };

  return labels[type];
}

function visiblePreviewItems(landing: PlatformLandingSettings) {
  const items = [];

  if (landing.visibleSections.solution) items.push("Solutions");
  if (landing.visibleSections.features) items.push(`${landing.features.filter((feature) => feature.visible !== false).length} fonctionnalités`);
  if (landing.visibleSections.pricing) items.push(`${landing.plans.filter((plan) => plan.active).length} forfaits`);
  if (landing.visibleSections.customBlocks) items.push(`${landing.customBlocks.filter((block) => block.visible).length} blocs`);

  return items;
}
