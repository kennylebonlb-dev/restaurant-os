import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/server/services/stripe-service";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    const event = await handleStripeWebhook({
      body,
      signature
    });

    return NextResponse.json({
      received: true,
      type: event.type
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
