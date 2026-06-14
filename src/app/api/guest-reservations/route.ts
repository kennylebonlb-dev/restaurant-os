import { guestReservationLookupSchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { listGuestReservations } from "@/server/services/reservation-service";

export async function POST(request: Request) {
  try {
    const data = await parseJson(request, guestReservationLookupSchema);
    const reservations = await listGuestReservations(data);

    return ok({ reservations });
  } catch (error) {
    return apiError(error);
  }
}
