"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

export function StripeEmbeddedCheckout({ clientSecret }: { clientSecret: string }) {
  if (!stripePublishableKey) {
    return (
      <div className="rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700">
        La clé publique Stripe n’est pas disponible dans cet environnement.
      </div>
    );
  }

  return (
    <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
