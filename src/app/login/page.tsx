"use client";

import { useMutation } from "@tanstack/react-query";
import { LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiFetch } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const { t } = useI18n();

  const registerMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ user: { id: string } }>("/api/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, phone, password })
      })
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
    <main className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(420px,620px)_minmax(360px,0.7fr)] lg:items-center lg:px-8">
      <section className="login-visual-panel relative w-full overflow-hidden rounded-lg bg-ink shadow-soft">
        <Image
          src="/login-restaurant-visual.png"
          alt="Salle de restaurant C’est ma table"
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="object-cover object-center"
        />
      </section>

      <section className="flex items-center justify-center py-2 lg:py-8">
        <form className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-7" onSubmit={handleSubmit}>
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

          {error || registerMutation.error ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error ?? registerMutation.error?.message}
            </p>
          ) : null}

          <button className="primary-button mt-5 w-full" disabled={registerMutation.isPending} type="submit">
            {mode === "login" ? t("login.signIn") : t("login.createAccount")}
          </button>
        </form>
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
