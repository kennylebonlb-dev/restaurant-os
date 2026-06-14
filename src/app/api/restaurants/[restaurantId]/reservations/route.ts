import { createAdminReservationSchema, createReservationSchema } from "@/lib/validators";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/guards";
import { sendReservationConfirmation } from "@/server/email";
import { apiError, created, ok } from "@/server/http";
import {
  createReservation,
  listRestaurantReservations
} from "@/server/services/reservation-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

async function findOrCreateReservationUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email
    },
    select: {
      id: true,
      passwordHash: true
    }
  });

  if (existingUser) {
    if (!existingUser.passwordHash) {
      const name = [data.firstName, data.lastName].filter(Boolean).join(" ");

      await prisma.user.update({
        where: {
          id: existingUser.id
        },
        data: {
          name,
          firstName: data.firstName,
          lastName: data.lastName,
          contactEmail: data.email,
          phone: data.phone
        }
      });
    }

    return existingUser.id;
  }

  const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const user = await prisma.user.create({
    data: {
      name,
      firstName: data.firstName,
      lastName: data.lastName,
      contactEmail: data.email,
      email: data.email,
      phone: data.phone,
      role: "CLIENT"
    },
    select: {
      id: true
    }
  });

  return user.id;
}

export async function GET(request: Request, context: Context) {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const { restaurantId } = await context.params;
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    const reservations = await listRestaurantReservations(restaurantId, date);

    return ok({ reservations });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    const { restaurantId } = await context.params;
    const payload = await request.json();

    if (session?.user.role === "ADMIN" && typeof payload.userId === "string") {
      const data = createAdminReservationSchema.parse(payload);
      const reservation = await createReservation({
        restaurantId,
        userId: data.userId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        numberOfGuests: data.numberOfGuests,
        tableId: data.tableId,
        autoAssignTable: data.autoAssignTable,
        tablePreferences: data.tablePreferences,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        highChair: data.highChair,
        birthday: data.birthday,
        romanticDinner: data.romanticDinner,
        notes: data.notes,
        status: data.status
      });

      await sendReservationConfirmation(reservation);

      return created({ reservation });
    }

    const data = createReservationSchema.parse(payload);
    const userId =
      session?.user.id ??
      (await findOrCreateReservationUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone
      }));
    const reservation = await createReservation({
      restaurantId,
      userId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      numberOfGuests: data.numberOfGuests,
      tableId: data.tableId,
      autoAssignTable: data.autoAssignTable,
      tablePreferences: data.tablePreferences,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      highChair: data.highChair,
      birthday: data.birthday,
      romanticDinner: data.romanticDinner,
      notes: data.notes
    });

    await sendReservationConfirmation(reservation);

    return created({ reservation });
  } catch (error) {
    return apiError(error);
  }
}
