"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BadgeEuro,
  Blocks,
  Building2,
  ExternalLink,
  Eye,
  FileText,
  GripVertical,
  History,
  ImageIcon,
  ImagePlus,
  LayoutDashboard,
  ListChecks,
  LogOut,
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
  Trash2
} from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/hooks/use-api";
import type {
  PlatformBrand,
  PlatformLandingCustomBlock,
  PlatformLandingHeader,
  PlatformLandingLink,
  PlatformLandingPlan,
  PlatformLandingSettings,
  PlatformLandingTextBlock
} from "@/server/platform-settings";

type ManagedRestaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    tables: number;
    reservations: number;
  };
};

type BrandResponse = {
  brand: PlatformBrand;
};

type LandingResponse = {
  landing: PlatformLandingSettings;
};

type SitesResponse = {
  restaurants: ManagedRestaurant[];
};

type AdminSection =
  | "dashboard"
  | "appearance"
  | "header"
  | "assets"
  | "content"
  | "blocks"
  | "plans"
  | "features"
  | "seo"
  | "footer"
  | "general"
  | "restaurants";

type PreviewDevice = "desktop" | "tablet" | "mobile";

type TextBlockArrayKey = "features" | "dashboardCards" | "secondaryFeatures" | "faqs";
type LinkArrayKey = "legalLinks" | "solutionLinks" | "companyLinks";
type StringListKey = "workflow" | "demoSteps";

