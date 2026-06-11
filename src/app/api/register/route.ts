import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { apiError, created, parseJson } from "@/server/http";

export async function POST(request: Request) {
  try {
    const data = await parseJson(request, registerSchema);
    const passwordHash = await hash(data.password, 12);
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ");

    const user = await prisma.user.create({
      data: {
        name,
        firstName: data.firstName,
        lastName: data.lastName,
        contactEmail: data.email,
        email: data.email,
        phone: data.phone,
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
