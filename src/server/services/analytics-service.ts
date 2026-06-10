import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/time";

export async function getDailyAnalytics(restaurantId: string, date: string) {
  const dateOnly = toDateOnly(date);

  const [tables, reservations] = await Promise.all([
    prisma.table.findMany({
      where: {
        restaurantId,
        active: true
      },
      select: {
        id: true,
        capacity: true
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
      select: {
        numberOfGuests: true,
        tableId: true
      }
    })
  ]);

  const totalSeats = tables.reduce((total, table) => total + table.capacity, 0);
  const reservedSeats = reservations.reduce(
    (total, reservation) => total + reservation.numberOfGuests,
    0
  );

  return {
    date,
    reservations: reservations.length,
    reservedSeats,
    totalSeats,
    occupancyRate: totalSeats === 0 ? 0 : Math.round((reservedSeats / totalSeats) * 100)
  };
}
