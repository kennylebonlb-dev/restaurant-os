import { z } from "zod";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { getStripePlanCatalog } from "@/server/services/stripe-service";

const plansSchema = z.object({
  restaurantId: z.string().cuid()
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const data = await parseJson(request, plansSchema);
    await requireRestaurantAccess(session, data.restaurantId, "OWNER");
    const plans = await getStripePlanCatalog();

    return ok({ plans });
  } catch (error) {
    return apiError(error);
  }
}
