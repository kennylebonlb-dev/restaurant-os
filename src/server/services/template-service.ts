import type { NotificationChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitRestaurantEvent } from "@/server/realtime";
import { recordAuditEvent } from "@/server/services/audit-service";

type NotificationTemplateInput = {
  key: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  enabled?: boolean;
  variables?: string[];
};

export async function listNotificationTemplates(restaurantId: string) {
  return prisma.notificationTemplate.findMany({
    where: {
      restaurantId
    },
    orderBy: [{ channel: "asc" }, { key: "asc" }]
  });
}

export async function upsertNotificationTemplate(
  restaurantId: string,
  input: NotificationTemplateInput,
  actorId?: string
) {
  const template = await prisma.notificationTemplate.upsert({
    where: {
      restaurantId_key_channel: {
        restaurantId,
        key: input.key,
        channel: input.channel
      }
    },
    create: {
      restaurantId,
      key: input.key,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      enabled: input.enabled ?? true,
      variables: (input.variables ?? []) as Prisma.InputJsonValue
    },
    update: {
      subject: input.subject,
      body: input.body,
      enabled: input.enabled ?? true,
      variables: (input.variables ?? []) as Prisma.InputJsonValue
    }
  });

  await recordAuditEvent({
    restaurantId,
    actorId,
    action: "notificationTemplate.upserted",
    entityType: "notificationTemplate",
    entityId: template.id,
    metadata: {
      key: template.key,
      channel: template.channel
    }
  });
  emitRestaurantEvent(restaurantId, "service_status_updated", {
    templateId: template.id,
    key: template.key,
    channel: template.channel
  });

  return template;
}
