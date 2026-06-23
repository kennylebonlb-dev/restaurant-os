import { customerReservationUpdateSchema, updateReservationSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireSession } from "@/server/auth/guards";
import { sendReservationCancellation, sendReservationUpdate } from "@/server/email";
import { NotFoundError } from "@/server/errors";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import {
  cancelReservation,
  updateReservation,
  updateUserReservation
} from "@/server/services/reservation-service";
import { sendReservationCancellationSms, sendReservationUpdateSms } from "@/server/sms";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

async function canManageReservation(session: Awaited<ReturnType<typeof requireSession>>, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: reservationId
    },
    select: {
      restaurantId: true
    }
  });

  if (!reservation) {
    throw new NotFoundError("Reservation not found.");
  }

  if (session.user.role === "ADMIN" || session.user.role === "STAFF") {
    return true;
  }

  try {
    await requireRestaurantAccess(session, reservation.restaurantId, "HOST");
    return true;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return false;
    }

    throw error;
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { reservationId } = await context.params;
    const canManage = await canManageReservation(session, reservationId);
    const data = await parseJson(request, canManage ? updateReservationSchema : customerReservationUpdateSchema);
    const { suppressNotifications, ...reservationData } = data as typeof data & { suppressNotifications?: boolean };
    const reservation = canManage
      ? await updateReservation(reservationId, reservationData)
      : await updateUserReservation(reservationId, session.user.id, reservationData);

    const isCancellation = canManage && "status" in reservationData && reservationData.status === "CANCELLED";
    const shouldNotify = !(canManage && suppressNotifications === true);
    const [emailSent, smsSent] = await Promise.all(
      shouldNotify
        ? isCancellation
          ? [sendReservationCancellation(reservation), sendReservationCancellationSms(reservation)]
          : [sendReservationUpdate(reservation), sendReservationUpdateSms(reservation)]
        : [Promise.resolve(false), Promise.resolve(false)]
    );

    return ok({ reservation, emailSent, smsSent });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { reservationId } = await context.params;
    const canManage = await canManageReservation(session, reservationId);
    const reservation = await cancelReservation(
      reservationId,
      canManage ? undefined : session.user.id,
      canManage ? "restaurant" : "customer"
    );

    await Promise.all([
      sendReservationCancellation(reservation),
      sendReservationCancellationSms(reservation)
    ]);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
