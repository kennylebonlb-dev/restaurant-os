import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/server/auth/guards";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path.join(".");
    const message = firstIssue
      ? `${field ? `${field}: ` : ""}${firstIssue.message}`
      : "Validation failed.";

    return NextResponse.json(
      { message, issues: error.flatten() },
      { status: 422 }
    );
  }

  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof Error && "status" in error) {
    const status = Number((error as Error & { status: number }).status);
    return NextResponse.json({ message: error.message }, { status });
  }

  if (error && typeof error === "object" && ("type" in error || "rawType" in error)) {
    const stripeError = error as {
      code?: string;
      message?: string;
      param?: string;
      rawType?: string;
      statusCode?: number;
      type?: string;
    };
    const isStripeError =
      typeof stripeError.type === "string" && stripeError.type.startsWith("Stripe") ||
      typeof stripeError.rawType === "string" && stripeError.rawType.includes("_error");

    if (isStripeError) {
      const status = stripeError.statusCode && stripeError.statusCode >= 400 ? stripeError.statusCode : 502;
      const missingCustomer = typeof stripeError.message === "string" && stripeError.message.includes("No such customer");
      const message = missingCustomer || stripeError.code === "resource_missing" && (stripeError.param === "customer" || stripeError.param === "id")
        ? "Client Stripe introuvable. Un nouveau client Stripe va être créé automatiquement, veuillez réessayer."
        : stripeError.message || "Stripe a refusé la demande de paiement.";

      console.error(error);
      return NextResponse.json({ message }, { status });
    }
  }

  if (error instanceof Error && error.message.includes("exceeded the data transfer quota")) {
    return NextResponse.json(
      {
        message:
          "Base de données momentanément indisponible : le quota Neon de transfert de données est dépassé."
      },
      { status: 503 }
    );
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return NextResponse.json({ message: "A record with this value already exists." }, { status: 409 });
  }

  console.error(error);
  return NextResponse.json({ message: "Unexpected server error." }, { status: 500 });
}

export async function parseJson<T>(request: Request, parser: { parse: (data: unknown) => T }) {
  const payload = await request.json();
  return parser.parse(payload);
}
