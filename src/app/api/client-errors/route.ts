import { NextResponse } from "next/server";
import { z } from "zod";

const clientErrorSchema = z.object({
  assetUrl: z.string().max(1500).optional(),
  column: z.number().optional(),
  line: z.number().optional(),
  message: z.string().max(2000).optional(),
  name: z.string().max(200).optional(),
  source: z.string().max(80).optional(),
  stack: z.string().max(6000).optional(),
  url: z.string().max(1000).optional(),
  userAgent: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = clientErrorSchema.safeParse(payload);

  if (parsed.success) {
    console.error("[client-error]", parsed.data);
  } else {
    console.error("[client-error] invalid payload", parsed.error.flatten());
  }

  return NextResponse.json({ ok: true });
}
