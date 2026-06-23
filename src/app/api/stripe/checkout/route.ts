import { z } from "zod";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { createSubscriptionCheckoutSession } from "@/server/services/stripe-service";

const checkoutSchema = z.object({
  restaurantId: z.string().cuid()
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const data = await parseJson(request, checkoutSchema);
    await requireRestaurantAccess(session, data.restaurantId, "OWNER");
    const checkoutSession = await createSubscriptionCheckoutSession({
      requestUrl: request.url,
      restaurantId: data.restaurantId
    });

    return ok(checkoutSession);
  } catch (error) {
    return apiError(error);
  }
}
