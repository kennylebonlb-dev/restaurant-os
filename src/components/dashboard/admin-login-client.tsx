"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/hooks/use-api";
import type { PlatformAdminLoginSettings, PlatformBrand } from "@/server/platform-settings";

type BrandResponse = {
  brand: PlatformBrand;
};

type AdminLoginResponse = {
  adminLogin: PlatformAdminLoginSettings;
};

type RestaurantsResponse = {
  restaurants: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

const rootHosts = new Set(["toquetop.com", "www.toquetop.com", "localhost", "127.0.0.1"]);
const ignoredSubdomains = new Set(["www", "app", "admin", "api"]);

function currentHost() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.hostname.toLowerCase();
}

function restaurantSlugFromHost(host: string) {
  const normalizedHost = host.split(":")[0]?.toLowerCase() ?? "";

  if (rootHosts.has(normalizedHost) || !normalizedHost.endsWith(".toquetop.com")) {
    return "";
  }

  const slug = normalizedHost.replace(/\.toquetop\.com$/, "");
  return slug && !ignoredSubdomains.has(slug) ? slug : "";
}

function renderAdminLoginText(value: string, restaurantName: string) {
  return value
    .replace(/\{\{\s*restaurantName\s*\}\}/g, restaurantName)
    .replace(/\{\{\s*nomRestaurant\s*\}\}/g, restaurantName)
    .replace(/\(nom restaurant\)/gi, restaurantName);
}

