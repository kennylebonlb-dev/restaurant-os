import { prisma } from "@/lib/prisma";
import { availabilitySchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { getAvailabilitySlots } from "@/server/services/reservation-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { restaurantId } = await context.params;
    const data = await parseJson(request, availabilitySchema.omit({ startTime: true, endTime: true }));
    const slots = await getAvailabilitySlots(prisma, {
      restaurantId,
      ...data
    });

    return ok({ slots });
  } catch (error) {
    return apiError(error);
  }
}
