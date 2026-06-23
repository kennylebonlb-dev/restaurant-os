import { notificationTemplateSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { listNotificationTemplates, upsertNotificationTemplate } from "@/server/services/template-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "READ_ONLY");
    const templates = await listNotificationTemplates(restaurantId);

    return ok({ templates });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "MANAGER");
    const data = await parseJson(request, notificationTemplateSchema);
    const template = await upsertNotificationTemplate(restaurantId, data, session.user.id);

    return ok({ template });
  } catch (error) {
    return apiError(error);
  }
}
