import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guestReservationRegisterSchema } from "@/lib/validators";
import { sendRegistrationConfirmation } from "@/server/email";
import { BadRequestError } from "@/server/errors";
import { apiError, ok, parseJson } from "@/server/http";
import { listGuestReservations } from "@/server/services/reservation-service";

export async function POST(request: Request) {
  try {
    const data = await parseJson(request, guestReservationRegisterSchema);
    const reservations = await listGuestReservations(data);
    const reservation = reservations[0];

    if (!reservation) {
      throw new BadRequestError("Aucune réservation active ne correspond à ces informations.");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: reservation.userId
      }
    });

    if (!user) {
      throw new BadRequestError("Impossible de retrouver le client de cette réservation.");
    }

    if (user.passwordHash) {
      throw new BadRequestError("Un compte existe déjà pour cette réservation. Connectez-vous pour continuer.");
    }

    const passwordHash = await hash(data.password, 12);
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        passwordHash
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    const emailSent = await sendRegistrationConfirmation(updatedUser);

    return ok({ user: updatedUser, emailSent });
  } catch (error) {
    return apiError(error);
  }
}
