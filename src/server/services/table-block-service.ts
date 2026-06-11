import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertValidTimeRange, toDateOnly } from "@/lib/time";
import { ConflictError, NotFoundError } from "@/server/errors";
import { emitRestaurantEvent } from "@/server/realtime";

export async function createTableBlock(input: {
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: "MAINTENANCE" | "ADMIN" | "EVENT";
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
}) {
  assertValidTimeRange(input.startTime, input.endTime);
  const date = toDateOnly(input.date);

  const { block, restaurantId } = await prisma.$transaction(
    async (tx) => {
      const table = await tx.table.findUnique({
        where: {
          id: input.tableId
        },
        select: {
          id: true,
          restaurantId: true
        }
      });

      if (!table) {
        throw new NotFoundError("Table not found.");
      }

      const overlappingReservation = await tx.reservation.findFirst({
        where: {
          tableId: input.tableId,
          date,
          status: {
            in: ["PENDING", "CONFIRMED"]
          },
          startTime: {
            lt: input.endTime
          },
          endTime: {
            gt: input.startTime
          }
        },
        select: {
          id: true
        }
      });

      if (overlappingReservation) {
        throw new ConflictError("A reservation already exists during this block.");
      }

      const overlappingBlock = await tx.tableBlock.findFirst({
        where: {
          tableId: input.tableId,
          date,
          startTime: {
            lt: input.endTime
          },
          endTime: {
            gt: input.startTime
          }
        },
        select: {
          id: true
        }
      });

      if (overlappingBlock) {
        throw new ConflictError("A table block already exists during this time.");
      }

      const block = await tx.tableBlock.create({
        data: {
          tableId: input.tableId,
          date,
          startTime: input.startTime,
          endTime: input.endTime,
          reason: input.reason,
          customerFirstName: input.customerFirstName,
          customerLastName: input.customerLastName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          notes: input.notes
        }
      });

      return {
        block,
        restaurantId: table.restaurantId
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );

  emitRestaurantEvent(restaurantId, "table:blocked", block);
  return block;
}

export async function listTableBlocks(tableId: string) {
  return prisma.tableBlock.findMany({
    where: {
      tableId
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }]
  });
}

export async function deleteTableBlock(blockId: string) {
  const block = await prisma.tableBlock.findUnique({
    where: {
      id: blockId
    },
    include: {
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

  await prisma.tableBlock.delete({
    where: {
      id: blockId
    }
  });

  emitRestaurantEvent(block.table.restaurantId, "table:unblocked", block);
}
