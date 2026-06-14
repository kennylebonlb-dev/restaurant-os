import { guestReservationLookupSchema } from "@/lib/validators";
import { sendReservationReminder } from "@/server/email";
import { apiError, ok, parseJson } from "@/server/http";
import { NotFoundError } from "@/server/errors";
import { listGuestReservations } from "@/server/services/reservation-service";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { reservationId } = await context.params;
    const guest = await parseJson(request, guestReservationLookupSchema);
    const reservations = await listGuestReservations(guest);
    const reservation = reservations.find((item) => item.id === reservationId);

    if (!reservation) {
      throw new NotFoundError("Reservation not found.");
    }

    await sendReservationReminder(reservation);

    return ok({ sent: true });
  } catch (error) {
    return apiError(error);
  }
}

