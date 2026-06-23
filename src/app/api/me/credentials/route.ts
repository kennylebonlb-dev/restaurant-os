import { compare, hash } from "bcryptjs";
import { updateCredentialsSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/guards";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import { apiError, ok, parseJson } from "@/server/http";

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const data = await parseJson(request, updateCredentialsSchema);
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        id: true,
        email: true,
        passwordHash: true
      }
    });

    if (!user) {
      throw new NotFoundError("Utilisateur introuvable.");
    }

    if (!user.passwordHash) {
      throw new BadRequestError("Ce compte ne possède pas encore de mot de passe local.");
    }

    const validPassword = await compare(data.currentPassword, user.passwordHash);

    if (!validPassword) {
      throw new BadRequestError("L’ancien mot de passe est incorrect.");
    }

    const nextEmail = data.email?.trim() || user.email;

    if (nextEmail !== user.email) {
      const existing = await prisma.user.findUnique({
        where: {
          email: nextEmail
        },
        select: {
          id: true
        }
      });

      if (existing && existing.id !== user.id) {
        throw new ConflictError("Cet email est déjà utilisé par un autre compte.");
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        email: nextEmail,
        contactEmail: nextEmail,
        ...(data.newPassword ? { passwordHash: await hash(data.newPassword, 12) } : {})
      },
      select: {
        id: true,
        email: true,
        contactEmail: true
      }
    });

    return ok({
      profile: updatedUser,
      persistentSession: data.persistentSession ?? true
    });
  } catch (error) {
    return apiError(error);
  }
}
