import { prisma } from "@/lib/prisma";
import { dateStringSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok } from "@/server/http";
import { requireRestaurantAccess } from "@/server/services/restaurant-access-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const session = await requireSession();
    const { restaurantId } = await context.params;
    await requireRestaurantAccess(session, restaurantId, "READ_ONLY");

    const dateParam = new URL(request.url).searchParams.get("date");
    const date = dateParam ? dateStringSchema.parse(dateParam) : undefined;
    const blocks = await prisma.tableBlock.findMany({
      where: {
        table: {
          restaurantId
        },
        ...(date
          ? {
              date: new Date(`${date}T00:00:00.000Z`)
            }
          : {})
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        table: {
          select: {
            id: true,
            label: true
          }
        }
      }
    });

    return ok({ blocks });
  } catch (error) {
    return apiError(error);
  }
}
