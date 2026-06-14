import { createHash, randomBytes } from "crypto";
import { forgotPasswordSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/server/email";
import { apiError, ok, parseJson } from "@/server/http";

const RESET_TOKEN_TTL_MINUTES = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function passwordResetIdentifier(email: string) {
  return `password-reset:${email}`;
}

export async function POST(request: Request) {
  try {
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

      const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${appUrl.replace(/\/$/, "")}/login?email=${encodeURIComponent(data.email)}&resetToken=${encodeURIComponent(token)}`;

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
