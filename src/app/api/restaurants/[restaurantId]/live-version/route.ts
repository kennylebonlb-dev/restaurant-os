import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/time";
import { dateStringSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

function versionToken(count: number, updatedAt?: Date | null) {
  return `${count}:${updatedAt?.toISOString() ?? "none"}`;
}

export async function GET(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "READ_ONLY");

    const dateParam = new URL(request.url).searchParams.get("date");
    const date = dateParam ? toDateOnly(dateStringSchema.parse(dateParam)) : undefined;

    const [reservations, tableBlocks, waitlist] = await Promise.all([
      prisma.reservation.aggregate({
        where: {
          restaurantId,
          date
        },
        _count: {
          _all: true
        },
        _max: {
          updatedAt: true
        }
      }),
      prisma.tableBlock.aggregate({
        where: {
          date,
          table: {
            restaurantId
          }
        },
        _count: {
          _all: true
        },
        _max: {
          updatedAt: true
        }
      }),
      prisma.waitlistEntry.aggregate({
        where: {
          restaurantId,
          date
        },
        _count: {
          _all: true
        },
        _max: {
          updatedAt: true
        }
      })
    ]);

    return ok(
      {
        version: {
          reservations: versionToken(reservations._count._all, reservations._max.updatedAt),
          tableBlocks: versionToken(tableBlocks._count._all, tableBlocks._max.updatedAt),
          waitlist: versionToken(waitlist._count._all, waitlist._max.updatedAt)
        }
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return apiError(error);
  }
}
