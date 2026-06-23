import { updateRestaurantSchema } from "@/lib/validators";
import { inferTimeZoneFromAddress } from "@/lib/time";
import { requireSession } from "@/server/auth/guards";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import {
  deleteRestaurant,
  getRestaurant,
  updateRestaurant
} from "@/server/services/restaurant-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { restaurantId } = await context.params;
    const restaurant = await getRestaurant(restaurantId);
    return ok({ restaurant });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "MANAGER");
    const data = await parseJson(request, updateRestaurantSchema);
    const restaurant = await updateRestaurant(
      restaurantId,
      data.address !== undefined || data.timezone
        ? {
            ...data,
            timezone: data.timezone || inferTimeZoneFromAddress(data.address)
          }
        : data
    );

    return ok({ restaurant });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "OWNER");
    await deleteRestaurant(restaurantId);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
