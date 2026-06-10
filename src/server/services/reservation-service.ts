import { Prisma, type ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertValidTimeRange, toDateOnly } from "@/lib/time";
import { ConflictError, NotFoundError } from "@/server/errors";
import { emitRestaurantEvent } from "@/server/realtime";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type AvailabilityInput = {
  restaurantId: string;
  date: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
};

export type CreateReservationInput = AvailabilityInput & {
  userId: string;
  tableId?: string;
  notes?: string;
  status?: ReservationStatus;
};

type AssertTableAvailableInput = AvailabilityInput & {
  tableId: string;
  ignoreReservationId?: string;
};

function activeReservationWhere() {
  return {
    in: ["PENDING", "CONFIRMED"] as ReservationStatus[]
  };
}

export async function getAvailableTables(db: DbClient, input: AvailabilityInput) {
  assertValidTimeRange(input.startTime, input.endTime);
  const date = toDateOnly(input.date);

  const candidateTables = await db.table.findMany({
    where: {
      restaurantId: input.restaurantId,
      active: true,
      capacity: {
        gte: input.numberOfGuests
      }
    },
    orderBy: [{ capacity: "asc" }, { label: "asc" }]
  });

  if (candidateTables.length === 0) {
    return [];
  }

  const tableIds = candidateTables.map((table) => table.id);

  const [overlappingReservations, overlappingBlocks] = await Promise.all([
    db.reservation.findMany({
      where: {
        restaurantId: input.restaurantId,
        tableId: {
          in: tableIds
        },
        date,
        status: activeReservationWhere(),
        startTime: {
          lt: input.endTime
        },
        endTime: {
          gt: input.startTime
        }
      },
      select: {
        tableId: true
      }
    }),
    db.tableBlock.findMany({
      where: {
        tableId: {
          in: tableIds
        },
        date,
        startTime: {
          lt: input.endTime
        },
        endTime: {
          gt: input.startTime
        }
      },
      select: {
        tableId: true
      }
    })
  ]);

  const unavailableTableIds = new Set<string>();

  for (const reservation of overlappingReservations) {
    if (reservation.tableId) {
      unavailableTableIds.add(reservation.tableId);
    }
  }

  for (const block of overlappingBlocks) {
    unavailableTableIds.add(block.tableId);
  }

  return candidateTables.filter((table) => !unavailableTableIds.has(table.id));
}

export async function assertTableAvailable(db: DbClient, input: AssertTableAvailableInput) {
  assertValidTimeRange(input.startTime, input.endTime);
  const date = toDateOnly(input.date);

  const table = await db.table.findFirst({
    where: {
      id: input.tableId,
      restaurantId: input.restaurantId
    }
  });

  if (!table || !table.active) {
    throw new NotFoundError("Table is not available.");
  }

  if (table.capacity < input.numberOfGuests) {
    throw new ConflictError("Table capacity is too small for this reservation.");
  }

  const overlappingReservation = await db.reservation.findFirst({
    where: {
      id: input.ignoreReservationId
        ? {
            not: input.ignoreReservationId
          }
        : undefined,
      tableId: input.tableId,
      date,
      status: activeReservationWhere(),
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
    throw new ConflictError("Table already has a reservation for this time.");
  }

  const overlappingBlock = await db.tableBlock.findFirst({
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
    throw new ConflictError("Table is blocked for this time.");
  }

  return table;
}

export async function createReservation(input: CreateReservationInput) {
  const reservation = await prisma.$transaction(
    async (tx) => {
      if (input.tableId) {
        await assertTableAvailable(tx, {
          ...input,
          tableId: input.tableId
        });
      } else {
        assertValidTimeRange(input.startTime, input.endTime);
      }

      return tx.reservation.create({
        data: {
          restaurantId: input.restaurantId,
          userId: input.userId,
          tableId: input.tableId,
          date: toDateOnly(input.date),
          startTime: input.startTime,
          endTime: input.endTime,
          numberOfGuests: input.numberOfGuests,
          status: input.status ?? (input.tableId ? "CONFIRMED" : "PENDING"),
          notes: input.notes
        },
        include: {
          restaurant: true,
          table: {
            select: {
              id: true,
              label: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );

  emitRestaurantEvent(input.restaurantId, "reservation:created", reservation);
  return reservation;
}

export async function listRestaurantReservations(restaurantId: string, date?: string) {
  return prisma.reservation.findMany({
    where: {
      restaurantId,
      date: date ? toDateOnly(date) : undefined
    },
    include: {
      table: {
        select: {
          id: true,
          label: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }]
  });
}

export async function listUserReservations(userId: string) {
  return prisma.reservation.findMany({
    where: {
      userId
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          address: true
        }
      },
      table: {
        select: {
          id: true,
          label: true
        }
      }
    },
    orderBy: [{ date: "desc" }, { startTime: "asc" }]
  });
}

export async function cancelReservation(reservationId: string, requesterId?: string) {
  const existing = await prisma.reservation.findUnique({
    where: {
      id: reservationId
    },
    include: {
      restaurant: true,
      table: {
        select: {
          id: true,
          label: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  if (!existing) {
    throw new NotFoundError("Reservation not found.");
  }

  if (requesterId && existing.userId !== requesterId) {
    throw new NotFoundError("Reservation not found.");
  }

  const reservation = await prisma.reservation.update({
    where: {
      id: reservationId
    },
    data: {
      status: "CANCELLED"
    },
    include: {
      restaurant: true,
      table: {
        select: {
          id: true,
          label: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  emitRestaurantEvent(reservation.restaurantId, "reservation:cancelled", reservation);
  return reservation;
}

export async function updateReservation(
  reservationId: string,
  data: {
    status?: ReservationStatus;
    notes?: string | null;
    tableId?: string | null;
  }
) {
  const existing = await prisma.reservation.findUnique({
    where: {
      id: reservationId
    }
  });

  if (!existing) {
    throw new NotFoundError("Reservation not found.");
  }

  if (data.tableId) {
    await assertTableAvailable(prisma, {
      restaurantId: existing.restaurantId,
      tableId: data.tableId,
      date: existing.date.toISOString().slice(0, 10),
      startTime: existing.startTime,
      endTime: existing.endTime,
      numberOfGuests: existing.numberOfGuests,
      ignoreReservationId: reservationId
    });
  }

  const reservation = await prisma.reservation.update({
    where: {
      id: reservationId
    },
    data,
    include: {
      restaurant: true,
      table: {
        select: {
          id: true,
          label: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  emitRestaurantEvent(reservation.restaurantId, "reservation:updated", reservation);
  return reservation;
}