const initialBrandForm: PlatformBrand = {
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
    { title: "Réservations sans friction", text: "Vos clients choisissent un créneau, leurs préférences et leur table depuis une expérience visuelle claire.", icon: "Calendar", category: "Réservations", order: 1, visible: true },
    { title: "Plan de salle vivant", text: "Plan 2D/3D, tables, capacités, zones, blocages, rotations et disponibilités synchronisées en temps réel.", icon: "Table", category: "Salle", order: 2, visible: true },
    { title: "Fichier client utile", text: "Nom, contact, notes, anniversaires, demandes spéciales et historique pour reconnaître les habitués.", icon: "Users", category: "CRM", order: 3, visible: true }
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
  pricingTitle: "Une offre lisible, sans commission cachée.",
  pricingSubtitle: "Les forfaits peuvent être adaptés selon le nombre d’établissements, le niveau de personnalisation et l’accompagnement souhaité.",
  plans: [
    { name: "Essentiel", price: "49€", highlight: "Pour lancer la réservation en ligne", featured: false, active: true, buttonLabel: "Choisir Essentiel", features: ["Site vitrine ToqueTop", "Module de réservation", "Plan de salle 2D"] },
    { name: "Pro", price: "89€", highlight: "Le meilleur choix pour un restaurant actif", featured: true, active: true, buttonLabel: "Choisir Pro", features: ["Tout Essentiel", "Plan 3D immersif", "Dashboard temps réel"] },
    { name: "Signature", price: "Sur mesure", highlight: "Pour groupes, lieux premium et multi-sites", featured: false, active: true, buttonLabel: "Nous contacter", features: ["Multi-restaurants", "Design sur mesure", "Préparation IA et CRM"] }
  ],
  demoEyebrow: "Lancer ToqueTop",
  demoTitle: "Prêt à transformer votre réservation directe ?",
  demoSubtitle: "On peut préparer une première version de votre site, votre plan de salle et vos règles de réservation pour vous montrer concrètement le rendu.",
  demoSteps: ["Audit rapide du site actuel", "Configuration des horaires et services", "Intégration du plan de salle", "Mise en ligne et formation"],
  faqEyebrow: "Questions fréquentes",
  faqTitle: "Simple à comprendre, solide à exploiter.",
  faqs: [
    { title: "Est-ce que ToqueTop remplace mon site actuel ?", text: "Oui si vous le souhaitez. ToqueTop peut devenir votre site principal, ou simplement ajouter une réservation moderne à votre site existant." },
    { title: "Puis-je garder la main sur les horaires et les tables ?", text: "Oui. Vous gérez les services, vacances, blocages, capacités, préférences de tables et règles de réservation depuis l’espace admin." }
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

const sections: Array<{ id: AdminSection; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Tableau de bord", description: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "appearance", label: "Graphisme", description: "Couleurs et style", icon: Palette },
  { id: "header", label: "Header", description: "Navigation du site", icon: PanelTop },
  { id: "assets", label: "Logo et favicon", description: "Images de marque", icon: ImageIcon },
  { id: "content", label: "Pages & contenus", description: "Textes principaux", icon: FileText },
  { id: "blocks", label: "Blocs du site", description: "Sections modulaires", icon: Blocks },
  { id: "plans", label: "Forfaits", description: "Offres affichées", icon: BadgeEuro },
  { id: "features", label: "Fonctionnalités", description: "Cartes visibles", icon: ListChecks },
  { id: "seo", label: "SEO", description: "Référencement", icon: Search },
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
  const [landingForm, setLandingForm] = useState<PlatformLandingSettings>(initialLandingForm);
  const [siteForm, setSiteForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    ownerEmail: ""
  });

  const brandQuery = useQuery({
    queryKey: ["platform-admin", "brand"],
    queryFn: () => apiFetch<BrandResponse>("/api/platform-admin/settings")
  });

  const landingQuery = useQuery({
    queryKey: ["platform-admin", "landing"],
    queryFn: () => apiFetch<LandingResponse>("/api/platform-admin/landing")
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

  const createSiteMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ restaurant: ManagedRestaurant }>("/api/platform-admin/sites", {
        method: "POST",
        body: JSON.stringify({
          name: siteForm.name,
          description: siteForm.description || undefined,
          address: siteForm.address || undefined,
          phone: siteForm.phone || undefined,
          ownerEmail: siteForm.ownerEmail || undefined
        })
      }),
    onSuccess: (data) => {
      setMessage(`Site créé : ${data.restaurant.name}`);
      setSiteForm({ name: "", description: "", address: "", phone: "", ownerEmail: "" });
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

  function markDirty() {
    setDirty(true);
  }

  function updateBrand<K extends keyof PlatformBrand>(key: K, value: PlatformBrand[K]) {
    setBrandForm((current) => ({ ...current, [key]: value }));
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
        { name: "Nouveau forfait", price: "Sur mesure", highlight: "Description du forfait", featured: false, active: true, buttonLabel: "Demander une démo", features: ["Fonctionnalité à compléter"] }
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

  async function updateLoginVisual(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      updateBrand("loginVisualUrl", dataUrl);
    }
  }

  async function saveAll() {
    try {
      const [brandData, landingData] = await Promise.all([saveBrandMutation.mutateAsync(), saveLandingMutation.mutateAsync()]);
      setBrandForm(brandData.brand);
      setLandingForm(landingData.landing);
      setDirty(false);
      setLastSavedAt(new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date()));
      setMessage("Modification effectuée");
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "brand"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "landing"] });
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
              <button className="primary-button" type="button" onClick={saveAll} disabled={saveBrandMutation.isPending || saveLandingMutation.isPending}>
                <Save className="h-4 w-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:px-8">
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
                  <Field label="Police des titres" value={landingForm.appearance.headingFont} onChange={(value) => updateAppearance("headingFont", value)} />
                  <Field label="Police des textes" value={landingForm.appearance.bodyFont} onChange={(value) => updateAppearance("bodyFont", value)} />
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
              <AdminSectionLayout description="Gère les fichiers visibles sur le site : logo, favicon, visuel de connexion et logo footer." icon={<ImageIcon className="h-5 w-5" />} panelClass={panelClass} title="Logo et favicon">
                <div className="grid gap-4 lg:grid-cols-2">
                  <AssetCard alt={brandForm.logoAlt} buttonLabel="Remplacer le logo" height={brandForm.logoHeight} image={brandForm.logoUrl} title="Logo du site" onUpload={updateLogo} />
                  <AssetCard alt={brandForm.logoAlt} buttonLabel="Remplacer le logo footer" height={brandForm.footerLogoHeight} image={brandForm.footerLogoUrl} title="Logo du footer" onUpload={updateFooterLogo} />
                  <AssetCard alt="Favicon" buttonLabel="Remplacer le favicon" height={56} image={brandForm.faviconUrl} title="Favicon" onUpload={updateFavicon} />
                  <AssetCard alt="Visuel de connexion" buttonLabel="Remplacer le visuel" image={brandForm.loginVisualUrl} imageClassName="aspect-[4/5] h-auto w-full object-cover" title="Visuel page de connexion" onUpload={updateLoginVisual} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Nom du site" value={brandForm.siteName} onChange={(value) => updateBrand("siteName", value)} />
                  <Field label="Texte alternatif du logo" value={brandForm.logoAlt} onChange={(value) => updateBrand("logoAlt", value)} />
                  <label className="text-sm font-semibold">
                    Taille du logo : {brandForm.logoHeight}px
                    <input className="mt-3 w-full accent-moss" type="range" min={18} max={96} value={brandForm.logoHeight} onChange={(event) => updateBrand("logoHeight", Number(event.target.value))} />
                  </label>
                  <label className="text-sm font-semibold">
                    Espacement autour du logo : {landingForm.header.logoSpacing}px
                    <input className="mt-3 w-full accent-moss" type="range" min={0} max={40} value={landingForm.header.logoSpacing} onChange={(event) => updateHeader("logoSpacing", Number(event.target.value))} />
                  </label>
                  <label className="text-sm font-semibold">
                    Taille du logo footer : {brandForm.footerLogoHeight}px
                    <input className="mt-3 w-full accent-moss" type="range" min={18} max={96} value={brandForm.footerLogoHeight} onChange={(event) => updateBrand("footerLogoHeight", Number(event.target.value))} />
                  </label>
                  <button className="secondary-button self-end" type="button" onClick={() => updateBrand("footerLogoUrl", brandForm.logoUrl)}>
                    Utiliser le logo principal en footer
                  </button>
                </div>
              </AdminSectionLayout>
            ) : null}

            {activeSection === "content" ? (
              <AdminSectionLayout description="Modifie le contenu principal de la page vitrine, les CTA et l’ordre visible des grandes sections." icon={<FileText className="h-5 w-5" />} panelClass={panelClass} title="Pages & contenus">
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
                <EditableStringList title="Étapes Solutions" items={landingForm.workflow} onAdd={() => addStringListItem("workflow")} onRemove={(index) => removeStringListItem("workflow", index)} onUpdate={(index, value) => updateStringList("workflow", index, value)} />
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
                      <Field label="Prix" value={plan.price} onChange={(value) => updatePlan(index, "price", value)} />
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

            {activeSection === "footer" ? (
              <AdminSectionLayout description="Configure les logos, slogans, liens et informations du bas de page." icon={<PanelBottom className="h-5 w-5" />} panelClass={panelClass} title="Footer">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Slogan du footer" value={landingForm.footerTagline} onChange={(value) => updateLandingField("footerTagline", value)} />
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
              <AdminSectionLayout description="Crée et consulte les sites restaurants rattachés à la plateforme." icon={<Building2 className="h-5 w-5" />} panelClass={panelClass} title="Restaurants">
                <form className={`rounded-md border p-4 ${panelClass}`} onSubmit={submitSite}>
                  <h3 className="text-lg font-black">Créer un nouveau site restaurant</h3>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <Field label="Nom du restaurant" required value={siteForm.name} onChange={(value) => setSiteForm((current) => ({ ...current, name: value }))} />
                    <Field label="E-mail du restaurant" type="email" value={siteForm.ownerEmail} onChange={(value) => setSiteForm((current) => ({ ...current, ownerEmail: value }))} />
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

                <div className={`overflow-hidden rounded-md border ${panelClass}`}>
                  <div className="grid grid-cols-[1.3fr_1fr_120px_140px] gap-3 bg-linen px-3 py-2 text-xs font-black uppercase text-ink/55">
                    <span>Restaurant</span>
                    <span>URL</span>
                    <span>Tables</span>
                    <span>Réservations</span>
                  </div>
                  {sites.map((site) => (
                    <div key={site.id} className="grid grid-cols-[1.3fr_1fr_120px_140px] gap-3 border-t border-ink/10 px-3 py-3 text-sm font-semibold">
                      <div className="min-w-0">
                        <p className="truncate font-black">{site.name}</p>
                        <p className={`mt-1 truncate text-xs font-medium ${mutedText}`}>{site.address || "Adresse à compléter"}</p>
                      </div>
                      <Link className="inline-flex min-w-0 items-center gap-2 text-moss hover:underline" href={`/sites/${site.slug}`}>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span className="truncate">/sites/{site.slug}</span>
                      </Link>
                      <span>{site._count.tables}</span>
                      <span>{site._count.reservations}</span>
                    </div>
                  ))}
                  {sites.length === 0 ? <p className={`border-t px-3 py-8 text-center text-sm font-semibold ${mutedText}`}>Aucun site restaurant pour le moment.</p> : null}
                </div>
              </AdminSectionLayout>
            ) : null}
          </div>

          <aside className="min-w-0 xl:sticky xl:top-28 xl:self-start">
            <PreviewPanel
              brand={brandForm}
              device={previewDevice}
              landing={landingForm}
              onDeviceChange={setPreviewDevice}
              panelClass={panelClass}
            />
          </aside>
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

function Textarea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="text-sm font-semibold lg:col-span-2">
      {label}
      <textarea className="control mt-1 min-h-24 w-full py-2" value={value} onChange={(event) => onChange(event.target.value)} />
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
  buttonLabel,
  height,
  image,
  imageClassName,
  onUpload,
  title
}: {
  alt: string;
  buttonLabel: string;
  height?: number;
  image: string;
  imageClassName?: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  title: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4 text-sm font-semibold text-ink">
      <p>{title}</p>
      <span className="mt-3 flex min-h-32 items-center justify-center overflow-hidden rounded-md bg-white p-3">
        <img src={image} alt={alt} className={imageClassName ?? "max-w-full object-contain"} style={height ? { height } : undefined} />
      </span>
      <label className="secondary-button mt-3 w-full cursor-pointer">
        <ImagePlus className="h-4 w-4" />
        {buttonLabel}
        <input className="sr-only" type="file" accept="image/*" onChange={onUpload} />
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
        <img src={brand.logoUrl} alt={brand.logoAlt} className="max-w-[180px] object-contain" style={{ height: brand.logoHeight }} />
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
            <img src={brand.logoUrl} alt={brand.logoAlt} className="max-w-[120px] object-contain" style={{ height: Math.min(brand.logoHeight, 36) }} />
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

function TimelineItem({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white/50 p-3">
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-sm font-semibold opacity-60">{text}</p>
    </div>
  );
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
