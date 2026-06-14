import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/guards";
import { sendReservationReminder } from "@/server/email";
import { apiError, ok } from "@/server/http";
import { NotFoundError } from "@/server/errors";

type Context = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(_: Request, context: Context) {
  try {
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
            contactEmail: true
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

    await sendReservationReminder(reservation);

    return ok({ sent: true });
  } catch (error) {
    return apiError(error);
  }
}

