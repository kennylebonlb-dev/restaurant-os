import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ResendReceivedEmailEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    message_id?: string;
    created_at?: string;
  };
};

function parseWebhookPayload(payload: string): ResendReceivedEmailEvent | null {
  try {
    const event = JSON.parse(payload);
    return event && typeof event === "object" ? event : null;
  } catch {
    return null;
  }
}

function summarizeReceivedEmail(event: ResendReceivedEmailEvent, deliveryId: string | null) {
  return {
    deliveryId,
    emailId: event.data?.email_id ?? null,
    messageId: event.data?.message_id ?? null,
    from: event.data?.from ?? null,
    to: event.data?.to ?? [],
    cc: event.data?.cc ?? [],
    bcc: event.data?.bcc ?? [],
    subject: event.data?.subject ?? null,
    eventCreatedAt: event.created_at ?? null,
    emailCreatedAt: event.data?.created_at ?? null
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "resend-webhook"
  });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const event = parseWebhookPayload(payload);

  if (!event) {
    return NextResponse.json({ message: "Invalid webhook payload." }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ignored: true, received: true, type: event.type ?? null });
  }

  console.info(
    "Resend inbound email received",
    summarizeReceivedEmail(event, request.headers.get("svix-id"))
  );

  return NextResponse.json({ received: true });
}