function AdminLoginContent({
  initialAdminLogin,
  initialBrand,
  initialRestaurantName
}: {
  initialAdminLogin: PlatformAdminLoginSettings;
  initialBrand: PlatformBrand;
  initialRestaurantName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("resetToken");
  const initialEmail = searchParams.get("email") ?? "";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotEmail, setForgotEmail] = useState(initialEmail);
  const [resetPassword, setResetPassword] = useState("");
  const [mode, setMode] = useState<"login" | "forgot" | "reset">(resetToken ? "reset" : "login");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [isLoginPending, setIsLoginPending] = useState(false);
  const brandQuery = useQuery({
    queryKey: ["platform-brand", "admin-login"],
    queryFn: () => apiFetch<BrandResponse>("/api/platform-brand"),
    initialData: { brand: initialBrand },
    staleTime: 60_000
  });
  const adminLoginQuery = useQuery({
    queryKey: ["platform-admin-login"],
    queryFn: () => apiFetch<AdminLoginResponse>("/api/platform-admin-login"),
    initialData: { adminLogin: initialAdminLogin },
    staleTime: 60_000
  });
  const restaurantQuery = useQuery({
    queryKey: ["admin-login-restaurant", restaurantSlug],
    enabled: Boolean(restaurantSlug && !initialRestaurantName),
    queryFn: () => apiFetch<RestaurantsResponse>(`/api/restaurants?slug=${encodeURIComponent(restaurantSlug)}`)
  });
  const brand = brandQuery.data?.brand ?? initialBrand;
  const adminLogin = adminLoginQuery.data?.adminLogin ?? initialAdminLogin;
  const restaurantName = initialRestaurantName ?? restaurantQuery.data?.restaurants[0]?.name ?? "votre restaurant";
  const siteLabel = brand.siteName || "ToqueTop";
  const visualUrl = "/admin-login-visual";
  const logoUrl = "/toquetop-logo.svg";
  const logoAlt = brand.logoAlt || "ToqueTop";
  const badgeText = renderAdminLoginText(adminLogin.badge, restaurantName);
  const titleText = renderAdminLoginText(adminLogin.title, restaurantName);
  const descriptionText = renderAdminLoginText(adminLogin.description, restaurantName);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    setRestaurantSlug(restaurantSlugFromHost(currentHost()));
  }, []);

  useEffect(() => {
    let mounted = true;
    const sources = [visualUrl, logoUrl];

    Promise.all(
      sources.map((source) =>
        new Promise<void>((resolve) => {
          const image = new window.Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = source;

          if (image.complete) {
            resolve();
          }
        })
      )
    ).then(() => {
      if (mounted) {
        setAssetsReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [logoUrl, visualUrl]);

  const forgotPasswordMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail,
          redirectPath: "/admin/login"
        })
      }),
    onSuccess: (data) => {
      setError(undefined);
      setMessage(data.message);
    },
    onError: (forgotError) => {
      setError(forgotError.message);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail || email,
          password: resetPassword,
          token: resetToken
        })
      }),
    onSuccess: (data) => {
      setMessage(data.message);
      setError(undefined);
      setEmail(forgotEmail || email);
      setPassword(resetPassword);
      setResetPassword("");
      setMode("login");
      router.replace("/admin/login");
    },
    onError: (resetError) => {
      setError(resetError.message);
    }
  });

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);
    setIsLoginPending(true);

    const result = await signIn("credentials", {
      email,
      password,
      rememberMe: rememberMe ? "true" : "false",
      redirect: false
    }).catch(() => null);

    if (!result || result.error) {
      setError("L’e-mail ou le mot de passe est incorrect.");
      setIsLoginPending(false);
      return;
    }

    const targetUrl = callbackUrl.startsWith("/admin") ? callbackUrl : "/admin";
    window.location.assign(targetUrl);
  }

  function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    forgotPasswordMutation.mutate();
  }

  function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetPasswordMutation.mutate();
  }

  if (!assetsReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-linen text-ink">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-moss">Chargement</p>
        </div>
      </main>
    );
  }

  return (
    <main aria-label={`${siteLabel} - connexion restaurant`} className="relative min-h-screen bg-linen text-ink">
      <div className="grid min-h-screen p-4 transition-opacity duration-300 lg:grid-cols-[minmax(420px,0.92fr)_minmax(430px,560px)] lg:gap-6 lg:p-6">
      <section className="relative hidden min-h-[calc(100vh-3rem)] overflow-hidden rounded-lg bg-ink shadow-soft lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(234,214,189,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(58,101,90,0.34),transparent_28%),linear-gradient(135deg,#121917_0%,#2d463f_52%,#101311_100%)]" />
        {visualUrl ? (
          <img
            alt="Visuel connexion Dashboard Live"
            className="absolute inset-0 h-full w-full object-cover"
            src={visualUrl}
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <img alt={logoAlt} className="h-14 w-auto max-w-[260px] object-contain drop-shadow" src={logoUrl} />
          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
              <ShieldCheck className="h-4 w-4" />
              {badgeText}
            </p>
            <h1 className="text-5xl font-black leading-[0.96] tracking-normal">
              {titleText}
            </h1>
            <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-white/78">
              {descriptionText}
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center py-8 lg:min-h-[calc(100vh-3rem)]">
        <div className="w-full max-w-xl">
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-moss">Dashboard Live</p>
              <h2 className="mt-2 text-3xl font-black text-ink">
                {mode === "reset" ? "Modifier le mot de passe" : mode === "forgot" ? "Mot de passe oublié" : "Connexion restaurant"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
                Accès sécurisé à votre restaurant.
              </p>
            </div>

            {message ? (
              <p className="mt-5 rounded-md border border-moss/20 bg-moss/10 p-3 text-sm font-bold text-moss">{message}</p>
            ) : null}
            {error ? (
              <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>
            ) : null}

            {mode === "login" ? (
              <form className="mt-6 grid gap-4" onSubmit={handleLogin}>
                <label className="text-sm font-bold text-ink">
                  E-mail
                  <div className="relative mt-1">
                    <Mail className="field-icon" />
                    <input
                      autoComplete="email"
                      className="control with-leading-icon w-full"
                      inputMode="email"
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </label>
                <label className="text-sm font-bold text-ink">
                  Mot de passe
                  <div className="relative mt-1">
                    <LockKeyhole className="field-icon" />
                    <input
                      autoComplete="current-password"
                      className="control with-leading-icon w-full"
                      required
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-ink/65">
                  <label className="inline-flex items-center gap-2">
                    <input
                      checked={rememberMe}
                      className="h-4 w-4 accent-moss"
                      type="checkbox"
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    Se souvenir de moi
                  </label>
                  <button className="font-black text-moss hover:underline" type="button" onClick={() => setMode("forgot")}>
                    Mot de passe oublié
                  </button>
                </div>
                <button
                  aria-busy={isLoginPending}
                  className={`primary-button mt-2 w-full ${isLoginPending ? "bg-ink hover:bg-ink disabled:opacity-100" : ""}`}
                  disabled={isLoginPending}
                  type="submit"
                >
                  {isLoginPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      Accéder au Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : null}

            {mode === "forgot" ? (
              <form className="mt-6 grid gap-4" onSubmit={handleForgotPassword}>
                <label className="text-sm font-bold text-ink">
                  E-mail du compte restaurant
                  <div className="relative mt-1">
                    <Mail className="field-icon" />
                    <input
                      autoComplete="email"
                      className="control with-leading-icon w-full"
                      inputMode="email"
                      required
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                    />
                  </div>
                </label>
                <button className="primary-button w-full" disabled={forgotPasswordMutation.isPending} type="submit">
                  {forgotPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Recevoir le lien de réinitialisation
                </button>
                <button className="secondary-button w-full" type="button" onClick={() => setMode("login")}>
                  Retour à la connexion
                </button>
              </form>
            ) : null}

            {mode === "reset" ? (
              <form className="mt-6 grid gap-4" onSubmit={handleResetPassword}>
                <label className="text-sm font-bold text-ink">
                  E-mail
                  <div className="relative mt-1">
                    <Mail className="field-icon" />
                    <input
                      autoComplete="email"
                      className="control with-leading-icon w-full"
                      inputMode="email"
                      required
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                    />
                  </div>
                </label>
                <label className="text-sm font-bold text-ink">
                  Nouveau mot de passe
                  <div className="relative mt-1">
                    <LockKeyhole className="field-icon" />
                    <input
                      autoComplete="new-password"
                      className="control with-leading-icon w-full"
                      minLength={8}
                      required
                      type="password"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                    />
                  </div>
                </label>
                <button className="primary-button w-full" disabled={resetPasswordMutation.isPending} type="submit">
                  {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Modifier le mot de passe
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}

export function AdminLoginClient({
  initialAdminLogin,
  initialBrand,
  initialRestaurantName
}: {
  initialAdminLogin: PlatformAdminLoginSettings;
  initialBrand: PlatformBrand;
  initialRestaurantName?: string;
}) {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-linen">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
        </main>
      }
    >
      <AdminLoginContent
        initialAdminLogin={initialAdminLogin}
        initialBrand={initialBrand}
        initialRestaurantName={initialRestaurantName}
      />
    </Suspense>
  );
}
