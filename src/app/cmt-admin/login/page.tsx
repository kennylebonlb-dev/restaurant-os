"use client";

import { useMutation } from "@tanstack/react-query";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/hooks/use-api";

export default function CmtAdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ authenticated: boolean }>("/api/platform-admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      }),
    onSuccess: () => router.push("/cmt-admin")
  });

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md items-center px-4 py-8">
      <form className="w-full rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-7" onSubmit={submitLogin}>
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-moss text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase text-moss">Accès privé</p>
            <h1 className="mt-1 text-2xl font-black text-ink">Admin C’est ma table</h1>
          </div>
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-semibold text-ink">
            Identifiant
            <div className="relative mt-1">
              <UserRound className="field-icon" />
              <input
                className="control with-leading-icon w-full"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
          </label>

          <label className="text-sm font-semibold text-ink">
            Mot de passe
            <div className="relative mt-1">
              <LockKeyhole className="field-icon" />
              <input
                className="control with-leading-icon w-full"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </label>
        </div>

        {loginMutation.error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
            {loginMutation.error.message}
          </p>
        ) : null}

        <button className="primary-button mt-5 w-full" type="submit" disabled={loginMutation.isPending}>
          Connexion
        </button>
      </form>
    </main>
  );
}
