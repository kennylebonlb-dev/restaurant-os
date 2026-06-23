import { clientSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, created, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { createClient, listClients } from "@/server/services/client-service";

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
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    const clients = await listClients(restaurantId, search);

    return ok({ clients });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "HOST");
    const data = await parseJson(request, clientSchema);
    const client = await createClient(restaurantId, data, session.user.id);

    return created({ client });
  } catch (error) {
    return apiError(error);
  }
}
