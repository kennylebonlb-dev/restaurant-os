import { customerReservationUpdateSchema, updateReservationSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { sendReservationCancellation } from "@/server/email";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import {
  cancelReservation,
  updateReservation,
  updateUserReservation
} from "@/server/services/reservation-service";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { reservationId } = await context.params;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";
    const data = await parseJson(request, isAdmin ? updateReservationSchema : customerReservationUpdateSchema);
    const reservation = isAdmin
      ? await updateReservation(reservationId, data)
      : await updateUserReservation(reservationId, session.user.id, data);

    return ok({ reservation });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { reservationId } = await context.params;
    const reservation = await cancelReservation(
      reservationId,
      session.user.role === "ADMIN" || session.user.role === "STAFF" ? undefined : session.user.id
    );

    await sendReservationCancellation(reservation);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
