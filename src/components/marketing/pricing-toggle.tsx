"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type PricingPlan = {
  name: string;
  price: string;
  annualPrice: string;
  highlight: string;
  featured: boolean;
  buttonLabel: string;
  features: string[];
};

export function PricingToggle({
  annualDiscountLabel,
  ctaHref,
  plans
}: {
  annualDiscountLabel: string;
  ctaHref: string;
  plans: PricingPlan[];
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const annual = billing === "annual";

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex rounded-md border border-ink/10 bg-[#fbf8f2] p-1">
          <button
            className={`h-10 rounded px-4 text-sm font-black transition ${!annual ? "bg-ink text-white shadow-sm" : "text-ink/60 hover:text-ink"}`}
            type="button"
            onClick={() => setBilling("monthly")}
          >
            Mensuel
          </button>
          <button
            className={`h-10 rounded px-4 text-sm font-black transition ${annual ? "bg-ink text-white shadow-sm" : "text-ink/60 hover:text-ink"}`}
            type="button"
            onClick={() => setBilling("annual")}
          >
            Annuel
          </button>
        </div>
        <span className="rounded-md bg-[#ead6bd] px-3 py-2 text-xs font-black text-ink">
          {annualDiscountLabel}
        </span>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = annual ? plan.annualPrice : plan.price;

          return (
            <article
              key={plan.name}
              className={`rounded-md border p-6 shadow-sm ${
                plan.featured ? "border-moss bg-ink text-white shadow-soft" : "border-ink/10 bg-[#fbf8f2] text-ink"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black">{plan.name}</h3>
                  <p className={`mt-2 text-sm font-semibold leading-6 ${plan.featured ? "text-white/60" : "text-ink/60"}`}>
                    {plan.highlight}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="rounded bg-[#ead6bd] px-2 py-1 text-xs font-black text-ink">Populaire</span>
                ) : null}
              </div>
              <p className="mt-8 flex items-end gap-2">
                <span className="text-4xl font-black">{price}</span>
                {price !== "Sur mesure" ? (
                  <span className={plan.featured ? "mb-1 text-sm font-bold text-white/60" : "mb-1 text-sm font-bold text-ink/50"}>
                    / mois {annual ? "facturé annuellement" : ""}
                  </span>
                ) : null}
              </p>
              <ul className="mt-7 grid gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm font-semibold leading-6">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-[#ead6bd]" : "text-moss"}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                className={`mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-black ${
                  plan.featured ? "bg-[#ead6bd] text-ink" : "bg-ink text-white"
                }`}
                href={ctaHref}
              >
                {plan.buttonLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
