import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BadRequestError, NotFoundError } from "@/server/errors";
import { emitRestaurantEvent } from "@/server/realtime";

type TableCreateInput = {
  restaurantId: string;
  label: string;
  capacity: number;
  zone: "INDOOR" | "TERRACE" | "VIP";
  positionX: number;
  positionY: number;
  rotation: number;
  active: boolean;
};

type TableUpdateInput = Partial<Omit<TableCreateInput, "restaurantId">>;

function touchesLayout(data: TableUpdateInput) {
  return (
    data.positionX !== undefined ||
    data.positionY !== undefined ||
    data.rotation !== undefined ||
    data.zone !== undefined
  );
}

export async function listTables(restaurantId: string) {
  return prisma.table.findMany({
    where: {
      restaurantId
    },
    orderBy: [{ zone: "asc" }, { label: "asc" }]
  });
}

export async function createTable(data: TableCreateInput) {
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: data.restaurantId
    },
    select: {
      layoutLocked: true
    }
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant not found.");
  }

  if (restaurant.layoutLocked) {
    throw new BadRequestError("The table layout is locked.");
  }

  const table = await prisma.table.create({
    data
  });

  emitRestaurantEvent(data.restaurantId, "table:created", table);
  return table;
}

export async function updateTable(tableId: string, data: TableUpdateInput) {
  const table = await prisma.table.findUnique({
    where: {
      id: tableId
    },
    include: {
      restaurant: {
        select: {
          layoutLocked: true
        }
      }
    }
  });

  if (!table) {
    throw new NotFoundError("Table not found.");
  }

  if (table.restaurant.layoutLocked && touchesLayout(data)) {
    throw new BadRequestError("The table layout is locked.");
  }

  const updatedTable = await prisma.table.update({
    where: {
      id: tableId
    },
    data
  });

  emitRestaurantEvent(updatedTable.restaurantId, "table:updated", updatedTable);

  if (touchesLayout(data)) {
    emitRestaurantEvent(updatedTable.restaurantId, "layout:updated", updatedTable);
  }

  return updatedTable;
}

export async function deleteTable(tableId: string) {
  const table = await prisma.table.findUnique({
    where: {
      id: tableId
    },
    include: {
      restaurant: {
        select: {
          layoutLocked: true
        }
      }
    }
  });

  if (!table) {
    throw new NotFoundError("Table not found.");
  }

  if (table.restaurant.layoutLocked) {
    throw new BadRequestError("The table layout is locked.");
  }

  await prisma.table.delete({
    where: {
      id: tableId
    }
  });

  emitRestaurantEvent(table.restaurantId, "table:deleted", { id: table.id });
}

export function tableSelect(): Prisma.TableSelect {
  return {
    id: true,
    label: true,
    capacity: true,
    zone: true,
    positionX: true,
    positionY: true,
    rotation: true,
    active: true
  };
}
