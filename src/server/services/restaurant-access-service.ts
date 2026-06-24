import type { RestaurantStaffRole } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/server/auth/guards";

const roleRank: Record<RestaurantStaffRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  HOST: 2,
  READ_ONLY: 1
};

export async function requireRestaurantAccess(
  session: Session,
  restaurantId: string,
  minimumRole: RestaurantStaffRole = "READ_ONLY"
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: restaurantId
    },
    select: {
      ownerId: true,
      staff: {
        where: {
          userId: session.user.id
        },
        select: {
          role: true
        },
        take: 1
      }
    }
  });

  const effectiveRole = restaurant?.ownerId === session.user.id
    ? "OWNER"
    : restaurant?.staff[0]?.role;

  if (!effectiveRole) {
    throw new ForbiddenError("You do not have access to this restaurant.");
  }

  if (roleRank[effectiveRole] < roleRank[minimumRole]) {
    throw new ForbiddenError("You do not have enough access for this action.");
  }

  return {
    role: effectiveRole
  };
}

export async function getRestaurantAccessRole(session: Session, restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: restaurantId
    },
    select: {
      ownerId: true,
      staff: {
        where: {
          userId: session.user.id
        },
        select: {
          role: true
        },
        take: 1
      }
    }
  });

  return restaurant?.ownerId === session.user.id
    ? "OWNER"
    : restaurant?.staff[0]?.role ?? null;
}
