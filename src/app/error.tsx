"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/layout/client-error-reporter";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "next.app-error");
  }, [error]);

  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-linen px-4 py-10 text-ink">
      <div className="w-full max-w-xl rounded-xl border border-ink/10 bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-moss">ToqueTop</p>
        <h1 className="mt-3 text-2xl font-black">Une erreur est survenue.</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">
          Le détail technique vient d’être transmis aux logs. Vous pouvez relancer l’affichage de cette page.
        </p>
        {error.digest ? (
          <p className="mt-3 rounded-md bg-linen p-3 text-xs font-bold text-ink/50">
            Référence : {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="primary-button h-10 px-4 text-sm" type="button" onClick={reset}>
            Réessayer
          </button>
          <button className="secondary-button h-10 px-4 text-sm" type="button" onClick={() => window.location.reload()}>
            Recharger
          </button>
        </div>
      </div>
    </section>
  );
}
