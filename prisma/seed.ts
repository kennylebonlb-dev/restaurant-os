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
        adminLoginVisualUrl: "/admin-login-visual-default.svg",
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
        adminLoginVisualUrl: "/admin-login-visual-default.svg",
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
  const tableTwo = restaurant.tables.find((table) => table.label === "T2");
  const vipTable = restaurant.tables.find((table) => table.label === "VIP1");

  await prisma.restaurantUser.upsert({
    where: {
      restaurantId_userId: {
        restaurantId: restaurant.id,
        userId: admin.id
      }
    },
    update: {
      role: "OWNER"
    },
    create: {
      restaurantId: restaurant.id,
      userId: admin.id,
      role: "OWNER"
    }
  });

  const demoClient = await prisma.client.create({
    data: {
      restaurantId: restaurant.id,
      userId: client.id,
      firstName: "Client",
      lastName: "Demo",
      email: clientEmail,
      phone: "+33 6 00 00 00 00",
      birthday: new Date("1990-06-15T00:00:00.000Z"),
      allergies: "Noisettes",
      preferences: ["Table au calme", "Près d’une fenêtre"],
      internalNotes: "Client régulier, préfère le service de 19h.",
      vip: true,
      noShowRisk: 15,
      lastVisitAt: new Date("2026-06-10T19:00:00.000Z")
    }
  });

  if (tableOne) {
    await prisma.reservation.create({
      data: {
        referenceCode: "TTDEMO01",
        restaurantId: restaurant.id,
        userId: client.id,
        clientId: demoClient.id,
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

  if (tableTwo) {
    await prisma.reservation.create({
      data: {
        referenceCode: "TTDEMO02",
        restaurantId: restaurant.id,
        userId: client.id,
        clientId: demoClient.id,
        tableId: tableTwo.id,
        date: new Date("2026-06-15T00:00:00.000Z"),
        startTime: "20:30",
        endTime: "22:30",
        numberOfGuests: 2,
        status: "CONFIRMED",
        guestFirstName: "Marie",
        guestLastName: "Bernard",
        guestEmail: "marie.bernard@example.com",
        guestPhone: "+33 6 11 22 33 44",
        birthday: true,
        notes: "Anniversaire discret."
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

  await prisma.waitlistEntry.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        clientId: demoClient.id,
        date: new Date("2026-06-15T00:00:00.000Z"),
        requestedTime: "20:00",
        numberOfGuests: 4,
        firstName: "Nora",
        lastName: "Petit",
        email: "nora.petit@example.com",
        phone: "+33 6 12 12 12 12",
        notes: "Prévenir si terrasse disponible.",
        tablePreferences: ["QUIET"]
      }
    ]
  });

  await prisma.notificationTemplate.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        key: "reservationConfirmation",
        channel: "EMAIL",
        subject: "Votre réservation {{reservationReference}} est confirmée",
        body: "Bonjour {{customerName}}, votre table est confirmée le {{reservationDate}} à {{reservationTime}}.",
        variables: ["customerName", "reservationReference", "reservationDate", "reservationTime"]
      },
      {
        restaurantId: restaurant.id,
        key: "reservationReminder",
        channel: "SMS",
        body: "Rappel {{restaurantName}} : votre réservation {{reservationReference}} est prévue à {{reservationTime}}. Adresse : {{restaurantAddress}}.",
        variables: ["restaurantName", "restaurantAddress", "reservationReference", "reservationTime"]
      }
    ]
  });

  await prisma.auditEvent.create({
    data: {
      restaurantId: restaurant.id,
      actorId: admin.id,
      action: "seed.dashboardLiveV1",
      entityType: "restaurant",
      entityId: restaurant.id,
      metadata: {
        message: "Données réalistes Dashboard Live V1"
      }
    }
  });

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
