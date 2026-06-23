import type { Prisma, WaitlistStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/time";
import { NotFoundError } from "@/server/errors";
import { emitRestaurantEvent } from "@/server/realtime";
import { recordAuditEvent } from "@/server/services/audit-service";
import { upsertClientFromReservation } from "@/server/services/client-service";

type WaitlistInput = {
  clientId?: string;
  date?: string;
  requestedTime?: string;
  numberOfGuests?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tablePreferences?: string[];
  status?: WaitlistStatus;
};

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listWaitlistEntries(restaurantId: string, date?: string) {
  return prisma.waitlistEntry.findMany({
    where: {
      restaurantId,
      ...(date ? { date: toDateOnly(date) } : {})
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: {
      client: true
    }
  });
}

export async function createWaitlistEntry(
  restaurantId: string,
  input: Required<Pick<WaitlistInput, "date" | "numberOfGuests" | "firstName" | "lastName">> & WaitlistInput,
  actorId?: string
) {
  const client =
    input.clientId
      ? await prisma.client.findFirst({ where: { id: input.clientId, restaurantId } })
      : await upsertClientFromReservation({
          restaurantId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone
        });

  const entry = await prisma.waitlistEntry.create({
    data: {
      restaurantId,
      clientId: client?.id ?? input.clientId,
      date: toDateOnly(input.date),
      requestedTime: cleanOptional(input.requestedTime),
      numberOfGuests: input.numberOfGuests,
      firstName: input.firstName,
      lastName: input.lastName,
      email: cleanOptional(input.email),
      phone: cleanOptional(input.phone),
      notes: cleanOptional(input.notes),
      tablePreferences: (input.tablePreferences ?? []) as Prisma.InputJsonValue
    },
    include: {
      client: true
    }
  });

  await recordAuditEvent({
    restaurantId,
    actorId,
    action: "waitlist.created",
    entityType: "waitlistEntry",
    entityId: entry.id
  });
  emitRestaurantEvent(restaurantId, "waitlist_updated", entry);

  return entry;
}

export async function updateWaitlistEntry(
  restaurantId: string,
  waitlistEntryId: string,
  input: WaitlistInput,
  actorId?: string
) {
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      id: waitlistEntryId,
      restaurantId
    }
  });

  if (!existing) {
    throw new NotFoundError("Waitlist entry not found.");
  }

  const entry = await prisma.waitlistEntry.update({
    where: {
      id: waitlistEntryId
    },
    data: {
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.date !== undefined ? { date: toDateOnly(input.date) } : {}),
      ...(input.requestedTime !== undefined ? { requestedTime: cleanOptional(input.requestedTime) } : {}),
      ...(input.numberOfGuests !== undefined ? { numberOfGuests: input.numberOfGuests } : {}),
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: cleanOptional(input.email) } : {}),
      ...(input.phone !== undefined ? { phone: cleanOptional(input.phone) } : {}),
      ...(input.notes !== undefined ? { notes: cleanOptional(input.notes) } : {}),
      ...(input.tablePreferences !== undefined ? { tablePreferences: input.tablePreferences as Prisma.InputJsonValue } : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    },
    include: {
      client: true
    }
  });

  await recordAuditEvent({
    restaurantId,
    actorId,
    action: "waitlist.updated",
    entityType: "waitlistEntry",
    entityId: entry.id,
    metadata: {
      status: entry.status
    }
  });
  emitRestaurantEvent(restaurantId, "waitlist_updated", entry);

  return entry;
}
