import { createHash, randomBytes } from "crypto";
import { forgotPasswordSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/server/email";
import { apiError, ok, parseJson } from "@/server/http";
import { assertRateLimit, rateLimitKey } from "@/server/rate-limit";

const RESET_TOKEN_TTL_MINUTES = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function passwordResetIdentifier(email: string) {
  return `password-reset:${email}`;
}

function requestBaseUrl(request: Request) {
  const origin = request.headers.get("origin");

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  return (process.env.APP_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    assertRateLimit(rateLimitKey(request, "auth:forgot-password"), {
      limit: 5,
      windowMs: 15 * 60_000
    });
    const data = await parseJson(request, forgotPasswordSchema);
    const user = await prisma.user.findUnique({
      where: {
        email: data.email
      },
      select: {
        email: true,
        firstName: true,
        name: true
      }
    });

    if (user) {
      const token = randomBytes(32).toString("base64url");
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
      const identifier = passwordResetIdentifier(data.email);

      await prisma.verificationToken.deleteMany({
        where: {
          identifier
        }
      });

      await prisma.verificationToken.create({
        data: {
          identifier,
          token: hashToken(token),
          expires
        }
      });

      const resetPath = data.redirectPath ?? "/login";
      const resetUrl = `${requestBaseUrl(request)}${resetPath}?email=${encodeURIComponent(data.email)}&resetToken=${encodeURIComponent(token)}`;

      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        resetUrl,
        expiresAt: expires
      });
    }

    return ok({
      message: "Si un compte existe pour cet e-mail, un lien de réinitialisation vient d’être envoyé."
    });
  } catch (error) {
    return apiError(error);
  }
}
