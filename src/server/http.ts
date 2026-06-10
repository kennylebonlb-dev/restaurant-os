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
    return NextResponse.json(
      { message: "Validation failed.", issues: error.flatten() },
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
