import { Prisma, type ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AvailabilitySlot, OpeningHours, TableFeature, VacationClosure } from "@/lib/domain";
import { tableFeaturesFromSettings } from "@/lib/floor-plan-settings";
import {
  addMinutes,
  assertValidTimeRange,
  getDayKey,
  getZonedDateTimeParts,
  isQuarterHour,
  minutesToTime,
  parseTimeToMinutes,
  toDateOnly
} from "@/lib/time";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import { emitRestaurantEvent } from "@/server/realtime";

type DbClient = Prisma.TransactionClient | typeof prisma;
const DEFAULT_RESERVATION_DURATION_MINUTES = 120;
const MIN_LEAD_TIME_MINUTES = 120;

export type AvailabilityInput = {
  restaurantId: string;
  date: string;
  startTime: string;
  endTime?: string;
  numberOfGuests: number;
  tablePreferences?: TableFeature[];
};

export type CreateReservationInput = AvailabilityInput & {
  userId: string;
  tableId?: string;
  autoAssignTable?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  highChair?: boolean;
  birthday?: boolean;
  romanticDinner?: boolean;
  notes?: string;
  status?: ReservationStatus;
};

type ReservationWindow = {
  startTime: string;
  endTime: string;
};

type RestaurantPolicy = {
  timezone: string;
  openingHours: OpeningHours;
  vacationClosures: VacationClosure[];
  reservationDurationMinutes: number;
  minimumLeadTimeMinutes: number;
  releaseTableAfterDuration: boolean;
  strictCapacityMatching: boolean;
  tableFeatures: Record<string, TableFeature[]>;
};

type ServiceWindow = {
  open: string;
  close: string;
  openMinutes: number;
  closeMinutes: number;
};

type AssertTableAvailableInput = Omit<AvailabilityInput, "endTime"> &
  ReservationWindow & {
  tableId: string;
  ignoreReservationId?: string;
};

