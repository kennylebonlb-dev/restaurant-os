import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applyFloorPlanSettings,
  floorPlan2dImageUrlFromSettings,
  floorPlanModelUrlFromSettings
} from "@/lib/floor-plan-settings";
import { NotFoundError } from "@/server/errors";
import { apiError, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const updatePlatformPlanSchema = z.object({
  tableId: z.string().cuid(),
  positionX: z.coerce.number().min(0),
  positionY: z.coerce.number().min(0),
  rotation: z.coerce.number().min(0).max(359).optional()
});

export async function GET(_: Request, context: Context) {
  try {
    await requirePlatformAdmin();
    const { restaurantId } = await context.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: {
        id: restaurantId
      },
      include: {
        tables: {
          orderBy: [{ zone: "asc" }, { label: "asc" }]
        }
      }
    });

    if (!restaurant) {
      return ok({ restaurant: null, tables: [] }, { status: 404 });
    }

    const settings = isRecord(restaurant.settings) ? restaurant.settings : {};

    return ok({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        layoutLocked: restaurant.layoutLocked,
        backgroundImageUrl: floorPlan2dImageUrlFromSettings(settings),
        modelUrl: floorPlanModelUrlFromSettings(settings)
      },
      tables: applyFloorPlanSettings(restaurant.tables, settings)
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePlatformAdmin();
    const { restaurantId } = await context.params;
    const data = await parseJson(request, updatePlatformPlanSchema);
    const existingTable = await prisma.table.findFirst({
      where: {
        id: data.tableId,
        restaurantId
      }
    });

    if (!existingTable) {
      throw new NotFoundError("Table not found.");
    }

    const table = await prisma.table.update({
      where: {
        id: data.tableId
      },
      data: {
        positionX: data.positionX,
        positionY: data.positionY,
        rotation: data.rotation
      }
    });

    return ok({ table });
  } catch (error) {
    return apiError(error);
  }
}
