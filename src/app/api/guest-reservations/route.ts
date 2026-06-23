import { guestReservationLookupSchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { assertRateLimit, rateLimitKey } from "@/server/rate-limit";
import { listGuestReservations } from "@/server/services/reservation-service";

export async function POST(request: Request) {
  try {
    assertRateLimit(rateLimitKey(request, "guest-reservation:lookup"), {
      limit: 12,
      windowMs: 60_000
    });
    const data = await parseJson(request, guestReservationLookupSchema);
    const reservations = await listGuestReservations(data);

    return ok({ reservations });
  } catch (error) {
    return apiError(error);
  }
}
