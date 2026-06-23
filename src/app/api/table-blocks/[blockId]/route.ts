import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/guards";
import { NotFoundError } from "@/server/errors";
import { apiError, noContent } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { deleteTableBlock } from "@/server/services/table-block-service";

type Context = {
  params: Promise<{
    blockId: string;
  }>;
};

async function getBlockRestaurantId(blockId: string) {
  const block = await prisma.tableBlock.findUnique({
    where: {
      id: blockId
    },
    select: {
      table: {
        select: {
          restaurantId: true
        }
      }
    }
  });

  if (!block) {
    throw new NotFoundError("Table block not found.");
  }

  return block.table.restaurantId;
}

export async function DELETE(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { blockId } = await context.params;
    await requireRestaurantAccess(session, await getBlockRestaurantId(blockId), "HOST");
    await deleteTableBlock(blockId);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
