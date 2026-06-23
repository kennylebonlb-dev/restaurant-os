import { waitlistEntrySchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/guards";
import { BadRequestError } from "@/server/errors";
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
    const { restaurantId } = await context.params;
    const data = await parseJson(request, waitlistEntrySchema);
    const session = await requireSession().catch(() => null);

    if (session) {
      await requireRestaurantAccess(session, restaurantId, "HOST");
    } else {
      const restaurant = await prisma.restaurant.findUnique({
        where: {
          id: restaurantId
        },
        select: {
          settings: true
        }
      });
      const settings = restaurant?.settings && typeof restaurant.settings === "object" && !Array.isArray(restaurant.settings)
        ? restaurant.settings as Record<string, unknown>
        : {};

      if (!restaurant || settings.waitlistEnabled !== true) {
        throw new BadRequestError("La liste d’attente n’est pas activée pour ce restaurant.");
      }
    }

    const waitlistEntry = await createWaitlistEntry(restaurantId, data, session?.user.id);

    return created({ waitlistEntry });
  } catch (error) {
    return apiError(error);
  }
}
