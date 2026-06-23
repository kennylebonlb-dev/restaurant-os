import { prisma } from "@/lib/prisma";
import { createTableBlockSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { NotFoundError } from "@/server/errors";
import { apiError, created, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import {
  createTableBlock,
  listTableBlocks
} from "@/server/services/table-block-service";

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

export async function GET(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { tableId } = await context.params;
    await requireRestaurantAccess(session, await getTableRestaurantId(tableId), "READ_ONLY");
    const blocks = await listTableBlocks(tableId);

    return ok({ blocks });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { tableId } = await context.params;
    await requireRestaurantAccess(session, await getTableRestaurantId(tableId), "HOST");
    const data = await parseJson(request, createTableBlockSchema);
    const block = await createTableBlock({
      tableId,
      ...data
    });

    return created({ block });
  } catch (error) {
    return apiError(error);
  }
}
