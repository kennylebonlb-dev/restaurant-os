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

    return ok({ restaurants });
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

    return created({ restaurant });
  } catch (error) {
    return apiError(error);
  }
}
