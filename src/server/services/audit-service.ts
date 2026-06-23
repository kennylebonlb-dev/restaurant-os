import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitRestaurantEvent } from "@/server/realtime";

export async function recordAuditEvent(input: {
  restaurantId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const event = await prisma.auditEvent.create({
    data: {
      restaurantId: input.restaurantId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
    }
  });

  emitRestaurantEvent(input.restaurantId, "service_status_updated", {
    auditEventId: event.id,
    action: event.action,
    entityType: event.entityType
  });

  return event;
}

export async function listAuditEvents(restaurantId: string, take = 50) {
  return prisma.auditEvent.findMany({
    where: {
      restaurantId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: Math.min(100, Math.max(1, take)),
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}
