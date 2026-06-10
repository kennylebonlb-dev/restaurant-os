import { dateStringSchema } from "@/lib/validators";
import { requireRole } from "@/server/auth/guards";
import { apiError, ok } from "@/server/http";
import { getDailyAnalytics } from "@/server/services/analytics-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const { restaurantId } = await context.params;
    const date = dateStringSchema.parse(
      new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
    );
    const analytics = await getDailyAnalytics(restaurantId, date);

    return ok({ analytics });
  } catch (error) {
    return apiError(error);
  }
}