function activeReservationWhere() {
  return {
    in: ["PENDING", "CONFIRMED"] as ReservationStatus[]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function reservationDurationFromSettings(settings: unknown) {
  if (!isRecord(settings)) {
    return DEFAULT_RESERVATION_DURATION_MINUTES;
  }

  const duration = settings.reservationDurationMinutes;

  return typeof duration === "number" && duration >= 30 && duration <= 360
    ? duration
    : DEFAULT_RESERVATION_DURATION_MINUTES;
}

function minimumLeadTimeFromSettings(settings: unknown) {
  if (!isRecord(settings)) {
    return MIN_LEAD_TIME_MINUTES;
  }

  return settings.minimumLeadTimeEnabled === false ? 0 : MIN_LEAD_TIME_MINUTES;
}

function releaseTableAfterDurationFromSettings(settings: unknown) {
  return !isRecord(settings) || settings.oneReservationPerTablePerService !== false;
}

function strictCapacityMatchingFromSettings(settings: unknown) {
  return !isRecord(settings) || settings.strictCapacityMatching !== false;
}

function vacationClosuresFromSettings(settings: unknown): VacationClosure[] {
  if (!isRecord(settings) || !Array.isArray(settings.vacationClosures)) {
    return [];
  }

  return settings.vacationClosures
    .map((closure): VacationClosure | null => {
      if (!isRecord(closure)) {
        return null;
      }

      const startDate = closure.startDate;
      const endDate = closure.endDate;

      if (typeof startDate !== "string" || typeof endDate !== "string") {
        return null;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return null;
      }

      return {
        id: typeof closure.id === "string" ? closure.id : `${startDate}-${endDate}`,
        startDate,
        endDate,
        label: typeof closure.label === "string" ? closure.label : undefined
      };
    })
    .filter((closure): closure is VacationClosure => Boolean(closure));
}

async function getRestaurantPolicy(db: DbClient, restaurantId: string): Promise<RestaurantPolicy> {
  const restaurant = await db.restaurant.findUnique({
    where: {
      id: restaurantId
    },
    select: {
      timezone: true,
      openingHours: true,
      settings: true
    }
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant not found.");
  }

  return {
    timezone: restaurant.timezone,
    openingHours: restaurant.openingHours as OpeningHours,
    vacationClosures: vacationClosuresFromSettings(restaurant.settings),
    reservationDurationMinutes: reservationDurationFromSettings(restaurant.settings),
    minimumLeadTimeMinutes: minimumLeadTimeFromSettings(restaurant.settings),
    releaseTableAfterDuration: releaseTableAfterDurationFromSettings(restaurant.settings),
    strictCapacityMatching: strictCapacityMatchingFromSettings(restaurant.settings),
    tableFeatures: tableFeaturesFromSettings(isRecord(restaurant.settings) ? restaurant.settings : {})
  };
}

function tableMatchesPreferences(
  tableId: string,
  policy: RestaurantPolicy,
  preferences?: TableFeature[]
) {
  if (!preferences || preferences.length === 0) {
    return true;
  }

  const features = policy.tableFeatures[tableId] ?? [];
  return preferences.every((preference) => features.includes(preference));
}

function filterByPreferredCapacity<TTable extends { capacity: number }>(
  tables: TTable[],
  numberOfGuests: number,
  policy: RestaurantPolicy
) {
  if (!policy.strictCapacityMatching) {
    return tables;
  }

  const exactTables = tables.filter((table) => table.capacity === numberOfGuests);
  return exactTables.length > 0 ? exactTables : tables;
}

function reservationWindow(input: AvailabilityInput, policy: RestaurantPolicy): ReservationWindow {
  if (!isQuarterHour(input.startTime)) {
    throw new BadRequestError("Reservations must start on a 15-minute slot.");
  }

  const endTime = input.endTime ?? addMinutes(input.startTime, policy.reservationDurationMinutes);
  assertValidTimeRange(input.startTime, endTime);

  return {
    startTime: input.startTime,
    endTime
  };
}

function isClosedForVacation(date: string, policy: RestaurantPolicy) {
  return policy.vacationClosures.some((closure) => {
    const startDate = closure.startDate <= closure.endDate ? closure.startDate : closure.endDate;
    const endDate = closure.startDate <= closure.endDate ? closure.endDate : closure.startDate;
    return date >= startDate && date <= endDate;
  });
}

function getServiceWindows(dayHours: OpeningHours[string] | undefined): ServiceWindow[] {
  if (!dayHours || dayHours.closed) {
    return [];
  }

  const windows: ServiceWindow[] = [];
  const addWindow = (open?: string, close?: string) => {
    if (!open || !close) {
      return;
    }

    const openMinutes = parseTimeToMinutes(open);
    const closeMinutes = parseTimeToMinutes(close);

    if (closeMinutes <= openMinutes) {
      return;
    }

    windows.push({
      open,
      close,
      openMinutes,
      closeMinutes
    });
  };

  addWindow(dayHours.open, dayHours.close);

  if (dayHours.secondServiceEnabled) {
    addWindow(dayHours.secondOpen, dayHours.secondClose);
  }

  return windows.sort((first, second) => first.openMinutes - second.openMinutes);
}

function assertRestaurantOpen(
  policy: RestaurantPolicy,
  date: string,
  startTime: string,
  endTime: string
) {
  if (isClosedForVacation(date, policy)) {
    throw new BadRequestError("Restaurant is closed during this vacation period.");
  }

  const serviceWindows = getServiceWindows(policy.openingHours[getDayKey(date)]);

  if (serviceWindows.length === 0) {
    throw new BadRequestError("Restaurant is closed for this time.");
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const insideService = serviceWindows.some(
    (serviceWindow) =>
      startMinutes >= serviceWindow.openMinutes && endMinutes <= serviceWindow.closeMinutes
  );

  if (!insideService) {
    throw new BadRequestError("Restaurant is closed for this time.");
  }
}

function assertLeadTime(date: string, startTime: string, timezone: string, minimumLeadTimeMinutes: number) {
  const now = getZonedDateTimeParts(timezone);

  if (date < now.date) {
    throw new BadRequestError("This date is no longer available.");
  }

  if (date === now.date && parseTimeToMinutes(startTime) < now.minutes) {
    throw new BadRequestError("This time is no longer available.");
  }

  if (date === now.date && parseTimeToMinutes(startTime) < now.minutes + minimumLeadTimeMinutes) {
    throw new BadRequestError("Reservations must be made at least 2 hours in advance.");
  }
}

function slotIsBookable(date: string, startTime: string, timezone: string, minimumLeadTimeMinutes: number) {
  const now = getZonedDateTimeParts(timezone);

  if (date < now.date) {
    return false;
  }

  if (date !== now.date) {
    return true;
  }

  const startMinutes = parseTimeToMinutes(startTime);
  return startMinutes >= now.minutes && startMinutes >= now.minutes + minimumLeadTimeMinutes;
}

async function getUnavailableTableIds(
  db: DbClient,
  input: Omit<AvailabilityInput, "endTime"> & ReservationWindow,
  tableIds: string[],
  releaseTableAfterDuration: boolean,
  ignoreReservationId?: string
) {
  const date = toDateOnly(input.date);
  const reservationWhere = releaseTableAfterDuration
    ? {
        id: ignoreReservationId
          ? {
              not: ignoreReservationId
            }
          : undefined,
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
      }
    : {
        id: ignoreReservationId
          ? {
              not: ignoreReservationId
            }
          : undefined,
        tableId: {
          in: tableIds
        },
        date,
        status: activeReservationWhere()
      };

  const [overlappingReservations, overlappingBlocks] = await Promise.all([
    db.reservation.findMany({
      where: reservationWhere,
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

  return unavailableTableIds;
}

export async function getAvailableTables(db: DbClient, input: AvailabilityInput) {
  const policy = await getRestaurantPolicy(db, input.restaurantId);
  const window = reservationWindow(input, policy);
  assertLeadTime(input.date, window.startTime, policy.timezone, policy.minimumLeadTimeMinutes);
  assertRestaurantOpen(policy, input.date, window.startTime, window.endTime);

  const allCandidateTables = await db.table.findMany({
    where: {
      restaurantId: input.restaurantId,
      active: true,
      capacity: {
        gte: input.numberOfGuests
      }
    },
    orderBy: [{ capacity: "asc" }, { label: "asc" }]
  });
  const candidateTables = allCandidateTables.filter((table) =>
    tableMatchesPreferences(table.id, policy, input.tablePreferences)
  );

  if (candidateTables.length === 0) {
    return [];
  }

  const tableIds = candidateTables.map((table) => table.id);
  const unavailableTableIds = await getUnavailableTableIds(
    db,
    {
      ...input,
      ...window
    },
    tableIds,
    policy.releaseTableAfterDuration
  );

  return filterByPreferredCapacity(
    candidateTables.filter((table) => !unavailableTableIds.has(table.id)),
    input.numberOfGuests,
    policy
  );
}

export async function getAvailabilitySlots(db: DbClient, input: Omit<AvailabilityInput, "startTime" | "endTime">) {
  const policy = await getRestaurantPolicy(db, input.restaurantId);
  const serviceWindows = getServiceWindows(policy.openingHours[getDayKey(input.date)]);

  if (isClosedForVacation(input.date, policy) || serviceWindows.length === 0) {
    return [] satisfies AvailabilitySlot[];
  }

  const allCandidateTables = await db.table.findMany({
    where: {
      restaurantId: input.restaurantId,
      active: true,
      capacity: {
        gte: input.numberOfGuests
      }
    },
    select: {
      capacity: true,
      id: true
    }
  });
  const candidateTables = allCandidateTables.filter((table) =>
    tableMatchesPreferences(table.id, policy, input.tablePreferences)
  );
  const tableIds = candidateTables.map((table) => table.id);
  const date = toDateOnly(input.date);

  const [reservations, blocks] =
    tableIds.length === 0
      ? [[], []]
      : await Promise.all([
          db.reservation.findMany({
            where: {
              restaurantId: input.restaurantId,
              tableId: {
                in: tableIds
              },
              date,
              status: activeReservationWhere()
            },
            select: {
              tableId: true,
              startTime: true,
              endTime: true
            }
          }),
          db.tableBlock.findMany({
            where: {
              tableId: {
                in: tableIds
              },
              date
            },
            select: {
              tableId: true,
              startTime: true,
              endTime: true
            }
          })
        ]);

  const slots: AvailabilitySlot[] = [];
  const now = getZonedDateTimeParts(policy.timezone);
  const seenStartTimes = new Set<string>();

  for (const serviceWindow of serviceWindows) {
    const latestStart = serviceWindow.closeMinutes - policy.reservationDurationMinutes;

    if (latestStart < serviceWindow.openMinutes) {
      continue;
    }

    for (let start = serviceWindow.openMinutes; start <= latestStart; start += 15) {
      const startTime = minutesToTime(start);
      const endTime = minutesToTime(start + policy.reservationDurationMinutes);

      if (seenStartTimes.has(startTime)) {
        continue;
      }

      seenStartTimes.add(startTime);

      if (input.date < now.date || (input.date === now.date && start < now.minutes)) {
        continue;
      }

      const selectableByTime = slotIsBookable(
        input.date,
        startTime,
        policy.timezone,
        policy.minimumLeadTimeMinutes
      );

      if (tableIds.length === 0) {
        slots.push({
          startTime,
          endTime,
          availableTables: 0,
          totalTables: 0,
          selectable: false,
          status: "RED",
          reason: "NO_TABLE_CAPACITY"
        });
        continue;
      }

      const unavailableTableIds = new Set<string>();

      for (const reservation of reservations) {
        if (
          reservation.tableId &&
          (!policy.releaseTableAfterDuration ||
            (reservation.startTime < endTime && reservation.endTime > startTime))
        ) {
          unavailableTableIds.add(reservation.tableId);
        }
      }

      for (const block of blocks) {
        if (block.startTime < endTime && block.endTime > startTime) {
          unavailableTableIds.add(block.tableId);
        }
      }

      const availableCandidateTables = candidateTables.filter((table) => !unavailableTableIds.has(table.id));
      const preferredAvailableTables = filterByPreferredCapacity(
        availableCandidateTables,
        input.numberOfGuests,
        policy
      );
      const exactCapacityAvailable = preferredAvailableTables.some(
        (table) => table.capacity === input.numberOfGuests
      );
      const relevantTablePool = policy.strictCapacityMatching && exactCapacityAvailable
        ? candidateTables.filter((table) => table.capacity === input.numberOfGuests)
        : candidateTables;
      const availableTables = preferredAvailableTables.length;
      const totalTables = relevantTablePool.length;
      const availabilityRatio = totalTables > 0 ? availableTables / totalTables : 0;

      slots.push({
        startTime,
        endTime,
        availableTables,
        totalTables,
        selectable: selectableByTime && availableTables > 0,
        status: !selectableByTime
          ? "CLOSED"
          : availableTables === 0
            ? "RED"
            : availabilityRatio <= 0.5
              ? "ORANGE"
              : "GREEN",
        reason: !selectableByTime ? "TOO_SOON" : availableTables === 0 ? "FULL" : undefined
      });
    }
  }

  return slots;
}

export async function assertTableAvailable(db: DbClient, input: AssertTableAvailableInput) {
  assertValidTimeRange(input.startTime, input.endTime);
  const policy = await getRestaurantPolicy(db, input.restaurantId);
  assertLeadTime(input.date, input.startTime, policy.timezone, policy.minimumLeadTimeMinutes);
  assertRestaurantOpen(policy, input.date, input.startTime, input.endTime);

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

  if (!tableMatchesPreferences(table.id, policy, input.tablePreferences)) {
    throw new ConflictError("Table does not match the requested preferences.");
  }

  const unavailableTableIds = await getUnavailableTableIds(
    db,
    input,
    [input.tableId],
    policy.releaseTableAfterDuration,
    input.ignoreReservationId
  );

  if (unavailableTableIds.has(input.tableId)) {
    throw new ConflictError("Table already has a reservation for this time.");
  }

  if (policy.strictCapacityMatching && table.capacity > input.numberOfGuests) {
    const preferredTables = await getAvailableTables(db, {
      restaurantId: input.restaurantId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      numberOfGuests: input.numberOfGuests,
      tablePreferences: input.tablePreferences
    });

    if (preferredTables.some((availableTable) => availableTable.capacity === input.numberOfGuests)) {
      throw new ConflictError("A table matching the party size is available.");
    }
  }

  return table;
}

export async function createReservation(input: CreateReservationInput) {
  const reservation = await prisma.$transaction(
    async (tx) => {
      const policy = await getRestaurantPolicy(tx, input.restaurantId);
      const window = reservationWindow(input, policy);
      let tableId = input.tableId;

      if (input.autoAssignTable && !tableId) {
        const availableTables = await getAvailableTables(tx, {
          restaurantId: input.restaurantId,
          date: input.date,
          startTime: window.startTime,
          endTime: window.endTime,
          numberOfGuests: input.numberOfGuests,
          tablePreferences: input.tablePreferences
        });

        if (availableTables.length === 0) {
          throw new ConflictError("No table is available for this time.");
        }

        tableId = availableTables[Math.floor(Math.random() * availableTables.length)].id;
      }

      if (tableId) {
        await assertTableAvailable(tx, {
          restaurantId: input.restaurantId,
          date: input.date,
          startTime: window.startTime,
          endTime: window.endTime,
          numberOfGuests: input.numberOfGuests,
          tablePreferences: input.tablePreferences,
          tableId
        });
      } else {
        assertLeadTime(input.date, window.startTime, policy.timezone, policy.minimumLeadTimeMinutes);
        assertRestaurantOpen(policy, input.date, window.startTime, window.endTime);
      }

      if (input.firstName || input.lastName || input.email || input.phone) {
        await tx.user.update({
          where: {
            id: input.userId
          },
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            contactEmail: input.email,
            name: [input.firstName, input.lastName].filter(Boolean).join(" ") || undefined
          }
        });
      }

      return tx.reservation.create({
        data: {
          restaurantId: input.restaurantId,
          userId: input.userId,
          tableId,
          guestFirstName: input.firstName,
          guestLastName: input.lastName,
          guestEmail: input.email,
          guestPhone: input.phone,
          date: toDateOnly(input.date),
          startTime: window.startTime,
          endTime: window.endTime,
          numberOfGuests: input.numberOfGuests,
          status: input.status ?? (tableId ? "CONFIRMED" : "PENDING"),
          highChair: input.highChair ?? false,
          birthday: input.birthday ?? false,
          romanticDinner: input.romanticDinner ?? false,
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
              name: true,
              contactEmail: true
            }
          }
        }
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15000
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
          email: true,
          contactEmail: true,
          phone: true
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
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          contactEmail: true,
          phone: true
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
          name: true,
          contactEmail: true
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
          name: true,
          contactEmail: true
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
          name: true,
          contactEmail: true
        }
      }
    }
  });

  emitRestaurantEvent(reservation.restaurantId, "reservation:updated", reservation);
  return reservation;
}
