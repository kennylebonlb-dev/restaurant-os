import { updateReservationSchema } from "@/lib/validators";
import { requireRole, requireSession } from "@/server/auth/guards";
import { sendReservationCancellation } from "@/server/email";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import {
  cancelReservation,
  updateReservation
} from "@/server/services/reservation-service";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const { reservationId } = await context.params;
    const data = await parseJson(request, updateReservationSchema);
    const reservation = await updateReservation(reservationId, data);

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
