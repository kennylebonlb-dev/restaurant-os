import { z } from "zod";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { createEmbeddedSubscriptionCheckoutSession } from "@/server/services/stripe-service";

const embeddedCheckoutSchema = z.object({
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]).optional(),
  commitment: z.enum(["NONE", "TWELVE_MONTHS"]).optional(),
  planName: z.enum(["Essentiel", "Pro", "Signature"]).optional(),
  restaurantId: z.string().cuid()
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const data = await parseJson(request, embeddedCheckoutSchema);
    await requireRestaurantAccess(session, data.restaurantId, "OWNER");
    const checkoutSession = await createEmbeddedSubscriptionCheckoutSession({
      billingCycle: data.billingCycle,
      commitment: data.commitment,
      planName: data.planName,
      requestUrl: request.url,
      restaurantId: data.restaurantId
    });

    return ok(checkoutSession);
  } catch (error) {
    return apiError(error);
  }
}
