"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarSearch, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiFetch } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";
import type { PlatformBrand } from "@/server/platform-settings";

type BrandResponse = {
  brand: PlatformBrand;
};

type GuestReservationResponse = {
  reservations: Array<{
    id: string;
  }>;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [guestReferenceName, setGuestReferenceName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestError, setGuestError] = useState<string>();
  const [error, setError] = useState<string>();
  const { t } = useI18n();
  const brandQuery = useQuery({
    queryKey: ["platform-brand"],
    queryFn: () => apiFetch<BrandResponse>("/api/platform-brand"),
    staleTime: 60_000
  });
  const loginVisualUrl = brandQuery.data?.brand.loginVisualUrl ?? "/login-restaurant-visual.png";
  const supportEmail = brandQuery.data?.brand.supportEmail || "contact@toquetop.com";

  const registerMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ user: { id: string } }>("/api/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, phone, password })
      })
  });

  const guestLookupMutation = useMutation({
    mutationFn: () =>
      apiFetch<GuestReservationResponse>("/api/guest-reservations", {
        method: "POST",
        body: JSON.stringify({
          referenceName: guestReferenceName,
          phone: guestPhone
        })
      }),
    onSuccess: (data) => {
      if (data.reservations.length === 0) {
        setGuestError(t("login.guestNoReservation"));
        return;
      }

      window.sessionStorage.setItem(
        "toquetop_guest_reservation_access",
        JSON.stringify({
          referenceName: guestReferenceName,
          phone: guestPhone
        })
      );
      router.push("/my-reservations?guest=1");
    },
    onError: (lookupError) => {
      setGuestError(lookupError.message);
    }
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (mode === "register") {
      await registerMutation.mutateAsync();
    }

    const result = await signIn("credentials", {
      email,
      password,
      rememberMe: rememberMe ? "true" : "false",
      redirect: false
    });

    if (result?.error) {
      setError(t("login.invalidCredentials"));
      return;
    }

    router.push(searchParams.get("callbackUrl") ?? "/");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(420px,620px)_minmax(460px,0.85fr)] lg:items-center lg:px-8">
      <section className="login-visual-panel relative w-full overflow-hidden rounded-lg bg-ink shadow-soft">
        <img
          src={loginVisualUrl}
          alt="Salle de restaurant C’est ma table"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </section>

      <section className="flex items-center justify-center py-2 lg:py-8">
        <div className="w-full max-w-xl space-y-4">
        <form className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-7" onSubmit={handleSubmit}>
          <div>
            <h1 className="text-2xl font-black text-ink">
              {mode === "login" ? t("login.signIn") : t("login.createAccount")}
            </h1>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/65">
              La table idéale n’attend plus que vous.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-md border border-ink/10 bg-linen p-1">
            <button
              className={`h-9 rounded text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:text-ink"
              }`}
              type="button"
              onClick={() => setMode("login")}
            >
              {t("login.signIn")}
            </button>
            <button
              className={`h-9 rounded text-sm font-semibold transition ${
                mode === "register" ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:text-ink"
              }`}
              type="button"
              onClick={() => setMode("register")}
            >
              {t("login.register")}
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {mode === "register" ? (
              <>
                <label className="text-sm font-semibold text-ink">
                  {t("login.firstName")}
                  <div className="relative mt-1">
                    <UserRound className="field-icon" />
                    <input
                      className="control with-leading-icon w-full"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                    />
                  </div>
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("login.lastName")}
                  <div className="relative mt-1">
                    <UserRound className="field-icon" />
                    <input
                      className="control with-leading-icon w-full"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      required
                    />
                  </div>
                </label>
              </>
            ) : null}

            <label className="text-sm font-semibold text-ink">
              {t("login.email")}
              <div className="relative mt-1">
                <Mail className="field-icon" />
                <input
                  className="control with-leading-icon w-full"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>

            {mode === "register" ? (
              <label className="text-sm font-semibold text-ink">
                {t("login.phone")}
                <div className="relative mt-1">
                  <Phone className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </div>
              </label>
            ) : null}

            <label className="text-sm font-semibold text-ink">
              {t("login.password")}
              <div className="relative mt-1">
                <LockKeyhole className="field-icon" />
                <input
                  className="control with-leading-icon w-full"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </label>
          </div>

          {mode === "login" ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
              <label className="inline-flex items-center gap-2 text-ink/70">
                <input
                  className="h-4 w-4 accent-moss"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                {t("login.rememberMe")}
              </label>
              <a className="text-moss hover:underline" href={`mailto:${supportEmail}?subject=Mot de passe oublié`}>
                {t("login.forgotPassword")}
              </a>
            </div>
          ) : null}

          {error || registerMutation.error ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error ?? registerMutation.error?.message}
            </p>
          ) : null}

          <button className="primary-button mt-5 w-full" disabled={registerMutation.isPending} type="submit">
            {mode === "login" ? t("login.signIn") : t("login.createAccount")}
          </button>
        </form>

        <form
          className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setGuestError(undefined);
            guestLookupMutation.mutate();
          }}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-moss/10 text-moss">
              <CalendarSearch className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-ink">{t("login.findReservation")}</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-ink/60 lg:whitespace-nowrap">
                {t("login.findReservationHint")}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-semibold text-ink">
              {t("login.referenceName")}
              <div className="relative mt-1">
                <UserRound className="field-icon" />
                <input
                  className="control with-leading-icon w-full"
                  value={guestReferenceName}
                  onChange={(event) => setGuestReferenceName(event.target.value)}
                  placeholder="dupontjean"
                  required
                />
              </div>
              <span className="mt-1 block text-xs font-semibold text-ink/50">
                {t("login.referenceExample")}
              </span>
            </label>
            <label className="text-sm font-semibold text-ink">
              {t("login.reservationPhone")}
              <div className="relative mt-1">
                <Phone className="field-icon" />
                <input
                  className="control with-leading-icon w-full"
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  required
                />
              </div>
            </label>
          </div>
          {guestError ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
              {guestError}
            </p>
          ) : null}
          <button className="secondary-button mt-4 w-full" disabled={guestLookupMutation.isPending} type="submit">
            {t("login.openReservation")}
          </button>
        </form>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
