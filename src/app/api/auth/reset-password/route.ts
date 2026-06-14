import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { resetPasswordSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { apiError, ok, parseJson } from "@/server/http";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function passwordResetIdentifier(email: string) {
  return `password-reset:${email}`;
}

export async function POST(request: Request) {
  try {
    const data = await parseJson(request, resetPasswordSchema);
    const identifier = passwordResetIdentifier(data.email);
    const tokenHash = hashToken(data.token);
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier,
          token: tokenHash
        }
      }
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return ok(
        {
          message: "Ce lien de réinitialisation a expiré ou n’est plus valide."
        },
        { status: 400 }
      );
    }

    const passwordHash = await hash(data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          email: data.email
        },
        data: {
          passwordHash
        }
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier,
            token: tokenHash
          }
        }
      })
    ]);

    return ok({
      message: "Votre mot de passe a été mis à jour. Vous pouvez vous connecter."
    });
  } catch (error) {
    return apiError(error);
  }
}

