"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ExternalLink, ImagePlus, LogOut, Save, Settings, Sparkles } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/hooks/use-api";
import type { PlatformBrand, PlatformLandingSettings } from "@/server/platform-settings";

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

type TextBlockArrayKey = "features" | "dashboardCards" | "secondaryFeatures" | "faqs";
type LinkArrayKey = "legalLinks" | "solutionLinks" | "companyLinks";
type StringListKey = "workflow" | "demoSteps";

const initialLandingForm: PlatformLandingSettings = {
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
    { title: "Réservations sans friction", text: "Vos clients choisissent un créneau, leurs préférences et leur table depuis une expérience visuelle claire." },
    { title: "Plan de salle vivant", text: "Plan 2D/3D, tables, capacités, zones, blocages, rotations et disponibilités synchronisées en temps réel." },
    { title: "Fichier client utile", text: "Nom, contact, notes, anniversaires, demandes spéciales et historique pour reconnaître les habitués." }
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
    { name: "Essentiel", price: "49€", highlight: "Pour lancer la réservation en ligne", featured: false, features: ["Site vitrine ToqueTop", "Module de réservation", "Plan de salle 2D"] },
    { name: "Pro", price: "89€", highlight: "Le meilleur choix pour un restaurant actif", featured: true, features: ["Tout Essentiel", "Plan 3D immersif", "Dashboard temps réel"] },
    { name: "Signature", price: "Sur mesure", highlight: "Pour groupes, lieux premium et multi-sites", featured: false, features: ["Multi-restaurants", "Design sur mesure", "Préparation IA et CRM"] }
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

  if (!file) {
    return undefined;
  }

  return readFileAsDataUrl(file);
}

