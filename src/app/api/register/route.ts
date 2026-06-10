import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { apiError, created, parseJson } from "@/server/http";

export async function POST(request: Request) {
  try {
    const data = await parseJson(request, registerSchema);
    const passwordHash = await hash(data.password, 12);
    const [firstName, ...lastNameParts] = data.name.trim().split(/\s+/);
    const lastName = lastNameParts.join(" ");

    const user = await prisma.user.create({
      data: {
        name: data.name,
        firstName,
        lastName: lastName || null,
        contactEmail: data.email,
        email: data.email,
        passwordHash,
        role: "CLIENT"
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    return created({ user });
  } catch (error) {
    return apiError(error);
  }
}
