import { dateStringSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { getDailyAnalytics } from "@/server/services/analytics-service";

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
    const date = dateStringSchema.parse(
      new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
    );
    const analytics = await getDailyAnalytics(restaurantId, date);

    return ok({ analytics });
  } catch (error) {
    return apiError(error);
  }
}
