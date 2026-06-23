import { requireSession } from "@/server/auth/guards";
import { apiError, ok } from "@/server/http";
import { listAuditEvents } from "@/server/services/audit-service";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "READ_ONLY");
    const take = Number(new URL(request.url).searchParams.get("take") ?? "50");
    const events = await listAuditEvents(restaurantId, take);

    return ok({ events });
  } catch (error) {
    return apiError(error);
  }
}
