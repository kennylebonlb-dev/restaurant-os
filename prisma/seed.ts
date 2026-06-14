import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const adminEmail = "admin@smartable.local";
const clientEmail = "client@smartable.local";

const openingHours = {
  monday: { open: "12:00", close: "22:00" },
  tuesday: { open: "12:00", close: "22:00" },
  wednesday: { open: "12:00", close: "22:00" },
  thursday: { open: "12:00", close: "22:00" },
  friday: { open: "12:00", close: "23:00" },
  saturday: { open: "12:00", close: "23:00" },
  sunday: { open: "12:00", close: "21:00" }
};

async function main() {
  const passwordHash = await hash("password123", 12);

  await prisma.platformSetting.upsert({
    where: { key: "brand" },
    update: {
      value: {
        siteName: "C’est ma table",
        logoUrl: "/cest-ma-table-logo.png",
        logoHeight: 48,
        footerLogoUrl: "/cest-ma-table-logo.png",
        footerLogoHeight: 32,
        loginVisualUrl: "/login-restaurant-visual.png",
        faviconUrl: "/cest-ma-table-favicon.png",
        logoAlt: "C’est ma table",
        supportEmail: ""
      }
    },
    create: {
      key: "brand",
      value: {
        siteName: "C’est ma table",
        logoUrl: "/cest-ma-table-logo.png",
        logoHeight: 48,
        footerLogoUrl: "/cest-ma-table-logo.png",
        footerLogoHeight: 32,
        loginVisualUrl: "/login-restaurant-visual.png",
        faviconUrl: "/cest-ma-table-favicon.png",
        logoAlt: "C’est ma table",
        supportEmail: ""
      }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "ADMIN", name: "Admin", firstName: "Admin", contactEmail: adminEmail },
    create: {
      email: adminEmail,
      name: "Admin",
      firstName: "Admin",
      contactEmail: adminEmail,
      passwordHash,
      role: "ADMIN"
    }
  });

  const client = await prisma.user.upsert({
    where: { email: clientEmail },
    update: {
      passwordHash,
      role: "CLIENT",
      name: "Client Demo",
      firstName: "Client",
      lastName: "Demo",
      contactEmail: clientEmail,
      phone: "+33 6 00 00 00 00"
    },
    create: {
      email: clientEmail,
      name: "Client Demo",
      firstName: "Client",
      lastName: "Demo",
      contactEmail: clientEmail,
      phone: "+33 6 00 00 00 00",
      passwordHash,
      role: "CLIENT"
    }
  });

  await prisma.restaurant.deleteMany({
    where: {
      slug: "atelier-lumiere"
    }
  });

  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId: admin.id,
      name: "Atelier Lumiere",
      slug: "atelier-lumiere",
      description: "A modern neighborhood dining room with indoor, terrace, and VIP seating.",
      address: "14 Rue du Marche, Paris",
      phone: "+33 1 42 00 00 00",
      timezone: "Europe/Paris",
      openingHours,
      settings: {
        reservationDurationMinutes: 120,
        minimumLeadTimeEnabled: true,
        oneReservationPerTablePerService: true,
        layoutGridSize: 32
      },
      menu: [
        { category: "Starter", name: "Charred leek vinaigrette", price: "14" },
        { category: "Main", name: "Roast chicken with herbs", price: "29" },
        { category: "Main", name: "Market fish", price: "32" },
        { category: "Dessert", name: "Citrus pavlova", price: "13" }
      ],
      tables: {
        create: [
          { label: "T1", capacity: 2, zone: "INDOOR", positionX: 64, positionY: 104 },
          { label: "T2", capacity: 2, zone: "INDOOR", positionX: 184, positionY: 104 },
          { label: "T3", capacity: 4, zone: "INDOOR", positionX: 88, positionY: 240 },
          { label: "T4", capacity: 4, zone: "TERRACE", positionX: 344, positionY: 140 },
          { label: "T5", capacity: 6, zone: "TERRACE", positionX: 448, positionY: 296 },
          { label: "VIP1", capacity: 8, zone: "VIP", positionX: 696, positionY: 176 },
          { label: "VIP2", capacity: 4, zone: "VIP", positionX: 712, positionY: 340 }
        ]
      }
    },
    include: {
      tables: true
    }
  });

  const tableOne = restaurant.tables.find((table) => table.label === "T1");
  const vipTable = restaurant.tables.find((table) => table.label === "VIP1");

  if (tableOne) {
    await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        userId: client.id,
        tableId: tableOne.id,
        date: new Date("2026-06-15T00:00:00.000Z"),
        startTime: "19:00",
        endTime: "21:00",
        numberOfGuests: 2,
        status: "CONFIRMED",
        guestFirstName: "Client",
        guestLastName: "Demo",
        guestEmail: clientEmail,
        guestPhone: "+33 6 00 00 00 00",
        notes: "Window seat preferred."
      }
    });
  }

  if (vipTable) {
    await prisma.tableBlock.create({
      data: {
        tableId: vipTable.id,
        date: new Date("2026-06-15T00:00:00.000Z"),
        startTime: "18:00",
        endTime: "22:00",
        reason: "EVENT"
      }
    });
  }

  console.log("Seed complete.");
  console.log(`Admin: ${adminEmail} / password123`);
  console.log(`Client: ${clientEmail} / password123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
