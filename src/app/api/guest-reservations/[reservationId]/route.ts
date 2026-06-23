import { customerReservationUpdateSchema, guestReservationLookupSchema } from "@/lib/validators";
import { sendReservationCancellation, sendReservationUpdate } from "@/server/email";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import { cancelGuestReservation, updateGuestReservation } from "@/server/services/reservation-service";
import { sendReservationCancellationSms, sendReservationUpdateSms } from "@/server/sms";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { reservationId } = await context.params;
    const payload = await request.json();
    const guest = guestReservationLookupSchema.parse(payload);
    const data = customerReservationUpdateSchema.parse(payload);
    const reservation = await updateGuestReservation(reservationId, guest, data);

    const [emailSent, smsSent] = await Promise.all([
      sendReservationUpdate(reservation),
      sendReservationUpdateSms(reservation)
    ]);

    return ok({ reservation, emailSent, smsSent });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { reservationId } = await context.params;
    const data = await parseJson(request, guestReservationLookupSchema);
    const reservation = await cancelGuestReservation(reservationId, data);

    await Promise.all([
      sendReservationCancellation(reservation),
      sendReservationCancellationSms(reservation)
    ]);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
