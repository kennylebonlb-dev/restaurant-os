import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/guards";
import { sendWaitlistTableAvailableEmail } from "@/server/email";
import { NotFoundError } from "@/server/errors";
import { apiError, ok } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";
import { updateWaitlistEntry } from "@/server/services/waitlist-service";
import { sendWaitlistTableAvailableSms } from "@/server/sms";

const WAITLIST_NOTIFIED_MARKER = "WAITLIST_NOTIFIED";

type Context = {
  params: Promise<{
    restaurantId: string;
    waitlistEntryId: string;
  }>;
};

export async function POST(_: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId, waitlistEntryId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "HOST");

    const entry = await prisma.waitlistEntry.findFirst({
      where: {
        id: waitlistEntryId,
        restaurantId
      },
      include: {
        restaurant: {
          select: {
            name: true,
            address: true,
            slug: true,
            settings: true
          }
        }
      }
    });

    if (!entry) {
      throw new NotFoundError("Waitlist entry not found.");
    }

    const restaurantSettings = entry.restaurant.settings &&
      typeof entry.restaurant.settings === "object" &&
      !Array.isArray(entry.restaurant.settings)
      ? entry.restaurant.settings as Record<string, unknown>
      : {};
    const waitlistSmsEnabled = restaurantSettings.waitlistSmsEnabled !== false;
    const [emailSent, smsSent] = await Promise.all([
      sendWaitlistTableAvailableEmail(entry),
      waitlistSmsEnabled ? sendWaitlistTableAvailableSms(entry) : Promise.resolve(false)
    ]);
    const notes = entry.notes?.includes(WAITLIST_NOTIFIED_MARKER)
      ? entry.notes
      : [entry.notes, WAITLIST_NOTIFIED_MARKER].filter(Boolean).join("\n");
    const waitlistEntry = await updateWaitlistEntry(
      restaurantId,
      waitlistEntryId,
      {
        notes
      },
      session.user.id
    );

    return ok({ waitlistEntry, emailSent, smsSent });
  } catch (error) {
    return apiError(error);
  }
}
