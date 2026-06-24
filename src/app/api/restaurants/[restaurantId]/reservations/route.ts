import { createAdminReservationSchema, createReservationSchema } from "@/lib/validators";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/guards";
import { sendReservationConfirmation } from "@/server/email";
import { apiError, created, ok } from "@/server/http";
import { assertRateLimit, rateLimitKey } from "@/server/rate-limit";
import { getRestaurantAccessRole, requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import {
  createReservation,
  listRestaurantReservations
} from "@/server/services/reservation-service";
import { sendReservationConfirmationSms } from "@/server/sms";

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
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "READ_ONLY");
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    const reservations = await listRestaurantReservations(restaurantId, date);

    return ok({ reservations });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertRateLimit(rateLimitKey(request, "reservation:create"), {
      limit: 20,
      windowMs: 60_000
    });
    const session = await getServerSession(authOptions);
	    const { restaurantId } = await context.params;
	    const payload = await request.json();
      const restaurantAccessRole = session ? await getRestaurantAccessRole(session, restaurantId) : null;
	    const isRestaurantStaff = Boolean(restaurantAccessRole) || session?.user.role === "ADMIN" || session?.user.role === "STAFF";
	    const isAdminReservation = isRestaurantStaff && (typeof payload.userId === "string" || typeof payload.status === "string" || payload.sendConfirmationSms === true);
      const sendConfirmationSmsForStaff = payload.sendConfirmationSms === true;

	    if (restaurantAccessRole && session) {
	      await requireRestaurantAccess(session, restaurantId, "HOST");
	    } else if (isAdminReservation && session) {
	      await requireRestaurantAccess(session, restaurantId, "HOST");
	    }

	    if (isAdminReservation && typeof payload.userId === "string") {
      const data = createAdminReservationSchema.parse(payload);
      const reservation = await createReservation({
        restaurantId,
        userId: data.userId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        numberOfGuests: data.numberOfGuests,
        tableId: data.tableId,
        combinationId: data.combinationId,
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

      const [emailSent, smsSent] = await Promise.all([
        sendReservationConfirmation(reservation),
        sendConfirmationSmsForStaff ? sendReservationConfirmationSms(reservation) : Promise.resolve(false)
      ]);

      return created({ reservation, emailSent, smsSent });
    }

    const data = createReservationSchema.parse(payload);
    const userId = isRestaurantStaff
      ? await findOrCreateReservationUser({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone
        })
      : session?.user.id ??
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
      combinationId: data.combinationId,
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

    const [emailSent, smsSent] = await Promise.all([
      sendReservationConfirmation(reservation),
      isRestaurantStaff && !payload.sendConfirmationSms ? Promise.resolve(false) : sendReservationConfirmationSms(reservation)
    ]);

    return created({ reservation, emailSent, smsSent });
  } catch (error) {
    return apiError(error);
  }
}
