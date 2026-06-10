import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";

export class UnauthorizedError extends Error {
  status = 401;
}

export class ForbiddenError extends Error {
  status = 403;
}

export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new UnauthorizedError("Authentication is required.");
  }

  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();

  if (!roles.includes(session.user.role)) {
    throw new ForbiddenError("You do not have access to this resource.");
  }

  return session;
}
