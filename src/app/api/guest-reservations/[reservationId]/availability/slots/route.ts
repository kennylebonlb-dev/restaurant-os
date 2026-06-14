import { availabilitySchema, guestReservationLookupSchema } from "@/lib/validators";
import { NotFoundError } from "@/server/errors";
import { apiError, ok } from "@/server/http";
import { getAvailabilitySlots, listGuestReservations } from "@/server/services/reservation-service";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { reservationId } = await context.params;
    const payload = await request.json();
    const guest = guestReservationLookupSchema.parse(payload);
    const data = availabilitySchema.omit({ startTime: true, endTime: true }).parse(payload);
    const reservations = await listGuestReservations(guest);
    const reservation = reservations.find((item) => item.id === reservationId);

    if (!reservation) {
      throw new NotFoundError("Reservation not found.");
    }

    const slots = await getAvailabilitySlots(prisma, {
      restaurantId: reservation.restaurant.id,
      ...data,
      ignoreReservationId: reservationId
    });

    return ok({ slots });
  } catch (error) {
    return apiError(error);
  }
}
