import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/guards";
import { sendReservationReminder } from "@/server/email";
import { apiError, ok } from "@/server/http";
import { NotFoundError } from "@/server/errors";
import { assertRateLimit, rateLimitKey } from "@/server/rate-limit";
import { sendReservationReminderSms } from "@/server/sms";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  try {
    assertRateLimit(rateLimitKey(request, "reservation:reminder"), {
      limit: 20,
      windowMs: 60_000
    });
    const session = await requireSession();
    const { reservationId } = await context.params;
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId
      },
      include: {
        restaurant: true,
        table: {
          select: {
            id: true,
            label: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            contactEmail: true,
            phone: true
          }
        }
      }
    });

    if (!reservation) {
      throw new NotFoundError("Reservation not found.");
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";

    if (!isAdmin && reservation.userId !== session.user.id) {
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
