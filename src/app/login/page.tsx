"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarSearch, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiFetch } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";

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
  const [showForgotPassword, setShowForgotPassword] = useState(Boolean(searchParams.get("resetToken")));
  const [forgotEmail, setForgotEmail] = useState(searchParams.get("email") ?? "");
  const [resetPassword, setResetPassword] = useState("");
  const [guestReferenceName, setGuestReferenceName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestError, setGuestError] = useState<string>();
  const [forgotMessage, setForgotMessage] = useState<string>();
  const [resetMessage, setResetMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const { t } = useI18n();
  const resetToken = searchParams.get("resetToken");
  const isResetPasswordMode = Boolean(resetToken) && showForgotPassword;

  const registerMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ user: { id: string } }>("/api/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, phone, password })
      })
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail })
      }),
    onSuccess: (data) => {
      setForgotMessage(data.message);
    },
    onError: (forgotError) => {
      setForgotMessage(forgotError.message);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail,
          password: resetPassword,
          token: resetToken
        })
      }),
    onSuccess: (data) => {
      setResetMessage(data.message);
      setForgotMessage(data.message);
      setPassword(resetPassword);
      setEmail(forgotEmail);
      setMode("login");
      setShowForgotPassword(false);
      router.replace("/login");
    },
    onError: (resetError) => {
      setResetMessage(resetError.message);
    }
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

    const callbackUrl = searchParams.get("callbackUrl");

    if (callbackUrl) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    try {
      const data = await apiFetch<{ restaurants: Array<{ id: string }> }>("/api/restaurants/current");
      router.push(data.restaurants.length > 0 ? "/admin" : "/");
    } catch {
      router.push("/");
    }

    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(420px,620px)_minmax(460px,0.85fr)] lg:items-start lg:px-8">
      <Link
        aria-label="Retour à la page principale"
        className="login-visual-panel relative block w-full overflow-hidden rounded-lg bg-ink shadow-soft lg:sticky lg:top-6 lg:self-start"
        href="/"
      >
        <img
          alt="Visuel page connexion client"
          className="h-full min-h-[520px] w-full object-cover"
          src="/client-login-visual"
        />
      </Link>

      <section className="flex items-center justify-center py-2 lg:py-8">
        <div className="w-full max-w-xl space-y-4">
        {!isResetPasswordMode ? (
        <form className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-7" onSubmit={handleSubmit}>
          <div>
            <h1 className="text-2xl font-black text-ink">
              {mode === "login" ? t("login.signIn") : t("login.createAccount")}
            </h1>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/65">
              {t("login.tagline")}
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
              <button
                className="text-moss hover:underline"
                type="button"
                onClick={() => {
                  setShowForgotPassword((current) => !current);
                  setForgotEmail(email);
                }}
              >
                {t("login.forgotPassword")}
              </button>
            </div>
          ) : null}

          {error || registerMutation.error ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error ?? registerMutation.error?.message}
            </p>
          ) : null}

          {forgotMessage && !showForgotPassword ? (
            <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm font-semibold text-moss">
              {forgotMessage}
            </p>
          ) : null}

          <button className="primary-button mt-5 w-full" disabled={registerMutation.isPending} type="submit">
            {mode === "login" ? t("login.signIn") : t("login.createAccount")}
          </button>
        </form>
        ) : null}

        {showForgotPassword ? (
          <form
            className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              setForgotMessage(undefined);
              setResetMessage(undefined);

              if (resetToken) {
                resetPasswordMutation.mutate();
                return;
              }

              forgotPasswordMutation.mutate();
            }}
          >
            <div>
              <h2 className="text-base font-black text-ink">
                {resetToken ? "Créer un nouveau mot de passe" : "Mot de passe oublié"}
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-ink/60">
                {resetToken
                  ? "Choisissez un nouveau mot de passe pour votre compte."
                  : "Recevez un lien sécurisé pour réinitialiser votre mot de passe."}
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-semibold text-ink">
                {t("login.email")}
                <div className="relative mt-1">
                  <Mail className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    required
                  />
                </div>
              </label>
              {resetToken ? (
                <label className="text-sm font-semibold text-ink">
                  Nouveau mot de passe
                  <div className="relative mt-1">
                    <LockKeyhole className="field-icon" />
                    <input
                      className="control with-leading-icon w-full"
                      minLength={8}
                      type="password"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      required
                    />
                  </div>
                </label>
              ) : null}
            </div>
            {forgotMessage || resetMessage ? (
              <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm font-semibold text-moss">
                {resetMessage ?? forgotMessage}
              </p>
            ) : null}
            <button
              className="secondary-button mt-4 w-full"
              disabled={forgotPasswordMutation.isPending || resetPasswordMutation.isPending}
              type="submit"
            >
              {resetToken ? "Valider le nouveau mot de passe" : "Envoyer le lien"}
            </button>
          </form>
        ) : null}

        {!isResetPasswordMode ? (
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
                  placeholder="dupontjean ou TTE3TK8H"
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
              <span className="mt-1 block text-xs font-semibold text-ink/50">
                {t("login.phoneExample")}
              </span>
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
        ) : null}
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
