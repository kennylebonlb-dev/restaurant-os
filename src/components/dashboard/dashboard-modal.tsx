"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export function DashboardModal({
  children,
  onClose,
  title
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      aria-labelledby="dashboard-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="dashboard-modal-title" className="text-lg font-black text-ink">
            {title}
          </h2>
          <button className="icon-button" type="button" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
