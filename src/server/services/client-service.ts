import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/time";
import { NotFoundError } from "@/server/errors";
import { emitRestaurantEvent } from "@/server/realtime";
import { recordAuditEvent } from "@/server/services/audit-service";

type ClientInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthday?: string;
  allergies?: string;
  preferences?: string[];
  internalNotes?: string;
  vip?: boolean;
  noShowRisk?: number;
};

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function upsertClientFromReservation(input: {
  restaurantId: string;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const firstName = cleanOptional(input.firstName ?? undefined);
  const lastName = cleanOptional(input.lastName ?? undefined);

  if (!firstName || !lastName) {
    return null;
  }

  const email = cleanOptional(input.email ?? undefined);
  const phone = cleanOptional(input.phone ?? undefined);
  const existing = email
    ? await prisma.client.findUnique({
        where: {
          restaurantId_email: {
            restaurantId: input.restaurantId,
            email
          }
        }
      })
    : phone
      ? await prisma.client.findFirst({
          where: {
            restaurantId: input.restaurantId,
            phone
          }
        })
      : null;

  if (existing) {
    return prisma.client.update({
      where: {
        id: existing.id
      },
      data: {
        firstName,
        lastName,
        email,
        phone,
        userId: input.userId ?? existing.userId,
        lastVisitAt: new Date()
      }
    });
  }

  return prisma.client.create({
    data: {
      restaurantId: input.restaurantId,
      userId: input.userId,
      firstName,
      lastName,
      email,
      phone,
      lastVisitAt: new Date()
    }
  });
}

export async function listClients(restaurantId: string, search?: string) {
  const term = search?.trim();

  return prisma.client.findMany({
    where: {
      restaurantId,
      ...(term
        ? {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { phone: { contains: term, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ vip: "desc" }, { updatedAt: "desc" }],
    take: 100,
    include: {
      reservations: {
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 10,
        select: {
          id: true,
          referenceCode: true,
          date: true,
          startTime: true,
          numberOfGuests: true,
          status: true,
          noShow: true,
          updatedAt: true,
          table: {
            select: {
              id: true,
              label: true
            }
          }
        }
      }
    }
  });
}

export async function createClient(restaurantId: string, input: ClientInput, actorId?: string) {
  const client = await prisma.client.create({
    data: {
      restaurantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: cleanOptional(input.email),
      phone: cleanOptional(input.phone),
      birthday: input.birthday ? toDateOnly(input.birthday) : null,
      allergies: cleanOptional(input.allergies),
      preferences: (input.preferences ?? []) as Prisma.InputJsonValue,
      internalNotes: cleanOptional(input.internalNotes),
      vip: input.vip ?? false,
      noShowRisk: input.noShowRisk ?? 0
    }
  });

  await recordAuditEvent({
    restaurantId,
    actorId,
    action: "client.created",
    entityType: "client",
    entityId: client.id
  });
  emitRestaurantEvent(restaurantId, "client_updated", client);

  return client;
}

export async function updateClient(
  restaurantId: string,
  clientId: string,
  input: Partial<ClientInput>,
  actorId?: string
) {
  const existing = await prisma.client.findFirst({
    where: {
      id: clientId,
      restaurantId
    }
  });

  if (!existing) {
    throw new NotFoundError("Client not found.");
  }

  const client = await prisma.client.update({
    where: {
      id: clientId
    },
    data: {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: cleanOptional(input.email) } : {}),
      ...(input.phone !== undefined ? { phone: cleanOptional(input.phone) } : {}),
      ...(input.birthday !== undefined ? { birthday: input.birthday ? toDateOnly(input.birthday) : null } : {}),
      ...(input.allergies !== undefined ? { allergies: cleanOptional(input.allergies) } : {}),
      ...(input.preferences !== undefined ? { preferences: input.preferences as Prisma.InputJsonValue } : {}),
      ...(input.internalNotes !== undefined ? { internalNotes: cleanOptional(input.internalNotes) } : {}),
      ...(input.vip !== undefined ? { vip: input.vip } : {}),
      ...(input.noShowRisk !== undefined ? { noShowRisk: input.noShowRisk } : {})
    }
  });

  await recordAuditEvent({
    restaurantId,
    actorId,
    action: "client.updated",
    entityType: "client",
    entityId: client.id
  });
  emitRestaurantEvent(restaurantId, "client_updated", client);

  return client;
}
