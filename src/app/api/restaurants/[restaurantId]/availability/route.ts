import { prisma } from "@/lib/prisma";
import { availabilitySchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { getAvailableTables } from "@/server/services/reservation-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { restaurantId } = await context.params;
    const data = await parseJson(request, availabilitySchema);
    const tables = await getAvailableTables(prisma, {
      restaurantId,
      ...data
    });

    return ok({ tables });
  } catch (error) {
    return apiError(error);
  }
}
