import { createRestaurantSchema } from "@/lib/validators";
import { defaultRestaurantSettings, defaultTrialSubscriptionSettings } from "@/lib/site-defaults";
import { inferTimeZoneFromAddress } from "@/lib/time";
import { requireRole } from "@/server/auth/guards";
import { apiError, created, ok, parseJson } from "@/server/http";
import { createRestaurant, listRestaurants } from "@/server/services/restaurant-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug")?.trim() || undefined;
    const restaurants = await listRestaurants({ slug });

    return ok(
      { restaurants },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    const data = await parseJson(request, createRestaurantSchema);
    const restaurant = await createRestaurant({
      ...data,
      settings: {
        ...defaultRestaurantSettings,
        ...defaultTrialSubscriptionSettings(),
        ...data.settings
      },
      timezone: data.timezone || inferTimeZoneFromAddress(data.address),
      ownerId: session.user.id
    });

    return created({ restaurant });
  } catch (error) {
    return apiError(error);
  }
}