export function PlatformAdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string>();
  const [brandForm, setBrandForm] = useState<PlatformBrand>({
    siteName: "C’est ma table",
    logoUrl: "/cest-ma-table-logo.png",
    logoHeight: 48,
    footerLogoUrl: "/cest-ma-table-logo.png",
    footerLogoHeight: 32,
    loginVisualUrl: "/login-restaurant-visual.png",
    faviconUrl: "/cest-ma-table-favicon.png",
    logoAlt: "C’est ma table",
    supportEmail: ""
  });
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

  const saveBrandMutation = useMutation({
    mutationFn: () =>
      apiFetch<BrandResponse>("/api/platform-admin/settings", {
        method: "PATCH",
        body: JSON.stringify(brandForm)
      }),
    onSuccess: (data) => {
      setBrandForm(data.brand);
      setMessage("Paramètres du site enregistrés.");
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "brand"] });
      router.refresh();
      window.setTimeout(() => setMessage(undefined), 3500);
    }
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

  const saveLandingMutation = useMutation({
    mutationFn: () =>
      apiFetch<LandingResponse>("/api/platform-admin/landing", {
        method: "PATCH",
        body: JSON.stringify(landingForm)
      }),
    onSuccess: (data) => {
      setLandingForm(data.landing);
      setMessage("Paramètres du site vitrine enregistrés.");
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "landing"] });
      router.refresh();
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

  async function updateLogo(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      setBrandForm((current) => ({ ...current, logoUrl: dataUrl }));
    }
  }

  async function updateFavicon(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      setBrandForm((current) => ({ ...current, faviconUrl: dataUrl }));
    }
  }

  async function updateFooterLogo(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      setBrandForm((current) => ({ ...current, footerLogoUrl: dataUrl }));
    }
  }

  async function updateLoginVisual(event: ChangeEvent<HTMLInputElement>) {
    const dataUrl = await imageInputToDataUrl(event);

    if (dataUrl) {
      setBrandForm((current) => ({ ...current, loginVisualUrl: dataUrl }));
    }
  }

  function submitBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveBrandMutation.mutate();
  }

  function submitSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createSiteMutation.mutate();
  }

  function submitLanding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveLandingMutation.mutate();
  }

  function updateLandingField<K extends keyof PlatformLandingSettings>(key: K, value: PlatformLandingSettings[K]) {
    setLandingForm((current) => ({ ...current, [key]: value }));
  }

  function updateStringList(key: StringListKey, index: number, value: string) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  }

  function addStringListItem(key: StringListKey) {
    setLandingForm((current) => ({ ...current, [key]: [...current[key], "Nouvel élément"] }));
  }

  function removeStringListItem(key: StringListKey, index: number) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function updateTextBlock(key: TextBlockArrayKey, index: number, field: "title" | "text", value: string) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  }

  function addTextBlock(key: TextBlockArrayKey) {
    setLandingForm((current) => ({
      ...current,
      [key]: [...current[key], { title: "Nouveau titre", text: "Texte à compléter." }]
    }));
  }

  function removeTextBlock(key: TextBlockArrayKey, index: number) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function updateProofPoint(index: number, field: "value" | "label", value: string) {
    setLandingForm((current) => ({
      ...current,
      proofPoints: current.proofPoints.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  }

  function addProofPoint() {
    setLandingForm((current) => ({
      ...current,
      proofPoints: [...current.proofPoints, { value: "1", label: "Nouvel indicateur" }]
    }));
  }

  function removeProofPoint(index: number) {
    setLandingForm((current) => ({
      ...current,
      proofPoints: current.proofPoints.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function updatePlan(index: number, field: "name" | "price" | "highlight" | "featured", value: string | boolean) {
    setLandingForm((current) => ({
      ...current,
      plans: current.plans.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  }

  function updatePlanFeatures(index: number, value: string) {
    setLandingForm((current) => ({
      ...current,
      plans: current.plans.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              features: value
                .split("\n")
                .map((feature) => feature.trim())
                .filter(Boolean)
            }
          : item
      )
    }));
  }

  function addPlan() {
    setLandingForm((current) => ({
      ...current,
      plans: [...current.plans, { name: "Nouveau forfait", price: "Sur mesure", highlight: "Description du forfait", featured: false, features: ["Fonctionnalité à compléter"] }]
    }));
  }

  function removePlan(index: number) {
    setLandingForm((current) => ({
      ...current,
      plans: current.plans.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function updateFooterLink(key: LinkArrayKey, index: number, field: "label" | "href", value: string) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  }

  function addFooterLink(key: LinkArrayKey) {
    setLandingForm((current) => ({
      ...current,
      [key]: [...current[key], { label: "Nouveau lien", href: "#" }]
    }));
  }

  function removeFooterLink(key: LinkArrayKey, index: number) {
    setLandingForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  const sites = sitesQuery.data?.restaurants ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-moss">Admin plateforme</p>
          <h1 className="mt-1 text-3xl font-black text-ink">Gestion des sites restaurants</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink/65">
            Cet espace te permet de gérer la marque C’est ma table et de créer les sites des restaurants que tu accompagnes.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={() => logoutMutation.mutate()}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>

      {message ? (
        <div className="mb-5 rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-bold text-moss">
          {message}
        </div>
      ) : null}

      <form
        className="mb-5 rounded-lg border border-ink/10 bg-white p-4 shadow-soft"
        id="parametre-site-vitrine"
        onSubmit={submitLanding}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-black text-ink">Paramètre site vitrine</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-ink/60">
              Modifie ici les textes, CTA, forfaits, FAQ et liens du footer affichés sur la page principale de ToqueTop.
            </p>
          </div>
          <Link className="secondary-button" href="/" target="_blank">
            <ExternalLink className="h-4 w-4" />
            Prévisualiser
          </Link>
        </div>

        <div className="grid gap-5">
          <section className="rounded-md border border-ink/10 bg-linen p-4">
            <h3 className="text-base font-black text-ink">Hero et appels à l’action</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className="text-sm font-semibold text-ink">
                Nom affiché
                <input className="control mt-1 w-full" value={landingForm.brandName} onChange={(event) => updateLandingField("brandName", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink">
                Accroche courte
                <input className="control mt-1 w-full" value={landingForm.heroEyebrow} onChange={(event) => updateLandingField("heroEyebrow", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink lg:col-span-2">
                Grand titre
                <input className="control mt-1 w-full" value={landingForm.heroTitle} onChange={(event) => updateLandingField("heroTitle", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink lg:col-span-2">
                Description
                <textarea className="control mt-1 min-h-24 w-full py-2" value={landingForm.heroSubtitle} onChange={(event) => updateLandingField("heroSubtitle", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink">
                Bouton principal
                <input className="control mt-1 w-full" value={landingForm.primaryCtaLabel} onChange={(event) => updateLandingField("primaryCtaLabel", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink">
                Lien bouton principal
                <input className="control mt-1 w-full" value={landingForm.primaryCtaHref} onChange={(event) => updateLandingField("primaryCtaHref", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink">
                Bouton démo gratuite
                <input className="control mt-1 w-full" value={landingForm.secondaryCtaLabel} onChange={(event) => updateLandingField("secondaryCtaLabel", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink">
                Lien démo gratuite
                <input className="control mt-1 w-full" value={landingForm.secondaryCtaHref} onChange={(event) => updateLandingField("secondaryCtaHref", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink">
                Bouton demande de démo
                <input className="control mt-1 w-full" value={landingForm.demoCtaLabel} onChange={(event) => updateLandingField("demoCtaLabel", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink">
                Lien demande de démo
                <input className="control mt-1 w-full" value={landingForm.demoCtaHref} onChange={(event) => updateLandingField("demoCtaHref", event.target.value)} />
              </label>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-ink">Indicateurs</h4>
                <button className="secondary-button h-9" type="button" onClick={addProofPoint}>Ajouter</button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {landingForm.proofPoints.map((point, index) => (
                  <div key={`${point.value}-${index}`} className="rounded-md border border-ink/10 bg-white p-3">
                    <div className="grid gap-2 sm:grid-cols-[100px_1fr_auto]">
                      <input className="control w-full" value={point.value} onChange={(event) => updateProofPoint(index, "value", event.target.value)} />
                      <input className="control w-full" value={point.label} onChange={(event) => updateProofPoint(index, "label", event.target.value)} />
                      <button className="secondary-button h-10" type="button" onClick={() => removeProofPoint(index)}>Retirer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-ink/10 bg-linen p-4">
              <h3 className="text-base font-black text-ink">Section Solutions</h3>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Eyebrow
                <input className="control mt-1 w-full" value={landingForm.solutionEyebrow} onChange={(event) => updateLandingField("solutionEyebrow", event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Titre
                <textarea className="control mt-1 min-h-20 w-full py-2" value={landingForm.solutionTitle} onChange={(event) => updateLandingField("solutionTitle", event.target.value)} />
              </label>
              <div className="mt-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-ink">Étapes</h4>
                <button className="secondary-button h-9" type="button" onClick={() => addStringListItem("workflow")}>Ajouter</button>
              </div>
              <div className="mt-2 grid gap-2">
                {landingForm.workflow.map((step, index) => (
                  <div key={`${step}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input className="control w-full" value={step} onChange={(event) => updateStringList("workflow", index, event.target.value)} />
                    <button className="secondary-button" type="button" onClick={() => removeStringListItem("workflow", index)}>Retirer</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-ink/10 bg-linen p-4">
              <h3 className="text-base font-black text-ink">Section Fonctionnalités</h3>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Eyebrow
                <input className="control mt-1 w-full" value={landingForm.featuresEyebrow} onChange={(event) => updateLandingField("featuresEyebrow", event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Titre
                <textarea className="control mt-1 min-h-20 w-full py-2" value={landingForm.featuresTitle} onChange={(event) => updateLandingField("featuresTitle", event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Description
                <textarea className="control mt-1 min-h-24 w-full py-2" value={landingForm.featuresSubtitle} onChange={(event) => updateLandingField("featuresSubtitle", event.target.value)} />
              </label>
            </div>
          </section>

          <EditableTextBlocks
            addLabel="Ajouter une fonctionnalité"
            items={landingForm.features}
            onAdd={() => addTextBlock("features")}
            onRemove={(index) => removeTextBlock("features", index)}
            onUpdate={(index, field, value) => updateTextBlock("features", index, field, value)}
            title="Cartes fonctionnalités"
          />

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-ink/10 bg-linen p-4">
              <h3 className="text-base font-black text-ink">Dashboard</h3>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Eyebrow
                <input className="control mt-1 w-full" value={landingForm.dashboardEyebrow} onChange={(event) => updateLandingField("dashboardEyebrow", event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Titre
                <textarea className="control mt-1 min-h-24 w-full py-2" value={landingForm.dashboardTitle} onChange={(event) => updateLandingField("dashboardTitle", event.target.value)} />
              </label>
            </div>
            <EditableTextBlocks
              addLabel="Ajouter une carte"
              compact
              items={landingForm.dashboardCards}
              onAdd={() => addTextBlock("dashboardCards")}
              onRemove={(index) => removeTextBlock("dashboardCards", index)}
              onUpdate={(index, field, value) => updateTextBlock("dashboardCards", index, field, value)}
              title="Cartes dashboard"
            />
          </section>

          <EditableTextBlocks
            addLabel="Ajouter un bloc"
            items={landingForm.secondaryFeatures}
            onAdd={() => addTextBlock("secondaryFeatures")}
            onRemove={(index) => removeTextBlock("secondaryFeatures", index)}
            onUpdate={(index, field, value) => updateTextBlock("secondaryFeatures", index, field, value)}
            title="Blocs secondaires"
          />

          <section className="rounded-md border border-ink/10 bg-linen p-4">
            <h3 className="text-base font-black text-ink">Forfaits</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <label className="text-sm font-semibold text-ink">
                Eyebrow
                <input className="control mt-1 w-full" value={landingForm.pricingEyebrow} onChange={(event) => updateLandingField("pricingEyebrow", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink lg:col-span-2">
                Titre
                <input className="control mt-1 w-full" value={landingForm.pricingTitle} onChange={(event) => updateLandingField("pricingTitle", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-ink lg:col-span-3">
                Description
                <textarea className="control mt-1 min-h-20 w-full py-2" value={landingForm.pricingSubtitle} onChange={(event) => updateLandingField("pricingSubtitle", event.target.value)} />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="secondary-button" type="button" onClick={addPlan}>Ajouter un forfait</button>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {landingForm.plans.map((plan, index) => (
                <div key={`${plan.name}-${index}`} className="rounded-md border border-ink/10 bg-white p-3">
                  <label className="text-sm font-semibold text-ink">
                    Nom
                    <input className="control mt-1 w-full" value={plan.name} onChange={(event) => updatePlan(index, "name", event.target.value)} />
                  </label>
                  <label className="mt-2 block text-sm font-semibold text-ink">
                    Prix
                    <input className="control mt-1 w-full" value={plan.price} onChange={(event) => updatePlan(index, "price", event.target.value)} />
                  </label>
                  <label className="mt-2 block text-sm font-semibold text-ink">
                    Description
                    <textarea className="control mt-1 min-h-16 w-full py-2" value={plan.highlight} onChange={(event) => updatePlan(index, "highlight", event.target.value)} />
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <input type="checkbox" checked={plan.featured} onChange={(event) => updatePlan(index, "featured", event.target.checked)} />
                    Forfait mis en avant
                  </label>
                  <label className="mt-2 block text-sm font-semibold text-ink">
                    Fonctionnalités, une par ligne
                    <textarea className="control mt-1 min-h-28 w-full py-2" value={plan.features.join("\n")} onChange={(event) => updatePlanFeatures(index, event.target.value)} />
                  </label>
                  <button className="secondary-button mt-3 w-full" type="button" onClick={() => removePlan(index)}>Retirer</button>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-ink/10 bg-linen p-4">
              <h3 className="text-base font-black text-ink">Démo gratuite</h3>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Eyebrow
                <input className="control mt-1 w-full" value={landingForm.demoEyebrow} onChange={(event) => updateLandingField("demoEyebrow", event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Titre
                <input className="control mt-1 w-full" value={landingForm.demoTitle} onChange={(event) => updateLandingField("demoTitle", event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Description
                <textarea className="control mt-1 min-h-24 w-full py-2" value={landingForm.demoSubtitle} onChange={(event) => updateLandingField("demoSubtitle", event.target.value)} />
              </label>
              <div className="mt-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-ink">Étapes affichées</h4>
                <button className="secondary-button h-9" type="button" onClick={() => addStringListItem("demoSteps")}>Ajouter</button>
              </div>
              <div className="mt-2 grid gap-2">
                {landingForm.demoSteps.map((step, index) => (
                  <div key={`${step}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input className="control w-full" value={step} onChange={(event) => updateStringList("demoSteps", index, event.target.value)} />
                    <button className="secondary-button" type="button" onClick={() => removeStringListItem("demoSteps", index)}>Retirer</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-ink/10 bg-linen p-4">
              <h3 className="text-base font-black text-ink">FAQ</h3>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Eyebrow
                <input className="control mt-1 w-full" value={landingForm.faqEyebrow} onChange={(event) => updateLandingField("faqEyebrow", event.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold text-ink">
                Titre
                <input className="control mt-1 w-full" value={landingForm.faqTitle} onChange={(event) => updateLandingField("faqTitle", event.target.value)} />
              </label>
            </div>
          </section>

          <EditableTextBlocks
            addLabel="Ajouter une question"
            items={landingForm.faqs}
            onAdd={() => addTextBlock("faqs")}
            onRemove={(index) => removeTextBlock("faqs", index)}
            onUpdate={(index, field, value) => updateTextBlock("faqs", index, field, value)}
            title="Questions fréquentes"
          />

          <section className="rounded-md border border-ink/10 bg-linen p-4">
            <h3 className="text-base font-black text-ink">Footer</h3>
            <label className="mt-3 block text-sm font-semibold text-ink">
              Phrase de bas de page
              <input className="control mt-1 w-full" value={landingForm.footerTagline} onChange={(event) => updateLandingField("footerTagline", event.target.value)} />
            </label>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <EditableFooterLinks items={landingForm.legalLinks} onAdd={() => addFooterLink("legalLinks")} onRemove={(index) => removeFooterLink("legalLinks", index)} onUpdate={(index, field, value) => updateFooterLink("legalLinks", index, field, value)} title="Légal" />
              <EditableFooterLinks items={landingForm.solutionLinks} onAdd={() => addFooterLink("solutionLinks")} onRemove={(index) => removeFooterLink("solutionLinks", index)} onUpdate={(index, field, value) => updateFooterLink("solutionLinks", index, field, value)} title="Solutions ToqueTop" />
              <EditableFooterLinks items={landingForm.companyLinks} onAdd={() => addFooterLink("companyLinks")} onRemove={(index) => removeFooterLink("companyLinks", index)} onUpdate={(index, field, value) => updateFooterLink("companyLinks", index, field, value)} title="L’entreprise" />
            </div>
          </section>
        </div>

        {saveLandingMutation.error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{saveLandingMutation.error.message}</p>
        ) : null}

        <button className="primary-button mt-5 w-full" type="submit" disabled={saveLandingMutation.isPending}>
          <Save className="h-4 w-4" />
          Enregistrer le site vitrine
        </button>
      </form>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft" onSubmit={submitBrand}>
          <div className="mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-black text-ink">Détails du site de base</h2>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-semibold text-ink">
              Nom du site
              <input
                className="control mt-1 w-full"
                value={brandForm.siteName}
                onChange={(event) => setBrandForm((current) => ({ ...current, siteName: event.target.value }))}
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              Texte alternatif du logo
              <input
                className="control mt-1 w-full"
                value={brandForm.logoAlt}
                onChange={(event) => setBrandForm((current) => ({ ...current, logoAlt: event.target.value }))}
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              E-mail de contact plateforme
              <input
                className="control mt-1 w-full"
                type="email"
                value={brandForm.supportEmail ?? ""}
                onChange={(event) => setBrandForm((current) => ({ ...current, supportEmail: event.target.value }))}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-ink/10 bg-linen p-3 text-sm font-semibold text-ink">
                <p>Logo de l’en-tête</p>
                <span className="mt-3 flex min-h-24 items-center justify-center rounded-md bg-white p-3">
                  <img
                    src={brandForm.logoUrl}
                    alt={brandForm.logoAlt}
                    className="max-w-full object-contain"
                    style={{ height: brandForm.logoHeight }}
                  />
                </span>
                <label className="secondary-button mt-3 w-full cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  Remplacer
                  <input className="sr-only" type="file" accept="image/*" onChange={updateLogo} />
                </label>
                <label className="mt-3 block text-xs font-bold uppercase text-ink/55">
                  Taille : {brandForm.logoHeight}px
                  <input
                    className="mt-2 w-full accent-moss"
                    type="range"
                    min={24}
                    max={88}
                    value={brandForm.logoHeight}
                    onChange={(event) =>
                      setBrandForm((current) => ({ ...current, logoHeight: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>

              <div className="rounded-md border border-ink/10 bg-linen p-3 text-sm font-semibold text-ink">
                <p>Logo du bas de page</p>
                <span className="mt-3 flex min-h-24 items-center justify-center rounded-md bg-white p-3">
                  <img
                    src={brandForm.footerLogoUrl}
                    alt={brandForm.logoAlt}
                    className="max-w-full object-contain"
                    style={{ height: brandForm.footerLogoHeight }}
                  />
                </span>
                <label className="secondary-button mt-3 w-full cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  Remplacer
                  <input className="sr-only" type="file" accept="image/*" onChange={updateFooterLogo} />
                </label>
                <button
                  className="secondary-button mt-2 w-full"
                  type="button"
                  onClick={() =>
                    setBrandForm((current) => ({
                      ...current,
                      footerLogoUrl: current.logoUrl,
                      footerLogoHeight: Math.max(18, Math.min(96, Math.round(current.logoHeight * 0.7)))
                    }))
                  }
                >
                  Utiliser le logo de l’en-tête
                </button>
                <label className="mt-3 block text-xs font-bold uppercase text-ink/55">
                  Taille : {brandForm.footerLogoHeight}px
                  <input
                    className="mt-2 w-full accent-moss"
                    type="range"
                    min={18}
                    max={72}
                    value={brandForm.footerLogoHeight}
                    onChange={(event) =>
                      setBrandForm((current) => ({ ...current, footerLogoHeight: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-md border border-ink/10 bg-linen p-3 text-sm font-semibold text-ink sm:col-span-1">
                Visuel de la page de connexion
                <span className="mt-3 block overflow-hidden rounded-md bg-ink">
                  <img
                    src={brandForm.loginVisualUrl}
                    alt="Aperçu du visuel de connexion"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </span>
                <span className="secondary-button mt-3 w-full cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  Remplacer
                  <input className="sr-only" type="file" accept="image/*" onChange={updateLoginVisual} />
                </span>
              </label>

              <label className="rounded-md border border-ink/10 bg-linen p-3 text-sm font-semibold text-ink sm:col-span-1">
                Favicon
                <span className="mt-3 flex min-h-20 items-center justify-center rounded-md bg-white p-3">
                  <img src={brandForm.faviconUrl} alt="" className="h-14 w-14 object-contain" />
                </span>
                <span className="secondary-button mt-3 w-full cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  Remplacer
                  <input className="sr-only" type="file" accept="image/*" onChange={updateFavicon} />
                </span>
              </label>
            </div>

            {saveBrandMutation.error ? (
              <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{saveBrandMutation.error.message}</p>
            ) : null}

            <button className="primary-button w-full" type="submit" disabled={saveBrandMutation.isPending}>
              <Save className="h-4 w-4" />
              Enregistrer les paramètres
            </button>
          </div>
        </form>

        <form className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft" onSubmit={submitSite}>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-black text-ink">Créer un site restaurant</h2>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-semibold text-ink">
              Nom du restaurant
              <input
                className="control mt-1 w-full"
                value={siteForm.name}
                onChange={(event) => setSiteForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              Description courte
              <textarea
                className="control mt-1 min-h-20 w-full py-2"
                value={siteForm.description}
                onChange={(event) => setSiteForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-ink">
                Téléphone
                <input
                  className="control mt-1 w-full"
                  value={siteForm.phone}
                  onChange={(event) => setSiteForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label className="text-sm font-semibold text-ink">
                E-mail du restaurant
                <input
                  className="control mt-1 w-full"
                  type="email"
                  value={siteForm.ownerEmail}
                  onChange={(event) => setSiteForm((current) => ({ ...current, ownerEmail: event.target.value }))}
                />
              </label>
            </div>
            <label className="text-sm font-semibold text-ink">
              Adresse
              <input
                className="control mt-1 w-full"
                value={siteForm.address}
                onChange={(event) => setSiteForm((current) => ({ ...current, address: event.target.value }))}
              />
            </label>

            {createSiteMutation.error ? (
              <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{createSiteMutation.error.message}</p>
            ) : null}

            <button className="primary-button w-full" type="submit" disabled={createSiteMutation.isPending}>
              <Building2 className="h-4 w-4" />
              Générer le site
            </button>
          </div>
        </form>
      </div>

      <section className="mt-5 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink">Sites restaurants</h2>
            <p className="mt-1 text-sm font-medium text-ink/60">{sites.length} site{sites.length > 1 ? "s" : ""} en gestion</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-ink/10">
          <div className="grid grid-cols-[1.3fr_1fr_120px_140px] gap-3 bg-linen px-3 py-2 text-xs font-black uppercase text-ink/55">
            <span>Restaurant</span>
            <span>URL</span>
            <span>Tables</span>
            <span>Réservations</span>
          </div>
          {sites.map((site) => (
            <div
              key={site.id}
              className="grid grid-cols-[1.3fr_1fr_120px_140px] gap-3 border-t border-ink/10 px-3 py-3 text-sm font-semibold text-ink"
            >
              <div className="min-w-0">
                <p className="truncate font-black">{site.name}</p>
                <p className="mt-1 truncate text-xs font-medium text-ink/55">{site.address || "Adresse à compléter"}</p>
              </div>
              <Link className="inline-flex min-w-0 items-center gap-2 text-moss hover:underline" href={`/sites/${site.slug}`}>
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate">/sites/{site.slug}</span>
              </Link>
              <span>{site._count.tables}</span>
              <span>{site._count.reservations}</span>
            </div>
          ))}
          {sites.length === 0 ? (
            <p className="border-t border-ink/10 px-3 py-8 text-center text-sm font-semibold text-ink/60">
              Aucun site restaurant pour le moment.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function EditableTextBlocks({
  addLabel,
  compact,
  items,
  onAdd,
  onRemove,
  onUpdate,
  title
}: {
  addLabel: string;
  compact?: boolean;
  items: Array<{ title: string; text: string }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: "title" | "text", value: string) => void;
  title: string;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-linen p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-ink">{title}</h3>
        <button className="secondary-button h-9" type="button" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      <div className={`mt-3 grid gap-3 ${compact ? "" : "lg:grid-cols-2"}`}>
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-md border border-ink/10 bg-white p-3">
            <label className="text-sm font-semibold text-ink">
              Titre
              <input className="control mt-1 w-full" value={item.title} onChange={(event) => onUpdate(index, "title", event.target.value)} />
            </label>
            <label className="mt-2 block text-sm font-semibold text-ink">
              Texte
              <textarea className="control mt-1 min-h-20 w-full py-2" value={item.text} onChange={(event) => onUpdate(index, "text", event.target.value)} />
            </label>
            <button className="secondary-button mt-3 w-full" type="button" onClick={() => onRemove(index)}>
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
  items: Array<{ label: string; href: string }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: "label" | "href", value: string) => void;
  title: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-black text-ink">{title}</h4>
        <button className="secondary-button h-9" type="button" onClick={onAdd}>
          Ajouter
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="rounded-md border border-ink/10 bg-linen p-2">
            <input className="control w-full" value={item.label} onChange={(event) => onUpdate(index, "label", event.target.value)} />
            <input className="control mt-2 w-full" value={item.href} onChange={(event) => onUpdate(index, "href", event.target.value)} />
            <button className="secondary-button mt-2 h-9 w-full" type="button" onClick={() => onRemove(index)}>
              Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
