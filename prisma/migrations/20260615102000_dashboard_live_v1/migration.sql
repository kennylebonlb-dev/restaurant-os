-- Dashboard Live V1: non-destructive additions for CRM, waitlist, audit, templates and restaurant staff roles.

CREATE TYPE "RestaurantStaffRole" AS ENUM ('OWNER', 'MANAGER', 'HOST', 'READ_ONLY');
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'SEATED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

CREATE TABLE "clients" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "userId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "birthday" DATE,
  "allergies" TEXT,
  "preferences" JSONB NOT NULL DEFAULT '[]',
  "internalNotes" TEXT,
  "vip" BOOLEAN NOT NULL DEFAULT false,
  "noShowRisk" INTEGER NOT NULL DEFAULT 0,
  "lastVisitAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "waitlist_entries" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "clientId" TEXT,
  "date" DATE NOT NULL,
  "requestedTime" VARCHAR(5),
  "numberOfGuests" INTEGER NOT NULL,
  "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "tablePreferences" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_templates" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "variables" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurant_users" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "RestaurantStaffRole" NOT NULL DEFAULT 'HOST',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restaurant_users_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reservations" ADD COLUMN "clientId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "arrivedAt" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN "noShow" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "clients_restaurantId_email_key" ON "clients"("restaurantId", "email");
CREATE INDEX "clients_restaurantId_lastName_firstName_idx" ON "clients"("restaurantId", "lastName", "firstName");
CREATE INDEX "clients_restaurantId_phone_idx" ON "clients"("restaurantId", "phone");
CREATE INDEX "clients_userId_idx" ON "clients"("userId");

CREATE INDEX "waitlist_entries_restaurantId_date_status_idx" ON "waitlist_entries"("restaurantId", "date", "status");
CREATE INDEX "waitlist_entries_clientId_idx" ON "waitlist_entries"("clientId");

CREATE INDEX "audit_events_restaurantId_createdAt_idx" ON "audit_events"("restaurantId", "createdAt");
CREATE INDEX "audit_events_actorId_idx" ON "audit_events"("actorId");

CREATE UNIQUE INDEX "notification_templates_restaurantId_key_channel_key" ON "notification_templates"("restaurantId", "key", "channel");
CREATE INDEX "notification_templates_restaurantId_channel_idx" ON "notification_templates"("restaurantId", "channel");

CREATE UNIQUE INDEX "restaurant_users_restaurantId_userId_key" ON "restaurant_users"("restaurantId", "userId");
CREATE INDEX "restaurant_users_userId_idx" ON "restaurant_users"("userId");

CREATE INDEX "reservations_clientId_date_idx" ON "reservations"("clientId", "date");

ALTER TABLE "clients" ADD CONSTRAINT "clients_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_users" ADD CONSTRAINT "restaurant_users_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restaurant_users" ADD CONSTRAINT "restaurant_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
