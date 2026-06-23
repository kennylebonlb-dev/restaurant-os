import { updateClientSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { updateClient } from "@/server/services/client-service";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";

type Context = {
  params: Promise<{
    restaurantId: string;
    clientId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId, clientId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "HOST");
    const data = await parseJson(request, updateClientSchema);
    const client = await updateClient(restaurantId, clientId, data, session.user.id);

    return ok({ client });
  } catch (error) {
    return apiError(error);
  }
}
