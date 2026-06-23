import { waitlistEntrySchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, created, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { createWaitlistEntry, listWaitlistEntries } from "@/server/services/waitlist-service";

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
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    const waitlist = await listWaitlistEntries(restaurantId, date);

    return ok({ waitlist });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "HOST");
    const data = await parseJson(request, waitlistEntrySchema);
    const waitlistEntry = await createWaitlistEntry(restaurantId, data, session.user.id);

    return created({ waitlistEntry });
  } catch (error) {
    return apiError(error);
  }
}
