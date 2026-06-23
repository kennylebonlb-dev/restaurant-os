import { prisma } from "@/lib/prisma";
import { parseTimeToMinutes, toDateOnly } from "@/lib/time";

export type ChefToqueInsight = {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  actionLabel?: string;
};

function overlaps(first: { startTime: string; endTime: string }, second: { startTime: string; endTime: string }) {
  return parseTimeToMinutes(first.startTime) < parseTimeToMinutes(second.endTime) &&
    parseTimeToMinutes(first.endTime) > parseTimeToMinutes(second.startTime);
}

export async function getChefToqueInsights(restaurantId: string, date: string): Promise<ChefToqueInsight[]> {
  const dateOnly = toDateOnly(date);
  const [restaurant, reservations, clients, waitlist] = await Promise.all([
    prisma.restaurant.findUnique({
      where: {
        id: restaurantId
      },
      include: {
        tables: {
          where: {
            active: true
          }
        }
      }
    }),
    prisma.reservation.findMany({
      where: {
        restaurantId,
        date: dateOnly,
        status: {
          in: ["PENDING", "CONFIRMED"]
        }
      },
      include: {
        table: true,
        client: true
      },
      orderBy: {
        startTime: "asc"
      }
    }),
    prisma.client.findMany({
      where: {
        restaurantId
      },
      include: {
        reservations: {
          orderBy: {
            date: "desc"
          },
          take: 20
        }
      }
    }),
    prisma.waitlistEntry.findMany({
      where: {
        restaurantId,
        date: dateOnly,
        status: "WAITING"
      }
    })
  ]);

  const insights: ChefToqueInsight[] = [];
  const totalSeats = restaurant?.tables.reduce((sum, table) => sum + table.capacity, 0) ?? 0;
  const reservedSeats = reservations.reduce((sum, reservation) => sum + reservation.numberOfGuests, 0);
  const occupancyRate = totalSeats > 0 ? Math.round((reservedSeats / totalSeats) * 100) : 0;

  if (occupancyRate >= 85) {
    insights.push({
      id: "service-nearly-full",
      level: occupancyRate >= 100 ? "critical" : "warning",
      title: "Service bientôt complet",
      message: `${occupancyRate}% des places sont déjà réservées sur la journée. Surveillez les arrivées et les tables à libérer.`,
      actionLabel: "Voir le plan"
    });
  }

  const monthDay = date.slice(5);
  const birthdayClients = clients.filter((client) => client.birthday?.toISOString().slice(5, 10) === monthDay);

  if (birthdayClients.length > 0) {
    insights.push({
      id: "birthday-clients",
      level: "info",
      title: "Anniversaires du jour",
      message: `${birthdayClients.length} client(s) ont un anniversaire aujourd’hui. Pensez à préparer une attention.`
    });
  }

  const riskyClients = clients.filter((client) => {
    const recent = client.reservations;
    const noShows = recent.filter((reservation) => reservation.noShow).length;
    const cancellations = recent.filter((reservation) => reservation.status === "CANCELLED").length;
    return client.noShowRisk >= 60 || noShows >= 1 || cancellations >= 3;
  });

  if (riskyClients.length > 0) {
    insights.push({
      id: "no-show-risk",
      level: "warning",
      title: "Clients à risque no-show",
      message: `${riskyClients.length} client(s) du CRM ont un historique sensible. Activez les rappels SMS si besoin.`,
      actionLabel: "Ouvrir CRM"
    });
  }

  const conflicts = reservations.flatMap((reservation, index) =>
    reservations
      .slice(index + 1)
      .filter((candidate) => reservation.tableId && reservation.tableId === candidate.tableId && overlaps(reservation, candidate))
      .map((candidate) => [reservation, candidate] as const)
  );

  if (conflicts.length > 0) {
    insights.push({
      id: "table-conflicts",
      level: "critical",
      title: "Conflits de table",
      message: `${conflicts.length} conflit(s) de table détecté(s). Réattribuez une table avant le service.`,
      actionLabel: "Réattribuer"
    });
  }

  const byHour = reservations.reduce<Record<string, number>>((groups, reservation) => {
    const hour = reservation.startTime.slice(0, 2);
    groups[hour] = (groups[hour] ?? 0) + 1;
    return groups;
  }, {});
  const strongestSlot = Object.entries(byHour).sort((first, second) => second[1] - first[1])[0];
  const weakestSlot = Object.entries(byHour).sort((first, second) => first[1] - second[1])[0];

  if (strongestSlot) {
    insights.push({
      id: "peak-slot",
      level: "info",
      title: "Heure de pointe",
      message: `Le créneau ${strongestSlot[0]}h concentre le plus de réservations (${strongestSlot[1]}).`
    });
  }

  if (weakestSlot && strongestSlot && weakestSlot[1] < strongestSlot[1]) {
    insights.push({
      id: "weak-slot",
      level: "info",
      title: "Créneau à stimuler",
      message: `Le créneau ${weakestSlot[0]}h est plus calme. Vous pouvez proposer une offre ou pousser ce créneau.`
    });
  }

  if (waitlist.length > 0) {
    insights.push({
      id: "waitlist",
      level: "warning",
      title: "Liste d’attente active",
      message: `${waitlist.length} demande(s) attendent une table. Vérifiez les annulations et tables combinables.`,
      actionLabel: "Voir la liste"
    });
  }

  return insights;
}
