import { availabilitySchema, guestReservationLookupSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/server/errors";
import { apiError, ok } from "@/server/http";
import { getAvailableTables, listGuestReservations } from "@/server/services/reservation-service";

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
    const data = availabilitySchema.parse(payload);
    const reservations = await listGuestReservations(guest);
    const reservation = reservations.find((item) => item.id === reservationId);

    if (!reservation) {
      throw new NotFoundError("Reservation not found.");
    }

    const tables = await getAvailableTables(prisma, {
      restaurantId: reservation.restaurant.id,
      ...data,
      ignoreReservationId: reservationId
    });

    return ok({ tables });
  } catch (error) {
    return apiError(error);
  }
}
