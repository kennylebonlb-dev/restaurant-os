import { prisma } from "@/lib/prisma";
import { updateTableSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { NotFoundError } from "@/server/errors";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { deleteTable, updateTable } from "@/server/services/table-service";

type Context = {
  params: Promise<{
    tableId: string;
  }>;
};

async function getTableRestaurantId(tableId: string) {
  const table = await prisma.table.findUnique({
    where: {
      id: tableId
    },
    select: {
      restaurantId: true
    }
  });

  if (!table) {
    throw new NotFoundError("Table not found.");
  }

  return table.restaurantId;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { tableId } = await context.params;
    await requireRestaurantAccess(session, await getTableRestaurantId(tableId), "MANAGER");
    const data = await parseJson(request, updateTableSchema);
    const table = await updateTable(tableId, data);

    return ok({ table });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { tableId } = await context.params;
    await requireRestaurantAccess(session, await getTableRestaurantId(tableId), "MANAGER");
    await deleteTable(tableId);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
