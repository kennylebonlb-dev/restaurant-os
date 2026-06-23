import { updateWaitlistEntrySchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { updateWaitlistEntry } from "@/server/services/waitlist-service";

type Context = {
  params: Promise<{
    restaurantId: string;
    waitlistEntryId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId, waitlistEntryId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "HOST");
    const data = await parseJson(request, updateWaitlistEntrySchema);
    const waitlistEntry = await updateWaitlistEntry(restaurantId, waitlistEntryId, data, session.user.id);

    return ok({ waitlistEntry });
  } catch (error) {
    return apiError(error);
  }
}
