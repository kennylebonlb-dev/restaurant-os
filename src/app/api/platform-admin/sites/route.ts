import { prisma } from "@/lib/prisma";
import { buildRestaurantSlug, defaultOpeningHours, defaultRestaurantSettings } from "@/lib/site-defaults";
import { inferTimeZoneFromAddress } from "@/lib/time";
import { createManagedRestaurantSchema } from "@/lib/validators";
import { apiError, created, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";

async function uniqueRestaurantSlug(name: string, requestedSlug?: string) {
  const baseSlug = requestedSlug || buildRestaurantSlug(name);
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.restaurant.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function startOfDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function withRestaurantMetrics<T extends { id: string; _count: { tables: number; reservations: number } }>(
  restaurants: T[]
) {
  const today = startOfDate(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  return Promise.all(
    restaurants.map(async (restaurant) => {
      const [reservationsToday, reservationsWeek, reservationsMonth] = await Promise.all([
        prisma.reservation.count({
          where: {
            restaurantId: restaurant.id,
            date: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        prisma.reservation.count({
          where: {
            restaurantId: restaurant.id,
            date: {
              gte: today,
              lt: weekEnd
            }
          }
        }),
        prisma.reservation.count({
          where: {
            restaurantId: restaurant.id,
            date: {
              gte: today,
              lt: monthEnd
            }
          }
        })
      ]);
      const occupancyRate = restaurant._count.tables
        ? Math.min(100, Math.round((reservationsToday / restaurant._count.tables) * 100))
        : 0;

      return {
        ...restaurant,
        metrics: {
          reservationsToday,
          reservationsWeek,
          reservationsMonth,
          occupancyRate,
          peakHours: reservationsToday > 0 ? "Service en cours" : "À analyser",
          performance: occupancyRate >= 70 ? "Forte" : occupancyRate >= 35 ? "Stable" : "À développer",
          visitors: 0,
          conversionRate: 0
        }
      };
    })
  );
}

export async function GET() {
  try {
    await requirePlatformAdmin();
    const restaurants = await prisma.restaurant.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        address: true,
        phone: true,
        timezone: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tables: true,
            reservations: true
          }
        }
      }
    });

    return ok({ restaurants: await withRestaurantMetrics(restaurants) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const data = await parseJson(request, createManagedRestaurantSchema);
    const slug = await uniqueRestaurantSlug(data.name, data.slug);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        address: data.address || null,
        phone: data.phone || null,
        timezone: inferTimeZoneFromAddress(data.address),
        openingHours: defaultOpeningHours(),
        settings: {
          ...defaultRestaurantSettings,
          ownerEmail: data.ownerEmail || ""
        },
        menu: []
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        address: true,
        phone: true,
        timezone: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tables: true,
            reservations: true
          }
        }
      }
    });

    return created({ restaurant: (await withRestaurantMetrics([restaurant]))[0] });
  } catch (error) {
    return apiError(error);
  }
}
