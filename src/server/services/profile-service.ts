import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/time";
import { NotFoundError } from "@/server/errors";

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      contactEmail: true,
      phone: true,
      birthDate: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new NotFoundError("Profile not found.");
  }

  return user;
}

export async function updateUserProfile(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate?: string;
  }
) {
  const user = await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      contactEmail: data.email,
      phone: data.phone,
      birthDate: data.birthDate ? toDateOnly(data.birthDate) : null,
      name: `${data.firstName} ${data.lastName}`.trim()
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      contactEmail: true,
      phone: true,
      birthDate: true,
      role: true,
      createdAt: true
    }
  });

  return user;
}
