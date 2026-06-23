import { guestReservationLookupSchema } from "@/lib/validators";
import { sendReservationReminder } from "@/server/email";
import { apiError, ok, parseJson } from "@/server/http";
import { NotFoundError } from "@/server/errors";
import { assertRateLimit, rateLimitKey } from "@/server/rate-limit";
import { listGuestReservations } from "@/server/services/reservation-service";
import { sendReservationReminderSms } from "@/server/sms";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  try {
    assertRateLimit(rateLimitKey(request, "guest-reservation:reminder"), {
      limit: 8,
      windowMs: 60_000
    });
    const { reservationId } = await context.params;
    const guest = await parseJson(request, guestReservationLookupSchema);
    const reservations = await listGuestReservations(guest);
    const reservation = reservations.find((item) => item.id === reservationId);

    if (!reservation) {
      throw new NotFoundError("Reservation not found.");
    }

    const [emailSent, smsSent] = await Promise.all([
      sendReservationReminder(reservation),
      sendReservationReminderSms(reservation)
    ]);

    return ok({ sent: emailSent || smsSent, emailSent, smsSent });
  } catch (error) {
    return apiError(error);
  }
}
