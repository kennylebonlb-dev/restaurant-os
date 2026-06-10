import { requireSession } from "@/server/auth/guards";
import { apiError, ok } from "@/server/http";
import { listUserReservations } from "@/server/services/reservation-service";

export async function GET() {
  try {
    const session = await requireSession();
    const reservations = await listUserReservations(session.user.id);

    return ok({ reservations });
  } catch (error) {
    return apiError(error);
  }
}
