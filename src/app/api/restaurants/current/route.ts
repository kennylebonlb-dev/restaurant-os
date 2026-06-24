import { prisma } from "@/lib/prisma";
import type { RestaurantAccessRole } from "@/lib/restaurant-permissions";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok } from "@/server/http";

const ROOT_HOSTS = new Set([
  "toquetop.com",
  "www.toquetop.com",
  "dashboard.toquetop.com",
  "help.toquetop.com",
  "localhost",
  "127.0.0.1"
]);
const IGNORED_SUBDOMAINS = new Set(["www", "app", "admin", "api", "dashboard", "help"]);

function restaurantSubdomain(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(":")[0].toLowerCase();

  if (ROOT_HOSTS.has(host) || !host.endsWith(".toquetop.com")) {
    return undefined;
  }

  const subdomain = host.replace(/\.toquetop\.com$/, "");
  return subdomain && !IGNORED_SUBDOMAINS.has(subdomain) ? subdomain : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const subdomain = restaurantSubdomain(request.headers.get("host"));
    const restaurants = await prisma.restaurant.findMany({
      where: {
        ...(subdomain ? { slug: subdomain } : {}),
        OR: [
          {
            ownerId: session.user.id
          },
          {
            staff: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      orderBy: {
        name: "asc"
      },
      include: {
        staff: {
          where: {
            userId: session.user.id
          },
          select: {
            role: true
          },
          take: 1
        },
        tables: {
          orderBy: [{ zone: "asc" }, { label: "asc" }]
        }
      }
    });

    const restaurantsWithAccess = restaurants.map(({ staff, ...restaurant }) => ({
      ...restaurant,
      accessRole: (restaurant.ownerId === session.user.id ? "OWNER" : staff[0]?.role ?? "READ_ONLY") satisfies RestaurantAccessRole
    }));

    return ok({ restaurants: restaurantsWithAccess });
  } catch (error) {
    return apiError(error);
  }
}
