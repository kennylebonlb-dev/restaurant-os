import { z } from "zod";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { listStripeInvoices } from "@/server/services/stripe-service";

const invoicesSchema = z.object({
  restaurantId: z.string().cuid()
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const data = await parseJson(request, invoicesSchema);
    await requireRestaurantAccess(session, data.restaurantId, "OWNER");
    const invoices = await listStripeInvoices(data.restaurantId);

    return ok({ invoices });
  } catch (error) {
    return apiError(error);
  }
}
