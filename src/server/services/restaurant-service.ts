import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/server/errors";
import { emitRestaurantEvent } from "@/server/realtime";

type RestaurantInput = {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  timezone: string;
  openingHours: unknown;
  settings: unknown;
  menu: unknown;
  ownerId?: string;
};

export async function listRestaurants() {
  return prisma.restaurant.findMany({
    orderBy: {
      name: "asc"
    },
    include: {
      tables: {
        orderBy: [{ zone: "asc" }, { label: "asc" }]
      }
    }
  });
}

export async function getRestaurant(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: restaurantId
    },
    include: {
      tables: {
        orderBy: [{ zone: "asc" }, { label: "asc" }]
      }
    }
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant not found.");
  }

  return restaurant;
}

export async function createRestaurant(data: RestaurantInput) {
  const restaurant = await prisma.restaurant.create({
    data: {
      ...data,
      openingHours: data.openingHours as Prisma.InputJsonValue,
      settings: data.settings as Prisma.InputJsonValue,
      menu: data.menu as Prisma.InputJsonValue
    }
  });

  emitRestaurantEvent(restaurant.id, "restaurant:created", restaurant);
  return restaurant;
}

export async function updateRestaurant(
  restaurantId: string,
  data: Partial<RestaurantInput> & {
    layoutLocked?: boolean;
    imageKey?: string | null;
  }
) {
  await getRestaurant(restaurantId);

  const restaurant = await prisma.restaurant.update({
    where: {
      id: restaurantId
    },
    data: data as Prisma.RestaurantUpdateInput
  });

  emitRestaurantEvent(restaurantId, "restaurant:updated", restaurant);

  if (data.layoutLocked !== undefined) {
    emitRestaurantEvent(restaurantId, "layout:updated", {
      layoutLocked: restaurant.layoutLocked
    });
  }

  return restaurant;
}

export async function deleteRestaurant(restaurantId: string) {
  await getRestaurant(restaurantId);

  const restaurant = await prisma.restaurant.delete({
    where: {
      id: restaurantId
    }
  });

  emitRestaurantEvent(restaurantId, "restaurant:deleted", { id: restaurantId });
  return restaurant;
}
