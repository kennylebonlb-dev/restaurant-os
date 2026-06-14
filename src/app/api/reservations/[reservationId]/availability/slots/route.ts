import { prisma } from "@/lib/prisma";
import { availabilitySchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { NotFoundError } from "@/server/errors";
import { apiError, ok, parseJson } from "@/server/http";
import { getAvailabilitySlots } from "@/server/services/reservation-service";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { reservationId } = await context.params;
    const data = await parseJson(request, availabilitySchema.omit({ startTime: true, endTime: true }));
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId
      },
      select: {
        restaurantId: true,
        userId: true
      }
    });

    if (
      !reservation ||
      (session.user.role !== "ADMIN" && session.user.role !== "STAFF" && reservation.userId !== session.user.id)
    ) {
      throw new NotFoundError("Reservation not found.");
    }

    const slots = await getAvailabilitySlots(prisma, {
      restaurantId: reservation.restaurantId,
      ...data,
      ignoreReservationId: reservationId
    });

    return ok({ slots });
  } catch (error) {
    return apiError(error);
  }
}
