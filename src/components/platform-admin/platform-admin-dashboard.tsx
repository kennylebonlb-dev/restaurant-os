"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ExternalLink, ImagePlus, LogOut, Save, Settings, Sparkles } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/hooks/use-api";
import type { PlatformBrand } from "@/server/platform-settings";

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

type SitesResponse = {
  restaurants: ManagedRestaurant[];
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
    faviconUrl: "/cest-ma-table-favicon.png",
    logoAlt: "C’est ma table",
    supportEmail: ""
  });
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

  const sitesQuery = useQuery({
    queryKey: ["platform-admin", "sites"],
    queryFn: () => apiFetch<SitesResponse>("/api/platform-admin/sites")
  });

  useEffect(() => {
    if (brandQuery.data?.brand) {
      setBrandForm(brandQuery.data.brand);
    }
  }, [brandQuery.data?.brand]);

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

  function submitBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveBrandMutation.mutate();
  }

  function submitSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createSiteMutation.mutate();
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
              <label className="rounded-md border border-ink/10 bg-linen p-3 text-sm font-semibold text-ink">
                Logo de l’en-tête
                <span className="mt-3 flex min-h-20 items-center justify-center rounded-md bg-white p-3">
                  <img src={brandForm.logoUrl} alt={brandForm.logoAlt} className="max-h-16 max-w-full object-contain" />
                </span>
                <span className="secondary-button mt-3 w-full cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  Remplacer
                  <input className="sr-only" type="file" accept="image/*" onChange={updateLogo} />
                </span>
              </label>

              <label className="rounded-md border border-ink/10 bg-linen p-3 text-sm font-semibold text-ink">
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
