import { createAdminReservationSchema, createReservationSchema } from "@/lib/validators";
import { requireRole, requireSession } from "@/server/auth/guards";
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
    const session = await requireSession();
    const { restaurantId } = await context.params;
    const payload = await request.json();

    if (session.user.role === "ADMIN" && typeof payload.userId === "string") {
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
    const reservation = await createReservation({
      restaurantId,
      userId: session.user.id,
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
