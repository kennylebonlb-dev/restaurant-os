import { z } from "zod";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { createBillingPortalSession } from "@/server/services/stripe-service";

const portalSchema = z.object({
  restaurantId: z.string().cuid()
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const data = await parseJson(request, portalSchema);
    await requireRestaurantAccess(session, data.restaurantId, "OWNER");
    const portalSession = await createBillingPortalSession({
      requestUrl: request.url,
      restaurantId: data.restaurantId
    });

    return ok(portalSession);
  } catch (error) {
    return apiError(error);
  }
}
