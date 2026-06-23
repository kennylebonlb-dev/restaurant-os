"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/layout/client-error-reporter";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "next.global-error");
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#f6f0e7] px-4 py-10 text-[#17171f]">
          <section className="w-full max-w-xl rounded-xl border border-black/10 bg-white p-6 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6655]">ToqueTop</p>
            <h1 className="mt-3 text-2xl font-black">Une erreur vient d’être détectée.</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-black/60">
              L’équipe technique reçoit automatiquement le détail de l’erreur. Vous pouvez réessayer sans perdre vos données.
            </p>
            {error.digest ? (
              <p className="mt-3 rounded-md bg-[#f6f0e7] p-3 text-xs font-bold text-black/50">
                Référence : {error.digest}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#2f6655] px-4 text-sm font-black text-white"
                type="button"
                onClick={reset}
              >
                Réessayer
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 px-4 text-sm font-black"
                type="button"
                onClick={() => window.location.reload()}
              >
                Recharger la page
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
