"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import dynamic from "next/dynamic";
import {
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Copy,
  Crown,
  Crop,
  CreditCard,
  Download,
  Eye,
  FileText,
  Gift,
  Image,
  ImagePlus,
  Info,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  List,
  LoaderCircle,
  LogOut,
  Lock,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  Move,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Plug,
  Plus,
  Power,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Timer,
  Trash2,
  Unlock,
  Upload,
  UserRound,
  Users,
  Wrench,
  X
} from "lucide-react";
import { signOut } from "next-auth/react";
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent, ReactNode, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { DashboardModal } from "@/components/dashboard/dashboard-modal";
import { FloorPlan, type TableBadge } from "@/components/floor-plan/floor-plan";
import { apiFetch } from "@/hooks/use-api";
import { useRestaurantSocket } from "@/hooks/use-socket-events";
import type { PlatformBrand } from "@/server/platform-settings";
import type {
  FloorRoom,
  FloorTable,
  OpeningHours,
  TableAutoAssignPriority,
  TableCombination,
  TableBlockReason,
  TableFeature,
  TableShape,
  TableViewImageCrop,
  TableZone,
  VacationClosure
} from "@/lib/domain";
import {
  applyFloorPlanSettings,
  defaultFloorRoom,
  defaultTableViewImageCrop,
  defaultTableDisplayScaleFromSettings,
  floorRoomsFromSettings,
  floorPlan2dImageUrlFromSettings,
  floorPlanModelUrlFromSettings,
  isTableAutoAssignPriority,
  isTableShape,
  normalizeTableViewImageCrop,
  tableBasePositionsFromSettings,
  tableCombinationsFromSettings,
  tableDisplayScaleLockedFromSettings,
  tableRoomsFromSettings,
  tableViewImageStyle,
  withTableBasePosition,
  withTableCombinations,
  withDefaultTableDisplayScale,
  withTableAutoAssignPriority,
  withTableDisplayScale,
  withTableFeatures,
  withTableViewImage,
  withTableViewImageCrop,
  withTableShape
} from "@/lib/floor-plan-settings";
import { addDaysToDateString, addMinutes, getDayKey, getZonedDateTimeParts, minutesToTime, parseTimeToMinutes } from "@/lib/time";
import { useFloorPlanStore } from "@/stores/floor-plan-store";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const StripeEmbeddedCheckout = dynamic(
  () => import("@/components/dashboard/stripe-embedded-checkout").then((module) => module.StripeEmbeddedCheckout),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-64 items-center justify-center rounded-lg bg-linen text-sm font-black text-moss">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        Chargement du paiement sécurisé...
      </div>
    )
  }
);

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  openingHours: OpeningHours;
  settings: Record<string, unknown>;
  layoutLocked: boolean;
  tables: FloorTable[];
};

type BrandResponse = {
  brand: PlatformBrand;
};

type Reservation = {
  id: string;
  referenceCode: string | null;
  date: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  notes: string | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  highChair: boolean;
  birthday: boolean;
  romanticDinner: boolean;
  arrivedAt?: string | null;
  noShow?: boolean;
  updatedAt?: string;
  table: { id: string; label: string } | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    vip: boolean;
    noShowRisk: number;
    _count?: {
      reservations: number;
    };
  } | null;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  allergies: string | null;
  preferences: string[];
  internalNotes: string | null;
  vip: boolean;
  noShowRisk: number;
  reservations: Array<{
    id: string;
    referenceCode: string | null;
    date: string;
    startTime: string;
    numberOfGuests: number;
    status: string;
    noShow: boolean;
  }>;
};

type WaitlistEntry = {
  id: string;
  date: string;
  requestedTime: string | null;
  numberOfGuests: number;
  status: "WAITING" | "SEATED" | "CANCELLED" | "EXPIRED";
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    vip: boolean;
    noShowRisk: number;
  } | null;
};

type ChefInsight = {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  actionLabel?: string;
};

type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { name: string | null; email: string } | null;
};

type TableBlock = {
  id: string;
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: "MAINTENANCE" | "ADMIN" | "EVENT";
  notes?: string | null;
  table: { id: string; label: string };
};

type AdminSection =
  | "dashboard"
  | "guide"
  | "general"
  | "reservations"
  | "crm"
  | "services"
  | "menus"
  | "gallery"
  | "giftCards"
  | "team"
  | "notifications"
  | "integrations"
  | "subscription"
  | "stats";

function isAdminSection(value: string | null): value is AdminSection {
  return Boolean(value) && menuItems.some((item) => item.id === value);
}

type ReservationView = "list" | "timeline";
type ServiceFilter = "lunch" | "dinner";
type ModalState = "createReservation" | "editReservation" | "blockTable" | "waitlist" | "client" | "contactClient" | null;

const menuItems: Array<{ id: AdminSection; label: string; icon: ReactNode }> = [
  { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "guide", label: "Guide de configuration", icon: <Check className="h-4 w-4" /> },
  { id: "general", label: "Général", icon: <Settings className="h-4 w-4" /> },
  { id: "reservations", label: "Réservations", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "crm", label: "CRM", icon: <Users className="h-4 w-4" /> },
  { id: "services", label: "Services", icon: <Timer className="h-4 w-4" /> },
  { id: "menus", label: "Menus", icon: <List className="h-4 w-4" /> },
  { id: "gallery", label: "Galerie", icon: <Image className="h-4 w-4" /> },
  { id: "giftCards", label: "Cartes cadeaux", icon: <Gift className="h-4 w-4" /> },
  { id: "team", label: "Équipes", icon: <Shield className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "integrations", label: "Intégrations", icon: <Plug className="h-4 w-4" /> },
  { id: "subscription", label: "Abonnement", icon: <CreditCard className="h-4 w-4" /> },
  { id: "stats", label: "Statistiques", icon: <LayoutDashboard className="h-4 w-4" /> }
];

const generalSubMenu = [
  "Restaurant",
  "Heures d’ouverture",
  "Congés",
  "Tables et salles",
  "Paramètres de réservation",
  "Connexions"
] as const;

type GeneralPage = (typeof generalSubMenu)[number];

const setupChecklist = [
  "À propos de l’établissement",
  "Horaires",
  "Tables",
  "Reserve with Google",
  "Facebook/Instagram",
  "Types de réservation",
  "SMS"
];

const timeOptions = Array.from({ length: 24 * 4 }, (_, index) => minutesToTime(index * 15));
const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const dayLabels: Record<(typeof dayKeys)[number], string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche"
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function operationalMinDate(timeZone?: string | null) {
  const now = getZonedDateTimeParts(timeZone || "Europe/Paris");

  return now.minutes < 3 * 60 ? addDaysToDateString(now.date, -1) : now.date;
}

function parseDashboardDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? trimmed
    : /^(\d{2})\/(\d{2})\/(\d{4})$/.test(trimmed)
      ? trimmed.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1")
      : trimmed.slice(0, 10);
  const date = new Date(`${isoDate}T12:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: unknown, fallback = "Date à définir") {
  const date = parseDashboardDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);
}

function formatCurrencyCents(value: number, currency = "eur") {
  return new Intl.NumberFormat("fr-FR", {
    currency: currency.toUpperCase(),
    style: "currency"
  }).format(value / 100);
}

function formatLongDate(value: unknown, fallback = "Date à définir") {
  const date = parseDashboardDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatPeriodDate(value: unknown, fallback = "Date à définir") {
  const date = parseDashboardDate(value);

  if (!date) {
    return fallback;
  }

  const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(date);
  const year = new Intl.DateTimeFormat("fr-FR", { year: "numeric" }).format(date);

  return `${day} - ${month} - ${year}`;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate;
}

function addMonthsToDateString(value: unknown, months: number) {
  const date = parseDashboardDate(value) ?? parseDashboardDate(today()) ?? new Date();

  return addMonths(date, months).toISOString().slice(0, 10);
}

function daysBetweenDateStrings(startDate: string, endDate: string) {
  const start = parseDashboardDate(startDate)?.getTime();
  const end = parseDashboardDate(endDate)?.getTime();

  if (start === undefined || end === undefined) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function buildStatsInsights({
  activeReservations,
  averageGuests,
  cancellationRate,
  conversionEstimate,
  noShowCount,
  occupancy,
  peakTime,
  periodLabel
}: {
  activeReservations: number;
  averageGuests: string;
  cancellationRate: number;
  conversionEstimate: number;
  noShowCount: number;
  occupancy: number;
  peakTime: string | null;
  periodLabel: string;
}) {
  return [
    {
      title: "Lecture de la période",
      message: `${periodLabel} : ${activeReservations} réservation(s), ${averageGuests} couvert(s) moyen(s) par réservation et un remplissage estimé à ${occupancy}%.`
    },
    {
      title: "Point d’attention",
      message: cancellationRate >= 20 || noShowCount > 0
        ? `Surveillez les annulations (${cancellationRate}%) et les ${noShowCount} no-show(s). Un rappel SMS ciblé avant le service peut réduire le risque.`
        : `Les annulations (${cancellationRate}%) sont contenues et aucun no-show n’est remonté sur cette période.`
    },
    {
      title: "Conseil ToqueChef",
      message: peakTime
        ? `Le rush semble se concentrer vers ${peakTime}. Renforcez l’équipe et poussez les créneaux avant/après ce pic. Conversion : ${conversionEstimate}%.`
        : `Pas de rush clair détecté. Continuez à suivre les créneaux faibles pour proposer des offres ou rappels ciblés.`
    }
  ];
}

function downloadTextPdf(filename: string, title: string, lines: string[]) {
  const safeLines = [title, "", ...lines].map((line) => line.replace(/[()\\]/g, "\\$&"));
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    `(${safeLines[0]}) Tj`,
    "/F1 11 Tf",
    "0 -32 Td",
    ...safeLines.slice(1).flatMap((line) => [`(${line}) Tj`, "0 -18 Td"]),
    "ET"
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function giftQrDataUrl(code: string) {
  const size = 15;
  const cells = Array.from({ length: size * size }, (_, index) => {
    const charCode = code.charCodeAt(index % code.length) || 0;
    const x = index % size;
    const y = Math.floor(index / size);
    const finder =
      (x < 4 && y < 4) ||
      (x > size - 5 && y < 4) ||
      (x < 4 && y > size - 5);

    return finder || ((charCode + x * 17 + y * 31 + index) % 5 < 2);
  });
  const rects = cells
    .map((active, index) => {
      if (!active) {
        return "";
      }

      const x = index % size;
      const y = Math.floor(index / size);
      return `<rect x="${x}" y="${y}" width="1" height="1" rx="0.08"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#243d36">${rects}</g></svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function formatDashboardClock(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone
  }).formatToParts(new Date(timestamp));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    hours: value("hour"),
    minutes: value("minute"),
    seconds: value("second")
  };
}

function normalizeServiceWindows(dayHours: OpeningHours[string] | undefined) {
  if (!dayHours || dayHours.closed) {
    return [];
  }

  const windows: Array<{ service: ServiceFilter; open: string; close: string; openMinutes: number; closeMinutes: number }> = [];
  const addWindow = (service: ServiceFilter, open?: string, close?: string) => {
    if (!open || !close) {
      return;
    }

    try {
      const openMinutes = parseTimeToMinutes(open);
      const closeMinutes = parseTimeToMinutes(close);

      if (closeMinutes > openMinutes) {
        windows.push({ service, open, close, openMinutes, closeMinutes });
      }
    } catch {
      // Invalid draft opening hours are ignored until a valid configuration is saved.
    }
  };

  addWindow("lunch", dayHours.morningOpen, dayHours.morningClose);

  if (dayHours.lunchServiceEnabled !== false) {
    addWindow("lunch", dayHours.open, dayHours.close);
  }

  if (dayHours.secondServiceEnabled) {
    addWindow("dinner", dayHours.secondOpen, dayHours.secondClose);
  }

  if (dayHours.thirdServiceEnabled) {
    addWindow("dinner", dayHours.thirdOpen, dayHours.thirdClose);
  }

  return windows.sort((first, second) => first.openMinutes - second.openMinutes);
}

function serviceWindowLabel(window: { open: string; close: string }, index: number) {
  const openMinutes = parseTimeToMinutes(window.open);

  if (openMinutes < 11 * 60) {
    return "Service matin";
  }

  if (openMinutes < 17 * 60) {
    return "Service midi";
  }

  return index > 0 ? "Service soir" : "Service";
}

function reservationMatchesService(reservation: Reservation, service: ServiceFilter, openingHours: OpeningHours, selectedDate: string) {
  const serviceWindows = normalizeServiceWindows(openingHours[getDayKey(selectedDate)]);
  const startMinutes = parseTimeToMinutes(reservation.startTime);

  return serviceWindows.some(
    (serviceWindow) =>
      serviceWindow.service === service &&
      startMinutes >= serviceWindow.openMinutes &&
      startMinutes < serviceWindow.closeMinutes
  );
}

function getRestaurantOpeningStatus(openingHours: OpeningHours, timeZone: string) {
  const now = getZonedDateTimeParts(timeZone || "Europe/Paris");
  const serviceWindows = normalizeServiceWindows(openingHours[getDayKey(now.date)]);
  const activeWindow = serviceWindows.find(
    (serviceWindow) => now.minutes >= serviceWindow.openMinutes && now.minutes < serviceWindow.closeMinutes
  );

  if (activeWindow) {
    return { tone: "open" as const, label: "Ouvert" };
  }

  const nextWindow = serviceWindows.find((serviceWindow) => serviceWindow.openMinutes > now.minutes);

  if (nextWindow && nextWindow.openMinutes - now.minutes <= 30) {
    return { tone: "soon" as const, label: "Ouvre bientôt" };
  }

  return { tone: "closed" as const, label: "Fermé" };
}

function recommendedDashboardService(openingHours: OpeningHours, selectedDate: string, timeZone: string): ServiceFilter {
  const now = getZonedDateTimeParts(timeZone || "Europe/Paris");

  if (selectedDate !== now.date) {
    return "lunch";
  }

  const serviceWindows = normalizeServiceWindows(openingHours[getDayKey(selectedDate)]);
  const lunchWindows = serviceWindows.filter((serviceWindow) => serviceWindow.service === "lunch");
  const hasDinner = serviceWindows.some((serviceWindow) => serviceWindow.service === "dinner");
  const lunchHasPassed = lunchWindows.length > 0 && lunchWindows.every((serviceWindow) => now.minutes >= serviceWindow.closeMinutes);

  return lunchHasPassed && hasDinner ? "dinner" : "lunch";
}

function dashboardServiceDisabled(openingHours: OpeningHours, selectedDate: string, timeZone: string, service: ServiceFilter) {
  const now = getZonedDateTimeParts(timeZone || "Europe/Paris");

  if (selectedDate !== now.date || service !== "lunch") {
    return false;
  }

  const serviceWindows = normalizeServiceWindows(openingHours[getDayKey(selectedDate)]);
  const lunchWindows = serviceWindows.filter((serviceWindow) => serviceWindow.service === "lunch");
  const hasDinner = serviceWindows.some((serviceWindow) => serviceWindow.service === "dinner");

  return hasDinner && lunchWindows.length > 0 && lunchWindows.every((serviceWindow) => now.minutes >= serviceWindow.closeMinutes);
}

function capacityCounts(tables: FloorTable[]) {
  return {
    two: tables.filter((table) => table.capacity <= 2).length,
    four: tables.filter((table) => table.capacity > 2 && table.capacity <= 4).length,
    sixPlus: tables.filter((table) => table.capacity >= 6).length
  };
}

function serviceLabel(service: ServiceFilter) {
  return service === "lunch" ? "midi" : "soir";
}

function rushForecast(reservations: Array<{ status: string; startTime: string; numberOfGuests: number }>) {
  const active = reservations.filter((reservation) => reservation.status !== "CANCELLED");
  const buckets = active.reduce<Record<string, { reservations: number; guests: number }>>((values, reservation) => {
    const bucket = `${reservation.startTime.slice(0, 2)}:00`;
    const current = values[bucket] ?? { reservations: 0, guests: 0 };

    values[bucket] = {
      reservations: current.reservations + 1,
      guests: current.guests + reservation.numberOfGuests
    };

    return values;
  }, {});
  const entries = Object.entries(buckets).sort((first, second) => {
    const guestDelta = second[1].guests - first[1].guests;

    return guestDelta || first[0].localeCompare(second[0]);
  });

  return {
    peak: entries[0]
      ? {
          time: entries[0][0],
          ...entries[0][1]
        }
      : null,
    timeline: entries
      .sort((first, second) => first[0].localeCompare(second[0]))
      .map(([time, stats]) => ({ time, ...stats }))
  };
}

function openingStatusClass(tone: "open" | "soon" | "closed") {
  return {
    open: "bg-moss/10 text-moss border-moss/20",
    soon: "bg-amber-50 text-amber-700 border-amber-200",
    closed: "bg-red-50 text-red-700 border-red-200"
  }[tone];
}

function reservationGuestName(reservation: Reservation) {
  return [reservation.guestFirstName, reservation.guestLastName].filter(Boolean).join(" ") || "Client";
}

function reservationRequestSummary(reservation: Reservation) {
  const requests = [
    reservation.highChair ? "bébé" : null,
    reservation.birthday ? "anniversaire" : null,
    reservation.romanticDinner ? "romantique" : null,
    reservation.notes ? "note" : null
  ].filter(Boolean);

  return requests.length > 0 ? requests.join(", ") : "Aucune demande spécifique";
}

function reservationNoShowRiskLabel(reservation: Reservation) {
  if (reservation.client?.vip) {
    return "VIP";
  }

  const risk = reservation.client?.noShowRisk ?? 0;

  if (risk >= 70) {
    return "Risque no-show élevé";
  }

  if (risk >= 35) {
    return "Risque no-show moyen";
  }

  return "Fiable";
}

function reservationClientFrequencyLabel(reservation: Reservation) {
  const reservationCount = reservation.client?._count?.reservations ?? 1;
  return reservationCount > 1 ? "Habitué" : "Nouveau client";
}

function waitlistClientProfile(entry: WaitlistEntry, clients: Client[]) {
  return entry.client ?? clients.find((client) => {
    const samePhone = entry.phone && client.phone && client.phone.replace(/\D/g, "") === entry.phone.replace(/\D/g, "");
    const sameEmail = entry.email && client.email && client.email.toLowerCase() === entry.email.toLowerCase();

    return samePhone || sameEmail;
  }) ?? null;
}

function waitlistClientFrequencyLabel(entry: WaitlistEntry, clients: Client[]) {
  const client = waitlistClientProfile(entry, clients);
  const reservationCount = Array.isArray((client as Partial<Client> | null)?.reservations)
    ? ((client as Client).reservations ?? []).length
    : 0;

  return reservationCount > 1 ? "Habitué" : "Nouveau client";
}

const WAITLIST_SERVICE_MARKER = "WAITLIST_SERVICE:";

function waitlistEntryService(entry: WaitlistEntry): ServiceFilter | null {
  const match = entry.notes?.match(/WAITLIST_SERVICE:(lunch|dinner)/);
  return match ? (match[1] as ServiceFilter) : null;
}

function waitlistMatchesDashboardService(
  entry: WaitlistEntry,
  selectedService: ServiceFilter,
  serviceWindows: Array<{ service: ServiceFilter; openMinutes: number; closeMinutes: number }>
) {
  if (entry.status !== "WAITING") {
    return false;
  }

  if (!entry.requestedTime) {
    return waitlistEntryService(entry) === selectedService || waitlistEntryService(entry) === null;
  }

  const requestedMinutes = parseTimeToMinutes(entry.requestedTime);

  return serviceWindows.some(
    (serviceWindow) =>
      serviceWindow.service === selectedService &&
      requestedMinutes >= serviceWindow.openMinutes &&
      requestedMinutes < serviceWindow.closeMinutes
  );
}

const WAITLIST_NOTIFIED_MARKER = "WAITLIST_NOTIFIED";

function isWaitlistEntryNotified(entry: WaitlistEntry) {
  return entry.notes?.includes(WAITLIST_NOTIFIED_MARKER) === true;
}

function waitlistDisplayNotes(entry: WaitlistEntry) {
  return entry.notes
    ?.replace(WAITLIST_NOTIFIED_MARKER, "")
    .replace(/WAITLIST_SERVICE:(lunch|dinner)/, "")
    .trim() || "Aucune note";
}

function isCustomerCancelledReservation(reservation: Reservation) {
  return reservation.status === "CANCELLED" && reservation.notes?.includes("CANCELLED_BY:customer") === true;
}

function isRestaurantCancelledReservation(reservation: Reservation) {
  return reservation.status === "CANCELLED" && !isCustomerCancelledReservation(reservation);
}

function reservationDelayLabel(reservation: Reservation, selectedDate: string, timeZone: string) {
  if (reservation.arrivedAt || reservation.status === "CANCELLED") {
    return null;
  }

  const now = getZonedDateTimeParts(timeZone || "Europe/Paris");

  if (selectedDate !== now.date) {
    return null;
  }

  const elapsed = now.minutes - parseTimeToMinutes(reservation.startTime);

  return elapsed > 0 ? `+${elapsed} min` : null;
}

function reservationLateCountdown(reservation: Reservation, selectedDate: string, graceMinutes: number, timeZone: string) {
  if (reservation.arrivedAt || reservation.status === "CANCELLED") {
    return null;
  }

  const now = getZonedDateTimeParts(timeZone || "Europe/Paris");

  if (selectedDate !== now.date) {
    return null;
  }

  const nowMinutes = now.minutes;
  const elapsed = nowMinutes - parseTimeToMinutes(reservation.startTime);

  if (elapsed < 0) {
    return null;
  }

  const remaining = graceMinutes - elapsed;

  if (remaining > 0) {
    return `Retard : annulation dans ${remaining} min`;
  }

  return "Retard : annulation possible";
}

function isCustomerCancellationCloseToService(reservation: Reservation) {
  if (!isCustomerCancelledReservation(reservation) || !reservation.updatedAt) {
    return false;
  }

  const reservationStart = new Date(`${reservation.date.slice(0, 10)}T${reservation.startTime}:00`);
  const cancelledAt = new Date(reservation.updatedAt);
  const minutesBeforeService = (reservationStart.getTime() - cancelledAt.getTime()) / 60000;

  return Number.isFinite(minutesBeforeService) && minutesBeforeService >= 0 && minutesBeforeService <= 120;
}

function reservationArrivalCountdown(reservation: Reservation, selectedDate: string, timeZone: string) {
  if (reservation.status === "CANCELLED") {
    return "Réservation annulée";
  }

  const now = getZonedDateTimeParts(timeZone || "Europe/Paris");

  if (selectedDate !== now.date) {
    return `Arrivée le ${formatDate(selectedDate)} à ${reservation.startTime}`;
  }

  const minutesUntilArrival = parseTimeToMinutes(reservation.startTime) - now.minutes;

  if (minutesUntilArrival > 0) {
    const hours = Math.floor(minutesUntilArrival / 60);
    const minutes = minutesUntilArrival % 60;

    if (hours > 0) {
      return `Arrivée dans ${hours}h${String(minutes).padStart(2, "0")}`;
    }

    return `Arrivée dans ${minutes} min`;
  }

  if (minutesUntilArrival === 0) {
    return "Arrivée maintenant";
  }

  return `Retard de ${Math.abs(minutesUntilArrival)} min`;
}

function dashboardErrorMessage(error: Error) {
  if (error.message.includes("Table capacity is too small")) {
    return "La capacité de cette table est insuffisante pour ce nombre de couverts.";
  }

  if (
    error.message.includes("Table already has a reservation") ||
    error.message.includes("reservation already exists") ||
    error.message.includes("No table is available")
  ) {
    return "Cette table n’est pas disponible sur ce créneau. Sélectionnez une autre table ou un autre horaire.";
  }

  return error.message;
}

function serviceWindowForDashboard(selectedService: ServiceFilter, settings: Record<string, unknown>) {
  const startTime = selectedService === "lunch"
    ? String(settings.dashboardLunchStartTime ?? "12:00")
    : String(settings.dashboardDinnerStartTime ?? "19:00");
  const duration = settingNumber(settings, ["reservationDurationMinutes"], 120);

  return {
    startTime,
    endTime: minutesToTime(parseTimeToMinutes(startTime) + duration)
  };
}

function overlapsTime(startTime: string, endTime: string, targetStartTime: string, targetEndTime: string) {
  return startTime < targetEndTime && endTime > targetStartTime;
}

function statusLabel(status: Reservation["status"]) {
  return {
    PENDING: "En attente",
    CONFIRMED: "Confirmée",
    CANCELLED: "Annulée"
  }[status];
}

function statusClass(status: Reservation["status"]) {
  return {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CONFIRMED: "bg-moss/10 text-moss border-moss/20",
    CANCELLED: "bg-red-50 text-red-700 border-red-200"
  }[status];
}

function reservationCardStateClass({
  customerCancelled,
  departed,
  paid,
  arrived,
  selected
}: {
  customerCancelled: boolean;
  departed: boolean;
  paid: boolean;
  arrived: boolean;
  selected: boolean;
}) {
  const selectedRing = selected ? " ring-2 ring-moss/15" : "";
  const selectedFocus = selected ? " outline outline-2 outline-offset-2 outline-moss/70 shadow-lg" : "";

  if (customerCancelled) {
    return `border-red-300 bg-red-50/80 ring-1 ring-red-100${selectedRing}${selectedFocus}`;
  }

  if (departed) {
    return `border-ink/10 bg-ink/5 opacity-85${selectedRing}${selectedFocus}`;
  }

  if (paid) {
    return `border-emerald-700 bg-emerald-200/90 ring-1 ring-emerald-500/30${selectedRing}${selectedFocus}`;
  }

  if (arrived) {
    return `border-orange-300 bg-orange-100/85 ring-1 ring-orange-200${selectedRing}${selectedFocus}`;
  }

  if (selected) {
    return "border-moss bg-moss/5 ring-2 ring-moss/20 outline outline-2 outline-offset-2 outline-moss/70 shadow-lg";
  }

  return "border-ink/10 bg-linen/70";
}

function insightClass(level: ChefInsight["level"]) {
  return {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    critical: "border-red-200 bg-red-50 text-red-900"
  }[level];
}

function tablePreferenceFromForm(formData: FormData): TableFeature[] {
  return ["QUIET", "ACCESSIBLE", "KIDS", "WINDOW"].filter((feature) => formData.get(feature)) as TableFeature[];
}

export function DashboardLive({ initialBrand }: { initialBrand: PlatformBrand }) {
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [hoveredMenuItem, setHoveredMenuItem] = useState<AdminSection | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [generalPage, setGeneralPage] = useState<GeneralPage>("Restaurant");
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedService, setSelectedService] = useState<ServiceFilter>("lunch");
  const [reservationView, setReservationView] = useState<ReservationView>("list");
  const [floorViewMode, setFloorViewMode] = useState<"2d" | "3d">("2d");
  const [dashboardRoomId, setDashboardRoomId] = useState<string | null>(null);
  const [floorZoom, setFloorZoom] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [paidReservationIds, setPaidReservationIds] = useState<string[]>([]);
  const [departedReservationIds, setDepartedReservationIds] = useState<string[]>([]);
  const [acknowledgedCancellationIds, setAcknowledgedCancellationIds] = useState<string[]>([]);
  const [showDepartedReservations, setShowDepartedReservations] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [liveSelectedTableIds, setLiveSelectedTableIds] = useState<string[]>([]);
  const [notifiedWaitlistIds, setNotifiedWaitlistIds] = useState<string[]>([]);
  const [expandedWaitlistId, setExpandedWaitlistId] = useState<string | null>(null);
  const [seenWaitlistIds, setSeenWaitlistIds] = useState<string[]>([]);
  const [hiddenInsightIds, setHiddenInsightIds] = useState<string[]>([]);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [chefPrompt, setChefPrompt] = useState("");
  const [chefPanelHeight, setChefPanelHeight] = useState(260);
  const [chefMessages, setChefMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Bonjour, je suis ToqueChef. Posez-moi une question sur le service, les réservations, les tables libres ou la liste d’attente."
    }
  ]);
  const { selectedTableId, setSelectedTableId } = useFloorPlanStore();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const firstAccountMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const waitlistPanelRef = useRef<HTMLElement | null>(null);

  const restaurantsQuery = useQuery({
    queryKey: ["current-restaurants"],
    queryFn: () => apiFetch<{ restaurants: Restaurant[] }>("/api/restaurants/current")
  });
  const brandQuery = useQuery({
    queryKey: ["platform-brand"],
    queryFn: () =>
      apiFetch<BrandResponse>("/api/platform-brand"),
    initialData: {
      brand: initialBrand
    },
    staleTime: 60_000
  });

  const restaurants = restaurantsQuery.data?.restaurants ?? [];
  const restaurant = restaurants[0];
  const dashboardSubscriptionState = subscriptionStateFromSettings(restaurant?.settings);
  const dashboardLogoUrl = brandQuery.data?.brand.logoUrl ?? "/toquetop-logo.svg";
  const dashboardLogoAlt = brandQuery.data?.brand.logoAlt ?? "ToqueTop";
  const dashboardLogoHeight = brandQuery.data?.brand.logoHeight ?? 48;
  const hiddenInsightStorageKey = restaurant?.id ? `toquetop:hidden-insights:${restaurant.id}` : null;
  const minDashboardDate = operationalMinDate(restaurant?.timezone);
  const headerDateTime = getZonedDateTimeParts(restaurant?.timezone || "Europe/Paris");
  const headerTodayDate = headerDateTime.date;
  const headerClock = formatDashboardClock(clockNow, restaurant?.timezone || "Europe/Paris");
  const canGoToPreviousDay = selectedDate > minDashboardDate;

  useRestaurantSocket(restaurant?.id);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get("section");

    if (isAdminSection(requestedSection)) {
      setSection(requestedSection);
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  void clockNow;

  useEffect(() => {
    if (!hiddenInsightStorageKey) {
      setHiddenInsightIds([]);
      return;
    }

    try {
      const stored = window.localStorage.getItem(hiddenInsightStorageKey);
      setHiddenInsightIds(stored ? JSON.parse(stored) : []);
    } catch {
      setHiddenInsightIds([]);
    }
  }, [hiddenInsightStorageKey]);

  useEffect(() => {
    if (!selectedReservationId) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest("[data-dashboard-reservation], [data-dashboard-reservation-badge], [data-dashboard-actions], [role='dialog']")
      ) {
        return;
      }

      setSelectedReservationId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [selectedReservationId]);

  useEffect(() => {
    if (!restaurant) {
      return;
    }

    const recommendedService = recommendedDashboardService(restaurant.openingHours, selectedDate, restaurant.timezone);

    if (recommendedService === "dinner" && selectedService !== "dinner") {
      setSelectedService("dinner");
    }
  }, [clockNow, restaurant, selectedDate, selectedService]);

  useEffect(() => {
    if (selectedDate < minDashboardDate) {
      setSelectedDate(minDashboardDate);
    }
  }, [minDashboardDate, selectedDate]);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    firstAccountMenuItemRef.current?.focus();

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  function selectAccountMenuSection(targetSection: AdminSection) {
    setSection(targetSection);
    setAccountMenuOpen(false);
  }

  const tablesQuery = useQuery({
    queryKey: ["tables", restaurant?.id],
    enabled: Boolean(restaurant?.id),
    queryFn: () => apiFetch<{ tables: FloorTable[] }>(`/api/restaurants/${restaurant?.id}/tables`)
  });

  const reservationsQuery = useQuery({
    queryKey: ["reservations", restaurant?.id, selectedDate],
    enabled: Boolean(restaurant?.id),
    refetchInterval: section === "dashboard" ? 5_000 : false,
    queryFn: () =>
      apiFetch<{ reservations: Reservation[] }>(`/api/restaurants/${restaurant?.id}/reservations?date=${selectedDate}`)
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", restaurant?.id, clientSearch],
    enabled: Boolean(restaurant?.id),
    queryFn: () =>
      apiFetch<{ clients: Client[] }>(
        `/api/restaurants/${restaurant?.id}/clients${clientSearch ? `?search=${encodeURIComponent(clientSearch)}` : ""}`
      )
  });

  const waitlistQuery = useQuery({
    queryKey: ["waitlist", restaurant?.id, selectedDate],
    enabled: Boolean(restaurant?.id),
    queryFn: () => apiFetch<{ waitlist: WaitlistEntry[] }>(`/api/restaurants/${restaurant?.id}/waitlist?date=${selectedDate}`)
  });

  const chefQuery = useQuery({
    queryKey: ["chef-toque", restaurant?.id, selectedDate],
    enabled: Boolean(restaurant?.id),
    queryFn: () => apiFetch<{ insights: ChefInsight[] }>(`/api/restaurants/${restaurant?.id}/chef-toque?date=${selectedDate}`)
  });

  const eventsQuery = useQuery({
    queryKey: ["events", restaurant?.id],
    enabled: Boolean(restaurant?.id),
    queryFn: () => apiFetch<{ events: AuditEvent[] }>(`/api/restaurants/${restaurant?.id}/events?take=12`)
  });

  const rawTables = tablesQuery.data?.tables ?? restaurant?.tables ?? [];
  const reservations = reservationsQuery.data?.reservations ?? [];
  const clients = clientsQuery.data?.clients ?? [];
  const waitlist = waitlistQuery.data?.waitlist ?? [];
  const insights = chefQuery.data?.insights ?? [];
  const events = eventsQuery.data?.events ?? [];
  const settings = restaurant?.settings ?? {};
  const dashboardServiceWindow = serviceWindowForDashboard(selectedService, settings);
  const dashboardServiceWindows = restaurant
    ? normalizeServiceWindows(restaurant.openingHours[getDayKey(selectedDate)])
    : [];
  const visibleWaitlist = waitlist.filter((entry) =>
    waitlistMatchesDashboardService(entry, selectedService, dashboardServiceWindows)
  );
  const unseenWaitlist = visibleWaitlist.filter((entry) => !seenWaitlistIds.includes(entry.id));
  const tableBlocksQuery = useQuery({
    queryKey: ["table-blocks", restaurant?.id, selectedDate],
    enabled: Boolean(restaurant?.id),
    refetchInterval: section === "dashboard" ? 5_000 : false,
    queryFn: () => apiFetch<{ blocks: TableBlock[] }>(`/api/restaurants/${restaurant?.id}/table-blocks?date=${selectedDate}`)
  });
  const tableBlocks = tableBlocksQuery.data?.blocks ?? [];
  const reservationsQueryKey = ["reservations", restaurant?.id, selectedDate] as const;
  const waitlistQueryKey = ["waitlist", restaurant?.id, selectedDate] as const;
  const tableBlocksQueryKey = ["table-blocks", restaurant?.id, selectedDate] as const;
  const tables = useMemo(() => applyFloorPlanSettings(rawTables, settings), [rawTables, settings]);
  const dashboardRooms = useMemo(
    () => floorRoomsFromSettings(settings).filter((room) => room.active !== false),
    [settings]
  );
  const dashboardTableRooms = useMemo(() => tableRoomsFromSettings(settings), [settings]);
  const dashboardRoom = dashboardRooms.find((room) => room.id === dashboardRoomId) ?? dashboardRooms[0] ?? defaultFloorRoom();
  const defaultDashboardRoomId = dashboardRooms[0]?.id ?? defaultFloorRoom().id;
  const dashboardTables = tables.filter((table) => (dashboardTableRooms[table.id] ?? defaultDashboardRoomId) === dashboardRoom.id);
  const selectedTable = tables.find((table) => table.id === selectedTableId);
  const selectedReservation = reservations.find((reservation) => reservation.id === selectedReservationId);
  const filteredReservations = restaurant
    ? reservations.filter((reservation) =>
        reservationMatchesService(reservation, selectedService, restaurant.openingHours, selectedDate)
      )
    : [];
  const visibleFilteredReservations = filteredReservations.filter((reservation) => {
    if (isRestaurantCancelledReservation(reservation)) {
      return false;
    }

    if (isCustomerCancelledReservation(reservation) && acknowledgedCancellationIds.includes(reservation.id)) {
      return false;
    }

    return showDepartedReservations ? true : !departedReservationIds.includes(reservation.id);
  });
  const activeReservations = visibleFilteredReservations.filter((reservation) => reservation.status !== "CANCELLED");
  const rush = rushForecast(activeReservations);
  const customerCancelledReservations = visibleFilteredReservations.filter(isCustomerCancelledReservation);
  const visibleInsights = insights.filter((insight) => !hiddenInsightIds.includes(insight.id));
  const dashboardSummary = {
    guests: activeReservations.reduce((sum, reservation) => sum + reservation.numberOfGuests, 0),
    loyal: activeReservations.filter((reservation) => (reservation.client?._count?.reservations ?? 1) > 1).length,
    newClients: activeReservations.filter((reservation) => (reservation.client?._count?.reservations ?? 1) <= 1).length,
    risky: activeReservations.filter((reservation) => (reservation.client?.noShowRisk ?? 0) >= 35).length,
    vip: activeReservations.filter((reservation) => reservation.client?.vip).length
  };
  const dashboardSummaryDetail = (
    <>
      <span>Couverts : {dashboardSummary.guests}</span>
      <span>Nouveaux clients : {dashboardSummary.newClients}</span>
      <span>Clients fidèles : {dashboardSummary.loyal}</span>
      <span>VIP : {dashboardSummary.vip}</span>
      <span>Réservations risquées : {dashboardSummary.risky}</span>
    </>
  );
  const dashboardTableCombinations = tableCombinationsFromSettings(settings);
  function autoCombinationBlocksForReservation(reservationId: string) {
    return tableBlocks.filter((block) => block.notes === `AUTO_COMBINATION:${reservationId}`);
  }

  function reservedTableIdsForReservation(reservation: Reservation) {
    const assignedTableId = reservation.table?.id;

    if (!assignedTableId) {
      return [];
    }

    const explicitCombinationIds = autoCombinationBlocksForReservation(reservation.id).map((block) => block.tableId);

    if (explicitCombinationIds.length > 0) {
      return [assignedTableId, ...explicitCombinationIds];
    }

    const assignedTable = tables.find((table) => table.id === assignedTableId);
    const matchingCombination = dashboardTableCombinations.find((combination) => {
      if (!combination.tableIds.includes(assignedTableId)) {
        return false;
      }

      const combinationCapacity = combination.tableIds.reduce((sum, tableId) => {
        const table = tables.find((item) => item.id === tableId);
        return sum + (table?.capacity ?? 0);
      }, 0);

      return combinationCapacity >= reservation.numberOfGuests && (!assignedTable || assignedTable.capacity < reservation.numberOfGuests);
    });

    return matchingCombination?.tableIds ?? [assignedTableId];
  }

  function reservationTableIds(reservation: Reservation) {
    return reservedTableIdsForReservation(reservation);
  }

  function reservationTableLabels(reservation: Reservation) {
    const tableIds = reservationTableIds(reservation);
    const labels = tableIds
      .map((tableId) => tables.find((table) => table.id === tableId)?.label ?? autoCombinationBlocksForReservation(reservation.id).find((block) => block.tableId === tableId)?.table.label)
      .filter(Boolean);

    if (labels.length > 1) {
      return `Tables combinées ${labels.join(" + ")}`;
    }

    return `Table ${labels[0] ?? reservation.table?.label ?? "à attribuer"}`;
  }

  const occupiedTableIds = new Set(activeReservations.flatMap(reservedTableIdsForReservation));
  const visibleManualBlocks = tableBlocks.filter((block) =>
    !block.notes?.startsWith("AUTO_COMBINATION:") &&
    overlapsTime(block.startTime, block.endTime, dashboardServiceWindow.startTime, dashboardServiceWindow.endTime)
  );
  const blockedTableIds = new Set(
    visibleManualBlocks.map((block) => block.tableId)
  );
  const selectedTableBlock = selectedTableId
    ? visibleManualBlocks.find((block) => block.tableId === selectedTableId)
    : undefined;
  const availableTables = tables.filter((table) => table.active && !occupiedTableIds.has(table.id) && !blockedTableIds.has(table.id));
  const availableTableIds = availableTables.map((table) => table.id);
  const availableCounts = capacityCounts(availableTables);
  const activeTableCount = tables.filter((table) => table.active).length;
  const occupancyRate = activeTableCount ? Math.round((occupiedTableIds.size / activeTableCount) * 100) : 0;
  const combinedTablePositionOverrides = new Map<string, { positionX: number; positionY: number }>();

  for (const reservation of activeReservations) {
    const assignedTableId = reservation.table?.id;

    if (!assignedTableId) {
      continue;
    }

    const assignedTable = tables.find((table) => table.id === assignedTableId);
    const matchingCombination = dashboardTableCombinations.find((combination) => {
      if (!combination.tableIds.includes(assignedTableId)) {
        return false;
      }

      const combinationCapacity = combination.tableIds.reduce((sum, tableId) => {
        const table = tables.find((item) => item.id === tableId);
        return sum + (table?.capacity ?? 0);
      }, 0);

      return combinationCapacity >= reservation.numberOfGuests && (!assignedTable || assignedTable.capacity < reservation.numberOfGuests);
    });

    if (!matchingCombination) {
      continue;
    }

    const combinationTables = matchingCombination.tableIds
      .map((tableId) => tables.find((table) => table.id === tableId))
      .filter((table): table is (typeof tables)[number] => Boolean(table));
    const positions = combinationPositionsForTables(combinationTables, matchingCombination.placement ?? "RIGHT");

    Object.entries(positions).forEach(([tableId, position]) => {
      combinedTablePositionOverrides.set(tableId, position);
    });
  }

  const dashboardTablesForDisplay = dashboardTables.map((table) => ({
    ...table,
    ...combinedTablePositionOverrides.get(table.id)
  }));
  const openingStatus = restaurant
    ? getRestaurantOpeningStatus(restaurant.openingHours, restaurant.timezone)
    : { label: "Chargement", tone: "soon" as const };
  const serviceSegmentOptions = restaurant
    ? [
        { value: "lunch", label: "Midi", disabled: dashboardServiceDisabled(restaurant.openingHours, selectedDate, restaurant.timezone, "lunch") },
        { value: "dinner", label: "Soir", disabled: dashboardServiceDisabled(restaurant.openingHours, selectedDate, restaurant.timezone, "dinner") }
      ]
    : [
        { value: "lunch", label: "Midi" },
        { value: "dinner", label: "Soir" }
      ];
  const floorPlanModelUrl = dashboardRoom.modelDataUrl ?? floorPlanModelUrlFromSettings(settings);
  const floorPlan2dImageUrl = dashboardRoom.plan2dDataUrl ?? floorPlan2dImageUrlFromSettings(settings);
  const reservationBadges: Record<string, TableBadge> = Object.fromEntries(
    activeReservations
      .filter((reservation) => reservation.table?.id)
      .map((reservation) => {
        const combinedLabels = reservationTableLabels(reservation);
        const isCombined = reservedTableIdsForReservation(reservation).length > 1;
        const delayLabel = reservationDelayLabel(reservation, selectedDate, restaurant?.timezone || "Europe/Paris");
        const noShowRisk = reservation.client?.noShowRisk ?? 0;

        return [
        reservation.table?.id ?? "",
        {
          title: `${reservation.client?.vip ? "★ " : ""}${reservationGuestName(reservation)}`,
          detail: `${reservationClientFrequencyLabel(reservation)} · ${reservationArrivalCountdown(
            reservation,
            selectedDate,
            restaurant?.timezone || "Europe/Paris"
          )}`,
          tableLabel: combinedLabels,
          guestCount: reservation.numberOfGuests,
          riskLabel: `${reservationNoShowRiskLabel(reservation)} · ${noShowRisk}%${noShowRisk >= 70 ? " !" : ""}`,
          riskCritical: noShowRisk >= 70,
          reservationId: reservation.id,
          startTime: reservation.startTime,
          isCombined,
          delayLabel,
          tone: reservation.client?.vip ? "vip" : "reserved"
        }
      ] as const;
      })
  );
  const cancellationBadges: Record<string, TableBadge> = Object.fromEntries(
    customerCancelledReservations
      .filter((reservation) => reservation.table?.id)
      .map((reservation) => [
        reservation.table?.id ?? "",
        {
          title: `Annulation client · ${reservationGuestName(reservation)}`,
          detail: `${reservation.numberOfGuests} couvert(s) · ${reservation.startTime}`,
          tableLabel: reservationTableLabels(reservation),
          guestCount: reservation.numberOfGuests,
          reservationId: reservation.id,
          startTime: reservation.startTime,
          isCombined: reservedTableIdsForReservation(reservation).length > 1,
          tone: "cancelled" as const
        }
      ] as const)
  );
  const dashboardTableBadges = {
    ...reservationBadges,
    ...cancellationBadges
  };
  const dashboardTableTones: Record<string, TableBadge["tone"]> = {
    ...Object.fromEntries(Array.from(occupiedTableIds).map((tableId) => [tableId, "reserved" as const])),
    ...Object.fromEntries(Array.from(blockedTableIds).map((tableId) => [tableId, "blocked" as const])),
    ...Object.fromEntries(Object.keys(cancellationBadges).map((tableId) => [tableId, "cancelled" as const]))
  };

  useEffect(() => {
    if (!dashboardRooms.some((room) => room.id === dashboardRoomId)) {
      setDashboardRoomId(dashboardRooms[0]?.id ?? null);
    }
  }, [dashboardRoomId, dashboardRooms]);

  function patchReservationsCache(updater: (reservations: Reservation[]) => Reservation[]) {
    queryClient.setQueryData<{ reservations: Reservation[] }>(reservationsQueryKey, (current) => ({
      reservations: updater(current?.reservations ?? [])
    }));
  }

  function optimisticReservationPatch(data: Record<string, unknown>): Partial<Reservation> {
    const patch: Partial<Reservation> = {};

    if (typeof data.status === "string" && ["PENDING", "CONFIRMED", "CANCELLED"].includes(data.status)) {
      patch.status = data.status as Reservation["status"];
    }

    if ("notes" in data) {
      patch.notes = typeof data.notes === "string" ? data.notes : null;
    }

    if (typeof data.startTime === "string") {
      patch.startTime = data.startTime;
    }

    if (typeof data.endTime === "string") {
      patch.endTime = data.endTime;
    }

    if (typeof data.numberOfGuests === "number" && Number.isFinite(data.numberOfGuests)) {
      patch.numberOfGuests = data.numberOfGuests;
    }

    if ("noShow" in data) {
      patch.noShow = Boolean(data.noShow);
    }

    if ("arrivedAt" in data) {
      patch.arrivedAt = data.arrivedAt === "now"
        ? new Date().toISOString()
        : typeof data.arrivedAt === "string"
          ? data.arrivedAt
          : null;
    }

    if ("tableId" in data) {
      const tableId = typeof data.tableId === "string" ? data.tableId : null;
      const table = tableId ? tables.find((item) => item.id === tableId) : null;
      patch.table = table ? { id: table.id, label: table.label } : null;
    }

    return patch;
  }

  const createReservationMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const startTime = String(formData.get("startTime"));
      const endTime = minutesToTime(parseTimeToMinutes(startTime) + 120);

      return apiFetch<{ reservation: Reservation }>(`/api/restaurants/${restaurant?.id}/reservations`, {
        method: "POST",
        body: JSON.stringify({
          date: String(formData.get("date")),
          startTime,
          endTime,
          numberOfGuests: Number(formData.get("numberOfGuests")),
          tableId: String(formData.get("tableId") || "") || undefined,
          firstName: String(formData.get("firstName")),
          lastName: String(formData.get("lastName")),
          email: String(formData.get("email")),
          phone: String(formData.get("phone")),
          tablePreferences: tablePreferenceFromForm(formData),
          highChair: Boolean(formData.get("highChair")),
          birthday: Boolean(formData.get("birthday")),
          romanticDinner: Boolean(formData.get("romanticDinner")),
          notes: String(formData.get("notes") || ""),
          sendConfirmationSms: Boolean(formData.get("sendConfirmationSms"))
        })
      });
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: reservationsQueryKey });
      const previousReservations = queryClient.getQueryData<{ reservations: Reservation[] }>(reservationsQueryKey);
      const tableId = String(formData.get("tableId") || "");
      const table = tableId ? tables.find((item) => item.id === tableId) : null;
      const startTime = String(formData.get("startTime"));
      const tempId = `temp-reservation-${Date.now()}`;

      queryClient.setQueryData<{ reservations: Reservation[] }>(reservationsQueryKey, (current) => ({
        reservations: [
          ...(current?.reservations ?? []),
          {
            id: tempId,
            referenceCode: "Enregistrement...",
            date: String(formData.get("date")),
            startTime,
            endTime: minutesToTime(parseTimeToMinutes(startTime) + 120),
            numberOfGuests: Number(formData.get("numberOfGuests")),
            status: "CONFIRMED",
            notes: String(formData.get("notes") || "") || null,
            guestFirstName: String(formData.get("firstName")),
            guestLastName: String(formData.get("lastName")),
            guestEmail: String(formData.get("email") || "") || null,
            guestPhone: String(formData.get("phone") || "") || null,
            highChair: Boolean(formData.get("highChair")),
            birthday: Boolean(formData.get("birthday")),
            romanticDinner: Boolean(formData.get("romanticDinner")),
            arrivedAt: null,
            noShow: false,
            table: table ? { id: table.id, label: table.label } : null,
            client: null
          }
        ]
      }));
      return { previousReservations, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReservations) {
        queryClient.setQueryData(reservationsQueryKey, context.previousReservations);
      }
    },
    onSuccess: (data, _variables, context) => {
      patchReservationsCache((current) =>
        current.map((reservation) => reservation.id === context?.tempId ? data.reservation : reservation)
      );
      setModal(null);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["tables", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["table-blocks", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
    }
  });

  const updateReservationMutation = useMutation({
    mutationFn: ({ reservationId, data }: { reservationId: string; data: Record<string, unknown> }) =>
      apiFetch<{ reservation: Reservation }>(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onMutate: async ({ reservationId, data }) => {
      await queryClient.cancelQueries({ queryKey: reservationsQueryKey });
      const previousReservations = queryClient.getQueryData<{ reservations: Reservation[] }>(reservationsQueryKey);
      const patch = optimisticReservationPatch(data);

      patchReservationsCache((current) =>
        current.map((reservation) =>
          reservation.id === reservationId
            ? {
                ...reservation,
                ...patch
              }
            : reservation
        )
      );
      setModal(null);

      return { previousReservations };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReservations) {
        queryClient.setQueryData(reservationsQueryKey, context.previousReservations);
      }
    },
    onSuccess: (data) => {
      patchReservationsCache((current) =>
        current.map((reservation) => reservation.id === data.reservation.id ? data.reservation : reservation)
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["table-blocks", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
    }
  });

  const cancelReservationMutation = useMutation({
    mutationFn: (reservationId: string) =>
      apiFetch<void>(`/api/reservations/${reservationId}`, {
        method: "DELETE"
      }),
    onMutate: async (reservationId) => {
      await queryClient.cancelQueries({ queryKey: reservationsQueryKey });
      const previousReservations = queryClient.getQueryData<{ reservations: Reservation[] }>(reservationsQueryKey);

      patchReservationsCache((current) =>
        current.map((reservation) =>
          reservation.id === reservationId
            ? {
                ...reservation,
                status: "CANCELLED"
              }
            : reservation
        )
      );

      return { previousReservations };
    },
    onError: (_error, _reservationId, context) => {
      if (context?.previousReservations) {
        queryClient.setQueryData(reservationsQueryKey, context.previousReservations);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["table-blocks", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
    }
  });

  function confirmCancelReservation(reservationId: string) {
    if (window.confirm("Êtes-vous sûr d’annuler la réservation ?")) {
      cancelReservationMutation.mutate(reservationId);
    }
  }

  const sendReminderMutation = useMutation({
    mutationFn: (reservationId: string) =>
      apiFetch<{ sent: boolean; emailSent: boolean; smsSent: boolean }>(`/api/reservations/${reservationId}/reminder`, {
        method: "POST"
      }),
    onSuccess: () => refreshLiveData()
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: Partial<FloorTable> }) =>
      apiFetch<{ table: FloorTable }>(`/api/tables/${tableId}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => refreshLiveData()
  });

  const createBlockMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<{ block: TableBlock }>(`/api/tables/${selectedTableId}/blocks`, {
        method: "POST",
	        body: JSON.stringify({
	          date: String(formData.get("date")),
	          startTime: String(formData.get("startTime")),
	          endTime: String(formData.get("endTime")),
	          reason: String(formData.get("reason")) as TableBlockReason,
	          notes: String(formData.get("notes") || "")
	        })
	      }),
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: tableBlocksQueryKey });
      const previousBlocks = queryClient.getQueryData<{ blocks: TableBlock[] }>(tableBlocksQueryKey);
      const table = selectedTable;
      const tempId = `temp-block-${Date.now()}`;

      if (table) {
        queryClient.setQueryData<{ blocks: TableBlock[] }>(tableBlocksQueryKey, (current) => ({
          blocks: [
            ...(current?.blocks ?? []),
            {
              id: tempId,
              tableId: table.id,
              date: String(formData.get("date")),
              startTime: String(formData.get("startTime")),
              endTime: String(formData.get("endTime")),
              reason: String(formData.get("reason")) as TableBlock["reason"],
              notes: String(formData.get("notes") || "") || null,
              table: {
                id: table.id,
                label: table.label
              }
            }
          ]
        }));
      }
      setModal(null);

      return { previousBlocks, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(tableBlocksQueryKey, context.previousBlocks);
      }
    },
    onSuccess: (data, _variables, context) => {
      queryClient.setQueryData<{ blocks: TableBlock[] }>(tableBlocksQueryKey, (current) => ({
        blocks: (current?.blocks ?? []).map((block) =>
          block.id === context?.tempId
            ? {
                ...data.block,
                table: data.block.table ?? block.table
              }
            : block
        )
      }));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["table-blocks", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) =>
      apiFetch<void>(`/api/table-blocks/${blockId}`, {
        method: "DELETE"
      }),
    onMutate: async (blockId) => {
      await queryClient.cancelQueries({ queryKey: tableBlocksQueryKey });
      const previousBlocks = queryClient.getQueryData<{ blocks: TableBlock[] }>(tableBlocksQueryKey);

      queryClient.setQueryData<{ blocks: TableBlock[] }>(tableBlocksQueryKey, (current) => ({
        blocks: (current?.blocks ?? []).filter((block) => block.id !== blockId)
      }));

      return { previousBlocks };
    },
    onError: (_error, _blockId, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(tableBlocksQueryKey, context.previousBlocks);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["table-blocks", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
    }
  });

  const createWaitlistMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const requestedTime = String(formData.get("requestedTime") || "").trim();
      const requestedService = String(formData.get("requestedService") || selectedService);
      const rawNotes = String(formData.get("notes") || "").trim();
      const notes = requestedTime
        ? rawNotes
        : [rawNotes, `${WAITLIST_SERVICE_MARKER}${requestedService}`].filter(Boolean).join("\n");

      return apiFetch<{ waitlistEntry: WaitlistEntry }>(`/api/restaurants/${restaurant?.id}/waitlist`, {
        method: "POST",
        body: JSON.stringify({
          date: String(formData.get("date")),
          requestedTime,
          numberOfGuests: Number(formData.get("numberOfGuests")),
          firstName: String(formData.get("firstName")),
          lastName: String(formData.get("lastName")),
          email: String(formData.get("email") || ""),
          phone: String(formData.get("phone") || ""),
          notes,
          tablePreferences: tablePreferenceFromForm(formData)
        })
      });
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: waitlistQueryKey });
      const previousWaitlist = queryClient.getQueryData<{ waitlist: WaitlistEntry[] }>(waitlistQueryKey);
      const tempId = `temp-waitlist-${Date.now()}`;
      const email = String(formData.get("email") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const requestedTime = String(formData.get("requestedTime") || "").trim();
      const requestedService = String(formData.get("requestedService") || selectedService);
      const rawNotes = String(formData.get("notes") || "").trim();
      const notes = requestedTime
        ? rawNotes
        : [rawNotes, `${WAITLIST_SERVICE_MARKER}${requestedService}`].filter(Boolean).join("\n");

      queryClient.setQueryData<{ waitlist: WaitlistEntry[] }>(waitlistQueryKey, (current) => ({
        waitlist: [
          ...(current?.waitlist ?? []),
          {
            id: tempId,
            date: String(formData.get("date")),
            requestedTime: requestedTime || null,
            numberOfGuests: Number(formData.get("numberOfGuests")),
            status: "WAITING",
            firstName: String(formData.get("firstName")),
            lastName: String(formData.get("lastName")),
            email: email || null,
            phone: phone || null,
            notes: notes || null
          }
        ]
      }));
      setModal(null);

      return { previousWaitlist, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWaitlist) {
        queryClient.setQueryData(waitlistQueryKey, context.previousWaitlist);
      }
    },
    onSuccess: (data, _variables, context) => {
      queryClient.setQueryData<{ waitlist: WaitlistEntry[] }>(waitlistQueryKey, (current) => ({
        waitlist: (current?.waitlist ?? []).map((entry) => entry.id === context?.tempId ? data.waitlistEntry : entry)
      }));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["waitlist", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
    }
  });

  const cancelWaitlistMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiFetch<{ waitlistEntry: WaitlistEntry }>(`/api/restaurants/${restaurant?.id}/waitlist/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "CANCELLED"
        })
      }),
    onMutate: async (entryId) => {
      await queryClient.cancelQueries({ queryKey: waitlistQueryKey });
      const previousWaitlist = queryClient.getQueryData<{ waitlist: WaitlistEntry[] }>(waitlistQueryKey);

      queryClient.setQueryData<{ waitlist: WaitlistEntry[] }>(waitlistQueryKey, (current) => ({
        waitlist: (current?.waitlist ?? []).filter((entry) => entry.id !== entryId)
      }));

      return { previousWaitlist };
    },
    onError: (_error, _entryId, context) => {
      if (context?.previousWaitlist) {
        queryClient.setQueryData(waitlistQueryKey, context.previousWaitlist);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["waitlist", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
    }
  });

  const markWaitlistNotifiedMutation = useMutation({
    mutationFn: (entry: WaitlistEntry) =>
      apiFetch<{ waitlistEntry: WaitlistEntry; emailSent: boolean; smsSent: boolean }>(`/api/restaurants/${restaurant?.id}/waitlist/${entry.id}/notify`, {
        method: "POST"
      }),
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: waitlistQueryKey });
      const previousWaitlist = queryClient.getQueryData<{ waitlist: WaitlistEntry[] }>(waitlistQueryKey);

      queryClient.setQueryData<{ waitlist: WaitlistEntry[] }>(waitlistQueryKey, (current) => ({
        waitlist: (current?.waitlist ?? []).map((item) =>
          item.id === entry.id
            ? {
                ...item,
                notes: item.notes?.includes(WAITLIST_NOTIFIED_MARKER)
                  ? item.notes
                  : [item.notes, WAITLIST_NOTIFIED_MARKER].filter(Boolean).join("\n")
              }
            : item
        )
      }));

      return { previousWaitlist };
    },
    onError: (_error, _entry, context) => {
      if (context?.previousWaitlist) {
        queryClient.setQueryData(waitlistQueryKey, context.previousWaitlist);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["waitlist", restaurant?.id] });
    }
  });

  const createClientMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<{ client: Client }>(`/api/restaurants/${restaurant?.id}/clients`, {
        method: "POST",
        body: JSON.stringify({
          firstName: String(formData.get("firstName")),
          lastName: String(formData.get("lastName")),
          email: String(formData.get("email") || ""),
          phone: String(formData.get("phone") || ""),
          birthday: String(formData.get("birthday") || ""),
          allergies: String(formData.get("allergies") || ""),
          preferences: String(formData.get("preferences") || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          internalNotes: String(formData.get("internalNotes") || ""),
          vip: Boolean(formData.get("vip")),
          noShowRisk: Number(formData.get("noShowRisk") || 0)
        })
      }),
    onSuccess: () => refreshLiveData()
  });

  function refreshLiveData() {
    setModal(null);
    queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
    queryClient.invalidateQueries({ queryKey: ["tables", restaurant?.id] });
    queryClient.invalidateQueries({ queryKey: ["clients", restaurant?.id] });
    queryClient.invalidateQueries({ queryKey: ["waitlist", restaurant?.id] });
    queryClient.invalidateQueries({ queryKey: ["table-blocks", restaurant?.id] });
    queryClient.invalidateQueries({ queryKey: ["chef-toque", restaurant?.id] });
    queryClient.invalidateQueries({ queryKey: ["events", restaurant?.id] });
  }

  function submitForm(mutation: { mutate: (formData: FormData) => void }) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      mutation.mutate(new FormData(event.currentTarget));
    };
  }

  function selectLiveTable(table: FloorTable, options?: { additive: boolean }) {
    setSelectedTableId(table.id);

    if (!options?.additive) {
      setLiveSelectedTableIds([table.id]);
      return;
    }

    setLiveSelectedTableIds((current) => {
      if (current.includes(table.id)) {
        const next = current.filter((tableId) => tableId !== table.id);
        return next.length > 0 ? next : [table.id];
      }

      return [...current, table.id];
    });
  }

  function deselectLiveTable() {
    setSelectedTableId(undefined);
    setLiveSelectedTableIds([]);
  }

  function notifyWaitlistEntry(entry: WaitlistEntry) {
    setNotifiedWaitlistIds((current) => [...new Set([...current, entry.id])]);
    markWaitlistNotifiedMutation.mutate(entry);
  }

  function hideChefInsight(insightId: string) {
    setHiddenInsightIds((current) => {
      const next = [...new Set([...current, insightId])];

      if (hiddenInsightStorageKey) {
        try {
          window.localStorage.setItem(hiddenInsightStorageKey, JSON.stringify(next));
        } catch {
          // The dashboard should stay usable even if localStorage is unavailable.
        }
      }

      return next;
    });
  }

  function openWaitlistAlert() {
    try {
      waitlistPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      waitlistPanelRef.current?.scrollIntoView();
    }

    if (unseenWaitlist[0]) {
      setExpandedWaitlistId(unseenWaitlist[0].id);
    }

    setSeenWaitlistIds((current) => [...new Set([...current, ...visibleWaitlist.map((entry) => entry.id)])]);
  }

  function buildChefAnswer(question: string) {
    const normalized = question.toLowerCase();
    const service = serviceLabel(selectedService);
    const date = formatDate(selectedDate);
    const nextReservation = [...activeReservations].sort((first, second) => first.startTime.localeCompare(second.startTime))[0];

    if (normalized.includes("rush") || normalized.includes("affluence") || normalized.includes("pic")) {
      return rush.peak
        ? `Le rush du service du ${service} ${date} est estimé autour de ${rush.peak.time}, avec ${rush.peak.guests} couvert(s) attendus sur ${rush.peak.reservations} réservation(s).\n${rush.timeline.map((item) => `${item.time} : ${item.guests} couvert(s)`).join("\n")}`
        : `Je ne vois pas encore de rush prévu sur le service du ${service} ${date}, car aucune réservation active n’est enregistrée.`;
    }

    if (normalized.includes("waitlist") || normalized.includes("attente")) {
      return visibleWaitlist.length > 0
        ? `La waitlist du service du ${service} contient ${visibleWaitlist.length} demande(s). La première demande est ${visibleWaitlist[0].firstName} ${visibleWaitlist[0].lastName}, ${visibleWaitlist[0].numberOfGuests} couvert(s), souhait ${visibleWaitlist[0].requestedTime || "flexible"}.`
        : `La waitlist du service du ${service} est vide pour le moment.`;
    }

    if (normalized.includes("table") || normalized.includes("libre") || normalized.includes("disponible")) {
      const suggestedTable = availableTables[0];

      return suggestedTable
        ? `Je proposerais ${suggestedTable.label} en priorité : ${suggestedTable.capacity} couvert(s), zone ${suggestedTable.zone}. Il reste ${availableTableIds.length}/${activeTableCount} table(s) libre(s) sur ce service.`
        : "Aucune table libre n’est visible sur ce service. Vérifiez les blocages, les combinaisons ou proposez la waitlist.";
    }

    if (normalized.includes("vip") || normalized.includes("no-show") || normalized.includes("noshow")) {
      const risky = activeReservations.filter((reservation) => (reservation.client?.noShowRisk ?? 0) >= 35);
      const vip = activeReservations.filter((reservation) => reservation.client?.vip);

      return `Sur le service du ${service}, je vois ${vip.length} client(s) VIP et ${risky.length} client(s) avec risque no-show moyen ou élevé. ${risky[0] ? `À surveiller : ${reservationGuestName(risky[0])}, risque ${risky[0].client?.noShowRisk ?? 0}%.` : "Aucun risque no-show marqué pour le moment."}`;
    }

    return [
      `Pour le service du ${service} ${date}, je vois ${activeReservations.length} réservation(s), ${availableTableIds.length}/${activeTableCount} table(s) libre(s) et ${visibleWaitlist.length} client(s) en waitlist.`,
      rush.peak ? `Rush estimé : ${rush.peak.time} avec ${rush.peak.guests} couvert(s).` : "Aucun rush détecté pour le moment.",
      nextReservation ? `Prochaine réservation : ${nextReservation.startTime}, ${reservationGuestName(nextReservation)}, ${nextReservation.numberOfGuests} couvert(s).` : "Aucune prochaine réservation active."
    ].join("\n");
  }

  function handleChefSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = chefPrompt.trim();

    if (!question) {
      return;
    }

    const answer = buildChefAnswer(question);

    setChefMessages((messages) => [
      { role: "assistant", content: answer },
      { role: "user", content: question },
      ...messages
    ]);
    setChefPrompt("");
  }

  function handleChefPromptKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const foregroundError = createReservationMutation.error ?? createWaitlistMutation.error ?? null;

  if (!restaurant) {
    const hasRestaurantLoadError = restaurantsQuery.isError;

    return (
      <main className="grid min-h-screen place-items-center bg-linen px-4 py-10">
        <div className="w-full max-w-xl rounded-lg border border-ink/10 bg-white p-8 text-center shadow-soft">
          <img
            alt={dashboardLogoAlt}
            className="mx-auto w-auto object-contain"
            src={dashboardLogoUrl}
            style={{ height: dashboardLogoHeight, maxWidth: 260 }}
          />
          {restaurantsQuery.isLoading ? (
            <div className="mt-8">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage text-moss">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-ink">Dashboard Live</h1>
              <p className="mt-2 text-sm font-semibold text-ink/60">
                Chargement du dashboard restaurant
                <span className="ml-1 inline-flex w-6 justify-start">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:120ms]">.</span>
                  <span className="animate-bounce [animation-delay:240ms]">.</span>
                </span>
              </p>
              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-linen">
                <div className="dashboard-loading-bar h-full w-1/3 rounded-full bg-moss" />
              </div>
            </div>
          ) : hasRestaurantLoadError ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-sm font-black text-amber-900">Impossible de charger les restaurants pour le moment.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
                {restaurantsQuery.error instanceof Error
                  ? restaurantsQuery.error.message
                  : "Le dashboard est bien déployé, mais l’API restaurants ne répond pas."}
              </p>
              <button
                className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-black text-white transition hover:bg-moss"
                type="button"
                onClick={() => restaurantsQuery.refetch()}
              >
                Réessayer
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-ink/60">Créez un restaurant pour commencer.</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-linen text-ink">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
          <div className="flex items-center gap-3">
            <img
              alt={dashboardLogoAlt}
              className="h-12 w-auto object-contain"
              src={dashboardLogoUrl}
              style={{ maxWidth: 260 }}
            />
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center gap-2">
              <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
              </span>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-moss">Dashboard Live</p>
              <div className="group relative inline-flex">
                <button
                  aria-describedby="dashboard-live-help"
                  className="grid h-7 w-7 place-items-center rounded-full text-moss transition hover:bg-sage focus:outline-none focus:ring-2 focus:ring-moss/30"
                  type="button"
                >
                  <Radio className="h-4 w-4" />
                  <span className="sr-only">Information sur le mode live</span>
                </button>
                <div
                  className="pointer-events-none absolute left-1/2 top-9 z-50 w-72 -translate-x-1/2 rounded-md border border-ink/10 bg-white p-3 text-left text-xs font-semibold leading-5 text-ink/70 opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-within:opacity-100"
                  id="dashboard-live-help"
                  role="tooltip"
                >
                  Le mode live permet d’avoir accès en temps réel aux réservations, annulations et changements de plan.
                  Les données se mettent à jour automatiquement.
                </div>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-semibold text-ink/55">{formatDate(headerTodayDate)}</span>
              <span
                aria-label={`Heure actuelle ${headerClock.hours}:${headerClock.minutes}:${headerClock.seconds}`}
                className="inline-flex items-center rounded-md border border-moss/15 bg-white px-2.5 py-1 font-mono text-sm font-black leading-none text-moss shadow-sm"
              >
                <span>{headerClock.hours}</span>
                <span className="mx-0.5 animate-pulse">:</span>
                <span>{headerClock.minutes}</span>
                <span className="mx-0.5 animate-pulse [animation-delay:500ms]">:</span>
                <span>{headerClock.seconds}</span>
              </span>
            </div>
          </div>
          <div className="relative flex items-center gap-2 text-sm font-bold" ref={accountMenuRef}>
            {dashboardSubscriptionState.trial ? (
              <span className={clsx(
                "hidden rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] sm:inline-flex",
                dashboardSubscriptionState.trialExpired ? "bg-red-50 text-red-700" : "bg-gold/25 text-ink"
              )}>
                {dashboardSubscriptionState.trialExpired ? "Essai terminé" : "Période d’essai"}
              </span>
            ) : null}
            {dashboardSubscriptionState.pastDue && !dashboardSubscriptionState.serviceSuspended ? (
              <span className="hidden rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white sm:inline-flex">
                Impayé
              </span>
            ) : null}
            {dashboardSubscriptionState.serviceSuspended ? (
              <span className="hidden rounded-full bg-ink px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white sm:inline-flex">
                Suspendu
              </span>
            ) : null}
            <span className="hidden max-w-[180px] truncate sm:inline">{restaurant.name}</span>
            <button
              aria-controls="dashboard-account-menu"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label="Ouvrir le menu du restaurant"
              className="grid h-10 w-10 place-items-center rounded-full bg-sage text-moss transition hover:bg-moss hover:text-white focus:outline-none focus:ring-2 focus:ring-moss/30"
              type="button"
              onClick={() => setAccountMenuOpen((current) => !current)}
            >
              <span aria-hidden="true" className="flex flex-col items-center gap-1">
                <span className="block h-1 w-5 rounded-full border border-current" />
                <span className="block h-1 w-5 rounded-full border border-current" />
                <span className="block h-1 w-5 rounded-full border border-current" />
              </span>
            </button>
            {accountMenuOpen ? (
              <div
                aria-label="Menu du restaurant"
                className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-lg border border-ink/10 bg-white p-2 text-left shadow-soft"
                id="dashboard-account-menu"
                role="menu"
              >
                <button
                  ref={firstAccountMenuItemRef}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-ink/75 transition hover:bg-linen focus:bg-linen focus:outline-none"
                  role="menuitem"
                  type="button"
                  onClick={() => selectAccountMenuSection("general")}
                >
                  <UserRound className="h-4 w-4" />
                  Profil
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-ink/75 transition hover:bg-linen focus:bg-linen focus:outline-none"
                  role="menuitem"
                  type="button"
                  onClick={() => selectAccountMenuSection("general")}
                >
                  <Settings className="h-4 w-4" />
                  Configurations
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-ink/75 transition hover:bg-linen focus:bg-linen focus:outline-none"
                  role="menuitem"
                  type="button"
                  onClick={() => selectAccountMenuSection("subscription")}
                >
                  <CreditCard className="h-4 w-4" />
                  Abonnement
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-ink/75 transition hover:bg-linen focus:bg-linen focus:outline-none"
                  role="menuitem"
                  type="button"
                  onClick={() => selectAccountMenuSection("guide")}
                >
                  <LifeBuoy className="h-4 w-4" />
                  Aide
                </button>
                <div className="my-2 border-t border-ink/10" />
                <button
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-black text-red-700/85 transition hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                  role="menuitem"
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <aside
        className={clsx(
          "fixed bottom-0 left-0 top-16 z-30 overflow-hidden border-r border-ink/10 bg-white transition-all",
          sidebarCollapsed ? "w-16" : "w-72 shadow-soft"
        )}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => {
          setSidebarCollapsed(true);
          setHoveredMenuItem(null);
        }}
      >
        <button
          className="flex h-12 w-full items-center justify-center border-b border-ink/10 text-ink/70 hover:bg-sage/50"
          type="button"
          onClick={() => setSidebarCollapsed((current) => !current)}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          <span className="sr-only">Rétracter le menu</span>
        </button>
        <nav className="max-h-[calc(100vh-7rem)] space-y-1 overflow-y-auto overscroll-contain p-2 pr-1">
          {menuItems.map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredMenuItem(item.id)}
              onMouseLeave={() => setHoveredMenuItem(null)}
            >
              <button
                className={clsx(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition hover:bg-sage/60",
                  section === item.id ? "bg-moss text-white hover:bg-moss" : "text-ink/70"
                )}
                type="button"
                onClick={() => {
                  setSection(item.id);

                  if (item.id === "dashboard") {
                    setSidebarCollapsed(true);
                  }
                }}
              >
                {item.icon}
                {sidebarCollapsed ? null : <span>{item.label}</span>}
              </button>
              {item.id === "general" && !sidebarCollapsed && (section === "general" || hoveredMenuItem === "general") ? (
                <div className="mt-1 space-y-1 pl-7">
                  {generalSubMenu.map((subItem) => (
                    <button
                      key={subItem}
                      className={clsx(
                        "flex w-full items-center rounded-md px-3 py-1.5 text-left text-xs font-black transition hover:bg-sage/60",
                        section === "general" && generalPage === subItem ? "bg-sage text-moss" : "text-ink/55"
                      )}
                      type="button"
                      onClick={() => {
                        setSection("general");
                        setGeneralPage(subItem);
                      }}
                    >
                      {subItem}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>

      <main className="pl-16 pt-16">
        <div
          className={clsx(
            "p-4 transition-[padding]",
            section === "dashboard" ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]" : "flex justify-center"
          )}
        >
          <section className={clsx("space-y-4", section !== "dashboard" ? "w-full max-w-5xl" : "")}>
            {dashboardSubscriptionState.trialExpired ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">Votre période d’essai est terminée.</p>
                    <p className="mt-1 text-sm font-semibold leading-6">
                      Pour continuer à bénéficier des services ToqueTop, choisissez un abonnement adapté à votre restaurant.
                    </p>
                  </div>
                  <button className="primary-button h-10 px-4 text-sm" type="button" onClick={() => setSection("subscription")}>
                    Voir les abonnements
                  </button>
                </div>
              </div>
            ) : null}
            {dashboardSubscriptionState.pastDue ? (
              <div className={clsx(
                "rounded-lg border p-4 shadow-soft",
                dashboardSubscriptionState.serviceSuspended ? "border-red-300 bg-red-100 text-red-950" : "border-red-200 bg-red-50 text-red-900"
              )}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">
                      {dashboardSubscriptionState.serviceSuspended ? "Services suspendus pour facture impayée." : "Facture impayée détectée."}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6">
                      {dashboardSubscriptionState.serviceSuspended
                        ? "Le délai de 15 jours est dépassé. Régularisez votre paiement depuis Abonnement pour réactiver le service."
                        : `Régularisez votre facture pour éviter la suspension du service${dashboardSubscriptionState.overdueDays ? ` dans ${Math.max(0, 15 - dashboardSubscriptionState.overdueDays)} jour(s)` : ""}.`}
                    </p>
                  </div>
                  <button className="primary-button h-10 px-4 text-sm" type="button" onClick={() => setSection("subscription")}>
                    Régler maintenant
                  </button>
                </div>
              </div>
            ) : null}
            {section === "dashboard" ? (
              <>
                <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl font-black text-ink">Tableau de bord</h1>
                      <p className="text-sm font-semibold capitalize text-ink/55">{formatLongDate(selectedDate)}</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="grid justify-items-center gap-1">
                        <span className="text-center text-xs font-black uppercase tracking-[0.12em] text-ink/45">Date</span>
                        <div className="flex items-center gap-2">
                          <button
                            className="grid h-10 w-10 place-items-center rounded-md border border-ink/10 bg-linen text-ink/70 transition hover:bg-sage disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-linen"
                            disabled={!canGoToPreviousDay}
                            type="button"
                            onClick={() => {
                              const previousDate = addDaysToDateString(selectedDate, -1);
                              setSelectedDate(previousDate < minDashboardDate ? minDashboardDate : previousDate);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Jour précédent</span>
                          </button>
                          <input
                            className="control h-10 w-40"
                            min={minDashboardDate}
                            type="date"
                            value={selectedDate}
                            onChange={(event) => {
                              const nextDate = event.target.value;
                              setSelectedDate(nextDate < minDashboardDate ? minDashboardDate : nextDate);
                            }}
                          />
                          <button
                            className="grid h-10 w-10 place-items-center rounded-md border border-ink/10 bg-linen text-ink/70 transition hover:bg-sage"
                            type="button"
                            onClick={() => setSelectedDate(addDaysToDateString(selectedDate, 1))}
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Jour suivant</span>
                          </button>
                        </div>
                      </div>
                      <div className="grid justify-items-center gap-1">
                        <span className="text-center text-xs font-black uppercase tracking-[0.12em] text-ink/45">Service</span>
	                        <Segmented
	                          options={serviceSegmentOptions}
	                          value={selectedService}
	                          onChange={(value) => setSelectedService(value as ServiceFilter)}
	                        />
                      </div>
                      <div className="grid justify-items-center gap-1">
                        <span className="text-center text-xs font-black uppercase tracking-[0.12em] text-ink/45">Statut</span>
                        <span className={clsx("inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-black", openingStatusClass(openingStatus.tone))}>
                          <span className="h-2.5 w-2.5 rounded-full bg-current" />
                          {openingStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
	                  <Metric label="Réservations" value={activeReservations.length.toString()} detail={dashboardSummaryDetail} />
	                  <Metric label="Remplissage" value={`${occupancyRate}%`} detail={dashboardSummaryDetail} />
	                  <Metric
	                    label="Tables libres"
	                    value={`${availableTableIds.length}/${activeTableCount}`}
	                    detail={
	                      <>
	                        <span>Tables de 2 : {availableCounts.two}</span>
	                        <span>Tables de 4 : {availableCounts.four}</span>
	                        <span>Tables 6+ : {availableCounts.sixPlus}</span>
	                        <span className="mt-1 border-t border-ink/10 pt-1">Couverts attendus : {dashboardSummary.guests}</span>
	                        <span>VIP : {dashboardSummary.vip}</span>
	                        <span>Réservations risquées : {dashboardSummary.risky}</span>
	                      </>
	                    }
	                  />
                  <Metric
                    label="Liste d’attente"
                    value={visibleWaitlist.length.toString()}
                    alert={unseenWaitlist.length > 0}
                    detail={
                      unseenWaitlist.length > 0
                        ? <span>{unseenWaitlist.length} nouvelle(s) demande(s) en attente.</span>
                        : <span>Aucune nouvelle demande sur ce service.</span>
                    }
                    onClick={openWaitlistAlert}
                  />
                  <Metric
                    label="Rush estimé"
                    value={rush.peak?.time ?? "—"}
                    detail={
                      rush.timeline.length > 0 ? (
                        <>
	                          {rush.timeline.map((item) => (
	                            <span key={item.time}>{item.time} : {item.guests} couvert(s)</span>
	                          ))}
	                          <span className="mt-1 border-t border-ink/10 pt-1">Nouveaux clients : {dashboardSummary.newClients}</span>
	                          <span>Clients fidèles : {dashboardSummary.loyal}</span>
	                          <span>VIP : {dashboardSummary.vip}</span>
	                          <span>Réservations risquées : {dashboardSummary.risky}</span>
	                        </>
	                      ) : (
	                        <>
	                          <span>Aucun rush détecté pour le moment.</span>
	                          {dashboardSummaryDetail}
	                        </>
	                      )
	                    }
	                  />
                </div>

                <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
	                      <h2 className="text-xl font-black text-ink">Votre salle en direct</h2>
                      <p className="text-sm font-semibold text-ink/55">
                        Service du <span className="font-black text-moss">{serviceLabel(selectedService)}</span> · {formatDate(selectedDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Segmented
                        options={[
                          { value: "2d", label: "2D" },
                          { value: "3d", label: "3D" }
                        ]}
                        value={floorViewMode}
                        onChange={(value) => setFloorViewMode(value as "2d" | "3d")}
                      />
                      {dashboardRooms.length > 1 ? (
                        <label className="flex items-center gap-2 text-xs font-bold text-ink/60">
                          <Layers className="h-4 w-4 text-moss" />
                          <select
                            className="control h-9 min-w-36"
                            value={dashboardRoom.id}
                            onChange={(event) => setDashboardRoomId(event.target.value)}
                          >
                            {dashboardRooms.map((room) => (
                              <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <label className="flex items-center gap-2 text-xs font-bold text-ink/60">
                        Zoom
                        <input
                          className="w-28 accent-moss"
                          max="1.8"
                          min="0.7"
                          step="0.05"
                          type="range"
                          value={floorZoom}
                          onChange={(event) => setFloorZoom(Number(event.target.value))}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="h-[520px] overflow-hidden rounded-lg border border-ink/10 bg-linen">
                    <FloorPlan
                      allowUnavailableSelect
                      availableTableIds={availableTableIds}
                      backgroundImageUrl={floorPlan2dImageUrl}
                      layoutLocked
                      mode="booking"
                      modelUrl={floorPlanModelUrl}
                      selectedTableId={selectedTableId}
                      selectedTableIds={liveSelectedTableIds}
                      showCenterControl
                      showLockIndicator={false}
                      showTableViewButtons={false}
                      tableBadges={dashboardTableBadges}
                      tableTones={dashboardTableTones}
                      tables={dashboardTablesForDisplay}
                      viewMode={floorViewMode}
                      zoom={floorZoom}
                      onDeselect={deselectLiveTable}
                      onBadgeSelect={setSelectedReservationId}
                      onSelect={selectLiveTable}
                      onZoomChange={setFloorZoom}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink/60">
                    <span className="rounded-full bg-moss/10 px-3 py-1 text-moss">Disponible</span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Occupée</span>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">Bloquée / indisponible</span>
                    {selectedTable ? <span>Table sélectionnée : {selectedTable.label} · {selectedTable.capacity} couverts</span> : null}
                  </div>
                </div>

                <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black">Réservations</h2>
                      <p className="text-xs font-semibold text-ink/55">
                        {selectedService === "lunch" ? "Midi" : "Soir"} · {formatDate(selectedDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-sage px-3 py-1 text-xs font-black text-moss">
                        Service du {serviceLabel(selectedService)} · {formatDate(selectedDate)}
                      </span>
                      <Segmented
                        options={[
                          { value: "list", label: "Liste" },
                          { value: "timeline", label: "Timeline" }
                        ]}
                        value={reservationView}
                        onChange={(value) => setReservationView(value as ReservationView)}
                      />
                    </div>
                  </div>
                  <ReservationsPanel
                    paidReservationIds={paidReservationIds}
                    departedReservationIds={departedReservationIds}
                    reservations={visibleFilteredReservations}
                    selectedReservationId={selectedReservationId}
                    selectedDate={selectedDate}
                    getReservationTableLabel={reservationTableLabels}
                    timeZone={restaurant.timezone}
                    showDepartedReservations={showDepartedReservations}
                    view={reservationView}
                    lateArrivalGraceMinutes={settingNumber(settings, ["lateArrivalGraceMinutes"], 15)}
                    onArrive={(reservationId) =>
                      updateReservationMutation.mutate({
                        reservationId,
                        data: { arrivedAt: "now", suppressNotifications: true }
                      })
                    }
                    onAcknowledgeCancellation={(reservationId) =>
                      setAcknowledgedCancellationIds((current) => [...new Set([...current, reservationId])])
                    }
                    onCancel={confirmCancelReservation}
                    onDepart={(reservationId) => setDepartedReservationIds((current) => [...new Set([...current, reservationId])])}
                    onEdit={(reservationId) => {
                      setSelectedReservationId(reservationId);
                      setModal("editReservation");
                    }}
                    onPaid={(reservationId) => setPaidReservationIds((current) => [...new Set([...current, reservationId])])}
                    onSelect={setSelectedReservationId}
                    onToggleDeparted={setShowDepartedReservations}
                  />
                </div>
              </>
            ) : null}

            {section === "guide" ? <GuidePanel /> : null}
            {section === "general" ? (
              <GeneralPanel
                activePage={generalPage}
                restaurant={restaurant}
                tableCount={tables.length}
              />
            ) : null}
            {section === "reservations" ? (
              <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Réservations</h2>
                    <p className="text-sm font-semibold text-ink/55">{formatDate(selectedDate)}</p>
                  </div>
                  <input
                    className="control h-10 w-36"
                    min={minDashboardDate}
                    type="date"
                    value={selectedDate}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      setSelectedDate(nextDate < minDashboardDate ? minDashboardDate : nextDate);
                    }}
                  />
                </div>
                <Segmented
                  options={[
                    { value: "list", label: "Liste" },
                    { value: "timeline", label: "Timeline" }
                  ]}
                  value={reservationView}
                  onChange={(value) => setReservationView(value as ReservationView)}
                />
                <ReservationsPanel
                  paidReservationIds={paidReservationIds}
                  departedReservationIds={departedReservationIds}
                  reservations={reservations}
                  selectedReservationId={selectedReservationId}
                  selectedDate={selectedDate}
                  getReservationTableLabel={reservationTableLabels}
                  timeZone={restaurant.timezone}
                  showDepartedReservations={showDepartedReservations}
                  view={reservationView}
                  lateArrivalGraceMinutes={settingNumber(settings, ["lateArrivalGraceMinutes"], 15)}
                  onArrive={(reservationId) =>
                    updateReservationMutation.mutate({
                      reservationId,
                      data: { arrivedAt: "now", suppressNotifications: true }
                    })
                  }
                  onAcknowledgeCancellation={(reservationId) =>
                    setAcknowledgedCancellationIds((current) => [...new Set([...current, reservationId])])
                  }
                  onCancel={confirmCancelReservation}
                  onDepart={(reservationId) => setDepartedReservationIds((current) => [...new Set([...current, reservationId])])}
                  onEdit={(reservationId) => {
                    setSelectedReservationId(reservationId);
                    setModal("editReservation");
                  }}
                  onPaid={(reservationId) => setPaidReservationIds((current) => [...new Set([...current, reservationId])])}
                  onSelect={setSelectedReservationId}
                  onToggleDeparted={setShowDepartedReservations}
                />
              </div>
            ) : null}
            {section === "crm" ? (
              <CrmPanel
                clients={clients}
                clientSearch={clientSearch}
                restaurantId={restaurant.id}
                setClientSearch={setClientSearch}
                onCreate={() => setModal("client")}
              />
            ) : null}
            {section === "menus" ? <MenusPanel /> : null}
            {section === "gallery" ? <GalleryPanel /> : null}
            {section === "giftCards" ? <GiftCardsPanel clients={clients} /> : null}
            {section === "stats" ? (
              <StatsPanel
                clients={clients}
                restaurant={restaurant}
                reservations={reservations}
                tables={tables}
                waitlist={waitlist}
              />
            ) : null}
            {section === "subscription" ? <SubscriptionPanel restaurant={restaurant} /> : null}
            {section === "notifications" ? <TemplatesPanel restaurant={restaurant} /> : null}
            {!["dashboard", "guide", "general", "reservations", "crm", "menus", "gallery", "giftCards", "stats", "subscription", "notifications"].includes(section) ? (
              <PlaceholderPanel section={menuItems.find((item) => item.id === section)?.label ?? "Section"} />
            ) : null}
          </section>

          {section === "dashboard" ? (
          <aside className="flex flex-col gap-4">
            <div className="order-2 rounded-lg border border-ink/10 bg-white p-4 shadow-soft" data-dashboard-actions>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-black">Actions rapides</h2>
                <Sparkles className="h-4 w-4 text-moss" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <QuickAction icon={<Plus className="h-4 w-4" />} label="Ajouter réservation" onClick={() => setModal("createReservation")} />
                <QuickAction
                  disabled={!selectedTable || deleteBlockMutation.isPending}
                  icon={selectedTableBlock ? <Unlock className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  label={selectedTableBlock ? "Débloquer table" : "Bloquer table"}
                  onClick={() =>
                    selectedTableBlock
                      ? deleteBlockMutation.mutate(selectedTableBlock.id)
                      : setModal("blockTable")
                  }
                />
                <QuickAction
                  disabled={!selectedReservation}
                  icon={<Phone className="h-4 w-4" />}
                  label="Contacter client"
                  onClick={() => setModal("contactClient")}
                />
                <QuickAction icon={<Users className="h-4 w-4" />} label="Ajouter waitlist" onClick={() => setModal("waitlist")} />
              </div>
            </div>

            <WaitlistPanel
              clients={clients}
              entries={visibleWaitlist}
              expandedEntryId={expandedWaitlistId}
              notifiedEntryIds={notifiedWaitlistIds}
              panelRef={waitlistPanelRef}
              onNotify={notifyWaitlistEntry}
              onRemove={(entryId) => cancelWaitlistMutation.mutate(entryId)}
              onToggleEntry={(entryId) => setExpandedWaitlistId((current) => current === entryId ? null : entryId)}
            />

	            <div className="order-1 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
	              <div className="mb-3 flex items-center gap-2">
	                <Bot className="h-5 w-5 text-moss" />
	                <h2 className="text-base font-black">ToqueChef</h2>
              </div>
              <div className="space-y-2">
                {visibleInsights.length === 0 ? (
                  <p className="rounded-md bg-linen p-3 text-sm font-semibold text-ink/60">Aucune alerte pour le moment.</p>
                ) : (
                  visibleInsights.map((insight) => (
                    <article
                      key={insight.id}
                      className={clsx(
                        "relative rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft after:absolute after:-bottom-1 after:left-6 after:h-3 after:w-3 after:rotate-45 after:border-b after:border-r after:bg-inherit",
                        insightClass(insight.level)
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black">{insight.title}</h3>
                          <p className="mt-1 text-xs font-semibold leading-5">{insight.message}</p>
                        </div>
                        <button
                          aria-label="Masquer cette notification ToqueChef"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/70 transition hover:bg-white"
                          type="button"
                          onClick={() => hideChefInsight(insight.id)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
	              <form className="mt-3 border-t border-ink/10 pt-3" onSubmit={handleChefSubmit}>
	                <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/45" htmlFor="chef-toque-prompt">
	                  Demander à ToqueChef
	                </label>
	                <textarea
	                  className="control mt-2 min-h-12 w-full resize-none text-sm"
	                  id="chef-toque-prompt"
	                  placeholder="Ex : Quelle table proposer à un client VIP de 4 personnes ce soir ?"
	                  rows={2}
	                  value={chefPrompt}
	                  onKeyDown={handleChefPromptKeyDown}
	                  onChange={(event) => setChefPrompt(event.target.value)}
	                />
	                <button className="primary-button mt-2 w-full" type="submit">
                  <Bot className="h-4 w-4" />
	                  Demander
	                </button>
	              </form>
	              <div className="mt-3 flex items-center justify-between gap-2">
	                <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Réponses</p>
	                <div className="flex gap-1">
	                  <button
	                    className="icon-button h-7 w-7"
	                    type="button"
	                    onClick={() => setChefPanelHeight((height) => Math.max(180, height - 80))}
	                  >
	                    <Minimize2 className="h-3.5 w-3.5" />
	                    <span className="sr-only">Réduire ToqueChef</span>
	                  </button>
	                  <button
	                    className="icon-button h-7 w-7"
	                    type="button"
	                    onClick={() => setChefPanelHeight((height) => Math.min(520, height + 120))}
	                  >
	                    <Maximize2 className="h-3.5 w-3.5" />
	                    <span className="sr-only">Agrandir ToqueChef</span>
	                  </button>
	                </div>
	              </div>
	              <div
	                className="mt-2 min-h-44 max-h-[520px] resize-y space-y-2 overflow-auto rounded-md border border-ink/10 bg-white p-2 pr-1"
	                style={{ height: chefPanelHeight }}
	              >
	                {chefMessages.map((message, index) => (
	                  <div
	                    key={`${message.role}-${index}`}
                    className={clsx(
                      "rounded-md p-3 text-xs font-semibold leading-5",
                      message.role === "user" ? "bg-moss text-white" : "bg-linen text-ink/70"
                    )}
                  >
                    <p className="mb-1 font-black">{message.role === "user" ? "Vous" : "ToqueChef"}</p>
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>
                ))}
              </div>
            </div>

          </aside>
          ) : null}
        </div>
      </main>

      {foregroundError ? (
        <div className="fixed inset-x-4 top-6 z-[120] mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-4 text-sm font-bold text-red-700 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
            <p className="min-w-0 flex-1">
              {dashboardErrorMessage(foregroundError)}
            </p>
            <button
              aria-label="Fermer le message"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-red-700 transition hover:bg-red-50"
              type="button"
              onClick={() => {
                createReservationMutation.reset();
                createWaitlistMutation.reset();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {modal === "createReservation" ? (
        <DashboardModal title="Ajouter une réservation" onClose={() => setModal(null)}>
          <ReservationForm
            clients={clients}
            defaultDate={selectedDate}
            defaultTableId={selectedTableId}
            openingHours={restaurant.openingHours}
            reservations={reservations}
            settings={settings}
            tableBlocks={tableBlocks}
            tables={tables}
            onClientSearchChange={setClientSearch}
            onSubmit={submitForm(createReservationMutation)}
          />
        </DashboardModal>
      ) : null}

      {modal === "editReservation" && selectedReservation ? (
        <DashboardModal title="Modifier la réservation" onClose={() => setModal(null)}>
          <EditReservationForm
            openingHours={restaurant.openingHours}
            reservation={selectedReservation}
            reservations={reservations}
            selectedService={selectedService}
            settings={settings}
            tableBlocks={tableBlocks}
            tables={tables}
            onSubmit={(formData) => {
              const startTime = String(formData.get("startTime"));

              updateReservationMutation.mutate({
                reservationId: selectedReservation.id,
                data: {
                  status: String(formData.get("status")),
                  tableId: String(formData.get("tableId")),
                  startTime,
                  endTime: String(formData.get("endTime")),
                  numberOfGuests: Number(formData.get("numberOfGuests")),
                  notes: String(formData.get("notes") || "")
                }
              });
            }}
          />
          {updateReservationMutation.error ? (
            <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
              Impossible de modifier la réservation : {dashboardErrorMessage(updateReservationMutation.error)}
            </p>
          ) : null}
        </DashboardModal>
      ) : null}

      {modal === "blockTable" ? (
        <DashboardModal title="Bloquer une table" onClose={() => setModal(null)}>
          <form className="grid gap-3" onSubmit={submitForm(createBlockMutation)}>
            <p className="rounded-md bg-linen p-3 text-sm font-bold">Table : {selectedTable?.label ?? "Aucune table sélectionnée"}</p>
            <InputField defaultValue={selectedDate} label="Date" name="date" type="date" />
            <SelectField defaultValue={dashboardServiceWindow.startTime} label="Début" name="startTime" options={timeOptions} />
            <SelectField defaultValue={dashboardServiceWindow.endTime} label="Fin" name="endTime" options={timeOptions} />
            <SelectField defaultValue="ADMIN" label="Raison" name="reason" options={["ADMIN", "MAINTENANCE"]} />
            <label className="text-sm font-bold">
              Note
              <textarea className="control mt-1 min-h-20 w-full" name="notes" />
            </label>
            <button className="primary-button w-full" disabled={!selectedTableId} type="submit">Bloquer la table</button>
          </form>
        </DashboardModal>
      ) : null}

      {modal === "waitlist" ? (
        <DashboardModal title="Ajouter à la liste d’attente" onClose={() => setModal(null)}>
          <WaitlistForm
            clients={clients}
            defaultDate={selectedDate}
            defaultService={selectedService}
            openingHours={restaurant.openingHours}
            onClientSearchChange={setClientSearch}
            onSubmit={submitForm(createWaitlistMutation)}
          />
        </DashboardModal>
      ) : null}

      {modal === "client" ? (
        <DashboardModal title="Créer une fiche client" onClose={() => setModal(null)}>
          <ClientForm onSubmit={submitForm(createClientMutation)} />
        </DashboardModal>
      ) : null}

      {modal === "contactClient" && selectedReservation ? (
        <DashboardModal title="Contacter le client" onClose={() => setModal(null)}>
          <div className="grid gap-4">
            <div className="rounded-md bg-linen p-4">
              <p className="text-lg font-black">{reservationGuestName(selectedReservation)}</p>
              <p className="mt-1 text-sm font-semibold text-ink/60">
                Réf. {selectedReservation.referenceCode ?? "—"} · {reservationTableLabels(selectedReservation)} · {selectedReservation.startTime}
              </p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-ink/75">
                <span>Téléphone : {selectedReservation.guestPhone ?? "Non renseigné"}</span>
                <span>Email : {selectedReservation.guestEmail ?? "Non renseigné"}</span>
                <span>Demandes : {reservationRequestSummary(selectedReservation)}</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="secondary-button justify-center"
                disabled={!selectedReservation.guestPhone}
                type="button"
                onClick={() => {
                  if (selectedReservation.guestPhone) {
                    window.location.href = `tel:${selectedReservation.guestPhone}`;
                  }
                }}
              >
                <Phone className="h-4 w-4" />
                Appeler
              </button>
              <button
                className="secondary-button justify-center"
                disabled={!selectedReservation.guestEmail}
                type="button"
                onClick={() => {
                  if (selectedReservation.guestEmail) {
                    window.location.href = `mailto:${selectedReservation.guestEmail}`;
                  }
                }}
              >
                <Mail className="h-4 w-4" />
                Envoyer un email
              </button>
              <button
                className="primary-button justify-center sm:col-span-2"
                disabled={sendReminderMutation.isPending}
                type="button"
                onClick={() => sendReminderMutation.mutate(selectedReservation.id)}
              >
                <MessageSquare className="h-4 w-4" />
                {sendReminderMutation.isPending ? "Envoi du rappel..." : "Envoyer un rappel email/SMS"}
              </button>
            </div>
          </div>
        </DashboardModal>
      ) : null}
    </div>
  );
}

function Metric({
  alert,
  detail,
  label,
  value,
  onClick
}: {
  alert?: boolean;
  detail?: ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className={clsx("text-3xl font-black transition", alert ? "animate-pulse text-moss" : "text-ink")}>{value}</p>
        {detail ? (
          <div className="group relative inline-flex">
            <button
              aria-label={`Détail ${label}`}
              className="grid h-7 w-7 place-items-center rounded-full text-moss transition hover:bg-sage focus:outline-none focus:ring-2 focus:ring-moss/30"
              type="button"
            >
              <Info className="h-4 w-4" />
            </button>
	            <div
	              className="pointer-events-none absolute left-1/2 top-9 z-30 grid w-56 -translate-x-1/2 gap-1 rounded-md border border-ink/10 bg-white p-3 text-xs font-black leading-5 text-ink/65 opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-within:opacity-100"
              role="tooltip"
            >
              {detail}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <div
        className={clsx(
	          "cursor-pointer rounded-lg border border-ink/10 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-moss/30",
          alert && "ring-2 ring-red-100"
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
	    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-lg">
      {content}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange
}: {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-grid grid-flow-col rounded-md border border-ink/10 bg-linen p-1">
      {options.map((option) => (
        <button
          key={option.value}
          className={clsx(
            "rounded px-3 py-1.5 text-xs font-black transition",
            value === option.value ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink",
            option.disabled && "cursor-not-allowed opacity-40 hover:text-ink/55"
          )}
          disabled={option.disabled}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function QuickAction({ disabled, icon, label, onClick }: { disabled?: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="secondary-button justify-start disabled:opacity-40"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function WaitlistPanel({
  clients,
  entries,
  expandedEntryId,
  notifiedEntryIds,
  panelRef,
  onNotify,
  onRemove,
  onToggleEntry
}: {
  clients: Client[];
  entries: WaitlistEntry[];
  expandedEntryId: string | null;
  notifiedEntryIds: string[];
  panelRef?: RefObject<HTMLElement | null>;
  onNotify: (entry: WaitlistEntry) => void;
  onRemove: (entryId: string) => void;
  onToggleEntry: (entryId: string) => void;
}) {
  return (
    <section ref={panelRef} className="order-3 scroll-mt-24 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black">Waitlist</h2>
          <p className="text-xs font-semibold text-ink/55">{entries.length} client(s) en attente sur ce service</p>
        </div>
        <Users className="h-4 w-4 text-moss" />
      </div>

      {entries.length === 0 ? (
        <p className="rounded-md bg-linen p-3 text-sm font-semibold text-ink/60">Aucun client en attente pour ce service.</p>
      ) : (
        <div className="grid gap-2">
          {entries.map((entry) => {
            const client = waitlistClientProfile(entry, clients);
            const crmClient = clients.find((item) => item.id === client?.id) ?? null;
            const alreadyNotified = notifiedEntryIds.includes(entry.id) || isWaitlistEntryNotified(entry);
            const canNotify = Boolean(entry.phone || entry.email);
            const expanded = expandedEntryId === entry.id;
            const crmReservations = Array.isArray(crmClient?.reservations) ? crmClient.reservations : [];
            const lastVisit = crmReservations
              .filter((reservation) => reservation.status !== "CANCELLED")
              .sort((first, second) => String(second.date).localeCompare(String(first.date)))[0];
            const lastVisitLabel = lastVisit?.date ? formatDate(String(lastVisit.date).slice(0, 10)) : "Aucune";

            return (
              <article key={entry.id} className="rounded-lg border border-ink/10 bg-linen/70 p-2.5">
                <div className="flex items-center gap-2">
                  <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onToggleEntry(entry.id)}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-black">{entry.firstName} {entry.lastName}</p>
                      <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-black text-white">{entry.numberOfGuests} couverts</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-ink/60">{entry.requestedTime || "Flexible"}</span>
                      <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-black text-moss">{waitlistClientFrequencyLabel(entry, clients)}</span>
                      {client?.vip ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">VIP</span> : null}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      aria-label="Prévenir par SMS et email"
                      className="relative grid h-8 w-8 place-items-center rounded-md border border-ink/10 bg-white text-moss transition hover:border-moss disabled:cursor-not-allowed disabled:opacity-35"
                      disabled={alreadyNotified || !canNotify}
                      title={alreadyNotified ? "Client déjà prévenu" : "Prévenir par SMS et email"}
                      type="button"
                      onClick={() => onNotify(entry)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <Mail className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-white" />
                    </button>
                    <button
                      aria-label="Supprimer de la waitlist"
                      className="grid h-8 w-8 place-items-center rounded-md border border-red-100 bg-white text-red-700 transition hover:border-red-300"
                      title="Supprimer de la waitlist"
                      type="button"
                      onClick={() => onRemove(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-2 grid gap-2 border-t border-ink/10 pt-2 text-xs font-semibold text-ink/65">
                    <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-2">
                      <span className="rounded-md bg-white p-2 text-center">No-show : <b>{client?.noShowRisk ?? 0}%</b></span>
                      <span className="flex min-w-0 items-center justify-between gap-2 whitespace-nowrap rounded-md bg-white p-2" title={`Dernière visite : ${lastVisitLabel}`}>
                        <span className="shrink-0">Dernière visite :</span>
                        <b className="min-w-0 text-right">{lastVisitLabel}</b>
                      </span>
                    </div>
                    <p className="rounded-md bg-white p-2">Contact : {entry.phone || "Téléphone non renseigné"} · {entry.email || "Email non renseigné"}</p>
                    <p className="rounded-md bg-white p-2">Note : {waitlistDisplayNotes(entry)}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReservationsPanel({
  getReservationTableLabel,
  paidReservationIds,
  departedReservationIds,
  reservations,
  selectedReservationId,
  selectedDate,
  timeZone,
  showDepartedReservations,
  view,
  lateArrivalGraceMinutes,
  onArrive,
  onAcknowledgeCancellation,
  onCancel,
  onDepart,
  onEdit,
  onPaid,
  onSelect,
  onToggleDeparted
}: {
  getReservationTableLabel: (reservation: Reservation) => string;
  paidReservationIds: string[];
  departedReservationIds: string[];
  reservations: Reservation[];
  selectedReservationId: string | null;
  selectedDate: string;
  timeZone: string;
  showDepartedReservations: boolean;
  view: ReservationView;
  lateArrivalGraceMinutes: number;
  onArrive: (reservationId: string) => void;
  onAcknowledgeCancellation: (reservationId: string) => void;
  onCancel: (reservationId: string) => void;
  onDepart: (reservationId: string) => void;
  onEdit: (reservationId: string) => void;
  onPaid: (reservationId: string) => void;
  onSelect: (reservationId: string) => void;
  onToggleDeparted: (value: boolean) => void;
}) {
  const sortedReservations = [...reservations].sort((first, second) => first.startTime.localeCompare(second.startTime));
  const groupedTimelineReservations = sortedReservations.reduce<Array<{ hour: string; reservations: Reservation[] }>>(
    (groups, reservation) => {
      const hour = `${reservation.startTime.slice(0, 2)}:00`;
      const existingGroup = groups.find((group) => group.hour === hour);

      if (existingGroup) {
        existingGroup.reservations.push(reservation);
      } else {
        groups.push({ hour, reservations: [reservation] });
      }

      return groups;
    },
    []
  );

  if (sortedReservations.length === 0) {
    return (
      <div className="mt-3">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-black text-ink/55">
            <input checked={showDepartedReservations} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => onToggleDeparted(event.target.checked)} />
            Voir les clients partis
          </label>
        </div>
        <p className="rounded-md bg-linen p-3 text-sm font-semibold text-ink/60">Aucune réservation sur cette date.</p>
      </div>
    );
  }

  if (view === "timeline") {
    return (
      <div className="mt-3">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-black text-ink/55">
            <input checked={showDepartedReservations} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => onToggleDeparted(event.target.checked)} />
            Voir les clients partis
          </label>
        </div>

        <div className="relative ml-2 border-l-2 border-moss/20 pl-5">
          {groupedTimelineReservations.map((group) => (
            <section key={group.hour} className="relative pb-5">
              <div className="absolute -left-[34px] top-0 grid h-7 w-14 place-items-center rounded-full border border-moss/20 bg-white text-[11px] font-black text-moss shadow-sm">
                {group.hour}
              </div>
              <div className="grid gap-2 pt-9">
                {group.reservations.map((reservation) => {
                  const paid = paidReservationIds.includes(reservation.id);
                  const departed = departedReservationIds.includes(reservation.id);
                  const customerCancelled = isCustomerCancelledReservation(reservation);
                  const closeCancellation = isCustomerCancellationCloseToService(reservation);
                  const lateCountdown = reservationLateCountdown(reservation, selectedDate, lateArrivalGraceMinutes, timeZone);
                  const delayLabel = reservationDelayLabel(reservation, selectedDate, timeZone);
                  const arrivalCountdown = reservationArrivalCountdown(reservation, selectedDate, timeZone);
                  const selected = selectedReservationId === reservation.id;

                  return (
                    <article
                      key={reservation.id}
                      data-dashboard-reservation
                      className={clsx(
                        "rounded-lg border bg-white p-3 shadow-sm transition",
                        reservationCardStateClass({
                          customerCancelled,
                          departed,
                          paid,
                          arrived: Boolean(reservation.arrivedAt),
                          selected
                        })
                      )}
                    >
                      <button className="w-full text-left" type="button" onClick={() => onSelect(reservation.id)}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-ink px-2 py-1 text-xs font-black text-white">{reservation.startTime}</span>
                              <p className="text-sm font-black text-ink">{reservationGuestName(reservation)}</p>
                              <span className="rounded-full bg-sage px-2 py-0.5 text-[11px] font-black text-moss">{reservationClientFrequencyLabel(reservation)}</span>
                              {reservation.client?.vip ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">VIP</span> : null}
                            </div>
                            <p className="mt-1 text-xs font-semibold text-ink/60">
                              {reservation.numberOfGuests} couverts · {getReservationTableLabel(reservation)} · Réf. {reservation.referenceCode ?? "—"}
                            </p>
                          </div>
                          <div className="grid justify-items-end gap-1">
                            <span className={clsx("rounded-full border px-2 py-0.5 text-[11px] font-black", statusClass(reservation.status))}>
                              {statusLabel(reservation.status)}
                            </span>
                            <span className="rounded-full bg-linen px-2 py-0.5 text-[11px] font-black text-ink/65">
                              {arrivalCountdown}
                            </span>
                            {delayLabel ? (
                              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">{delayLabel}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {customerCancelled ? <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">Annulation client</span> : null}
                          {closeCancellation ? <span className="rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] font-black text-red-700">Annulée moins de 2h avant</span> : null}
                          {reservation.highChair ? <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-black text-moss">Bébé</span> : null}
                          {reservation.birthday ? <span className="rounded-md bg-linen px-2 py-0.5 text-[11px] font-black text-ink/70">Anniversaire</span> : null}
                          {reservation.romanticDinner ? <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700">Romantique</span> : null}
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-ink/60">{reservationNoShowRiskLabel(reservation)}</span>
                          {reservation.arrivedAt ? <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[11px] font-black text-white">Arrivé</span> : null}
                          {paid ? <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-[11px] font-black text-white">Payée</span> : null}
                          {departed ? <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-black text-white">Parti</span> : null}
                        </div>
                        {lateCountdown ? <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">{lateCountdown}</p> : null}
                      </button>
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink/10 pt-2">
                        {customerCancelled ? (
                          <button className="secondary-button h-7 px-2 text-[11px] text-red-700" type="button" onClick={() => onAcknowledgeCancellation(reservation.id)}>Confirmer l’annulation</button>
                        ) : null}
                        {!reservation.arrivedAt && !departed && !customerCancelled ? (
                          <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onArrive(reservation.id)}>Client arrivé</button>
                        ) : null}
                        {reservation.arrivedAt && !paid && !departed && !customerCancelled ? (
                          <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onPaid(reservation.id)}>Payée</button>
                        ) : null}
                        {reservation.arrivedAt && !departed && !customerCancelled ? (
                          <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onDepart(reservation.id)}>Client parti</button>
                        ) : null}
                        {!departed && !customerCancelled ? (
                          <>
                            <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onEdit(reservation.id)}>Modifier</button>
                            <button className="secondary-button h-7 px-2 text-[11px] text-red-700" type="button" onClick={() => onCancel(reservation.id)}>Annuler</button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-black text-ink/55">
          <input checked={showDepartedReservations} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => onToggleDeparted(event.target.checked)} />
          Voir les clients partis
        </label>
      </div>
      <div className="space-y-2">
      {sortedReservations.map((reservation) => {
        const paid = paidReservationIds.includes(reservation.id);
        const departed = departedReservationIds.includes(reservation.id);
        const customerCancelled = isCustomerCancelledReservation(reservation);
        const closeCancellation = isCustomerCancellationCloseToService(reservation);
        const lateCountdown = reservationLateCountdown(reservation, selectedDate, lateArrivalGraceMinutes, timeZone);
        const delayLabel = reservationDelayLabel(reservation, selectedDate, timeZone);
        const selected = selectedReservationId === reservation.id;

        return (
        <article
          key={reservation.id}
          data-dashboard-reservation
          className={clsx(
            "relative grid gap-2 rounded-md border p-2.5 transition lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
            reservationCardStateClass({
              customerCancelled,
              departed,
              paid,
              arrived: Boolean(reservation.arrivedAt),
              selected
            })
          )}
        >
          <button className="w-full text-left" type="button" onClick={() => onSelect(reservation.id)}>
            <div className="flex items-center justify-between gap-3 lg:justify-start lg:gap-4">
              <p className="text-[13px] font-black leading-tight">{reservation.startTime} · {reservationGuestName(reservation)}</p>
              <span className={clsx("rounded-full border px-2 py-0.5 text-[11px] font-black", statusClass(reservation.status))}>
                {statusLabel(reservation.status)}
              </span>
              {delayLabel ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">{delayLabel}</span> : null}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-ink/60 lg:mt-0 lg:inline-block lg:pl-4">
              {reservation.numberOfGuests} couverts · Réf. {reservation.referenceCode ?? "—"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:mt-0 lg:inline-flex lg:pl-4">
              <span className="rounded-md border border-moss/15 bg-moss/10 px-2 py-0.5 text-[11px] font-black text-moss">
                {getReservationTableLabel(reservation)}
              </span>
              {customerCancelled ? <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">Annulation client</span> : null}
              {closeCancellation ? <span className="rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] font-black text-red-700">Annulée moins de 2h avant</span> : null}
              {reservation.client?.vip ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">VIP</span> : null}
              <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-black text-moss">{reservationClientFrequencyLabel(reservation)}</span>
              {reservation.highChair ? <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-black text-moss">Bébé</span> : null}
              {reservation.birthday ? <span className="rounded-md bg-linen px-2 py-0.5 text-[11px] font-black text-ink/70">Anniversaire</span> : null}
              {reservation.romanticDinner ? <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700">Romantique</span> : null}
              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-ink/60">{reservationNoShowRiskLabel(reservation)}</span>
              {reservation.arrivedAt ? <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[11px] font-black text-white">Arrivé</span> : null}
              {paid ? <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-[11px] font-black text-white">Payée</span> : null}
              {departed ? <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-black text-white">Parti</span> : null}
            </div>
            {lateCountdown ? <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[11px] font-black text-red-700">{lateCountdown}</p> : null}
          </button>
          <div className="mt-2 flex flex-wrap gap-1.5 lg:mt-0 lg:justify-end">
            {customerCancelled ? (
              <button className="secondary-button h-7 px-2 text-[11px] text-red-700" type="button" onClick={() => onAcknowledgeCancellation(reservation.id)}>Confirmer l’annulation</button>
            ) : null}
            {!reservation.arrivedAt && !departed && !customerCancelled ? (
              <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onArrive(reservation.id)}>Client arrivé</button>
            ) : null}
            {reservation.arrivedAt && !paid && !departed && !customerCancelled ? (
              <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onPaid(reservation.id)}>Payée</button>
            ) : null}
            {reservation.arrivedAt && !departed && !customerCancelled ? (
              <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onDepart(reservation.id)}>Client parti</button>
            ) : null}
            {!departed && !customerCancelled ? (
              <>
                <button className="secondary-button h-7 px-2 text-[11px]" type="button" onClick={() => onEdit(reservation.id)}>Modifier</button>
                <button className="secondary-button h-7 px-2 text-[11px] text-red-700" type="button" onClick={() => onCancel(reservation.id)}>Annuler</button>
              </>
            ) : null}
          </div>
        </article>
        );
      })}
      </div>
    </div>
  );
}

function GuidePanel() {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <h2 className="text-lg font-black">Guide de configuration</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {setupChecklist.map((item, index) => (
          <label key={item} className="flex items-center gap-3 rounded-md bg-linen p-3 text-sm font-bold">
            <input className="h-4 w-4 accent-moss" type="checkbox" defaultChecked={index < 3} />
            {item}
          </label>
        ))}
      </div>
    </section>
  );
}

function GeneralPanel({
  activePage,
  restaurant,
  tableCount
}: {
  activePage: GeneralPage;
  restaurant: Restaurant;
  tableCount: number;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <GeneralPageContent page={activePage} restaurant={restaurant} tableCount={tableCount} />
    </section>
  );
}

function settingString(settings: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = settings[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

function settingNumber(settings: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = settings[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return fallback;
}

function GeneralPageContent({ page, restaurant, tableCount }: { page: GeneralPage; restaurant: Restaurant; tableCount: number }) {
  const restaurantEmail = settingString(restaurant.settings, ["email", "mail", "contactEmail", "restaurantEmail"]);
  const postalCode = settingString(restaurant.settings, ["postalCode", "zipCode"]);
  const city = settingString(restaurant.settings, ["city"]);
  const country = settingString(restaurant.settings, ["country"]) || "France";
  const language = settingString(restaurant.settings, ["language", "locale"]) || "fr";
  const timeFormat = settingString(restaurant.settings, ["timeFormat"]) || "24h";

  if (page === "Restaurant") {
    return (
      <div className="space-y-6">
        <PanelHeader title="Configurations" description="Informations principales utilisées pour identifier le restaurant, afficher ses coordonnées et adapter les réglages régionaux." />

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-moss">Le lieu</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <InputField defaultValue={restaurant.name} label="Nom du restaurant" name="name" />
            <InputField defaultValue={restaurant.phone ?? ""} label="Téléphone" name="phone" />
            <InputField defaultValue={restaurantEmail} label="Mail" name="mail" type="email" />
            <InputField defaultValue={restaurant.address ?? ""} label="Adresse" name="address" />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField defaultValue={postalCode} label="Code postal" name="postalCode" />
              <InputField defaultValue={city} label="Ville" name="city" />
            </div>
            <InputField defaultValue={country} label="Pays" name="country" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-moss">Paramètres régionaux</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <SelectField
              defaultValue={language}
              label="Langue standard"
              name="language"
              options={["fr", "en"]}
              render={(value) => value === "fr" ? "Français" : "Anglais"}
            />
            <SelectField
              defaultValue={restaurant.timezone}
              label="Fuseau horaire"
              name="timezone"
              options={["Europe/Paris", "Europe/London", "Europe/Madrid", "Europe/Rome", "America/New_York", "America/Los_Angeles"]}
            />
            <SelectField
              defaultValue={timeFormat}
              label="Format d’heure"
              name="timeFormat"
              options={["24h", "12h"]}
              render={(value) => value === "24h" ? "24 heures" : "12 heures AM/PM"}
            />
          </div>
        </div>
      </div>
    );
  }

  if (page === "Heures d’ouverture") {
    return <OpeningHoursPanel restaurant={restaurant} />;
  }

  if (page === "Congés") {
    return <ClosuresPanel restaurant={restaurant} />;
  }

  if (page === "Tables et salles") {
    return <TablesRoomsStudio restaurant={restaurant} tableCount={tableCount} />;
  }

  if (page === "Paramètres de réservation") {
    return <ReservationSettingsPanel restaurant={restaurant} />;
  }

  if (page === "Connexions") {
    return <ConnectionsPanel restaurant={restaurant} />;
  }

  return null;
}

function ReservationSettingsPanel({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const releaseTableAfterDuration = typeof restaurant.settings.releaseTableAfterDuration === "boolean"
    ? restaurant.settings.releaseTableAfterDuration
    : restaurant.settings.oneReservationPerTablePerService === true
      ? false
      : true;
  const minimumLeadTimeEnabled = restaurant.settings.minimumLeadTimeEnabled !== false && restaurant.settings.minimumAdvanceBookingEnabled !== false;
  const minimumLeadTimeMinutes = minimumLeadTimeEnabled
    ? String(settingNumber(restaurant.settings, ["minimumLeadTimeMinutes"], 120))
    : "0";
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          settings
        })
      }),
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Impossible d’enregistrer les paramètres.");
      setMessage(null);
    },
    onSuccess: () => {
      setError(null);
      setMessage("Modification effectuée");
      void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const tableAvailabilityMode = String(formData.get("tableAvailabilityMode") || "duration");
    const leadTime = Number(formData.get("minimumLeadTimeMinutes") || 0);
    const autoCancelEnabled = formData.get("autoCancelLateReservationsEnabled") === "on";

    updateSettingsMutation.mutate({
      ...restaurant.settings,
      reservationDurationMinutes: Number(formData.get("reservationDurationMinutes") || 120),
      releaseTableAfterDuration: tableAvailabilityMode === "duration",
      oneReservationPerTablePerService: tableAvailabilityMode === "service",
      minimumLeadTimeEnabled: leadTime > 0,
      minimumAdvanceBookingEnabled: leadTime > 0,
      minimumLeadTimeMinutes: leadTime,
      lateArrivalGraceMinutes: Number(formData.get("lateArrivalGraceMinutes") || 15),
      lateCancellationHours: Number(formData.get("lateCancellationHours") || 3),
      strictCapacityMatching: formData.get("strictCapacityMatching") === "on",
      autoCancelLateReservationsEnabled: autoCancelEnabled,
      autoCancelLateMinutes: Number(formData.get("autoCancelLateMinutes") || 15)
    });
  }

  return (
    <div>
      <PanelHeader title="Paramètres de réservation" description="Organisez les règles de disponibilité, d’anticipation, de retard et d’attribution des tables." />
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <section className="rounded-lg border border-ink/10 bg-linen p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-moss">Créneaux et durée</h3>
          <p className="mt-1 text-sm font-semibold leading-5 text-ink/55">
            Ces réglages définissent combien de temps une table est bloquée et à partir de quand un client peut réserver.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold">
              Durée d’une réservation
              <select className="control mt-1 w-full" defaultValue={String(restaurant.settings.reservationDurationMinutes ?? 120)} name="reservationDurationMinutes">
                <option value="60">1 heure</option>
                <option value="90">1 heure 30</option>
                <option value="120">2 heures</option>
                <option value="150">2 heures 30</option>
                <option value="180">3 heures</option>
              </select>
              <span className="mt-1 block text-xs font-semibold text-ink/50">Une réservation à 20h avec une durée de 2h bloque la table jusqu’à 22h.</span>
            </label>
            <label className="text-sm font-bold">
              Délai minimum de réservation
              <select className="control mt-1 w-full" defaultValue={minimumLeadTimeMinutes} name="minimumLeadTimeMinutes">
                <option value="0">Aucune restriction</option>
                <option value="30">30 minutes avant</option>
                <option value="60">1 heure avant</option>
                <option value="90">1 heure 30 avant</option>
                <option value="120">2 heures avant</option>
                <option value="180">3 heures avant</option>
                <option value="240">4 heures avant</option>
              </select>
              <span className="mt-1 block text-xs font-semibold text-ink/50">Exemple : avec 2h de délai, à 18h le premier créneau du soir sera 20h.</span>
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-linen p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-moss">Disponibilité des tables</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="rounded-md border border-ink/10 bg-white p-3 text-sm font-bold">
              <input
                className="mr-2 h-4 w-4 accent-moss"
                defaultChecked={releaseTableAfterDuration}
                name="tableAvailabilityMode"
                type="radio"
                value="duration"
              />
              Libérer la table après la durée prévue
              <span className="mt-1 block pl-6 text-xs font-semibold leading-5 text-ink/55">
                Si une table est réservée à 20h pour 2h, elle pourra être proposée à nouveau à partir de 22h. Si le restaurateur la libère plus tôt, les prochains créneaux pourront être rouverts.
              </span>
            </label>
            <label className="rounded-md border border-ink/10 bg-white p-3 text-sm font-bold">
              <input
                className="mr-2 h-4 w-4 accent-moss"
                defaultChecked={!releaseTableAfterDuration}
                name="tableAvailabilityMode"
                type="radio"
                value="service"
              />
              Une seule réservation par table et par service
              <span className="mt-1 block pl-6 text-xs font-semibold leading-5 text-ink/55">
                Dès qu’une table est réservée sur le service, elle n’est plus proposée sur les autres créneaux du même service.
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-md border border-ink/10 bg-white p-3 text-sm font-bold md:col-span-2">
              <input className="h-4 w-4 accent-moss" defaultChecked={restaurant.settings.strictCapacityMatching !== false} name="strictCapacityMatching" type="checkbox" />
              Prioriser les tables adaptées au nombre de couverts
              <span className="text-xs font-semibold text-ink/50">Une table plus grande reste proposée uniquement si aucune table adaptée ou combinaison n’est disponible.</span>
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-linen p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-moss">Retards et annulations</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold">
              Délai de retard avant alerte
              <select className="control mt-1 w-full" defaultValue={String(restaurant.settings.lateArrivalGraceMinutes ?? 15)} name="lateArrivalGraceMinutes">
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
              <span className="mt-1 block text-xs font-semibold text-ink/50">Le compteur de retard passe en rouge dans le Dashboard Live après ce délai.</span>
            </label>
            <label className="text-sm font-bold">
              Annulation tardive si moins de
              <select className="control mt-1 w-full" defaultValue={String(restaurant.settings.lateCancellationHours ?? 3)} name="lateCancellationHours">
                <option value="1">1 heure avant le service</option>
                <option value="2">2 heures avant le service</option>
                <option value="3">3 heures avant le service</option>
                <option value="4">4 heures avant le service</option>
                <option value="6">6 heures avant le service</option>
              </select>
              <span className="mt-1 block text-xs font-semibold text-ink/50">Ces annulations alimentent le risque client dans le CRM.</span>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-ink/10 bg-white p-3 text-sm font-bold md:col-span-2">
              <input className="mt-1 h-4 w-4 accent-moss" defaultChecked={restaurant.settings.autoCancelLateReservationsEnabled === true} name="autoCancelLateReservationsEnabled" type="checkbox" />
              <span>
                Annuler automatiquement une réservation en retard
                <span className="mt-1 block text-xs font-semibold leading-5 text-ink/55">
                  Le Dashboard Live pourra retirer une réservation non arrivée après le délai choisi. Le client sera alors traité comme no-show.
                </span>
              </span>
            </label>
            <label className="text-sm font-bold">
              Délai avant annulation automatique
              <select className="control mt-1 w-full" defaultValue={String(restaurant.settings.autoCancelLateMinutes ?? 15)} name="autoCancelLateMinutes">
                <option value="10">10 minutes de retard</option>
                <option value="15">15 minutes de retard</option>
                <option value="20">20 minutes de retard</option>
                <option value="30">30 minutes de retard</option>
              </select>
            </label>
          </div>
        </section>

        {message ? <p className="rounded-md bg-moss/10 p-3 text-sm font-black text-moss">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-black text-red-700">{error}</p> : null}
        <button className="primary-button h-10 px-4 text-sm" disabled={updateSettingsMutation.isPending} type="submit">
          {updateSettingsMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}

function ConnectionsPanel({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const [credentialsMessage, setCredentialsMessage] = useState<string | null>(null);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const profileQuery = useQuery({
    queryKey: ["me-profile"],
    queryFn: () => apiFetch<{ profile: { email: string; contactEmail: string | null } }>("/api/me/profile")
  });
  const credentialsMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; email: string; newPassword: string }) =>
      apiFetch<{ profile: { email: string; contactEmail: string | null } }>("/api/me/credentials", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onError: (mutationError) => {
      setCredentialsError(mutationError instanceof Error ? mutationError.message : "Impossible de modifier les identifiants.");
      setCredentialsMessage(null);
    },
    onSuccess: () => {
      setCredentialsError(null);
      setCredentialsMessage("Modification effectuée");
      void queryClient.invalidateQueries({ queryKey: ["me-profile"] });
    }
  });
  const sessionMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ settings })
      }),
    onError: (mutationError) => {
      setSessionError(mutationError instanceof Error ? mutationError.message : "Impossible d’enregistrer la politique de connexion.");
      setSessionMessage(null);
    },
    onSuccess: () => {
      setSessionError(null);
      setSessionMessage("Modification effectuée");
      void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
    }
  });
  const loginEmail = profileQuery.data?.profile.email ?? String(restaurant.settings.ownerEmail ?? "");

  function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    credentialsMutation.mutate({
      currentPassword: String(formData.get("currentPassword") || ""),
      email: String(formData.get("email") || ""),
      newPassword: String(formData.get("newPassword") || "")
    });
  }

  function handleSessionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    sessionMutation.mutate({
      ...restaurant.settings,
      persistentAdminSession: formData.get("persistentAdminSession") === "on",
      requireAdminReauth: formData.get("persistentAdminSession") !== "on"
    });
  }

  return (
    <div>
      <PanelHeader title="Connexions" description="Gérez l’email, le mot de passe et la politique de reconnexion du Dashboard Live." />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <form className="rounded-lg border border-ink/10 bg-linen p-4" onSubmit={handleCredentialsSubmit}>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-moss">Identifiants de connexion</h3>
          <div className="mt-3 grid gap-3">
            <InputField defaultValue={loginEmail} label="Email de connexion" name="email" type="email" />
            <InputField label="Ancien mot de passe" name="currentPassword" type="password" />
            <InputField label="Nouveau mot de passe" name="newPassword" required={false} type="password" />
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-ink/55">
            L’ancien mot de passe est obligatoire pour modifier l’email ou définir un nouveau mot de passe.
          </p>
          {credentialsMessage ? <p className="mt-3 rounded-md bg-moss/10 p-3 text-sm font-black text-moss">{credentialsMessage}</p> : null}
          {credentialsError ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-black text-red-700">{credentialsError}</p> : null}
          <button className="primary-button mt-4 h-10 px-4 text-sm" disabled={credentialsMutation.isPending} type="submit">
            {credentialsMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer
          </button>
        </form>

        <form className="rounded-lg border border-ink/10 bg-linen p-4" onSubmit={handleSessionSubmit}>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-moss">Session administrateur</h3>
          <label className="mt-3 flex items-start gap-3 rounded-md border border-ink/10 bg-white p-3 text-sm font-bold">
            <input className="mt-1 h-4 w-4 accent-moss" defaultChecked={restaurant.settings.persistentAdminSession !== false} name="persistentAdminSession" type="checkbox" />
            <span>
              Garder la connexion active
              <span className="mt-1 block text-xs font-semibold leading-5 text-ink/55">
                Si cette option est désactivée, le restaurant devra se reconnecter plus régulièrement sur cet appareil.
              </span>
            </span>
          </label>
          {sessionMessage ? <p className="mt-3 rounded-md bg-moss/10 p-3 text-sm font-black text-moss">{sessionMessage}</p> : null}
          {sessionError ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-black text-red-700">{sessionError}</p> : null}
          <button className="primary-button mt-4 h-10 px-4 text-sm" disabled={sessionMutation.isPending} type="submit">
            {sessionMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}

type TableStudioDraft = {
  autoAssignPriority: TableAutoAssignPriority;
  capacity: number;
  displayScale: number;
  features: TableFeature[];
  label: string;
  rememberBasePosition: boolean;
  shape: TableShape;
  zone: TableZone;
};

type TableInlineDraft = {
  capacity: number;
  features: TableFeature[];
  id: string;
  label: string;
  roomId: string;
  shape: TableShape;
  zone: TableZone;
};

type FloorPlanHistorySnapshot = {
  id: string;
  label: string;
  createdAt: string;
  rooms: FloorRoom[];
  tableRooms: Record<string, string>;
  tableCombinations: TableCombination[];
};

type CombinationPlacement = NonNullable<TableCombination["placement"]>;

const roomTypeLabels: Record<FloorRoom["type"], string> = {
  MAIN: "Salle principale",
  FLOOR: "Étage",
  TERRACE: "Terrasse",
  PRIVATE: "Salon privé",
  ROOFTOP: "Rooftop"
};

const tableZoneLabels: Record<TableZone, string> = {
  INDOOR: "Salle",
  TERRACE: "Terrasse",
  VIP: "VIP"
};

const tableShapeLabels: Record<TableShape, string> = {
  ROUND: "Ronde",
  SQUARE: "Carrée",
  RECTANGLE: "Rectangle"
};

const tableFeatureLabels: Record<TableFeature, string> = {
  QUIET: "Calme",
  ACCESSIBLE: "PMR",
  KIDS: "Enfants",
  WINDOW: "Fenêtre"
};

const combinationPlacementLabels: Record<CombinationPlacement, string> = {
  RIGHT: "À droite",
  LEFT: "À gauche",
  BOTTOM: "En dessous",
  TOP: "Au-dessus"
};

function floorPlanHistoryFromSettings(settings: Record<string, unknown>): FloorPlanHistorySnapshot[] {
  const value = settings.floorPlanHistory;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((snapshot): snapshot is Record<string, unknown> => Boolean(snapshot) && typeof snapshot === "object")
    .map((snapshot): FloorPlanHistorySnapshot | null => {
      const rooms = Array.isArray(snapshot.rooms)
        ? floorRoomsFromSettings({ floorPlanRooms: snapshot.rooms })
        : [];
      const tableRooms = snapshot.tableRooms && typeof snapshot.tableRooms === "object" && !Array.isArray(snapshot.tableRooms)
        ? Object.entries(snapshot.tableRooms).reduce<Record<string, string>>((values, [tableId, roomId]) => {
            if (typeof roomId === "string") {
              values[tableId] = roomId;
            }

            return values;
          }, {})
        : {};
      const tableCombinations = tableCombinationsFromSettings({ tableCombinations: snapshot.tableCombinations });

      if (!rooms.length) {
        return null;
      }

      return {
        id: typeof snapshot.id === "string" ? snapshot.id : `history-${Date.now()}`,
        label: typeof snapshot.label === "string" ? snapshot.label : "Version du plan",
        createdAt: typeof snapshot.createdAt === "string" ? snapshot.createdAt : new Date().toISOString(),
        rooms,
        tableRooms,
        tableCombinations
      };
    })
    .filter((snapshot): snapshot is FloorPlanHistorySnapshot => Boolean(snapshot))
    .slice(0, 8);
}

function nextTableLabel(tables: FloorTable[]) {
  const existing = new Set(tables.map((table) => table.label.toLowerCase()));
  let index = tables.length + 1;

  while (existing.has(`t${index}`)) {
    index += 1;
  }

  return `T${index}`;
}

function tablePlanFootprint(table: FloorTable) {
  const scale = Math.min(2.4, Math.max(0.5, table.displayScale ?? 1));
  const applyScale = (width: number, height: number) => ({
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  });

  if (table.shape === "RECTANGLE") {
    return applyScale(Math.min(220, 86 + Math.max(0, table.capacity - 2) * 13), 58);
  }

  if (table.shape === "SQUARE") {
    return applyScale(table.capacity >= 5 ? 72 : 58, table.capacity >= 5 ? 72 : 58);
  }

  if (table.capacity >= 7) {
    return applyScale(88, 88);
  }

  if (table.capacity >= 5) {
    return applyScale(76, 76);
  }

  if (table.capacity >= 3) {
    return applyScale(64, 64);
  }

  return applyScale(54, 54);
}

function combinationPositionsForTables(selectedTables: FloorTable[], placement: CombinationPlacement) {
  if (selectedTables.length < 2) {
    return {};
  }

  const anchor = selectedTables[0];
  const positions: Record<string, { positionX: number; positionY: number }> = {
    [anchor.id]: {
      positionX: anchor.positionX,
      positionY: anchor.positionY
    }
  };

  let cursorX = anchor.positionX;
  let cursorY = anchor.positionY;

  selectedTables.slice(1).forEach((table, index) => {
    const previousTable = selectedTables[index] ?? anchor;
    const previousFootprint = tablePlanFootprint(previousTable);
    const tableFootprint = tablePlanFootprint(table);

    if (placement === "RIGHT") {
      cursorX += previousFootprint.width;
      positions[table.id] = {
        positionX: Math.max(0, Math.min(860, cursorX)),
        positionY: Math.max(0, Math.min(500, anchor.positionY))
      };
    } else if (placement === "LEFT") {
      cursorX -= tableFootprint.width;
      positions[table.id] = {
        positionX: Math.max(0, Math.min(860, cursorX)),
        positionY: Math.max(0, Math.min(500, anchor.positionY))
      };
    } else if (placement === "TOP") {
      cursorY -= tableFootprint.height;
      positions[table.id] = {
        positionX: Math.max(0, Math.min(860, anchor.positionX)),
        positionY: Math.max(0, Math.min(500, cursorY))
      };
    } else {
      cursorY += previousFootprint.height;
      positions[table.id] = {
        positionX: Math.max(0, Math.min(860, anchor.positionX)),
        positionY: Math.max(0, Math.min(500, cursorY))
      };
    }
  });

  return positions;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });
}

function TablesRoomsStudio({ restaurant, tableCount }: { restaurant: Restaurant; tableCount: number }) {
  const queryClient = useQueryClient();
  const settings = restaurant.settings;
  const persistedRooms = floorRoomsFromSettings(settings);
  const tableRooms = tableRoomsFromSettings(settings);
  const defaultRoomId = persistedRooms[0]?.id ?? "main-room";
  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoomId);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [zoom, setZoom] = useState(1);
  const [activeToolPanel, setActiveToolPanel] = useState<"table" | "rooms" | "settings" | "view" | "combinations" | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [combinationLabel, setCombinationLabel] = useState("");
  const [combinationTableIds, setCombinationTableIds] = useState<string[]>([]);
  const [combinationSourceTableId, setCombinationSourceTableId] = useState("");
  const [combinationPartnerTableId, setCombinationPartnerTableId] = useState("");
  const [combinationPlacement, setCombinationPlacement] = useState<CombinationPlacement>("BOTTOM");
  const [combinationDraftPositions, setCombinationDraftPositions] = useState<Record<string, { positionX: number; positionY: number }>>({});
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const [tableInlineDraft, setTableInlineDraft] = useState<TableInlineDraft | null>(null);
  const [tableListSort, setTableListSort] = useState<"label" | "room">("label");
  const [tableListRoomFilter, setTableListRoomFilter] = useState("ALL");
  const [tableListFeatureFilter, setTableListFeatureFilter] = useState<"ALL" | TableFeature>("ALL");
  const [tableViewEditorTableId, setTableViewEditorTableId] = useState<string | null>(null);
  const [tableViewCropDraft, setTableViewCropDraft] = useState<TableViewImageCrop>(() => defaultTableViewImageCrop());
  const [planFullscreen, setPlanFullscreen] = useState(false);
  const [optimisticRooms, setOptimisticRooms] = useState<Record<string, Partial<FloorRoom>>>({});
  const [optimisticCreatedTables, setOptimisticCreatedTables] = useState<FloorTable[]>([]);
  const optimisticCreatedTablesRef = useRef<FloorTable[]>([]);
  const [optimisticDeletedTableIds, setOptimisticDeletedTableIds] = useState<string[]>([]);
  const [optimisticTableRooms, setOptimisticTableRooms] = useState<Record<string, string>>({});
  const [optimisticTablePatches, setOptimisticTablePatches] = useState<Record<string, Partial<FloorTable>>>({});
  const [optimisticTableDisplayScales, setOptimisticTableDisplayScales] = useState<Record<string, number>>({});
  const [optimisticTableRotations, setOptimisticTableRotations] = useState<Record<string, number>>({});
  const [pendingDuplicateTableId, setPendingDuplicateTableId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<FloorRoom["type"]>("FLOOR");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSettingsSaves, setPendingSettingsSaves] = useState(0);
  const tableViewImageInputRef = useRef<HTMLInputElement | null>(null);
  const inlineTableEditorRef = useRef<HTMLDivElement | null>(null);
  const pendingTableViewImageIdRef = useRef<string | null>(null);
  const tableViewCropDragRef = useRef<{
    crop: TableViewImageCrop;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const [tableDraft, setTableDraft] = useState<TableStudioDraft>(() => ({
    autoAssignPriority: "DISABLED",
    capacity: 2,
    displayScale: defaultTableDisplayScaleFromSettings(settings),
    features: [],
    label: "",
    rememberBasePosition: true,
    shape: "ROUND",
    zone: "INDOOR"
  }));
  const { selectedTableId, setSelectedTableId } = useFloorPlanStore();
  useEffect(() => {
    optimisticCreatedTablesRef.current = optimisticCreatedTables;
  }, [optimisticCreatedTables]);

  const rooms = useMemo(
    () =>
      persistedRooms.map((room) => ({
        ...room,
        ...optimisticRooms[room.id]
      })),
    [optimisticRooms, persistedRooms]
  );

  const tablesQuery = useQuery({
    queryKey: ["tables", restaurant.id],
    queryFn: () => apiFetch<{ tables: FloorTable[] }>(`/api/restaurants/${restaurant.id}/tables`)
  });

  const rawTables = useMemo(() => {
    const baseTables = tablesQuery.data?.tables ?? restaurant.tables ?? [];
    const existingIds = new Set(baseTables.map((table) => table.id));
    return [
      ...baseTables,
      ...optimisticCreatedTables.filter((table) => !existingIds.has(table.id))
    ].filter((table) => !optimisticDeletedTableIds.includes(table.id));
  }, [optimisticCreatedTables, optimisticDeletedTableIds, restaurant.tables, tablesQuery.data?.tables]);
  const tables = useMemo(
    () =>
      applyFloorPlanSettings(rawTables, settings).map((table) => ({
        ...table,
        ...optimisticTablePatches[table.id],
        ...combinationDraftPositions[table.id],
        displayScale: optimisticTableDisplayScales[table.id] ?? table.displayScale,
        rotation: optimisticTableRotations[table.id] ?? table.rotation
      })),
    [rawTables, settings, optimisticTablePatches, combinationDraftPositions, optimisticTableDisplayScales, optimisticTableRotations]
  );
  const currentRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? defaultFloorRoom();
  const editingRoom = rooms.find((room) => room.id === editingRoomId) ?? currentRoom;
  const currentRoomLocked = currentRoom.locked === true;
  const effectiveTableRooms = useMemo(
    () => ({
      ...tableRooms,
      ...optimisticTableRooms
    }),
    [optimisticTableRooms, tableRooms]
  );
  const roomTables = tables.filter((table) => (effectiveTableRooms[table.id] ?? defaultRoomId) === currentRoom.id);
  const selectedTable = roomTables.find((table) => table.id === selectedTableId);
  const tableViewEditorTable = tableViewEditorTableId
    ? tables.find((table) => table.id === tableViewEditorTableId)
    : selectedTable;
  const tableCombinations = tableCombinationsFromSettings(settings);
  const tableBasePositions = tableBasePositionsFromSettings(settings);
  const suggestedTableLabel = nextTableLabel(roomTables);
  const tableDraftDuplicate = tableDraft.label.trim().length > 0 && tableLabelExists(tableDraft.label);
  const filteredTableList = useMemo(() => {
    return [...tables]
      .filter((table) => {
        const roomId = effectiveTableRooms[table.id] ?? defaultRoomId;
        const featureMatch = tableListFeatureFilter === "ALL" || (table.features ?? []).includes(tableListFeatureFilter);
        const roomMatch = tableListRoomFilter === "ALL" || roomId === tableListRoomFilter;

        return roomMatch && featureMatch;
      })
      .sort((first, second) => {
        if (tableListSort === "room") {
          const firstRoomName = rooms.find((room) => room.id === (effectiveTableRooms[first.id] ?? defaultRoomId))?.name ?? "";
          const secondRoomName = rooms.find((room) => room.id === (effectiveTableRooms[second.id] ?? defaultRoomId))?.name ?? "";
          const roomCompare = firstRoomName.localeCompare(secondRoomName, "fr", { numeric: true });

          if (roomCompare !== 0) {
            return roomCompare;
          }
        }

        return first.label.localeCompare(second.label, "fr", { numeric: true });
      });
  }, [defaultRoomId, effectiveTableRooms, rooms, tableListFeatureFilter, tableListRoomFilter, tableListSort, tables]);

  useEffect(() => {
    if (!expandedTableId) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      if (inlineTableEditorRef.current?.contains(target) || target.closest("[data-table-inline-trigger='true']")) {
        return;
      }

      setExpandedTableId(null);
      setTableInlineDraft(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [expandedTableId]);

  useEffect(() => {
    if (!planFullscreen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPlanFullscreen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [planFullscreen]);
  const planHistory = floorPlanHistoryFromSettings(settings);
  const tableDisplayScaleLocked = tableDisplayScaleLockedFromSettings(settings);
  const modelUrl = currentRoom.modelDataUrl ?? floorPlanModelUrlFromSettings(settings);
  const backgroundImageUrl = currentRoom.plan2dDataUrl ?? floorPlan2dImageUrlFromSettings(settings);

  useEffect(() => {
    if (!tableViewEditorTable) {
      return;
    }

    setTableViewCropDraft(normalizeTableViewImageCrop(tableViewEditorTable.viewImageCrop));
  }, [tableViewEditorTable?.id, tableViewEditorTable?.viewImageCrop]);

  function showTransientMessage(nextMessage: string) {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(null), 2500);
  }

  function normalizedTableLabel(label: string) {
    return label.trim().toLocaleLowerCase("fr-FR");
  }

  function tableLabelExists(label: string, ignoredTableId?: string) {
    const normalizedLabel = normalizedTableLabel(label);

    if (!normalizedLabel) {
      return false;
    }

    return tables.some((table) => table.id !== ignoredTableId && normalizedTableLabel(table.label) === normalizedLabel);
  }

  async function patchRestaurantSettings(nextSettings: Record<string, unknown>, extra: Record<string, unknown> = {}) {
    setPendingSettingsSaves((current) => current + 1);

    try {
      const response = await apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...extra,
          settings: nextSettings
        })
      });

      await queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
      await queryClient.invalidateQueries({ queryKey: ["tables", restaurant.id] });
      showTransientMessage("Modification effectuée");
      return response.restaurant;
    } finally {
      setPendingSettingsSaves((current) => Math.max(0, current - 1));
    }
  }

  function settingsWithRooms(nextRooms: FloorRoom[]) {
    return {
      ...settings,
      floorPlanRooms: nextRooms
    };
  }

  function settingsWithTableRoom(tableId: string, roomId: string) {
    return {
      ...settings,
      tableRooms: {
        ...tableRooms,
        [tableId]: roomId
      }
    };
  }

	  const createTableMutation = useMutation({
	    mutationFn: async (draft: TableStudioDraft & { sourceTable?: FloorTable }) => {
      const table = await apiFetch<{ table: FloorTable }>(`/api/restaurants/${restaurant.id}/tables`, {
        method: "POST",
        body: JSON.stringify({
          active: true,
          capacity: draft.capacity,
          label: draft.label.trim() || nextTableLabel(tables),
          positionX: draft.sourceTable ? Math.min(860, draft.sourceTable.positionX + 36) : 430,
          positionY: draft.sourceTable ? Math.min(500, draft.sourceTable.positionY + 36) : 270,
          rotation: draft.sourceTable?.rotation ?? 0,
          zone: draft.zone
        })
      });

      let nextSettings: Record<string, unknown> = settingsWithTableRoom(table.table.id, currentRoom.id);
      nextSettings = withTableShape(nextSettings, table.table.id, draft.shape);
      nextSettings = withTableFeatures(nextSettings, table.table.id, draft.features);
      nextSettings = withTableDisplayScale(nextSettings, table.table.id, draft.displayScale);
      nextSettings = withTableAutoAssignPriority(nextSettings, table.table.id, draft.autoAssignPriority);

      if (draft.rememberBasePosition) {
        nextSettings = withTableBasePosition(nextSettings, table.table.id, {
          positionX: table.table.positionX,
          positionY: table.table.positionY
        });
      }

      if (tableDisplayScaleLocked) {
        nextSettings = withDefaultTableDisplayScale(nextSettings, draft.displayScale, true);
      }

      await patchRestaurantSettings(nextSettings);
      return table.table;
    },
    onMutate: (draft) => {
      if (!draft.sourceTable) {
        return {};
      }

      const temporaryTable: FloorTable = {
        ...draft.sourceTable,
        id: `temp-${Date.now()}`,
        label: draft.label.trim() || nextTableLabel(roomTables),
        capacity: draft.capacity,
        positionX: Math.min(860, draft.sourceTable.positionX + 36),
        positionY: Math.min(500, draft.sourceTable.positionY + 36),
        rotation: draft.sourceTable.rotation,
        zone: draft.zone,
        shape: draft.shape,
        features: draft.features,
        displayScale: draft.displayScale,
        autoAssignPriority: draft.autoAssignPriority
      };

      setOptimisticCreatedTables((current) => [...current, temporaryTable]);
      setOptimisticTableRooms((current) => ({
        ...current,
        [temporaryTable.id]: currentRoom.id
      }));
      setOptimisticTableDisplayScales((current) => ({
        ...current,
        [temporaryTable.id]: draft.displayScale
      }));
      setSelectedTableId(temporaryTable.id);

      return { temporaryTableId: temporaryTable.id };
	    },
	    onSuccess: (table, draft, context) => {
      const temporaryTable = context?.temporaryTableId
        ? optimisticCreatedTablesRef.current.find((item) => item.id === context.temporaryTableId)
        : undefined;
      const settledTable = temporaryTable
        ? {
          ...table,
          capacity: temporaryTable.capacity,
          displayScale: temporaryTable.displayScale,
          features: temporaryTable.features,
          positionX: temporaryTable.positionX,
          positionY: temporaryTable.positionY,
          rotation: temporaryTable.rotation,
          shape: temporaryTable.shape,
          zone: temporaryTable.zone
        }
        : table;

      if (context?.temporaryTableId) {
        setOptimisticCreatedTables((current) => current.filter((item) => item.id !== context.temporaryTableId));
        setOptimisticTableRooms((current) => {
          const next = { ...current };
          delete next[context.temporaryTableId];
          return next;
        });
        setOptimisticTableDisplayScales((current) => {
          const next = { ...current };
          delete next[context.temporaryTableId];
          return next;
        });
      }

      setOptimisticCreatedTables((current) => current.some((item) => item.id === table.id) ? current : [...current, settledTable]);
      setOptimisticTableRooms((current) => ({
        ...current,
        [table.id]: currentRoom.id
      }));
      setOptimisticTableDisplayScales((current) => ({
        ...current,
        [table.id]: draft.displayScale
      }));
      setOptimisticTablePatches((current) => ({
        ...current,
        [table.id]: {
          ...current[table.id],
          positionX: settledTable.positionX,
          positionY: settledTable.positionY,
          rotation: settledTable.rotation
        }
      }));
      if (
        temporaryTable &&
        (temporaryTable.positionX !== table.positionX || temporaryTable.positionY !== table.positionY || temporaryTable.rotation !== table.rotation)
      ) {
        void apiFetch<{ table: FloorTable }>(`/api/tables/${table.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            positionX: Math.round(temporaryTable.positionX),
            positionY: Math.round(temporaryTable.positionY),
            rotation: temporaryTable.rotation
          })
        }).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["tables", restaurant.id] });
          void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
        }).catch(() => {
          showTransientMessage("La table est créée, mais sa position n’a pas pu être synchronisée.");
        });
      }
      setSelectedTableId(table.id);
      setShowCreateTable(false);
      setActiveToolPanel(null);
	      setTableDraft((current) => ({
	        ...current,
	        label: nextTableLabel([...roomTables, table]),
	        rememberBasePosition: true
	      }));
	    },
	    onError: (error, _draft, context) => {
      if (context?.temporaryTableId) {
        setOptimisticCreatedTables((current) => current.filter((item) => item.id !== context.temporaryTableId));
        setOptimisticTableRooms((current) => {
          const next = { ...current };
          delete next[context.temporaryTableId];
          return next;
        });
        setOptimisticTableDisplayScales((current) => {
          const next = { ...current };
          delete next[context.temporaryTableId];
          return next;
        });
      }

	      showTransientMessage(error instanceof Error && error.message.includes("already exists")
	        ? "Une table avec ce libellé existe déjà."
	        : "Impossible de créer la table.");
	    }
	  });

	  const updateTableMutation = useMutation({
	    mutationFn: ({ tableId, data }: { tableId: string; data: Partial<FloorTable> }) =>
      apiFetch<{ table: FloorTable }>(`/api/tables/${tableId}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
	    onMutate: ({ tableId, data }) => {
	      const previousPatch = optimisticTablePatches[tableId];
	      setOptimisticTablePatches((current) => ({
	        ...current,
	        [tableId]: {
	          ...current[tableId],
	          ...data
	        }
	      }));

	      return { previousPatch, tableId };
	    },
	    onError: (error, _variables, context) => {
	      if (context) {
	        setOptimisticTablePatches((current) => {
	          const next = { ...current };

	          if (context.previousPatch) {
	            next[context.tableId] = context.previousPatch;
	          } else {
	            delete next[context.tableId];
	          }

	          return next;
	        });
	      }

	      showTransientMessage(error instanceof Error && error.message.includes("already exists")
	        ? "Une table avec ce libellé existe déjà."
	        : "Impossible d’enregistrer la modification.");
	    },
	    onSuccess: () => {
	      void queryClient.invalidateQueries({ queryKey: ["tables", restaurant.id] });
	    }
	  });

  const deleteTableMutation = useMutation({
    mutationFn: (tableId: string) =>
      apiFetch<void>(`/api/tables/${tableId}`, {
        method: "DELETE"
      }),
    onMutate: (tableId) => {
      setSelectedTableId(undefined);
      setOptimisticDeletedTableIds((current) => [...new Set([...current, tableId])]);
      return { tableId };
    },
    onError: (_error, _tableId, context) => {
      if (context?.tableId) {
        setOptimisticDeletedTableIds((current) => current.filter((id) => id !== context.tableId));
      }

      showTransientMessage("Impossible de supprimer la table.");
    },
    onSuccess: () => {
      setSelectedTableId(undefined);
      void queryClient.invalidateQueries({ queryKey: ["tables", restaurant.id] });
      void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
    }
  });

  function createRoom() {
    const room: FloorRoom = {
      id: `room-${Date.now()}`,
      name: newRoomName.trim() || `Salle ${rooms.length + 1}`,
      type: newRoomType,
      active: true
    };

    void patchRestaurantSettings(settingsWithRooms([...rooms, room])).then(() => {
      setSelectedRoomId(room.id);
      setNewRoomName("");
      setNewRoomType("FLOOR");
      setShowCreateRoom(false);
    });
  }

  function updateRoom(roomId: string, updates: Partial<FloorRoom>) {
    setOptimisticRooms((current) => ({
      ...current,
      [roomId]: {
        ...current[roomId],
        ...updates
      }
    }));
    const nextRooms = rooms.map((room) => room.id === roomId ? { ...room, ...updates } : room);
    void patchRestaurantSettings(settingsWithRooms(nextRooms)).catch(() => {
      setOptimisticRooms((current) => {
        const next = { ...current };
        delete next[roomId];
        return next;
      });
      showTransientMessage("Impossible d’enregistrer le plan.");
    });
  }

  function deleteRoom(roomId: string) {
    if (rooms.length <= 1) {
      window.alert("Vous devez conserver au moins un plan de salle.");
      return;
    }

    const room = rooms.find((item) => item.id === roomId);

    if (!room || !window.confirm(`Supprimer le plan "${room.name}" ? Les tables seront déplacées vers un autre plan.`)) {
      return;
    }

    const nextRooms = rooms.filter((item) => item.id !== roomId);
    const fallbackRoomId = nextRooms[0]?.id ?? "main-room";
    const nextTableRooms = Object.entries(effectiveTableRooms).reduce<Record<string, string>>((values, [tableId, assignedRoomId]) => {
      values[tableId] = assignedRoomId === roomId ? fallbackRoomId : assignedRoomId;
      return values;
    }, {});

    setOptimisticTableRooms((current) =>
      Object.entries(current).reduce<Record<string, string>>((values, [tableId, assignedRoomId]) => {
        values[tableId] = assignedRoomId === roomId ? fallbackRoomId : assignedRoomId;
        return values;
      }, {})
    );
    void patchRestaurantSettings({
      ...settingsWithRooms(nextRooms),
      tableRooms: nextTableRooms
    }).then(() => {
      if (selectedRoomId === roomId) {
        setSelectedRoomId(fallbackRoomId);
      }

      if (editingRoomId === roomId) {
        setEditingRoomId(null);
      }
    });
  }

  async function duplicateRoom(room: FloorRoom, includeTables: boolean) {
    const duplicatedRoom: FloorRoom = {
      ...room,
      id: `room-${Date.now()}`,
      name: `${room.name} copie`,
      active: false,
      draftStatus: "DRAFT",
      locked: false
    };
    let nextSettings: Record<string, unknown> = settingsWithRooms([...rooms, duplicatedRoom]);

    if (includeTables) {
      const sourceTables = tables.filter((table) => (effectiveTableRooms[table.id] ?? defaultRoomId) === room.id);

      for (const sourceTable of sourceTables) {
        const created = await apiFetch<{ table: FloorTable }>(`/api/restaurants/${restaurant.id}/tables`, {
          method: "POST",
          body: JSON.stringify({
            active: sourceTable.active,
            capacity: sourceTable.capacity,
            label: nextTableLabel([...tables, sourceTable]),
            positionX: sourceTable.positionX,
            positionY: sourceTable.positionY,
            rotation: sourceTable.rotation,
            zone: sourceTable.zone
          })
        });

        nextSettings = {
          ...nextSettings,
          tableRooms: {
            ...tableRoomsFromSettings(nextSettings),
            [created.table.id]: duplicatedRoom.id
          }
        };
        nextSettings = withTableShape(nextSettings, created.table.id, sourceTable.shape ?? "ROUND");
        nextSettings = withTableFeatures(nextSettings, created.table.id, sourceTable.features ?? []);
        nextSettings = withTableDisplayScale(nextSettings, created.table.id, sourceTable.displayScale ?? 1);
        nextSettings = withTableAutoAssignPriority(nextSettings, created.table.id, sourceTable.autoAssignPriority ?? "DISABLED");
      }
    }

    await patchRestaurantSettings(nextSettings);
    setSelectedRoomId(duplicatedRoom.id);
    setEditingRoomId(duplicatedRoom.id);
  }

  async function handleRoomPlanUpload(file: File | undefined, type: "2d" | "3d", roomId = currentRoom.id) {
    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    updateRoom(roomId, type === "2d" ? { plan2dDataUrl: dataUrl } : { modelDataUrl: dataUrl });
  }

  async function persistTableViewImage(tableId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Veuillez sélectionner une image.");
    }

    const dataUrl = await readFileAsDataUrl(file);
    const nextSettings = withTableViewImageCrop(
      withTableViewImage(settings, tableId, dataUrl),
      tableId,
      defaultTableViewImageCrop()
    );
    await patchRestaurantSettings(nextSettings);
    setTableViewCropDraft(defaultTableViewImageCrop());
  }

  async function persistTableViewImageCrop(tableId: string, crop: TableViewImageCrop) {
    await patchRestaurantSettings(withTableViewImageCrop(settings, tableId, crop));
  }

  function openTableViewImagePicker(tableId: string) {
    pendingTableViewImageIdRef.current = tableId;
    tableViewImageInputRef.current?.click();
  }

  function handleTableViewPhoto(table: FloorTable) {
    setSelectedTableId(table.id);
    setTableViewEditorTableId(table.id);
    setShowCreateTable(false);
    setShowCreateRoom(false);
    setActiveToolPanel("view");
  }

  function updateTableViewCropDraft(nextCrop: Partial<TableViewImageCrop>) {
    setTableViewCropDraft((current) =>
      normalizeTableViewImageCrop({
        ...current,
        ...nextCrop
      })
    );
  }

  function handleTableViewCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!tableViewEditorTable?.viewImageUrl) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    tableViewCropDragRef.current = {
      crop: tableViewCropDraft,
      pointerX: event.clientX,
      pointerY: event.clientY
    };
  }

  function handleTableViewCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = tableViewCropDragRef.current;

    if (!drag) {
      return;
    }

    updateTableViewCropDraft({
      x: drag.crop.x + (event.clientX - drag.pointerX) / 3,
      y: drag.crop.y + (event.clientY - drag.pointerY) / 3
    });
  }

  function handleTableViewCropPointerEnd(event: PointerEvent<HTMLDivElement>) {
    tableViewCropDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function validateTableViewCrop() {
    if (!tableViewEditorTable?.viewImageUrl) {
      return;
    }

    void persistTableViewImageCrop(tableViewEditorTable.id, normalizeTableViewImageCrop(tableViewCropDraft));
  }

  function applyDisplayScaleToCurrentRoom(displayScale: number) {
    let nextSettings = { ...settings };

    for (const table of roomTables) {
      nextSettings = withTableDisplayScale(nextSettings, table.id, displayScale);
    }

    setOptimisticTableDisplayScales((current) => ({
      ...current,
      ...Object.fromEntries(roomTables.map((table) => [table.id, displayScale]))
    }));
    void patchRestaurantSettings(nextSettings);
  }

  function toggleCombinationTable(tableId: string) {
    setCombinationTableIds((current) =>
      current.includes(tableId)
        ? current.filter((id) => id !== tableId)
        : [...current, tableId]
    );
  }

  async function persistTableCombinations(combinations: TableCombination[]) {
    await patchRestaurantSettings(withTableCombinations(settings, combinations));
  }

  function savePlanHistorySnapshot() {
    const lightweightRooms = rooms.map((room) => {
      const { plan2dDataUrl, modelDataUrl, ...roomWithoutAssets } = room;

      void plan2dDataUrl;
      void modelDataUrl;

      return roomWithoutAssets;
    });
    const snapshot: FloorPlanHistorySnapshot = {
      id: `history-${Date.now()}`,
      label: `${currentRoom.name} · ${new Date().toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })}`,
      createdAt: new Date().toISOString(),
      rooms: lightweightRooms,
      tableRooms: effectiveTableRooms,
      tableCombinations
    };

    void patchRestaurantSettings({
      ...settings,
      floorPlanHistory: [snapshot, ...planHistory].slice(0, 8)
    }).then(() => {
      showTransientMessage("Historique du plan sauvegardé.");
    }).catch(() => {
      showTransientMessage("Impossible de sauvegarder l’historique du plan.");
    });
  }

  function restorePlanHistorySnapshot(snapshot: FloorPlanHistorySnapshot) {
    const roomsWithCurrentAssets = snapshot.rooms.map((room) => {
      const currentRoomAssets = rooms.find((item) => item.id === room.id);

      return {
        ...room,
        plan2dDataUrl: currentRoomAssets?.plan2dDataUrl,
        modelDataUrl: currentRoomAssets?.modelDataUrl
      };
    });

    void patchRestaurantSettings({
      ...settings,
      floorPlanRooms: roomsWithCurrentAssets,
      tableRooms: snapshot.tableRooms,
      tableCombinations: snapshot.tableCombinations
    }).then(() => {
      setSelectedRoomId(roomsWithCurrentAssets[0]?.id ?? "main-room");
      setEditingRoomId(roomsWithCurrentAssets[0]?.id ?? null);
    });
  }

  function createTableCombination() {
    const tableIds = Array.from(new Set(combinationTableIds));

    if (tableIds.length < 2) {
      return;
    }

    const label = combinationLabel.trim() || tableIds
      .map((tableId) => tables.find((table) => table.id === tableId)?.label)
      .filter(Boolean)
      .join(" + ");

    void persistTableCombinations([
      ...tableCombinations,
      {
        id: `combination-${Date.now()}`,
        label,
        placement: combinationPlacement,
        tableIds
      }
    ]).then(() => {
      setCombinationLabel("");
      setCombinationTableIds([]);
      setCombinationDraftPositions({});
    });
  }

  function removeTableCombination(combinationId: string) {
    void persistTableCombinations(tableCombinations.filter((combination) => combination.id !== combinationId));
  }

  function updateTableCombinationPlacement(combination: TableCombination, placement: CombinationPlacement) {
    void persistTableCombinations(
      tableCombinations.map((item) =>
        item.id === combination.id
          ? {
              ...item,
              placement
            }
          : item
      )
    );
  }

  function createPairCombination() {
    const tableIds = Array.from(new Set([combinationSourceTableId, combinationPartnerTableId].filter(Boolean)));

    if (tableIds.length < 2) {
      showTransientMessage("Sélectionnez deux tables à combiner.");
      return;
    }

    const label = tableIds
      .map((tableId) => tables.find((table) => table.id === tableId)?.label)
      .filter(Boolean)
      .join(" + ");

    void persistTableCombinations([
      ...tableCombinations,
      {
        id: `combination-${Date.now()}`,
        label,
        placement: combinationPlacement,
        tableIds
      }
    ]).then(() => {
      setCombinationSourceTableId("");
      setCombinationPartnerTableId("");
    });
  }

  function openTableSettings(table: FloorTable) {
    const roomId = effectiveTableRooms[table.id] ?? defaultRoomId;

    setSelectedRoomId(roomId);
    setSelectedTableId(table.id);
    setShowCreateTable(false);
    setShowCreateRoom(false);
    setActiveToolPanel("settings");
  }

  function openInlineTableEditor(table: FloorTable) {
    const roomId = effectiveTableRooms[table.id] ?? defaultRoomId;

    setExpandedTableId(table.id);
    setTableInlineDraft({
      capacity: table.capacity,
      features: table.features ?? [],
      id: table.id,
      label: table.label,
      roomId,
      shape: table.shape ?? "ROUND",
      zone: table.zone
    });
  }

  function updateInlineTableDraft(updates: Partial<TableInlineDraft>) {
    setTableInlineDraft((current) => current ? { ...current, ...updates } : current);
  }

  function toggleInlineTableFeature(feature: TableFeature) {
    setTableInlineDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        features: current.features.includes(feature)
          ? current.features.filter((item) => item !== feature)
          : [...current.features, feature]
      };
    });
  }

  function validateInlineTableEdit() {
    if (!tableInlineDraft) {
      return;
    }

    const table = tables.find((item) => item.id === tableInlineDraft.id);

    if (!table) {
      return;
    }

    if (tableInlineDraft.label.trim() && tableLabelExists(tableInlineDraft.label, table.id)) {
      showTransientMessage("Une table avec ce libellé existe déjà.");
      return;
    }

    updateTableMutation.mutate({
      tableId: table.id,
      data: {
        capacity: tableInlineDraft.capacity,
        label: tableInlineDraft.label.trim() || table.label,
        zone: tableInlineDraft.zone
      }
    });

    let nextSettings: Record<string, unknown> = settingsWithTableRoom(table.id, tableInlineDraft.roomId);
    nextSettings = withTableShape(nextSettings, table.id, tableInlineDraft.shape);
    nextSettings = withTableFeatures(nextSettings, table.id, tableInlineDraft.features);
    void patchRestaurantSettings(nextSettings);
    setExpandedTableId(null);
    setTableInlineDraft(null);
  }

  function clearCombinationDraft() {
    setCombinationDraftPositions({});
  }

  function alignCombinationTables(mode: "horizontal" | "vertical") {
    const selectedTables: FloorTable[] = [];

    for (const tableId of combinationTableIds) {
      const table = roomTables.find((item) => item.id === tableId);

      if (table) {
        selectedTables.push(table);
      }
    }

    if (selectedTables.length < 2) {
      return;
    }

    const draftPositions = combinationPositionsForTables(
      selectedTables,
      mode === "vertical" ? "BOTTOM" : combinationPlacement
    );

    setCombinationDraftPositions((current) => ({
      ...current,
      ...draftPositions
    }));
  }

  function toggleFeature(feature: TableFeature) {
    setTableDraft((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature]
    }));
  }

  function toggleSelectedTableFeature(feature: TableFeature) {
    if (!selectedTable) {
      return;
    }

    const currentFeatures = selectedTable.features ?? [];
    persistSelectedTableSettings({
      features: currentFeatures.includes(feature)
        ? currentFeatures.filter((item) => item !== feature)
        : [...currentFeatures, feature]
    });
  }

  function persistSelectedTableSettings(updates: {
    autoAssignPriority?: TableAutoAssignPriority;
    displayScale?: number;
    features?: TableFeature[];
    shape?: TableShape;
  }) {
    if (!selectedTable) {
      return;
    }

    let nextSettings = { ...settings };
    const optimisticPatch: Partial<FloorTable> = {};

    if (updates.shape) {
      optimisticPatch.shape = updates.shape;
      nextSettings = withTableShape(nextSettings, selectedTable.id, updates.shape);
    }

    if (updates.features) {
      optimisticPatch.features = updates.features;
      nextSettings = withTableFeatures(nextSettings, selectedTable.id, updates.features);
    }

    if (updates.displayScale !== undefined) {
      setOptimisticTableDisplayScales((current) => ({
        ...current,
        [selectedTable.id]: updates.displayScale ?? selectedTable.displayScale ?? 1
      }));
      nextSettings = withTableDisplayScale(nextSettings, selectedTable.id, updates.displayScale);
    }

    if (updates.autoAssignPriority) {
      optimisticPatch.autoAssignPriority = updates.autoAssignPriority;
      nextSettings = withTableAutoAssignPriority(nextSettings, selectedTable.id, updates.autoAssignPriority);
    }

    if (Object.keys(optimisticPatch).length > 0) {
      setOptimisticTablePatches((current) => ({
        ...current,
        [selectedTable.id]: {
          ...current[selectedTable.id],
          ...optimisticPatch
        }
      }));
    }

    void patchRestaurantSettings(nextSettings).catch(() => {
      if (Object.keys(optimisticPatch).length > 0) {
        setOptimisticTablePatches((current) => {
          const next = { ...current };
          delete next[selectedTable.id];
          return next;
        });
      }
      showTransientMessage("Impossible d’enregistrer la modification.");
    });
  }

  function rememberSelectedTableBasePosition() {
    if (!selectedTable) {
      return;
    }

    void patchRestaurantSettings(
      withTableBasePosition(settings, selectedTable.id, {
        positionX: selectedTable.positionX,
        positionY: selectedTable.positionY
      })
    );
  }

  function restoreSelectedTableBasePosition() {
    if (!selectedTable) {
      return;
    }

    const basePosition = tableBasePositions[selectedTable.id];

    if (!basePosition) {
      showTransientMessage("Aucune position de base enregistrée pour cette table.");
      return;
    }

    updateTableMutation.mutate({
      tableId: selectedTable.id,
      data: basePosition
    });
  }

  function moveStudioTable(tableId: string, position: { positionX: number; positionY: number }) {
    if (tableId.startsWith("temp-")) {
      setOptimisticCreatedTables((current) =>
        current.map((table) =>
          table.id === tableId
            ? { ...table, ...position }
            : table
        )
      );
      return;
    }

    updateTableMutation.mutate({ tableId, data: position });
  }

  function duplicateTable(table: FloorTable) {
    setPendingDuplicateTableId(table.id);
    createTableMutation.mutate(
      {
        autoAssignPriority: table.autoAssignPriority ?? "DISABLED",
        capacity: table.capacity,
        displayScale: table.displayScale ?? defaultTableDisplayScaleFromSettings(settings),
        features: table.features ?? [],
        label: nextTableLabel(roomTables),
        rememberBasePosition: true,
        shape: table.shape ?? "ROUND",
        sourceTable: table,
        zone: table.zone
      },
      {
        onSettled: () => setPendingDuplicateTableId(null)
      }
    );
  }

  function deleteTable(tableId: string) {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette table ?")) {
      if (tableId.startsWith("temp-")) {
        setSelectedTableId(undefined);
        setOptimisticCreatedTables((current) => current.filter((table) => table.id !== tableId));
        setOptimisticTableRooms((current) => {
          const next = { ...current };
          delete next[tableId];
          return next;
        });
        setOptimisticTableDisplayScales((current) => {
          const next = { ...current };
          delete next[tableId];
          return next;
        });
        return;
      }

      deleteTableMutation.mutate(tableId);
    }
  }

  function rotateTable(table: FloorTable) {
    const rotation = (Math.round(table.rotation) + 90) % 360;
    setOptimisticTableRotations((current) => ({
      ...current,
      [table.id]: rotation
    }));
    updateTableMutation.mutate({
      tableId: table.id,
      data: {
        rotation
      }
    });
  }

  function createTableFromDraft() {
    if (tableDraft.label.trim() && tableLabelExists(tableDraft.label)) {
      showTransientMessage("Une table avec ce libellé existe déjà.");
      return;
    }

    createTableMutation.mutate(tableDraft);
  }

  function updateSelectedTableLabel(value: string) {
    if (!selectedTable) {
      return;
    }

    if (tableLabelExists(value, selectedTable.id)) {
      showTransientMessage("Une table avec ce libellé existe déjà.");
      return;
    }

    updateTableMutation.mutate({ tableId: selectedTable.id, data: { label: value } });
  }

  function openRestaurantPreview() {
    const slug = restaurant.slug;
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const previewUrl = isLocal ? `/sites/${slug}` : `https://${slug}.toquetop.com`;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  const isSaving =
    pendingSettingsSaves > 0 ||
    createTableMutation.isPending ||
    updateTableMutation.isPending ||
    deleteTableMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeader title="Tables et salles" description="Studio de plan de salle : salles, étages, plans 2D/3D, tables et paramètres d’attribution." />
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-linen px-3 py-2 text-xs font-black text-ink/70">
              <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-moss/30 bg-white">
                <span className="absolute h-4 w-4 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
              </span>
              Chargement...
            </span>
          ) : null}
          {message ? <span className="rounded-full bg-moss/10 px-3 py-2 text-xs font-black text-moss">{message}</span> : null}
        </div>
      </div>

      <input
        ref={tableViewImageInputRef}
        accept="image/*"
        className="sr-only"
        type="file"
        onChange={(event) => {
          const tableId = pendingTableViewImageIdRef.current;
          const file = event.target.files?.[0];

          if (tableId && file) {
            void persistTableViewImage(tableId, file);
          }

          event.target.value = "";
          pendingTableViewImageIdRef.current = null;
        }}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <SettingCard label="Salles / niveaux" value={rooms.length.toString()} />
        <SettingCard label="Tables" value={tableCount.toString()} />
        <SettingCard label="Combinaisons" value={tableCombinations.length.toString()} />
      </div>

      <div
        className={clsx(
          "rounded-lg border border-ink/10 bg-white p-4 shadow-soft",
          planFullscreen && "fixed inset-3 z-[90] overflow-auto bg-white md:inset-6"
        )}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={[
                { value: "2d", label: "2D" },
                { value: "3d", label: "3D" }
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as "2d" | "3d")}
            />
            <label className="flex items-center gap-2 text-xs font-bold text-ink/60">
              Zoom
              <input className="w-28 accent-moss" max="1.8" min="0.7" step="0.05" type="range" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
          </div>
          <div className="rounded-full bg-linen px-4 py-2 text-xs font-black text-ink/70">
            {currentRoom.name} · {roomTypeLabels[currentRoom.type]} · {roomTables.length} table(s)
          </div>
        </div>

        <div className={clsx("relative overflow-hidden rounded-lg border border-ink/10 bg-linen", planFullscreen && "min-h-[calc(100vh-9rem)]")}>
          <FloorPlan
            backgroundImageUrl={backgroundImageUrl}
            deleteMode={false}
            layoutLocked={currentRoomLocked}
            mode="admin"
            modelUrl={modelUrl}
            selectedTableId={selectedTableId}
            selectedTableIds={activeToolPanel === "combinations" ? combinationTableIds : undefined}
            pendingDuplicateTableId={pendingDuplicateTableId}
            tables={roomTables}
            viewMode={viewMode}
            zoom={zoom}
            onDelete={deleteTable}
            onDeselect={() => {
              setSelectedTableId(undefined);
              if (activeToolPanel === "settings" || activeToolPanel === "view") {
                setActiveToolPanel(null);
              }
            }}
            onDuplicate={duplicateTable}
            onMove={moveStudioTable}
            onRotate={rotateTable}
            onSelect={(table) => {
              if (activeToolPanel === "combinations") {
                toggleCombinationTable(table.id);
                return;
              }

              setSelectedTableId(table.id);
            }}
            onView={handleTableViewPhoto}
            onZoomChange={setZoom}
          />

          <div className="absolute right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2 rounded-full border border-ink/10 bg-white/95 p-2 shadow-xl backdrop-blur">
            <button
              aria-label="Ajouter une table"
              className={clsx(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border text-ink transition focus-ring",
                activeToolPanel === "table" ? "border-moss bg-moss text-white" : "border-ink/10 bg-white hover:bg-sage",
                currentRoomLocked && "cursor-not-allowed opacity-45"
              )}
              disabled={currentRoomLocked}
              title="Ajouter une table"
              type="button"
              onClick={() => {
                const nextLabel = nextTableLabel(roomTables);
                setTableDraft((current) => ({
                  ...current,
                  label: nextLabel
                }));
                setShowCreateTable(true);
                setShowCreateRoom(false);
                setActiveToolPanel(activeToolPanel === "table" ? null : "table");
              }}
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              aria-label="Modifier la table sélectionnée"
              className={clsx(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border text-ink transition focus-ring",
                activeToolPanel === "settings" ? "border-moss bg-moss text-white" : "border-ink/10 bg-white hover:bg-sage",
                (!selectedTable || currentRoomLocked) && "cursor-not-allowed opacity-45"
              )}
              disabled={!selectedTable || currentRoomLocked}
              title="Modifier la table sélectionnée"
              type="button"
              onClick={() => {
                setShowCreateTable(false);
                setShowCreateRoom(false);
                setActiveToolPanel(activeToolPanel === "settings" ? null : "settings");
              }}
            >
              <Wrench className="h-5 w-5" />
            </button>
            <button
              aria-label="Plans et étages"
              className={clsx(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border text-ink transition focus-ring",
                activeToolPanel === "rooms" ? "border-moss bg-moss text-white" : "border-ink/10 bg-white hover:bg-sage"
              )}
              title="Plans et étages"
              type="button"
              onClick={() => {
                setShowCreateTable(false);
                setActiveToolPanel(activeToolPanel === "rooms" ? null : "rooms");
              }}
            >
              <Layers className="h-5 w-5" />
            </button>
            <button
              aria-label="Combiner des tables"
              className={clsx(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border text-ink transition focus-ring",
                activeToolPanel === "combinations" ? "border-moss bg-moss text-white" : "border-ink/10 bg-white hover:bg-sage",
                currentRoomLocked && "cursor-not-allowed opacity-45"
              )}
              disabled={currentRoomLocked}
              title="Combiner des tables"
              type="button"
              onClick={() => {
                setShowCreateTable(false);
                setShowCreateRoom(false);
                setActiveToolPanel(activeToolPanel === "combinations" ? null : "combinations");
              }}
            >
              <Link2 className="h-5 w-5" />
            </button>
            <button
              aria-label={currentRoomLocked ? "Déverrouiller ce plan" : "Verrouiller ce plan"}
              className={clsx(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border transition focus-ring",
                currentRoomLocked ? "border-gold/30 bg-gold/15 text-ink" : "border-ink/10 bg-white text-ink hover:bg-sage"
              )}
              title={currentRoomLocked ? "Déverrouiller ce plan" : "Verrouiller ce plan"}
              type="button"
              onClick={() => updateRoom(currentRoom.id, { locked: !currentRoomLocked })}
            >
              {currentRoomLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </button>
            <button
              aria-label={planFullscreen ? "Quitter le plein écran" : "Agrandir le plan"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink transition hover:bg-sage focus-ring"
              title={planFullscreen ? "Quitter le plein écran" : "Agrandir le plan"}
              type="button"
              onClick={() => setPlanFullscreen((current) => !current)}
            >
              {planFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>

          {activeToolPanel === "table" && showCreateTable ? (
            <form
              className="absolute right-20 top-4 z-30 max-h-[calc(100%-2rem)] w-[360px] max-w-[calc(100%-6rem)] overflow-auto rounded-xl border border-moss/20 bg-white p-4 shadow-2xl"
	              onSubmit={(event) => {
	                event.preventDefault();
	                createTableFromDraft();
	              }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Ajouter une table</h3>
                  <p className="text-xs font-semibold text-ink/55">Création dans {currentRoom.name}</p>
                </div>
                <button aria-label="Fermer le panneau" className="icon-button h-9 w-9" title="Fermer" type="button" onClick={() => setActiveToolPanel(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3">
                <label className="text-sm font-bold">
                  Libellé
                  <input
                    className={clsx("control mt-1 w-full", tableDraftDuplicate && "border-red-300 bg-red-50")}
                    name="tableLabel"
                    placeholder={suggestedTableLabel}
                    value={tableDraft.label}
                    onChange={(event) => setTableDraft((current) => ({ ...current, label: event.target.value }))}
                  />
                  <span className={clsx("mt-1 block text-xs font-semibold", tableDraftDuplicate ? "text-red-700" : "text-ink/45")}>
                    {tableDraftDuplicate ? "Table existante" : `Suggestion : ${suggestedTableLabel}`}
                  </span>
                </label>
                <InputField label="Couverts" name="capacity" type="number" value={String(tableDraft.capacity)} onChange={(value) => setTableDraft((current) => ({ ...current, capacity: Number(value) || 1 }))} />
                <label className="text-sm font-bold">
                  Forme
                  <select className="control mt-1 w-full" value={tableDraft.shape} onChange={(event) => setTableDraft((current) => ({ ...current, shape: event.target.value as TableShape }))}>
                    <option value="ROUND">Ronde</option>
                    <option value="SQUARE">Carrée</option>
                    <option value="RECTANGLE">Rectangle</option>
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Zone
                  <select className="control mt-1 w-full" value={tableDraft.zone} onChange={(event) => setTableDraft((current) => ({ ...current, zone: event.target.value as TableZone }))}>
                    <option value="INDOOR">Salle</option>
                    <option value="TERRACE">Terrasse</option>
                    <option value="VIP">VIP</option>
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Taille d’affichage
	                  <input className="mt-3 w-full accent-moss" max="2.4" min="0.5" step="0.05" type="range" value={tableDraft.displayScale} onChange={(event) => setTableDraft((current) => ({ ...current, displayScale: Number(event.target.value) }))} />
                </label>
                <label className="text-sm font-bold">
                  Priorité auto
                  <select className="control mt-1 w-full" value={tableDraft.autoAssignPriority} onChange={(event) => setTableDraft((current) => ({ ...current, autoAssignPriority: event.target.value as TableAutoAssignPriority }))}>
                    <option value="DISABLED">Désactivé</option>
                    <option value="LOW">Faible</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="HIGH">Haute</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-md bg-linen p-3 text-sm font-bold">
                  <input
                    checked={tableDraft.rememberBasePosition}
                    className="h-4 w-4 accent-moss"
                    type="checkbox"
                    onChange={(event) => setTableDraft((current) => ({ ...current, rememberBasePosition: event.target.checked }))}
                  />
                  Définir cette position comme position de base
                </label>
                <div>
                  <p className="text-sm font-bold">Options</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      ["QUIET", "Calme"],
                      ["ACCESSIBLE", "PMR"],
                      ["KIDS", "Enfants"],
                      ["WINDOW", "Vue"]
                    ].map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 rounded-md bg-linen px-3 py-2 text-xs font-black">
                        <input checked={tableDraft.features.includes(value as TableFeature)} className="h-4 w-4 accent-moss" type="checkbox" onChange={() => toggleFeature(value as TableFeature)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="secondary-button" type="button" onClick={() => setActiveToolPanel(null)}>Annuler</button>
                <button className="primary-button" disabled={createTableMutation.isPending || tableDraftDuplicate} type="submit">
                  {createTableMutation.isPending ? "Chargement" : "Ajouter"}
                </button>
              </div>
            </form>
          ) : null}

          {activeToolPanel === "settings" && selectedTable ? (
            <div className="absolute right-20 top-4 z-30 max-h-[calc(100%-2rem)] w-[380px] max-w-[calc(100%-6rem)] overflow-auto rounded-xl border border-ink/10 bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Modifier la table</h3>
                  <p className="text-xs font-semibold text-ink/55">{selectedTable.label} · {selectedTable.capacity} couverts</p>
                </div>
                <button aria-label="Fermer le panneau" className="icon-button h-9 w-9" title="Fermer" type="button" onClick={() => setActiveToolPanel(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3">
	                <InputField label="Libellé" name="selectedLabel" value={selectedTable.label} onChange={updateSelectedTableLabel} />
                <InputField label="Capacité" name="selectedCapacity" type="number" value={String(selectedTable.capacity)} onChange={(value) => updateTableMutation.mutate({ tableId: selectedTable.id, data: { capacity: Number(value) || selectedTable.capacity } })} />
                <label className="text-sm font-bold">
                  Salle / étage
                  <select className="control mt-1 w-full" value={effectiveTableRooms[selectedTable.id] ?? defaultRoomId} onChange={(event) => void patchRestaurantSettings(settingsWithTableRoom(selectedTable.id, event.target.value))}>
                    {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Forme
                  <select className="control mt-1 w-full" value={selectedTable.shape ?? "ROUND"} onChange={(event) => isTableShape(event.target.value) ? persistSelectedTableSettings({ shape: event.target.value }) : undefined}>
                    <option value="ROUND">Ronde</option>
                    <option value="SQUARE">Carrée</option>
                    <option value="RECTANGLE">Rectangle</option>
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Zone
                  <select className="control mt-1 w-full" value={selectedTable.zone} onChange={(event) => updateTableMutation.mutate({ tableId: selectedTable.id, data: { zone: event.target.value as TableZone } })}>
                    <option value="INDOOR">Salle</option>
                    <option value="TERRACE">Terrasse</option>
                    <option value="VIP">VIP</option>
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Taille visuelle · {Math.round((selectedTable.displayScale ?? 1) * 100)}%
	                  <input className="mt-3 w-full accent-moss" max="2.4" min="0.5" step="0.05" type="range" value={selectedTable.displayScale ?? 1} onChange={(event) => persistSelectedTableSettings({ displayScale: Number(event.target.value) })} />
                </label>
                <button className="secondary-button justify-center text-xs" type="button" onClick={() => applyDisplayScaleToCurrentRoom(selectedTable.displayScale ?? 1)}>
                  Appliquer cette taille à toutes les tables
                </button>
                <div className="grid grid-cols-2 gap-2 rounded-md bg-linen p-2">
                  <button className="secondary-button h-9 px-2 text-xs" type="button" onClick={rememberSelectedTableBasePosition}>
                    Définir comme base
                  </button>
                  <button
                    className="secondary-button h-9 px-2 text-xs"
                    disabled={!tableBasePositions[selectedTable.id]}
                    type="button"
                    onClick={restoreSelectedTableBasePosition}
                  >
                    Remettre à la base
                  </button>
                </div>
                <label className="text-sm font-bold">
                  Priorité auto
                  <select className="control mt-1 w-full" value={selectedTable.autoAssignPriority ?? "DISABLED"} onChange={(event) => isTableAutoAssignPriority(event.target.value) ? persistSelectedTableSettings({ autoAssignPriority: event.target.value }) : undefined}>
                    <option value="DISABLED">Désactivé</option>
                    <option value="LOW">Faible</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="HIGH">Haute</option>
	                  </select>
	                </label>
                <div>
                  <p className="text-sm font-bold">Préférences de table</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      ["QUIET", "Calme"],
                      ["ACCESSIBLE", "PMR"],
                      ["KIDS", "Enfants bas âge"],
                      ["WINDOW", "Fenêtre"]
                    ].map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 rounded-md bg-linen px-3 py-2 text-xs font-black">
                        <input
                          checked={(selectedTable.features ?? []).includes(value as TableFeature)}
                          className="h-4 w-4 accent-moss"
                          type="checkbox"
                          onChange={() => toggleSelectedTableFeature(value as TableFeature)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
	                <div className="grid grid-cols-2 gap-2">
	                  <button className="secondary-button h-9 px-3 text-xs" disabled={pendingDuplicateTableId === selectedTable.id} type="button" onClick={() => duplicateTable(selectedTable)}>
                      {pendingDuplicateTableId === selectedTable.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      Dupliquer
                    </button>
	                  <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => handleTableViewPhoto(selectedTable)}>
	                    <Image className="h-4 w-4" />
	                    Vue client
	                  </button>
	                  <button className="danger-button col-span-2 h-9 justify-center px-3 text-xs" type="button" onClick={() => deleteTable(selectedTable.id)}>Supprimer</button>
	                </div>
              </div>
            </div>
          ) : null}

          {activeToolPanel === "view" && tableViewEditorTable ? (
            <div className="absolute right-20 top-4 z-30 max-h-[calc(100%-2rem)] w-[640px] max-w-[calc(100%-6rem)] overflow-auto rounded-xl border border-ink/10 bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Vue de la table</p>
                  <h3 className="text-lg font-black">Vue client · {tableViewEditorTable.label}</h3>
                </div>
                <button aria-label="Fermer le panneau" className="icon-button h-9 w-9" title="Fermer" type="button" onClick={() => setActiveToolPanel(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,6.1in)_220px]">
                <div
                  className={clsx(
                    "relative aspect-[16/10] w-full max-w-[6.1in] overflow-hidden rounded-md border border-ink/10 bg-linen",
                    tableViewEditorTable.viewImageUrl && "cursor-move"
                  )}
                  onPointerDown={handleTableViewCropPointerDown}
                  onPointerMove={handleTableViewCropPointerMove}
                  onPointerUp={handleTableViewCropPointerEnd}
                  onPointerCancel={handleTableViewCropPointerEnd}
                >
                  {tableViewEditorTable.viewImageUrl ? (
                    <img
                      alt=""
                      className="h-full w-full select-none object-cover"
                      draggable={false}
                      src={tableViewEditorTable.viewImageUrl}
                      style={tableViewImageStyle(tableViewCropDraft)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-ink/55">
                      Aucune photo de vue n’est encore associée à cette table.
                    </div>
                  )}
                  {tableViewEditorTable.viewImageUrl ? (
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs font-bold text-ink shadow-sm">
                      <Move className="h-3.5 w-3.5 text-moss" />
                      Glisser pour cadrer
                    </div>
                  ) : null}
                </div>
                <div className="grid content-start gap-3">
                  <button className="secondary-button justify-center" type="button" onClick={() => openTableViewImagePicker(tableViewEditorTable.id)}>
                    <ImagePlus className="h-4 w-4" />
                    Modifier
                  </button>
                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-ink/10 bg-linen px-3 text-sm font-bold text-ink">
                    <Crop className="h-4 w-4 text-moss" />
                    Cadrer la photo
                  </span>
                  <label className="text-sm font-semibold text-ink">
                    Gauche / droite
                    <input className="mt-2 w-full accent-moss" disabled={!tableViewEditorTable.viewImageUrl} max={100} min={0} step={1} type="range" value={tableViewCropDraft.x} onChange={(event) => updateTableViewCropDraft({ x: Number(event.target.value) })} />
                  </label>
                  <label className="text-sm font-semibold text-ink">
                    Haut / bas
                    <input className="mt-2 w-full accent-moss" disabled={!tableViewEditorTable.viewImageUrl} max={100} min={0} step={1} type="range" value={tableViewCropDraft.y} onChange={(event) => updateTableViewCropDraft({ y: Number(event.target.value) })} />
                  </label>
                  <label className="text-sm font-semibold text-ink">
                    Zoom photo
                    <input className="mt-2 w-full accent-moss" disabled={!tableViewEditorTable.viewImageUrl} max={240} min={100} step={5} type="range" value={Math.round(tableViewCropDraft.zoom * 100)} onChange={(event) => updateTableViewCropDraft({ zoom: Number(event.target.value) / 100 })} />
                  </label>
                  <button className="secondary-button justify-center" disabled={!tableViewEditorTable.viewImageUrl} type="button" onClick={() => setTableViewCropDraft(defaultTableViewImageCrop())}>
                    Recentrer
                  </button>
                  <button className="primary-button justify-center" disabled={!tableViewEditorTable.viewImageUrl} type="button" onClick={validateTableViewCrop}>
                    <Check className="h-4 w-4" />
                    Valider
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {activeToolPanel === "combinations" ? (
            <div className="absolute right-20 top-4 z-30 max-h-[calc(100%-2rem)] w-[410px] max-w-[calc(100%-6rem)] overflow-auto rounded-xl border border-ink/10 bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Combinaisons de tables</h3>
                  <p className="text-xs font-semibold text-ink/55">Sélectionnez plusieurs tables directement sur le plan.</p>
                </div>
                <button aria-label="Fermer le panneau" className="icon-button h-9 w-9" title="Fermer" type="button" onClick={() => setActiveToolPanel(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3">
                <InputField label="Nom de la combinaison" name="combinationLabel" value={combinationLabel} onChange={setCombinationLabel} />
                <label className="text-sm font-bold">
                  Sens de disposition
                  <select
                    className="control mt-1 w-full"
                    value={combinationPlacement}
                    onChange={(event) => setCombinationPlacement(event.target.value as CombinationPlacement)}
                  >
                    {Object.entries(combinationPlacementLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <div className="rounded-lg bg-linen p-3">
                  <p className="text-sm font-black">{combinationTableIds.length} table(s) sélectionnée(s)</p>
                  <p className="mt-1 text-xs font-semibold text-ink/55">
                    {combinationTableIds
                      .map((tableId) => roomTables.find((table) => table.id === tableId)?.label)
                      .filter(Boolean)
                      .join(" + ") || "Cliquez sur les tables à combiner."}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button className="secondary-button h-9 px-2 text-xs" disabled={combinationTableIds.length < 2} type="button" onClick={() => alignCombinationTables("horizontal")}>
                    Aligner
                  </button>
                  <button className="secondary-button h-9 px-2 text-xs" disabled={combinationTableIds.length < 2} type="button" onClick={() => alignCombinationTables("horizontal")}>
                    Coller
                  </button>
                  <button className="secondary-button h-9 px-2 text-xs" type="button" onClick={() => {
                    setCombinationTableIds([]);
                    clearCombinationDraft();
                  }}>
                    Vider
                  </button>
                </div>
                {Object.keys(combinationDraftPositions).length > 0 ? (
                  <div className="grid gap-2 rounded-lg border border-moss/15 bg-moss/5 p-2">
                    <p className="text-xs font-semibold leading-5 text-moss">
                      Aperçu uniquement : cette disposition s’appliquera visuellement pendant une réservation combinée.
                    </p>
                    <button className="secondary-button h-9 justify-center px-2 text-xs" type="button" onClick={clearCombinationDraft}>
                      Masquer l’aperçu
                    </button>
                  </div>
                ) : null}
                <button className="primary-button justify-center" disabled={combinationTableIds.length < 2} type="button" onClick={createTableCombination}>
                  <Link2 className="h-4 w-4" />
                  Créer la combinaison
                </button>
                <div className="border-t border-ink/10 pt-3">
                  <p className="text-sm font-black">Combinaisons possibles</p>
                  <div className="mt-2 grid gap-2">
                    {tableCombinations.length > 0 ? tableCombinations.map((combination) => (
                      <div key={combination.id} className="grid gap-3 rounded-md bg-linen p-3 text-sm">
                        <div>
                          <p className="font-black">{combination.label}</p>
                          <p className="mt-1 text-xs font-semibold text-ink/55">
                            {combination.tableIds
                              .map((tableId) => tables.find((table) => table.id === tableId)?.label)
                              .filter(Boolean)
                              .join(" + ")}
                            {" · "}
                            {combinationPlacementLabels[combination.placement ?? "RIGHT"]}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <select
                              className="control h-8 w-full text-xs"
                              value={combination.placement ?? "RIGHT"}
                              onChange={(event) => updateTableCombinationPlacement(combination, event.target.value as CombinationPlacement)}
                            >
                              {Object.entries(combinationPlacementLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <p className="mt-1 flex items-start gap-1 text-[11px] font-semibold leading-4 text-ink/50">
                              <Info className="mt-0.5 h-3 w-3 shrink-0" />
                              Placement visuel temporaire de la table combinée : à droite, à gauche, au-dessus ou en dessous.
                            </p>
                          </div>
                          <button className="danger-button h-8 px-2 text-xs" type="button" onClick={() => removeTableCombination(combination.id)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )) : (
                      <p className="rounded-md bg-linen p-3 text-sm font-semibold text-ink/55">Aucune combinaison enregistrée.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeToolPanel === "rooms" ? (
            <div className="absolute right-20 top-4 z-30 max-h-[calc(100%-2rem)] w-[820px] max-w-[calc(100%-6rem)] overflow-auto rounded-xl border border-ink/10 bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Plans et étages</h3>
                  <p className="text-xs font-semibold text-ink/55">Cliquez sur un plan pour l’ouvrir, puis modifiez ses paramètres à droite.</p>
                </div>
                <button aria-label="Fermer le panneau" className="icon-button h-9 w-9" title="Fermer" type="button" onClick={() => setActiveToolPanel(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="grid content-start gap-2">
                  {rooms.map((room) => {
                    const count = tables.filter((table) => (effectiveTableRooms[table.id] ?? defaultRoomId) === room.id).length;

                    return (
                      <button
                        key={room.id}
                        className={clsx(
                          "grid gap-3 rounded-lg border p-2 text-left transition focus-ring",
                          room.id === currentRoom.id ? "border-moss bg-moss/5" : "border-ink/10 bg-linen hover:bg-sage/70"
                        )}
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setEditingRoomId(room.id);
                        }}
                      >
                        <span className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
                          <span
                            className="h-20 rounded-md border border-white/70 bg-white bg-cover bg-center shadow-inner"
                            style={{
                              backgroundImage: room.plan2dDataUrl
                                ? `url(${room.plan2dDataUrl})`
                                : "linear-gradient(135deg, #f7f4eb 0 32%, #d8bd98 32% 48%, #f1ece1 48% 70%, #dfeee9 70% 100%)"
                            }}
                          />
                          <span className="min-w-0 py-1">
                            <span className="block truncate font-black">{room.name}</span>
                            <span className="block text-xs font-semibold text-ink/50">{roomTypeLabels[room.type]} · {count} table(s)</span>
                            <span className="mt-2 flex flex-wrap gap-1">
                              <span className={clsx("inline-flex rounded-full px-2 py-1 text-[10px] font-black", room.active ? "bg-moss/10 text-moss" : "bg-red-50 text-red-700")}>
                                {room.active ? "Actif" : "Désactivé"}
                              </span>
                              {room.scheduleEnabled ? <span className="inline-flex rounded-full bg-gold/15 px-2 py-1 text-[10px] font-black text-ink">Programmé</span> : null}
                              {room.locked ? <span className="inline-flex rounded-full bg-ink/10 px-2 py-1 text-[10px] font-black text-ink">Verrouillé</span> : null}
                              <span className={clsx("inline-flex rounded-full px-2 py-1 text-[10px] font-black", room.draftStatus === "DRAFT" ? "bg-orange-50 text-orange-700" : "bg-sage text-moss")}>
                                {room.draftStatus === "DRAFT" ? "Brouillon" : "Publié"}
                              </span>
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}

                  <div className="mt-2">
                    <button className="secondary-button w-full" type="button" onClick={() => setShowCreateRoom((current) => !current)}>
                      <Plus className="h-4 w-4" />
                      Créer une salle / étage
                    </button>
                    {showCreateRoom ? (
                      <div className="mt-3 grid gap-3 rounded-lg border border-moss/20 bg-linen p-3">
                        <InputField label="Nom de la salle" name="roomName" value={newRoomName} onChange={setNewRoomName} />
                        <label className="text-sm font-bold">
                          Type
                          <select className="control mt-1 w-full" value={newRoomType} onChange={(event) => setNewRoomType(event.target.value as FloorRoom["type"])}>
                            {Object.entries(roomTypeLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </label>
                        <button className="primary-button" type="button" onClick={createRoom}>Créer</button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg bg-linen p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black">{editingRoom.name}</p>
                      <p className="text-xs font-semibold text-ink/55">{roomTypeLabels[editingRoom.type]} · paramètres du plan</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => updateRoom(editingRoom.id, { active: !editingRoom.active })}>
                        {editingRoom.active ? "Désactiver" : "Activer"}
                      </button>
                      <button className="icon-button h-9 w-9 text-red-700" title="Supprimer le plan" type="button" onClick={() => deleteRoom(editingRoom.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <InputField label="Nom du plan" name="roomEditName" value={editingRoom.name} onChange={(value) => updateRoom(editingRoom.id, { name: value })} />
                    <label className="text-sm font-bold">
                      Type
                      <select className="control mt-1 w-full" value={editingRoom.type} onChange={(event) => updateRoom(editingRoom.id, { type: event.target.value as FloorRoom["type"] })}>
                        {Object.entries(roomTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
	                    <button className="secondary-button justify-center text-xs" type="button" onClick={openRestaurantPreview}>
                      <Eye className="h-4 w-4" />
                      Aperçu client
                    </button>
                    <button className="secondary-button justify-center text-xs" type="button" onClick={() => updateRoom(editingRoom.id, { locked: !editingRoom.locked })}>
                      {editingRoom.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {editingRoom.locked ? "Déverrouiller" : "Verrouiller"}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="secondary-button h-9 cursor-pointer px-3 text-xs">
                      <Upload className="h-4 w-4" />
                      Plan 2D
                      <input accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" type="file" onChange={(event) => void handleRoomPlanUpload(event.target.files?.[0], "2d", editingRoom.id)} />
                    </label>
                    <label className="secondary-button h-9 cursor-pointer px-3 text-xs">
                      <Upload className="h-4 w-4" />
                      Plan 3D
                      <input accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="sr-only" type="file" onChange={(event) => void handleRoomPlanUpload(event.target.files?.[0], "3d", editingRoom.id)} />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 rounded-md border border-ink/10 bg-white p-3">
                    <label className="flex items-center justify-between gap-3 text-sm font-bold">
                      Statut brouillon
                      <select className="control h-9 w-36" value={editingRoom.draftStatus ?? "PUBLISHED"} onChange={(event) => updateRoom(editingRoom.id, { draftStatus: event.target.value as FloorRoom["draftStatus"] })}>
                        <option value="PUBLISHED">Publié</option>
                        <option value="DRAFT">Brouillon</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between gap-3 text-sm font-bold">
                      Programmer ce plan
                      <input checked={editingRoom.scheduleEnabled === true} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => updateRoom(editingRoom.id, { scheduleEnabled: event.target.checked })} />
                    </label>
                    {editingRoom.scheduleEnabled ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <InputField label="Date début" name="roomStartDate" type="date" value={editingRoom.activeStartDate ?? ""} onChange={(value) => updateRoom(editingRoom.id, { activeStartDate: value })} />
                        <InputField label="Heure début" name="roomStartTime" type="time" value={editingRoom.activeStartTime ?? ""} onChange={(value) => updateRoom(editingRoom.id, { activeStartTime: value })} />
                        <InputField label="Date fin" name="roomEndDate" type="date" value={editingRoom.activeEndDate ?? ""} onChange={(value) => updateRoom(editingRoom.id, { activeEndDate: value })} />
                        <InputField label="Heure fin" name="roomEndTime" type="time" value={editingRoom.activeEndTime ?? ""} onChange={(value) => updateRoom(editingRoom.id, { activeEndTime: value })} />
                      </div>
                    ) : null}
                    <p className="text-xs font-semibold text-ink/55">
                      Le moteur de réservation pourra sélectionner automatiquement ce plan de salle selon la date et les horaires.
                    </p>
                  </div>
                  <div className="mt-3 rounded-md border border-ink/10 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black">Historique du plan</p>
                        <p className="text-xs font-semibold text-ink/55">Enregistrez une version avant une grosse modification.</p>
                      </div>
                      <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={savePlanHistorySnapshot}>
                        Sauvegarder
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {planHistory.length > 0 ? planHistory.map((snapshot) => (
                        <div key={snapshot.id} className="flex items-center justify-between gap-2 rounded-md bg-linen p-2 text-xs font-semibold">
                          <span>{snapshot.label}</span>
                          <button className="secondary-button h-8 px-2 text-xs" type="button" onClick={() => restorePlanHistorySnapshot(snapshot)}>
                            Restaurer
                          </button>
                        </div>
                      )) : (
                        <p className="rounded-md bg-linen p-2 text-xs font-semibold text-ink/55">Aucune version sauvegardée.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelHeader
            title="Liste des tables"
            description="Vue rapide de toutes les tables, avec tri par nom ou par salle et filtres par préférence."
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
              Trier
              <select className="control mt-1 h-9 w-36" value={tableListSort} onChange={(event) => setTableListSort(event.target.value as "label" | "room")}>
                <option value="label">Par nom</option>
                <option value="room">Par salle</option>
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
              Salle
              <select className="control mt-1 h-9 w-40" value={tableListRoomFilter} onChange={(event) => setTableListRoomFilter(event.target.value)}>
                <option value="ALL">Toutes</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
              Filtre
              <select
                className="control mt-1 h-9 w-40"
                value={tableListFeatureFilter}
                onChange={(event) => setTableListFeatureFilter(event.target.value as "ALL" | TableFeature)}
              >
                <option value="ALL">Toutes</option>
                {Object.entries(tableFeatureLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-ink/10">
          <div className="min-w-[820px]">
          <div className="grid grid-cols-[1fr_120px_120px_1fr_110px] gap-3 bg-linen px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/45">
            <span>Table</span>
            <span>Couverts</span>
            <span>Zone</span>
            <span>Préférences</span>
            <span className="text-right">Action</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {filteredTableList.length > 0 ? filteredTableList.map((table) => {
              const room = rooms.find((item) => item.id === (effectiveTableRooms[table.id] ?? defaultRoomId));
              const features = table.features ?? [];

              return (
                <div key={table.id} className="border-t border-ink/10">
                  <article className="grid grid-cols-[1fr_120px_120px_1fr_110px] items-center gap-3 px-3 py-2 text-sm">
                    <button className="min-w-0 text-left" type="button" onClick={() => openTableSettings(table)}>
                      <span className="block truncate font-black text-ink">{table.label}</span>
                      <span className="block truncate text-xs font-semibold text-ink/50">{room?.name ?? "Plan principal"} · {tableShapeLabels[table.shape ?? "ROUND"]}</span>
                    </button>
                    <span className="font-bold text-ink/70">{table.capacity}</span>
                    <span className="rounded-full bg-sage px-2 py-1 text-center text-xs font-black text-moss">{tableZoneLabels[table.zone]}</span>
                    <span className="flex flex-wrap gap-1">
                      {features.length > 0 ? features.map((feature) => (
                        <span key={feature} className="rounded-full bg-linen px-2 py-1 text-[11px] font-black text-ink/60">
                          {tableFeatureLabels[feature]}
                        </span>
                      )) : (
                        <span className="text-xs font-semibold text-ink/40">Aucune</span>
                      )}
                    </span>
                    <button className="secondary-button h-8 justify-center px-2 text-xs" data-table-inline-trigger="true" type="button" onClick={() => openInlineTableEditor(table)}>
                      Modifier
                    </button>
                  </article>
                  {expandedTableId === table.id && tableInlineDraft ? (
                    <div ref={inlineTableEditorRef} className="grid gap-3 bg-sage/30 px-3 py-3 md:grid-cols-[1fr_90px_140px_140px_140px_1fr_44px]">
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
                        Libellé
                        <input className="control mt-1 h-9 w-full" value={tableInlineDraft.label} onChange={(event) => updateInlineTableDraft({ label: event.target.value })} />
                      </label>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
                        Places
                        <input className="control mt-1 h-9 w-full" min={1} type="number" value={tableInlineDraft.capacity} onChange={(event) => updateInlineTableDraft({ capacity: Number(event.target.value) || 1 })} />
                      </label>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
                        Salle
                        <select className="control mt-1 h-9 w-full" value={tableInlineDraft.roomId} onChange={(event) => updateInlineTableDraft({ roomId: event.target.value })}>
                          {rooms.map((roomOption) => (
                            <option key={roomOption.id} value={roomOption.id}>{roomOption.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
                        Forme
                        <select className="control mt-1 h-9 w-full" value={tableInlineDraft.shape} onChange={(event) => updateInlineTableDraft({ shape: event.target.value as TableShape })}>
                          {Object.entries(tableShapeLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">
                        Zone
                        <select className="control mt-1 h-9 w-full" value={tableInlineDraft.zone} onChange={(event) => updateInlineTableDraft({ zone: event.target.value as TableZone })}>
                          {Object.entries(tableZoneLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/50">Filtres</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(tableFeatureLabels).map(([value, label]) => (
                            <label key={value} className="flex h-9 items-center gap-1 rounded-md bg-white px-2 text-[11px] font-black text-ink/65">
                              <input
                                checked={tableInlineDraft.features.includes(value as TableFeature)}
                                className="h-3.5 w-3.5 accent-moss"
                                type="checkbox"
                                onChange={() => toggleInlineTableFeature(value as TableFeature)}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button className="icon-button mt-5 h-9 w-9 bg-moss text-white hover:bg-moss/90" title="Valider" type="button" onClick={validateInlineTableEdit}>
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            }) : (
              <p className="border-t border-ink/10 p-4 text-sm font-semibold text-ink/55">Aucune table ne correspond aux filtres.</p>
            )}
          </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <PanelHeader
          title="Combinaisons des tables"
          description="Définissez quelles tables peuvent être associées pour créer une grande tablée."
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-lg bg-linen p-3">
            <h3 className="text-sm font-black">Créer une combinaison rapide</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Table principale
                <select className="control mt-1 w-full" value={combinationSourceTableId} onChange={(event) => setCombinationSourceTableId(event.target.value)}>
                  <option value="">Sélectionner</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>{table.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Peut être combinée avec
                <select className="control mt-1 w-full" value={combinationPartnerTableId} onChange={(event) => setCombinationPartnerTableId(event.target.value)}>
                  <option value="">Sélectionner</option>
                  {tables
                    .filter((table) => table.id !== combinationSourceTableId)
                    .map((table) => (
                      <option key={table.id} value={table.id}>{table.label}</option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Sens de disposition
                <select className="control mt-1 w-full" value={combinationPlacement} onChange={(event) => setCombinationPlacement(event.target.value as CombinationPlacement)}>
                  {Object.entries(combinationPlacementLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="primary-button mt-3 justify-center" type="button" onClick={createPairCombination}>
              <Link2 className="h-4 w-4" />
              Enregistrer la combinaison
            </button>
          </div>

          <div className="rounded-lg border border-ink/10 p-3">
            <h3 className="text-sm font-black">Combinaisons possibles</h3>
            <div className="mt-3 grid max-h-[280px] gap-2 overflow-y-auto">
              {tableCombinations.length > 0 ? tableCombinations.map((combination) => (
                <article key={combination.id} className="grid gap-3 rounded-md bg-linen p-3 text-sm">
                  <div>
                    <p className="font-black text-ink">{combination.label}</p>
                    <p className="mt-1 text-xs font-semibold text-ink/55">
                      {combination.tableIds
                        .map((tableId) => tables.find((table) => table.id === tableId)?.label)
                        .filter(Boolean)
                        .join(" + ")}
                      {" · "}
                      {combinationPlacementLabels[combination.placement ?? "RIGHT"]}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <select
                        className="control h-8 w-full text-xs"
                        value={combination.placement ?? "RIGHT"}
                        onChange={(event) => updateTableCombinationPlacement(combination, event.target.value as CombinationPlacement)}
                      >
                        {Object.entries(combinationPlacementLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <p className="mt-1 flex items-start gap-1 text-[11px] font-semibold leading-4 text-ink/50">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" />
                        Ce choix concerne uniquement l’affichage visuel temporaire de la combinaison.
                      </p>
                    </div>
                    <button className="danger-button h-8 px-2 text-xs" type="button" onClick={() => removeTableCombination(combination.id)}>
                      Supprimer
                    </button>
                  </div>
                </article>
              )) : (
                <p className="rounded-md bg-linen p-3 text-sm font-semibold text-ink/55">Aucune combinaison enregistrée.</p>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 rounded-md bg-sage/60 p-3 text-xs font-semibold leading-5 text-moss">
          Les combinaisons enregistrées ne déplacent pas le plan de salle. Elles servent au moteur de réservation pour associer temporairement plusieurs tables quand aucun seul emplacement ne suffit.
        </p>
      </section>

    </div>
  );
}

type OpeningServiceCount = 1 | 2 | 3;

type SpecialOpeningPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  serviceCount: OpeningServiceCount;
  openingHours: OpeningHours;
};

function readSpecialOpeningPeriods(settings: Record<string, unknown>, fallbackOpeningHours: OpeningHours): SpecialOpeningPeriod[] {
  const value = settings.specialOpeningPeriods;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((period): period is Record<string, unknown> => Boolean(period) && typeof period === "object")
    .map((period, index) => ({
      id: typeof period.id === "string" ? period.id : `period-${index}`,
      name: typeof period.name === "string" && period.name.trim() ? period.name : "Période spéciale",
      startDate: typeof period.startDate === "string" ? period.startDate : today(),
      endDate: typeof period.endDate === "string" ? period.endDate : today(),
      active: period.active !== false,
      serviceCount: period.serviceCount === 1 || period.serviceCount === 2 || period.serviceCount === 3 ? period.serviceCount : 2,
      openingHours: isOpeningHours(period.openingHours) ? period.openingHours : fallbackOpeningHours
    }));
}

function isOpeningHours(value: unknown): value is OpeningHours {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneOpeningHours(openingHours: OpeningHours): OpeningHours {
  return JSON.parse(JSON.stringify(openingHours)) as OpeningHours;
}

function openingHoursForServiceCount(openingHours: OpeningHours, serviceCount: OpeningServiceCount): OpeningHours {
  return Object.fromEntries(
    Object.entries(openingHours).map(([day, hours]) => [
      day,
      {
        ...hours,
        ...(serviceCount < 3 ? { morningOpen: undefined, morningClose: undefined } : {}),
        secondServiceEnabled: serviceCount >= 2,
        ...(serviceCount < 2 ? { secondOpen: undefined, secondClose: undefined } : {}),
        thirdServiceEnabled: false,
        thirdOpen: undefined,
        thirdClose: undefined
      }
    ])
  ) as OpeningHours;
}

function specialOpeningHoursForServiceCount(openingHours: OpeningHours, serviceCount: OpeningServiceCount): OpeningHours {
  return Object.fromEntries(
    Object.entries(openingHours).map(([day, hours]) => [
      day,
      {
        ...hours,
        ...(serviceCount < 3 ? { morningOpen: undefined, morningClose: undefined } : {}),
        ...(serviceCount < 2 ? { secondServiceEnabled: false, secondOpen: undefined, secondClose: undefined } : {}),
        thirdServiceEnabled: false,
        thirdOpen: undefined,
        thirdClose: undefined
      }
    ])
  ) as OpeningHours;
}

function openingServiceCountFromRestaurant(restaurant: Restaurant): OpeningServiceCount {
  const configured = restaurant.settings.openingServiceCount;

  if (configured === 1 || configured === 2 || configured === 3) {
    return configured;
  }

  const dayValues = Object.values(restaurant.openingHours);
  const hasMorning = dayValues.some((hours) => Boolean(hours.morningOpen || hours.morningClose));
  const hasThird = dayValues.some((hours) => Boolean(hours.thirdServiceEnabled || hours.thirdOpen || hours.thirdClose));
  const hasDinner = dayValues.some((hours) => Boolean(hours.secondServiceEnabled || hours.secondOpen || hours.secondClose));

  if (hasMorning || hasThird) {
    return 3;
  }

  return hasDinner ? 2 : 1;
}

function openingDaySummary(hours: OpeningHours[string] | undefined, serviceCount: OpeningServiceCount) {
  if (!hours || hours.closed) {
    return "Fermé";
  }

  const windows = [
    serviceCount === 3 && hours.morningOpen && hours.morningClose ? `Matin ${hours.morningOpen} - ${hours.morningClose}` : null,
    hours.lunchServiceEnabled === false ? null : `Midi ${hours.open} - ${hours.close}`,
    serviceCount >= 2 && hours.secondServiceEnabled !== false ? `Soir ${hours.secondOpen ?? "19:00"} - ${hours.secondClose ?? "22:00"}` : null
  ].filter(Boolean);

  return windows.length > 0 ? windows.join(" · ") : "Fermé";
}

function OpeningHoursPanel({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const [serviceCount, setServiceCount] = useState<OpeningServiceCount>(() => openingServiceCountFromRestaurant(restaurant));
  const [dayShiftEnabled, setDayShiftEnabled] = useState(Boolean(restaurant.settings.shiftEarlyMorningToPreviousDay));
  const [openingHoursDraft, setOpeningHoursDraft] = useState<OpeningHours>(() => cloneOpeningHours(restaurant.openingHours));
  const [periods, setPeriods] = useState<SpecialOpeningPeriod[]>(() =>
    readSpecialOpeningPeriods(restaurant.settings, cloneOpeningHours(restaurant.openingHours))
  );
  const [periodDraft, setPeriodDraft] = useState<SpecialOpeningPeriod | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const openingSnapshot = useMemo(
    () =>
      JSON.stringify({
        openingHours: openingHoursForServiceCount(openingHoursDraft, serviceCount),
        openingServiceCount: serviceCount,
        shiftEarlyMorningToPreviousDay: dayShiftEnabled,
        specialOpeningPeriods: periods.map((period) => ({
          ...period,
          openingHours: specialOpeningHoursForServiceCount(period.openingHours, period.serviceCount)
        }))
      }),
    [dayShiftEnabled, openingHoursDraft, periods, serviceCount]
  );
  const initialOpeningSnapshot = useMemo(
    () =>
      JSON.stringify({
        openingHours: openingHoursForServiceCount(cloneOpeningHours(restaurant.openingHours), openingServiceCountFromRestaurant(restaurant)),
        openingServiceCount: openingServiceCountFromRestaurant(restaurant),
        shiftEarlyMorningToPreviousDay: Boolean(restaurant.settings.shiftEarlyMorningToPreviousDay),
        specialOpeningPeriods: readSpecialOpeningPeriods(restaurant.settings, cloneOpeningHours(restaurant.openingHours)).map((period) => ({
          ...period,
          openingHours: specialOpeningHoursForServiceCount(period.openingHours, period.serviceCount)
        }))
      }),
    [restaurant]
  );
  const [savedOpeningSnapshot, setSavedOpeningSnapshot] = useState(initialOpeningSnapshot);
  const hasUnsavedOpeningChanges = openingSnapshot !== savedOpeningSnapshot;

  const saveOpeningHoursMutation = useMutation({
    mutationFn: () => {
      const nextOpeningHours = openingHoursForServiceCount(openingHoursDraft, serviceCount);
      const nextPeriods = periods.map((period) => ({
        ...period,
        openingHours: specialOpeningHoursForServiceCount(period.openingHours, period.serviceCount)
      }));

      return apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          openingHours: nextOpeningHours,
          settings: {
            ...restaurant.settings,
            openingServiceCount: serviceCount,
            shiftEarlyMorningToPreviousDay: dayShiftEnabled,
            specialOpeningPeriods: nextPeriods
          }
        })
      });
    },
    onSuccess: () => {
      setSaveMessage("Modification effectuée");
      setSavedOpeningSnapshot(openingSnapshot);
      void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
      window.setTimeout(() => setSaveMessage(null), 2500);
    },
    onError: (error) => {
      setSaveMessage(error instanceof Error ? error.message : "Impossible d’enregistrer les horaires.");
    }
  });

  useEffect(() => {
    setSavedOpeningSnapshot(initialOpeningSnapshot);
  }, [initialOpeningSnapshot]);

  useEffect(() => {
    if (!hasUnsavedOpeningChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedOpeningChanges]);

  function updateOpeningHour(day: string, updates: Partial<OpeningHours[string]>) {
    setOpeningHoursDraft((current) => ({
      ...current,
      [day]: {
        ...(current[day] ?? { open: "12:00", close: "14:00" }),
        ...updates
      }
    }));
  }

  function updatePeriodDraft(updates: Partial<SpecialOpeningPeriod>) {
    setPeriodDraft((current) => current ? { ...current, ...updates } : current);
  }

  function updatePeriodDay(day: string, updates: Partial<OpeningHours[string]>) {
    setPeriodDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        openingHours: {
          ...current.openingHours,
          [day]: {
            ...(current.openingHours[day] ?? { open: "12:00", close: "14:00" }),
            ...updates
          }
        }
      };
    });
  }

  function createPeriod() {
    setPeriodDraft({
      id: `period-${Date.now()}`,
      name: "",
      startDate: today(),
      endDate: today(),
      active: true,
      serviceCount,
      openingHours: cloneOpeningHours(openingHoursDraft)
    });
  }

  function savePeriod() {
    if (!periodDraft) {
      return;
    }

    const nextPeriod = {
      ...periodDraft,
      name: periodDraft.name.trim() || "Période spéciale"
    };

    setPeriods((current) => {
      const exists = current.some((period) => period.id === nextPeriod.id);

      return exists
        ? current.map((period) => period.id === nextPeriod.id ? nextPeriod : period)
        : [...current, nextPeriod];
    });
    setPeriodDraft(null);
  }

  function editPeriod(period: SpecialOpeningPeriod) {
    setPeriodDraft({
      ...period,
      openingHours: cloneOpeningHours(period.openingHours)
    });
  }

  function removePeriod(periodId: string) {
    setPeriods((current) => current.filter((period) => period.id !== periodId));
    setPeriodDraft((current) => current?.id === periodId ? null : current);
  }

  function togglePeriod(periodId: string) {
    setPeriods((current) =>
      current.map((period) => period.id === periodId ? { ...period, active: !period.active } : period)
    );
  }

  function discardOpeningChanges() {
    const nextServiceCount = openingServiceCountFromRestaurant(restaurant);
    setServiceCount(nextServiceCount);
    setDayShiftEnabled(Boolean(restaurant.settings.shiftEarlyMorningToPreviousDay));
    setOpeningHoursDraft(cloneOpeningHours(restaurant.openingHours));
    setPeriods(readSpecialOpeningPeriods(restaurant.settings, cloneOpeningHours(restaurant.openingHours)));
    setPeriodDraft(null);
    setSavedOpeningSnapshot(initialOpeningSnapshot);
    setSaveMessage("Modifications ignorées");
    window.setTimeout(() => setSaveMessage(null), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeader title="Heures d’ouverture" description="Configurez les services, les jours ouverts et les horaires utilisés par le moteur de réservation." />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {saveMessage ? <p className="text-sm font-black text-moss">{saveMessage}</p> : null}
          <button
            className="primary-button"
            disabled={saveOpeningHoursMutation.isPending}
            type="button"
            onClick={() => saveOpeningHoursMutation.mutate()}
          >
            {saveOpeningHoursMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {hasUnsavedOpeningChanges ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
          <p>Des modifications ne sont pas enregistrées. Voulez-vous les enregistrer ?</p>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={discardOpeningChanges}>Ignorer</button>
            <button
              className="primary-button h-9 px-3 text-xs"
              disabled={saveOpeningHoursMutation.isPending}
              type="button"
              onClick={() => saveOpeningHoursMutation.mutate()}
            >
              Enregistrer
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-950">
        <p className="font-black uppercase tracking-[0.12em] text-amber-700">Important</p>
        <p className="mt-1">
          L’heure de fermeture correspond à l’heure à laquelle la dernière réservation doit se terminer, et non à l’heure de dernière arrivée.
          Par exemple, si la fermeture est définie à 22 h et qu’une réservation dure 2 heures, la dernière arrivée possible sera à 20h.
        </p>
      </div>

      <div className="grid max-w-4xl gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
        <div className="rounded-md border border-ink/10 bg-linen p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Services proposés</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {[
              { value: 1 as const, label: "1 service", detail: "Midi" },
              { value: 2 as const, label: "2 services", detail: "Midi / soir" },
              { value: 3 as const, label: "3 services", detail: "Matin / midi / soir" }
            ].map((option) => (
              <button
                key={option.value}
                className={clsx(
                  "rounded-md border p-2 text-left text-xs font-black transition",
                  serviceCount === option.value ? "border-moss bg-moss text-white" : "border-ink/10 bg-white hover:bg-sage/60"
                )}
                type="button"
                onClick={() => setServiceCount(option.value)}
              >
                {option.label}
                <span className={clsx("mt-1 block text-xs font-semibold", serviceCount === option.value ? "text-white/75" : "text-ink/50")}>
                  {option.detail}
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="relative flex min-h-full items-center justify-center gap-3 rounded-md border border-ink/10 bg-linen p-3 text-center text-sm font-bold">
          <input
            checked={dayShiftEnabled}
            className="h-4 w-4 accent-moss"
            type="checkbox"
            onChange={(event) => setDayShiftEnabled(event.target.checked)}
          />
          <span>
            Jour décalé
            <span className="group relative ml-2 inline-flex align-middle">
              <Info className="h-4 w-4 text-moss" />
              <span className="pointer-events-none absolute right-0 top-6 z-10 hidden w-72 rounded-md border border-ink/10 bg-white p-3 text-xs font-semibold leading-5 text-ink/70 shadow-soft group-hover:block">
                Lorsque l’option est activée, les réservations dont l’heure de début se situe entre minuit et 5h du matin peuvent être rattachées à la journée précédente, à condition que les horaires d’ouverture le permettent. Cette option est particulièrement utile pour les établissements ouverts après minuit, comme les bars, clubs ou restaurants de nuit.
              </span>
            </span>
          </span>
        </label>
      </div>

      <div className="grid gap-3">
        {dayKeys.map((day) => {
          const hours = openingHoursDraft[day] ?? { open: "12:00", close: "14:00" };

          return (
            <div key={day} className="rounded-md border border-ink/10 bg-linen">
              <button
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                type="button"
                onClick={() => setExpandedDays((current) => ({ ...current, [day]: !current[day] }))}
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  <span className="text-sm font-black">{dayLabels[day]}</span>
                  <span className="min-w-0 text-sm font-semibold text-ink/60">{openingDaySummary(hours, serviceCount)}</span>
                </span>
                {expandedDays[day] ? <ChevronUp className="h-4 w-4 shrink-0 text-ink/50" /> : <ChevronDown className="h-4 w-4 shrink-0 text-ink/50" />}
              </button>
              {expandedDays[day] ? (
                <div className="border-t border-ink/10 p-3">
                  <label className="flex items-center gap-3 text-sm font-black">
                    <input
                      checked={!hours.closed}
                      className="h-4 w-4 accent-moss"
                      type="checkbox"
                      onChange={(event) => updateOpeningHour(day, { closed: !event.target.checked })}
                    />
                    Jour ouvert
                  </label>
                  {hours.closed ? (
                    <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-black text-ink/55">Fermé</p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                  {serviceCount === 3 ? (
                    <ServiceTimeRow
                      close={hours.morningClose ?? "11:00"}
                      disabled={false}
                      label="Matin"
                      open={hours.morningOpen ?? "08:00"}
                      onChange={(updates) => updateOpeningHour(day, updates)}
                      openKey="morningOpen"
                      closeKey="morningClose"
                    />
                  ) : null}
                  <ServiceTimeRow
                    close={hours.close}
                    disabled={false}
                    label="Midi"
                    open={hours.open}
                    onChange={(updates) => updateOpeningHour(day, updates)}
                    openKey="open"
                    closeKey="close"
                  />
                  {serviceCount >= 2 ? (
                    <ServiceTimeRow
                      close={hours.secondClose ?? "22:00"}
                      disabled={false}
                      label="Soir"
                      open={hours.secondOpen ?? "19:00"}
                      onChange={(updates) =>
                        updateOpeningHour(day, {
                          secondServiceEnabled: true,
                          ...updates
                        })
                      }
                      openKey="secondOpen"
                      closeKey="secondClose"
                    />
                  ) : null}
                </div>
              )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-ink/10 bg-linen p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Périodes spéciales</h3>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              Créez une période avec des horaires différents. Elle remplacera les horaires de base sur les dates indiquées.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={createPeriod}>
            <Plus className="h-4 w-4" />
            Créer une période
          </button>
        </div>

        {periodDraft ? (
          <div className="mt-4 rounded-md border border-moss/20 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <InputField defaultValue={periodDraft.name} label="Nom" name="periodName" onChange={(value) => updatePeriodDraft({ name: value })} />
              <InputField defaultValue={periodDraft.startDate} label="Date de début" name="periodStartDate" type="date" onChange={(value) => updatePeriodDraft({ startDate: value })} />
              <InputField defaultValue={periodDraft.endDate} label="Date de fin" name="periodEndDate" type="date" onChange={(value) => updatePeriodDraft({ endDate: value })} />
            </div>
            <div className="mt-4 rounded-md bg-linen p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Services de la période</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  { value: 1 as const, label: "1 service" },
                  { value: 2 as const, label: "2 services" },
                  { value: 3 as const, label: "3 services" }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={clsx(
                      "rounded-md border p-2 text-left text-xs font-black transition",
                      periodDraft.serviceCount === option.value ? "border-moss bg-moss text-white" : "border-ink/10 bg-white hover:bg-sage/60"
                    )}
                    type="button"
                    onClick={() => updatePeriodDraft({ serviceCount: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {dayKeys.map((day) => {
                const hours = periodDraft.openingHours[day] ?? { open: "12:00", close: "14:00" };

                return (
                  <div key={day} className="rounded-md bg-linen p-3">
                    <label className="flex items-center gap-3 text-sm font-black">
                      <input
                        checked={!hours.closed}
                        className="h-4 w-4 accent-moss"
                        type="checkbox"
                        onChange={(event) => updatePeriodDay(day, { closed: !event.target.checked })}
                      />
                      {dayLabels[day]}
                    </label>
                    {hours.closed ? (
                      <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-black text-ink/55">Fermé</p>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        {periodDraft.serviceCount === 3 ? (
                          <ServiceTimeRow
                            close={hours.morningClose ?? "11:00"}
                            closeKey="morningClose"
                            disabled={false}
                            enabled={Boolean(hours.morningOpen && hours.morningClose)}
                            label="Matin"
                            open={hours.morningOpen ?? "08:00"}
                            openKey="morningOpen"
                            onChange={(updates) => updatePeriodDay(day, updates)}
                            onEnabledChange={(enabled) =>
                              updatePeriodDay(day, {
                                morningOpen: enabled ? hours.morningOpen ?? "08:00" : undefined,
                                morningClose: enabled ? hours.morningClose ?? "11:00" : undefined
                              })
                            }
                          />
                        ) : null}
                        <ServiceTimeRow
                          close={hours.close}
                          closeKey="close"
                          disabled={false}
                          enabled={hours.lunchServiceEnabled !== false}
                          label="Midi"
                          open={hours.open}
                          openKey="open"
                          onChange={(updates) => updatePeriodDay(day, updates)}
                          onEnabledChange={(enabled) => updatePeriodDay(day, { lunchServiceEnabled: enabled })}
                        />
                        {periodDraft.serviceCount >= 2 ? (
                          <ServiceTimeRow
                            close={hours.secondClose ?? "22:00"}
                            closeKey="secondClose"
                            disabled={false}
                            enabled={Boolean(hours.secondServiceEnabled)}
                            label="Soir"
                            open={hours.secondOpen ?? "19:00"}
                            openKey="secondOpen"
                            onChange={(updates) =>
                              updatePeriodDay(day, {
                                secondServiceEnabled: true,
                                ...updates
                              })
                            }
                            onEnabledChange={(enabled) =>
                              updatePeriodDay(day, {
                                secondServiceEnabled: enabled,
                                secondOpen: enabled ? hours.secondOpen ?? "19:00" : hours.secondOpen,
                                secondClose: enabled ? hours.secondClose ?? "22:00" : hours.secondClose
                              })
                            }
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="secondary-button" type="button" onClick={() => setPeriodDraft(null)}>Annuler</button>
              <button className="primary-button" type="button" onClick={savePeriod}>Enregistrer la période</button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          {periods.length === 0 ? (
            <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink/60">Aucune période spécifique configurée.</p>
          ) : null}
          {periods.map((period) => (
            <div key={period.id} className="grid gap-3 rounded-md border border-ink/10 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="font-black">{period.name}</p>
                <p className="text-sm font-semibold text-ink/55">{formatPeriodDate(period.startDate)} au {formatPeriodDate(period.endDate)}</p>
                <span className={clsx("mt-2 inline-flex rounded-full px-2 py-1 text-xs font-black", period.active ? "bg-moss/10 text-moss" : "bg-ink/10 text-ink/50")}>
                  {period.active ? "Active" : "Désactivée"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => editPeriod(period)}>Modifier</button>
                <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => togglePeriod(period.id)}>
                  {period.active ? "Désactiver" : "Activer"}
                </button>
                <button className="danger-button h-9 px-3 text-xs" type="button" onClick={() => removePeriod(period.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function readVacationClosures(settings: Record<string, unknown>): VacationClosure[] {
  const value = settings.vacationClosures;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((closure): closure is Record<string, unknown> => Boolean(closure) && typeof closure === "object")
    .map((closure, index) => ({
      id: typeof closure.id === "string" ? closure.id : `closure-${index}`,
      startDate: typeof closure.startDate === "string" ? closure.startDate : today(),
      endDate: typeof closure.endDate === "string" ? closure.endDate : today(),
      label: typeof closure.label === "string" ? closure.label : "Fermeture",
      active: closure.active !== false
    }));
}

function ClosuresPanel({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const [closures, setClosures] = useState<VacationClosure[]>(() => readVacationClosures(restaurant.settings));
  const [closureDraft, setClosureDraft] = useState<VacationClosure | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const saveClosuresMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            ...restaurant.settings,
            vacationClosures: closures
          }
        })
      }),
    onSuccess: () => {
      setSaveMessage("Modification effectuée");
      void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
      window.setTimeout(() => setSaveMessage(null), 2500);
    },
    onError: (error) => {
      setSaveMessage(error instanceof Error ? error.message : "Impossible d’enregistrer les congés.");
    }
  });

  function createClosure() {
    setClosureDraft({
      id: `closure-${Date.now()}`,
      startDate: today(),
      endDate: today(),
      label: "",
      active: true
    });
  }

  function updateClosureDraft(updates: Partial<VacationClosure>) {
    setClosureDraft((current) => current ? { ...current, ...updates } : current);
  }

  function saveClosureDraft() {
    if (!closureDraft) {
      return;
    }

    const nextClosure = {
      ...closureDraft,
      label: closureDraft.label?.trim() || "Fermeture"
    };

    setClosures((current) => {
      const exists = current.some((closure) => closure.id === nextClosure.id);

      return exists
        ? current.map((closure) => closure.id === nextClosure.id ? nextClosure : closure)
        : [...current, nextClosure];
    });
    setClosureDraft(null);
  }

  function editClosure(closure: VacationClosure) {
    setClosureDraft({ ...closure });
  }

  function toggleClosure(closureId: string) {
    setClosures((current) =>
      current.map((closure) => closure.id === closureId ? { ...closure, active: closure.active === false } : closure)
    );
  }

  function removeClosure(closureId: string) {
    setClosures((current) => current.filter((closure) => closure.id !== closureId));
    setClosureDraft((current) => current?.id === closureId ? null : current);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeader title="Congés" description="Ajoutez les périodes de fermeture de l’établissement. Les réservations seront bloquées sur les périodes actives." />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {saveMessage ? <p className="text-sm font-black text-moss">{saveMessage}</p> : null}
          <button
            className="primary-button"
            disabled={saveClosuresMutation.isPending}
            type="button"
            onClick={() => saveClosuresMutation.mutate()}
          >
            {saveClosuresMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="rounded-md border border-ink/10 bg-linen p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Périodes de fermeture</h3>
            <p className="mt-1 text-sm font-semibold text-ink/55">Créez plusieurs périodes, puis activez ou désactivez-les selon vos besoins.</p>
          </div>
          <button className="primary-button" type="button" onClick={createClosure}>
            <Plus className="h-4 w-4" />
            Ajouter un congé
          </button>
        </div>

        {closureDraft ? (
          <div className="mt-4 rounded-md border border-moss/20 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <InputField defaultValue={closureDraft.label ?? ""} label="Nom" name="closureName" onChange={(value) => updateClosureDraft({ label: value })} />
              <InputField defaultValue={closureDraft.startDate} label="Date de début" name="closureStartDate" type="date" onChange={(value) => updateClosureDraft({ startDate: value })} />
              <InputField defaultValue={closureDraft.endDate} label="Date de fin" name="closureEndDate" type="date" onChange={(value) => updateClosureDraft({ endDate: value })} />
            </div>
            <label className="mt-4 flex items-center gap-3 rounded-md bg-linen p-3 text-sm font-bold">
              <input
                checked={closureDraft.active !== false}
                className="h-4 w-4 accent-moss"
                type="checkbox"
                onChange={(event) => updateClosureDraft({ active: event.target.checked })}
              />
              Congé actif
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button className="secondary-button" type="button" onClick={() => setClosureDraft(null)}>Annuler</button>
              <button className="primary-button" type="button" onClick={saveClosureDraft}>Enregistrer le congé</button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          {closures.length === 0 ? (
            <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink/60">Aucun congé configuré.</p>
          ) : null}
          {closures.map((closure) => (
            <div key={closure.id} className="grid gap-3 rounded-md border border-ink/10 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="font-black">{closure.label || "Fermeture"}</p>
                <p className="text-sm font-semibold text-ink/55">{formatPeriodDate(closure.startDate)} au {formatPeriodDate(closure.endDate)}</p>
                <span className={clsx("mt-2 inline-flex rounded-full px-2 py-1 text-xs font-black", closure.active === false ? "bg-ink/10 text-ink/50" : "bg-red-50 text-red-700")}>
                  {closure.active === false ? "Désactivé" : "Fermeture active"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => editClosure(closure)}>Modifier</button>
                <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => toggleClosure(closure.id)}>
                  {closure.active === false ? "Activer" : "Désactiver"}
                </button>
                <button className="danger-button h-9 px-3 text-xs" type="button" onClick={() => removeClosure(closure.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type OpeningHourFieldKey = "morningOpen" | "morningClose" | "open" | "close" | "secondOpen" | "secondClose";

function ServiceTimeRow({
  close,
  closeKey,
  disabled,
  enabled = true,
  label,
  onChange,
  onEnabledChange,
  open,
  openKey
}: {
  close: string;
  closeKey: OpeningHourFieldKey;
  disabled: boolean;
  enabled?: boolean;
  label: string;
  onChange: (updates: Partial<OpeningHours[string]>) => void;
  onEnabledChange?: (enabled: boolean) => void;
  open: string;
  openKey: OpeningHourFieldKey;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] md:items-end">
      <div>
        {onEnabledChange ? (
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-ink/45">
            <input
              checked={enabled}
              className="h-4 w-4 accent-moss"
              disabled={disabled}
              type="checkbox"
              onChange={(event) => onEnabledChange(event.target.checked)}
            />
            {label}
          </label>
        ) : (
          <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</p>
        )}
      </div>
      {!enabled ? (
        <p className="rounded-md bg-white px-3 py-2 text-sm font-black text-ink/45 md:col-span-2">Service désactivé</p>
      ) : (
        <>
      <label className="text-xs font-bold text-ink/60">
        Ouverture
        <select
          className="control mt-1 h-10 w-full"
          disabled={disabled || !enabled}
          value={open}
          onChange={(event) => onChange({ [openKey]: event.target.value } as Partial<OpeningHours[string]>)}
        >
          {timeOptions.map((time) => (
            <option key={`${label}-${openKey}-${time}`} value={time}>{time}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60">
        Fermeture
        <select
          className="control mt-1 h-10 w-full"
          disabled={disabled || !enabled}
          value={close}
          onChange={(event) => onChange({ [closeKey]: event.target.value } as Partial<OpeningHours[string]>)}
        >
          {timeOptions.map((time) => (
            <option key={`${label}-${closeKey}-${time}`} value={time}>{time}</option>
          ))}
        </select>
      </label>
        </>
      )}
    </div>
  );
}

function PanelHeader({ description, title }: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-ink/55">{description}</p>
    </div>
  );
}

function SettingCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-linen p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function CrmPanel({
  clients,
  clientSearch,
  restaurantId,
  setClientSearch,
  onCreate
}: {
  clients: Client[];
  clientSearch: string;
  restaurantId: string;
  setClientSearch: (value: string) => void;
  onCreate: () => void;
}) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "vip" | "recent" | "regular" | "risk" | "cancelRisk">("all");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const sortedClients = [...clients]
    .filter((client) => {
      if (filter === "vip") return client.vip;
      if (filter === "recent") return client.reservations.length <= 1;
      if (filter === "regular") return client.reservations.length >= 3;
      if (filter === "risk") return client.noShowRisk >= 35;
      if (filter === "cancelRisk") return clientCancellationRisk(client) >= 25;

      return true;
    })
    .sort((first, second) => `${first.lastName} ${first.firstName}`.localeCompare(`${second.lastName} ${second.firstName}`, "fr"));
  const updateClientMutation = useMutation({
    mutationFn: ({ clientId, formData }: { clientId: string; formData: FormData }) =>
      apiFetch<{ client: Client }>(`/api/restaurants/${restaurantId}/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: String(formData.get("firstName") || ""),
          lastName: String(formData.get("lastName") || ""),
          email: String(formData.get("email") || ""),
          phone: String(formData.get("phone") || ""),
          birthday: String(formData.get("birthday") || ""),
          allergies: String(formData.get("allergies") || ""),
          preferences: String(formData.get("preferences") || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          internalNotes: String(formData.get("internalNotes") || ""),
          vip: Boolean(formData.get("vip")),
          noShowRisk: Number(formData.get("noShowRisk") || 0)
        })
      }),
    onSuccess: () => {
      setEditingClientId(null);
      setSaveMessage("Fiche client mise à jour");
      window.setTimeout(() => setSaveMessage(null), 2500);
      void queryClient.invalidateQueries({ queryKey: ["clients", restaurantId] });
    },
    onError: (error) => {
      setSaveMessage(error instanceof Error ? error.message : "Impossible de mettre à jour la fiche client.");
    }
  });

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">CRM clients</h2>
          <p className="text-sm font-semibold text-ink/55">Fiches clients, allergies, préférences, no-shows, annulations tardives et statut VIP.</p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Client
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <input
          className="control w-full"
          placeholder="Rechercher par nom, email ou téléphone"
          value={clientSearch}
          onChange={(event) => setClientSearch(event.target.value)}
        />
        <select className="control min-w-48" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
          <option value="all">Tous les clients</option>
          <option value="vip">VIP</option>
          <option value="recent">Récents</option>
          <option value="regular">Habitués</option>
          <option value="risk">Risque no-show</option>
          <option value="cancelRisk">Annulation tardive</option>
        </select>
      </div>
      {saveMessage ? <p className="mt-3 rounded-md bg-sage p-3 text-sm font-black text-moss">{saveMessage}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-ink/10">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_120px_120px_120px] gap-3 bg-linen px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/45">
            <span>Client</span>
            <span>Contact</span>
            <span>No-show</span>
            <span>Annulation</span>
            <span>Profil</span>
          </div>
          <div className="divide-y divide-ink/10">
            {sortedClients.map((client) => {
              const expanded = expandedClientId === client.id;
              const editing = editingClientId === client.id;
              const lastReservations = [...client.reservations]
                .sort((first, second) => `${second.date} ${second.startTime}`.localeCompare(`${first.date} ${first.startTime}`))
                .slice(0, 4);

              return (
                <article key={client.id} className="bg-white">
                  <button
                    className="grid w-full grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_120px_120px_120px] gap-3 px-3 py-3 text-left transition hover:bg-linen/60"
                    type="button"
                    onClick={() => setExpandedClientId((current) => current === client.id ? null : client.id)}
                  >
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm font-black">
                        {client.vip ? <Crown className="h-4 w-4 shrink-0 text-amber-600" aria-label="Client VIP" /> : null}
                        <span className="truncate">{client.lastName} {client.firstName}</span>
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-ink/55">
                        {client.birthday ? `Anniversaire : ${formatPeriodDate(client.birthday)}` : "Anniversaire non renseigné"}
                      </span>
                    </span>
                    <span className="min-w-0 text-xs font-semibold text-ink/60">
                      <span className="block truncate">{client.email ?? "Sans email"}</span>
                      <span className="block truncate">{client.phone ?? "Sans téléphone"}</span>
                    </span>
                    <span className="self-center">
                      <span className="rounded-md bg-linen px-2 py-1 text-xs font-black text-ink">{client.noShowRisk ?? 0}%</span>
                    </span>
                    <span className="group relative self-center">
                      <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">{clientCancellationRisk(client)}%</span>
                      <span className="pointer-events-none absolute bottom-7 left-0 z-30 w-64 rounded-md bg-ink p-2 text-xs font-semibold leading-5 text-white opacity-0 shadow-soft transition group-hover:opacity-100">
                        Risque estimé à partir des annulations enregistrées, notamment les annulations effectuées moins de 4h avant la réservation lorsque la donnée est disponible.
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1 self-center">
                      {client.vip ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">VIP</span> : null}
                      <span className="rounded-full bg-sage px-2 py-0.5 text-[11px] font-black text-moss">{clientFrequencyLabel(client)}</span>
                    </span>
                  </button>

                  {expanded ? (
                    <div className="border-t border-ink/10 bg-linen/50 p-3">
                      {editing ? (
                        <form
                          className="grid gap-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            updateClientMutation.mutate({ clientId: client.id, formData: new FormData(event.currentTarget) });
                          }}
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <InputField defaultValue={client.firstName} label="Prénom" name="firstName" />
                            <InputField defaultValue={client.lastName} label="Nom" name="lastName" />
                            <InputField defaultValue={client.email ?? ""} label="Email" name="email" required={false} type="email" />
                            <InputField defaultValue={client.phone ?? ""} label="Téléphone" name="phone" required={false} />
                            <InputField defaultValue={client.birthday ?? ""} label="Anniversaire" name="birthday" required={false} type="date" />
                            <InputField defaultValue={String(client.noShowRisk ?? 0)} label="Risque no-show (%)" name="noShowRisk" required={false} type="number" />
                          </div>
                          <InputField defaultValue={client.preferences.join(", ")} label="Préférences" name="preferences" required={false} />
                          <label className="text-sm font-bold">
                            Allergies
                            <textarea className="control mt-1 min-h-20 w-full" defaultValue={client.allergies ?? ""} name="allergies" />
                          </label>
                          <label className="text-sm font-bold">
                            Notes internes
                            <textarea className="control mt-1 min-h-24 w-full" defaultValue={client.internalNotes ?? ""} name="internalNotes" />
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm font-bold">
                            <input className="h-4 w-4 accent-moss" defaultChecked={client.vip} name="vip" type="checkbox" />
                            Client VIP
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button className="primary-button" disabled={updateClientMutation.isPending} type="submit">
                              {updateClientMutation.isPending ? "Chargement" : "Valider"}
                            </button>
                            <button className="secondary-button" type="button" onClick={() => setEditingClientId(null)}>Annuler</button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="rounded-md bg-white p-3">
                            <h4 className="font-black">Détails client</h4>
                            <p className="mt-2 text-sm font-semibold text-ink/65">Allergies : {client.allergies || "Aucune"}</p>
                            <p className="text-sm font-semibold text-ink/65">Préférences : {client.preferences.length ? client.preferences.join(", ") : "Aucune"}</p>
                            <p className="mt-2 text-sm font-semibold text-ink/65">Notes : {client.internalNotes || "Aucune note interne"}</p>
                            <button className="secondary-button mt-3 h-9 text-xs" type="button" onClick={() => setEditingClientId(client.id)}>
                              Modifier la fiche
                            </button>
                          </div>
                          <div className="rounded-md bg-white p-3">
                            <h4 className="font-black">Dernières réservations</h4>
                            <div className="mt-2 grid gap-2">
                              {lastReservations.length === 0 ? (
                                <p className="text-sm font-semibold text-ink/55">Aucune réservation récente.</p>
                              ) : (
                                lastReservations.map((reservation) => (
                                  <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-linen p-2 text-xs font-bold text-ink/65">
                                    <span>{formatDate(reservation.date.slice(0, 10))} · {reservation.startTime} · {reservation.numberOfGuests} couvert(s)</span>
                                    <span className={clsx("rounded-full border px-2 py-0.5", statusClass(reservation.status as Reservation["status"]))}>
                                      {statusLabel(reservation.status as Reservation["status"])}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {sortedClients.length === 0 ? (
              <p className="p-4 text-sm font-semibold text-ink/55">Aucun client ne correspond à cette recherche.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MenusPanel() {
  const [menus, setMenus] = useState([
    {
      name: "Carte principale",
      status: "Publié",
      schedule: "Tous les jours",
      sections: [
        { name: "Entrées", items: 6 },
        { name: "Plats", items: 12 },
        { name: "Desserts", items: 5 }
      ]
    },
    {
      name: "Menu du midi",
      status: "Brouillon",
      schedule: "Lundi - vendredi · midi",
      sections: [
        { name: "Formules", items: 3 },
        { name: "Suggestions", items: 4 }
      ]
    },
    {
      name: "Boissons",
      status: "Publié",
      schedule: "Tous les services",
      sections: [
        { name: "Vins", items: 18 },
        { name: "Softs", items: 7 }
      ]
    }
  ]);
  const [selectedMenu, setSelectedMenu] = useState("Carte principale");
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showDishForm, setShowDishForm] = useState(false);
  const [editingDishName, setEditingDishName] = useState<string | null>(null);
  const [dishes, setDishes] = useState([
    { name: "Burrata crémeuse", price: "12 €", category: "Entrées", description: "Burrata, huile d’olive, tomates confites.", tags: ["Végétarien"], status: "Disponible" },
    { name: "Filet de bar, légumes rôtis", price: "24 €", category: "Plats", description: "Poisson du jour, jus citronné.", tags: ["Sans gluten"], status: "Disponible" },
    { name: "Tiramisu maison", price: "8 €", category: "Desserts", description: "Recette maison au café.", tags: ["Allergènes"], status: "Masqué" }
  ]);
  const currentMenu = menus.find((menu) => menu.name === selectedMenu) ?? menus[0];

  function createMenu(formData: FormData) {
    const name = String(formData.get("menuName") || "").trim();

    if (!name || menus.some((menu) => menu.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    setMenus((current) => [
      ...current,
      {
        name,
        status: String(formData.get("menuStatus") || "Brouillon"),
        schedule: String(formData.get("menuSchedule") || "Non programmée"),
        sections: []
      }
    ]);
    setSelectedMenu(name);
    setShowMenuForm(false);
  }

  function upsertDish(formData: FormData) {
    const name = String(formData.get("dishName") || "").trim();

    if (!name) {
      return;
    }

    const nextDish = {
      name,
      price: String(formData.get("dishPrice") || "0 €"),
      category: String(formData.get("dishCategory") || "Carte"),
      description: String(formData.get("dishDescription") || ""),
      tags: String(formData.get("dishTags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: String(formData.get("dishStatus") || "Disponible")
    };

    setDishes((current) => {
      if (!editingDishName) {
        return [...current, nextDish];
      }

      return current.map((dish) => dish.name === editingDishName ? nextDish : dish);
    });
    setEditingDishName(null);
    setShowDishForm(false);
  }

  const editingDish = dishes.find((dish) => dish.name === editingDishName);

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Menus"
        description="Créez vos cartes, organisez les sections, gérez les plats, allergènes, photos et QR codes de menu digital."
      />
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black">Cartes</h3>
            <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => setShowMenuForm((value) => !value)}>
              <Plus className="h-4 w-4" />
              Menu
            </button>
          </div>
          {showMenuForm ? (
            <form
              className="mt-3 grid gap-2 rounded-md bg-linen p-3"
              onSubmit={(event) => {
                event.preventDefault();
                createMenu(new FormData(event.currentTarget));
              }}
            >
              <InputField label="Nom de la carte" name="menuName" />
              <SelectField label="Statut" name="menuStatus" options={["Brouillon", "Publié", "Programmé"]} />
              <InputField label="Programmation" name="menuSchedule" required={false} defaultValue="Midi uniquement" />
              <button className="primary-button h-9 text-xs" type="submit">Créer la carte</button>
            </form>
          ) : null}
          <div className="mt-3 grid gap-2">
            {menus.map((menu) => (
              <button
                key={menu.name}
                className={clsx(
                  "rounded-md border p-3 text-left transition",
                  selectedMenu === menu.name ? "border-moss bg-sage" : "border-ink/10 bg-linen hover:border-moss/30"
                )}
                type="button"
                onClick={() => setSelectedMenu(menu.name)}
              >
                <span className="block font-black">{menu.name}</span>
                <span className="mt-1 block text-xs font-semibold text-ink/55">{menu.status} · {menu.schedule}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-md bg-linen p-3 text-xs font-semibold leading-5 text-ink/60">
            QR code menu digital, lien public et aperçu client seront disponibles depuis cette page.
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">{selectedMenu}</h3>
              <p className="text-sm font-semibold text-ink/55">Programmation : {currentMenu.schedule}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="secondary-button h-9 px-3 text-xs" type="button"><Copy className="h-4 w-4" />Dupliquer</button>
              <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={() => setShowDishForm((value) => !value)}><Plus className="h-4 w-4" />Plat</button>
              <button className="primary-button h-9 px-3 text-xs" type="button">Publier</button>
            </div>
          </div>
          {showDishForm ? (
            <form
              className="mt-4 grid gap-3 rounded-md bg-linen p-3"
              onSubmit={(event) => {
                event.preventDefault();
                upsertDish(new FormData(event.currentTarget));
              }}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <InputField defaultValue={editingDish?.name ?? ""} label="Nom du plat / boisson" name="dishName" />
                <InputField defaultValue={editingDish?.price ?? ""} label="Prix" name="dishPrice" />
                <InputField defaultValue={editingDish?.category ?? ""} label="Catégorie" name="dishCategory" />
                <SelectField defaultValue={editingDish?.status ?? "Disponible"} label="Statut" name="dishStatus" options={["Disponible", "Masqué", "Rupture"]} />
              </div>
              <InputField defaultValue={editingDish?.tags.join(", ") ?? ""} label="Infos / tags" name="dishTags" required={false} />
              <label className="text-sm font-bold">
                Description
                <textarea className="control mt-1 min-h-20 w-full" defaultValue={editingDish?.description ?? ""} name="dishDescription" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="primary-button h-9 text-xs" type="submit">{editingDishName ? "Valider la modification" : "Ajouter"}</button>
                <button className="secondary-button h-9 text-xs" type="button" onClick={() => { setEditingDishName(null); setShowDishForm(false); }}>Annuler</button>
              </div>
            </form>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(currentMenu.sections ?? []).map((section) => (
              <article key={section.name} className="rounded-md border border-ink/10 bg-linen p-3">
                <p className="font-black">{section.name}</p>
                <p className="mt-1 text-xs font-semibold text-ink/55">{section.items} élément(s)</p>
              </article>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-ink/10">
            {dishes.map((dish) => (
              <div key={dish.name} className="grid gap-2 border-b border-ink/10 p-3 last:border-b-0 md:grid-cols-[1fr_90px_180px_120px_90px] md:items-center">
                <div>
                  <p className="font-black">{dish.name}</p>
                  <p className="mt-1 text-xs font-semibold text-ink/55">{dish.category} · {dish.description}</p>
                </div>
                <p className="text-sm font-black">{dish.price}</p>
                <div className="flex flex-wrap gap-1">
                  {dish.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-sage px-2 py-0.5 text-[11px] font-black text-moss">{tag}</span>
                  ))}
                </div>
                <span className={clsx("rounded-full px-2 py-1 text-center text-xs font-black", dish.status === "Disponible" ? "bg-moss/10 text-moss" : "bg-ink/10 text-ink/55")}>
                  {dish.status}
                </span>
                <button
                  className="secondary-button h-8 text-xs"
                  type="button"
                  onClick={() => {
                    setEditingDishName(dish.name);
                    setShowDishForm(true);
                  }}
                >
                  Modifier
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GalleryPanel() {
  const [category, setCategory] = useState("Tout");
  const photos = [
    { title: "Salle principale", category: "Restaurant", featured: true, enabled: true },
    { title: "Terrasse", category: "Restaurant", featured: false, enabled: true },
    { title: "Plat signature", category: "Plats", featured: true, enabled: true },
    { title: "Dessert maison", category: "Plats", featured: false, enabled: false }
  ];
  const visiblePhotos = photos.filter((photo) => category === "Tout" || photo.category === category);

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Galerie"
        description="Importez les photos du restaurant et des plats, gérez l’ordre d’affichage, les titres, textes alternatifs et la visibilité."
      />
      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {["Tout", "Restaurant", "Plats", "Équipe", "Ambiance"].map((item) => (
              <button
                key={item}
                className={clsx("rounded-md px-3 py-2 text-sm font-black transition", category === item ? "bg-moss text-white" : "bg-linen text-ink/65 hover:bg-sage")}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="primary-button" type="button">
            <ImagePlus className="h-4 w-4" />
            Ajouter des photos
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visiblePhotos.map((photo, index) => (
            <article key={photo.title} className="overflow-hidden rounded-lg border border-ink/10 bg-linen">
              <div className="grid aspect-[4/3] place-items-center bg-white text-ink/35">
                <Image className="h-10 w-10" />
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black">{photo.title}</p>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-ink/55">#{index + 1}</span>
                </div>
                <p className="text-xs font-semibold text-ink/55">{photo.category}</p>
                <div className="flex flex-wrap gap-1">
                  {photo.featured ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">Mise en avant</span> : null}
                  <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-black", photo.enabled ? "bg-moss/10 text-moss" : "bg-ink/10 text-ink/50")}>
                    {photo.enabled ? "Visible" : "Masquée"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button className="secondary-button h-8 flex-1 text-xs" type="button">Modifier</button>
                  <button className="secondary-button h-8 flex-1 text-xs" type="button">Déplacer</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GiftCardsPanel({ clients }: { clients: Client[] }) {
  const [cards, setCards] = useState([
    { name: "Carte découverte", amount: "25 €", sold: 12, active: true, validity: "12", description: "Carte cadeau découverte valable sur toute la carte." },
    { name: "Dîner pour deux", amount: "50 €", sold: 8, active: true, validity: "12", description: "Montant idéal pour un dîner ou un geste commercial." },
    { name: "Expérience premium", amount: "100 €", sold: 3, active: false, validity: "24", description: "Carte cadeau premium pour une expérience complète." }
  ]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingCardName, setEditingCardName] = useState<string | null>(null);
  const [giftSearch, setGiftSearch] = useState("");
  const [crmGiftSearch, setCrmGiftSearch] = useState("");
  const [issuedCards, setIssuedCards] = useState([
    { code: "TT-GIFT-8K4M", recipient: "Kenny LeBron", email: "client@example.com", phone: "0641323232", amount: "50 €", validUntil: "19/06/2027", status: "Envoyée", message: "Merci pour votre fidélité.", qrCodeUrl: giftQrDataUrl("TT-GIFT-8K4M") },
    { code: "TT-GIFT-A7F9", recipient: "Marie Dupont", email: "marie@example.com", phone: "0611223344", amount: "25 €", validUntil: "19/12/2026", status: "Utilisée", message: "Geste commercial.", qrCodeUrl: giftQrDataUrl("TT-GIFT-A7F9") }
  ]);
  const editingCard = cards.find((card) => card.name === editingCardName);
  const editingCardDefaults = editingCard ?? {
    name: "",
    amount: "50 €",
    sold: 0,
    active: true,
    validity: "12",
    description: ""
  };
  const filteredIssuedCards = issuedCards.filter((card) => {
    const query = giftSearch.trim().toLocaleLowerCase("fr-FR");

    if (!query) {
      return true;
    }

    return [card.code, card.recipient, card.email, card.phone]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase("fr-FR").includes(query));
  });

  function toggleCard(name: string) {
    setCards((current) => current.map((card) => card.name === name ? { ...card, active: !card.active } : card));
  }

  function updateGiftCardOffer(formData: FormData) {
    const nextName = String(formData.get("cardName") || editingCardDefaults.name).trim() || "Nouvelle carte cadeau";
    const nextCard = {
      ...editingCardDefaults,
      name: nextName,
      amount: String(formData.get("cardAmount") || editingCardDefaults.amount),
      validity: String(formData.get("cardValidity") || editingCardDefaults.validity),
      description: String(formData.get("cardDescription") || ""),
      active: Boolean(formData.get("cardActive"))
    };

    if (!editingCard) {
      setCards((current) => [nextCard, ...current]);
      setEditingCardName(null);
      return;
    }

    setCards((current) =>
      current.map((card) =>
        card.name === editingCard.name
          ? nextCard
          : card
      )
    );
    setEditingCardName(null);
  }

  function offerGiftCard(formData: FormData) {
    const amount = String(formData.get("giftAmount") || "50 €");
    const crmSearch = String(formData.get("crmClient") || "").trim();
    const selectedClient = clients.find((client) => `${client.firstName} ${client.lastName}`.toLocaleLowerCase("fr-FR") === crmSearch.toLocaleLowerCase("fr-FR"));
    const firstName = selectedClient?.firstName ?? String(formData.get("recipientFirstName") || "").trim();
    const lastName = selectedClient?.lastName ?? String(formData.get("recipientLastName") || "").trim();
    const recipient = [firstName, lastName].filter(Boolean).join(" ") || crmSearch || "Client";
    const email = selectedClient?.email ?? String(formData.get("recipientEmail") || "");
    const phone = selectedClient?.phone ?? String(formData.get("recipientPhone") || "");
    const validityMonths = Number(formData.get("validityMonths") || 12);
    const validUntil = new Intl.DateTimeFormat("fr-FR").format(addMonths(new Date(), validityMonths));
    const code = `TT-GIFT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    setIssuedCards((current) => [
      {
        code,
        recipient,
        email,
        phone,
        amount,
        validUntil,
        status: "Offerte",
        message: String(formData.get("giftMessage") || ""),
        qrCodeUrl: giftQrDataUrl(code)
      },
      ...current
    ]);
    setShowOfferForm(false);
    setCrmGiftSearch("");
  }

  function downloadGiftCardPdf(card: (typeof issuedCards)[number]) {
    downloadTextPdf(`${card.code}.pdf`, "Carte cadeau ToqueTop", [
      `Code : ${card.code}`,
      `Bénéficiaire : ${card.recipient}`,
      `Email : ${card.email || "Non renseigné"}`,
      `Téléphone : ${card.phone || "Non renseigné"}`,
      `Montant : ${card.amount}`,
      `Valable jusqu’au : ${card.validUntil}`,
      `Statut : ${card.status}`,
      `Message : ${card.message || "Aucun message"}`,
      "",
      "Présentez ce code ou le QR code au restaurant pour utiliser la carte cadeau."
    ]);
  }

  function exportGiftCardsPdf() {
    downloadTextPdf("cartes-cadeaux-toquetop.pdf", "Export cartes cadeaux ToqueTop", filteredIssuedCards.flatMap((card) => [
      `${card.code} · ${card.recipient} · ${card.amount} · valide jusqu’au ${card.validUntil} · ${card.status}`,
      `Email : ${card.email || "Non renseigné"} · Téléphone : ${card.phone || "Non renseigné"} · Message : ${card.message || "Aucun message"}`,
      ""
    ]));
  }

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Cartes cadeaux"
        description="Préparez les montants, codes uniques, QR codes et validation des coupons. Le paiement en ligne pourra être branché plus tard avec Stripe."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-black">Offres disponibles</h3>
            <button className="primary-button h-9 px-3 text-xs" type="button" onClick={() => setEditingCardName("__new")}>
              <Plus className="h-4 w-4" />
              Créer une carte cadeau
            </button>
          </div>
          {editingCardName ? (
            <form
              className="mt-4 grid gap-3 rounded-md bg-linen p-3"
              onSubmit={(event) => {
                event.preventDefault();
                updateGiftCardOffer(new FormData(event.currentTarget));
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-black">{editingCard ? "Modifier la carte cadeau" : "Créer une carte cadeau"}</h4>
                <button className="icon-button h-8 w-8" type="button" onClick={() => setEditingCardName(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <InputField defaultValue={editingCardDefaults.name} label="Titre" name="cardName" />
                <InputField defaultValue={editingCardDefaults.amount} label="Montant" name="cardAmount" />
                <InputField defaultValue={editingCardDefaults.validity} label="Validité en mois" name="cardValidity" type="number" />
                <label className="flex items-center gap-3 rounded-md bg-white p-3 text-sm font-bold">
                  <input className="h-4 w-4 accent-moss" defaultChecked={editingCardDefaults.active} name="cardActive" type="checkbox" />
                  Carte active
                </label>
              </div>
              <label className="text-sm font-bold">
                Description
                <textarea className="control mt-1 min-h-20 w-full" defaultValue={editingCardDefaults.description} name="cardDescription" />
              </label>
              <button className="primary-button h-9 text-xs" type="submit">{editingCard ? "Valider les modifications" : "Créer la carte"}</button>
            </form>
          ) : null}
          <div className="mt-4 grid gap-3">
            {cards.map((card) => (
              <article key={card.name} className="grid gap-3 rounded-md border border-ink/10 bg-linen p-3 md:grid-cols-[minmax(0,1fr)_72px_72px_84px_108px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-black">{card.name}</p>
                  <p className="text-xs font-semibold text-ink/55">Code unique + QR code généré à l’achat</p>
                </div>
                <p className="text-lg font-black">{card.amount}</p>
                <span className="text-center">
                  <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-ink/40">Vendus</span>
                  <span className="text-sm font-black text-ink/70">{card.sold}</span>
                </span>
                <span className="text-center">
                  <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-ink/40">Validité</span>
                  <span className="text-xs font-black text-ink/60">{card.validity} mois</span>
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    aria-label={card.active ? "Désactiver la carte cadeau" : "Activer la carte cadeau"}
                    className={clsx(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full border transition focus-ring",
                      card.active ? "border-moss/20 bg-moss/10 text-moss" : "border-red-200 bg-red-50 text-red-600"
                    )}
                    title={card.active ? "Carte active" : "Carte désactivée"}
                    type="button"
                    onClick={() => toggleCard(card.name)}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button className="secondary-button h-8 px-2 text-xs" type="button" onClick={() => setEditingCardName(card.name)}>
                    <Wrench className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <h3 className="font-black">Validation mobile</h3>
          <div className="mt-3 grid aspect-square place-items-center rounded-lg border border-dashed border-ink/20 bg-linen text-center">
            <div>
              <Gift className="mx-auto h-10 w-10 text-moss" />
              <p className="mt-2 text-sm font-black">QR coupon</p>
              <p className="mt-1 px-6 text-xs font-semibold leading-5 text-ink/55">
                Une page mobile pourra scanner le QR code et afficher “coupon valide 50 €”, puis le marquer utilisé.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs font-semibold text-ink/60">
            <p className="rounded-md bg-linen p-2">Statuts : disponible, utilisé, expiré, remboursé.</p>
            <p className="rounded-md bg-linen p-2">Expiration configurable par offre.</p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black">Cartes cadeaux commandées</h3>
            <p className="text-sm font-semibold text-ink/55">Suivi des cartes créées, offertes ou commandées, avec validité et téléchargement PDF.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="primary-button h-9 px-3 text-xs" type="button" onClick={() => setShowOfferForm((value) => !value)}>
              <Plus className="h-4 w-4" />
              Offrir une carte cadeau
            </button>
            <button className="secondary-button h-9 px-3 text-xs" type="button" onClick={exportGiftCardsPdf}>
              <FileText className="h-4 w-4" />
              Exporter
            </button>
          </div>
        </div>
        {showOfferForm ? (
          <form
            className="mt-4 grid gap-3 rounded-md bg-linen p-3"
            onSubmit={(event) => {
              event.preventDefault();
              offerGiftCard(new FormData(event.currentTarget));
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-bold">
                Client CRM
                <input
                  className="control mt-1 w-full"
                  list="gift-crm-clients"
                  name="crmClient"
                  placeholder="Commencez à écrire un nom..."
                  value={crmGiftSearch}
                  onChange={(event) => setCrmGiftSearch(event.target.value)}
                />
                <datalist id="gift-crm-clients">
                  {clients.map((client) => (
                    <option key={client.id} label={client.email || client.phone || "Client CRM"} value={`${client.firstName} ${client.lastName}`} />
                  ))}
                </datalist>
              </label>
              <InputField label="Montant" name="giftAmount" defaultValue="50 €" />
              <InputField label="Prénom du bénéficiaire" name="recipientFirstName" required={false} />
              <InputField label="Nom du bénéficiaire" name="recipientLastName" required={false} />
              <InputField label="Email du bénéficiaire" name="recipientEmail" required={false} type="email" />
              <InputField label="Téléphone du bénéficiaire" name="recipientPhone" required={false} type="tel" />
              <InputField label="Validité en mois" name="validityMonths" defaultValue="12" type="number" />
            </div>
            <label className="text-sm font-bold">
              Message
              <textarea className="control mt-1 min-h-20 w-full" name="giftMessage" placeholder="Message envoyé avec la carte cadeau" />
            </label>
            <button className="primary-button h-9 text-xs" type="submit">Créer et envoyer par email</button>
          </form>
        ) : null}
        <div className="mt-4">
          <label className="text-sm font-bold">
            Rechercher une carte cadeau
            <input
              className="control mt-1 w-full"
              name="giftCardSearch"
              placeholder="Nom, prénom, email, téléphone ou code..."
              value={giftSearch}
              onChange={(event) => setGiftSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-ink/10">
          <div className="min-w-[760px] divide-y divide-ink/10">
            {filteredIssuedCards.map((card) => (
              <article key={card.code} className="grid grid-cols-[54px_130px_1fr_120px_110px_110px_120px] items-center gap-3 bg-linen/60 p-3 text-sm">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-white p-1 shadow-inner">
                  <img alt={`QR code ${card.code}`} className="h-full w-full" src={card.qrCodeUrl} />
                </span>
                <span className="font-black">{card.code}</span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{card.recipient}</span>
                  <span className="block truncate text-xs font-semibold text-ink/55">{card.email || "Email non renseigné"}</span>
                  <span className="block truncate text-xs font-semibold text-ink/45">{card.phone || "Téléphone non renseigné"}</span>
                </span>
                <span className="font-black">{card.amount}</span>
                <span className="text-xs font-bold text-ink/65">{card.validUntil}</span>
                <span className="rounded-full bg-sage px-2 py-1 text-center text-xs font-black text-moss">{card.status}</span>
                <button className="secondary-button h-8 text-xs" type="button" onClick={() => downloadGiftCardPdf(card)}>
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </article>
            ))}
            {filteredIssuedCards.length === 0 ? (
              <p className="bg-linen/60 p-4 text-sm font-semibold text-ink/55">Aucune carte cadeau ne correspond à cette recherche.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsPanel({
  clients,
  restaurant,
  reservations,
  tables,
  waitlist
}: {
  clients: Client[];
  restaurant: Restaurant;
  reservations: Reservation[];
  tables: FloorTable[];
  waitlist: WaitlistEntry[];
}) {
  const [period, setPeriod] = useState<"24h" | "7d" | "24d" | "6m" | "1y" | "custom">("7d");
  const [customStartDate, setCustomStartDate] = useState(addDaysToDateString(today(), -6));
  const [customEndDate, setCustomEndDate] = useState(today());
  const periodDays = {
    "24h": 1,
    "7d": 7,
    "24d": 24,
    "6m": 183,
    "1y": 365,
    custom: 1
  }[period];
  const periodLabel = {
    "24h": "24 dernières heures",
    "7d": "7 derniers jours",
    "24d": "24 derniers jours",
    "6m": "6 derniers mois",
    "1y": "1 an",
    custom: `${formatDate(customStartDate)} au ${formatDate(customEndDate)}`
  }[period];
  const periodStart = period === "custom" ? customStartDate : addDaysToDateString(today(), -periodDays + 1);
  const periodEnd = period === "custom" ? customEndDate : today();
  const crmReservations = clients.flatMap((client) =>
    client.reservations.map((reservation) => ({
      ...reservation,
      clientId: client.id,
      clientVip: client.vip
    }))
  );
  const liveHistory = reservations.map((reservation) => ({
    id: reservation.id,
    referenceCode: reservation.referenceCode,
    date: reservation.date,
    startTime: reservation.startTime,
    numberOfGuests: reservation.numberOfGuests,
    status: reservation.status,
    noShow: Boolean(reservation.noShow),
    clientId: reservation.client?.id ?? reservation.guestPhone ?? reservation.id,
    clientVip: Boolean(reservation.client?.vip),
    tableId: reservation.table?.id ?? null
  }));
  const periodReservations = [...liveHistory, ...crmReservations]
    .filter((reservation, index, list) => list.findIndex((item) => item.id === reservation.id) === index)
    .filter((reservation) => {
      const date = reservation.date.slice(0, 10);

      return date >= periodStart && date <= periodEnd;
    });
  const activeReservations = periodReservations.filter((reservation) => reservation.status !== "CANCELLED");
  const cancelledReservations = periodReservations.filter((reservation) => reservation.status === "CANCELLED");
  const guests = activeReservations.reduce((sum, reservation) => sum + reservation.numberOfGuests, 0);
  const occupiedTables = new Set(activeReservations.map((reservation) => "tableId" in reservation ? reservation.tableId : null).filter(Boolean)).size;
  const occupancy = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;
  const rush = rushForecast(activeReservations);
  const returning = clients.filter((client) => client.reservations.length >= 2).length;
  const averageGuests = activeReservations.length > 0 ? (guests / activeReservations.length).toFixed(1) : "0";
  const cancellationRate = periodReservations.length > 0 ? Math.round((cancelledReservations.length / periodReservations.length) * 100) : 0;
  const noShowCount = periodReservations.filter((reservation) => reservation.noShow).length;
  const vipReservations = periodReservations.filter((reservation) => reservation.clientVip).length;
  const reservationPageVisitors = settingNumber(restaurant.settings, ["reservationPageVisitors", "reservationVisitors", "bookingPageVisitors"], Math.max(activeReservations.length * 7, clients.length * 2, 0));
  const conversionEstimate = reservationPageVisitors > 0 ? Math.min(100, Math.round((activeReservations.length / reservationPageVisitors) * 100)) : 0;
  const reservedTableIds = new Set(activeReservations.map((reservation) => "tableId" in reservation ? reservation.tableId : null).filter(Boolean));
  const reservedTables = tables.filter((table) => reservedTableIds.has(table.id));
  const reservedTablesBySize = {
    two: reservedTables.filter((table) => table.capacity <= 2).length,
    four: reservedTables.filter((table) => table.capacity > 2 && table.capacity <= 4).length,
    sixPlus: reservedTables.filter((table) => table.capacity >= 6).length
  };
  const periodServiceWindows = normalizeServiceWindows(restaurant.openingHours[getDayKey(periodEnd)]);
  const hourlyTimeline = Array.from(
    activeReservations.reduce((map, reservation) => {
      const hour = `${reservation.startTime.slice(0, 2)}h`;
      map.set(hour, (map.get(hour) ?? 0) + reservation.numberOfGuests);
      return map;
    }, new Map<string, number>())
  )
    .map(([time, covers]) => ({ time, covers }))
    .sort((first, second) => parseInt(first.time, 10) - parseInt(second.time, 10));
  const maxHourlyCovers = Math.max(...hourlyTimeline.map((item) => item.covers), 1);
  const chartDays = Math.max(1, Math.min(daysBetweenDateStrings(periodStart, periodEnd) + 1, period === "custom" ? 31 : 30));
  const chartStart = addDaysToDateString(periodEnd, -chartDays + 1);
  const dailyStats = Array.from({ length: chartDays }, (_, index) => {
    const date = addDaysToDateString(chartStart, index);
    const dayReservations = periodReservations.filter((reservation) => reservation.date.slice(0, 10) === date);

    return {
      date,
      reservations: dayReservations.length,
      guests: dayReservations.reduce((sum, reservation) => sum + reservation.numberOfGuests, 0)
    };
  });
  const maxDailyGuests = Math.max(...dailyStats.map((item) => item.guests), 1);
  const aiInsights = buildStatsInsights({
    activeReservations: activeReservations.length,
    averageGuests,
    cancellationRate,
    conversionEstimate,
    noShowCount,
    occupancy,
    peakTime: rush.peak?.time ?? null,
    periodLabel
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeader
          title="Statistiques"
          description="Analysez les réservations, le remplissage, les heures de pointe, les clients fidèles et l’efficacité de la waitlist."
        />
        <label className="text-sm font-bold">
          <span className="mb-2 block">Période</span>
          <select className="control min-w-48" value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}>
            <option value="24h">24 dernières heures</option>
            <option value="7d">7 derniers jours</option>
            <option value="24d">24 derniers jours</option>
            <option value="6m">6 mois</option>
            <option value="1y">1 an</option>
            <option value="custom">Dates personnalisées</option>
          </select>
        </label>
      </div>
      {period === "custom" ? (
        <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-soft md:grid-cols-2">
          <InputField label="Date de début" name="statsStartDate" type="date" value={customStartDate} onChange={setCustomStartDate} />
          <InputField label="Date de fin" name="statsEndDate" type="date" value={customEndDate} onChange={setCustomEndDate} />
        </div>
      ) : null}
      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <p className="text-sm font-black text-moss">Période analysée : {periodLabel}</p>
        <p className="mt-1 text-xs font-semibold text-ink/55">
          Les statistiques combinent les réservations visibles du dashboard et l’historique CRM disponible.
        </p>
      </div>
      <div className="rounded-lg border border-moss/15 bg-sage/70 p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-moss" />
          <h3 className="font-black text-moss">Résumé intelligent</h3>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {aiInsights.map((insight) => (
            <article key={insight.title} className="rounded-md bg-white p-3">
              <p className="text-sm font-black">{insight.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-ink/60">{insight.message}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SettingCard label="Réservations" value={String(activeReservations.length)} />
        <SettingCard label="Couverts prévus" value={String(guests)} />
        <SettingCard label="Remplissage" value={`${occupancy}%`} />
        <SettingCard label="Rush estimé" value={rush.peak ? `${rush.peak.time} · ${rush.peak.guests} couverts` : "Non détecté"} />
        <div className="rounded-lg border border-ink/10 bg-linen p-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/40">Tables réservées</p>
            <span className="group relative inline-flex">
              <Info className="h-3.5 w-3.5 text-moss" />
              <span className="pointer-events-none absolute left-1/2 top-6 z-50 hidden w-44 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-xs font-semibold leading-5 text-white shadow-xl group-hover:block">
                Tables de 2 : {reservedTablesBySize.two}
                <br />
                Tables de 4 : {reservedTablesBySize.four}
                <br />
                Tables 6+ : {reservedTablesBySize.sixPlus}
              </span>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black">{reservedTables.length}</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <h3 className="font-black">Heures de pointe</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {periodServiceWindows.length === 0 ? (
              <span className="rounded-full bg-linen px-3 py-1 text-xs font-black text-ink/55">Aucun service configuré</span>
            ) : (
              periodServiceWindows.map((serviceWindow, index) => (
                <span key={`${serviceWindow.open}-${serviceWindow.close}-${index}`} className="rounded-full bg-sage px-3 py-1 text-xs font-black text-moss">
                  {serviceWindowLabel(serviceWindow, index)} · {serviceWindow.open}-{serviceWindow.close}
                </span>
              ))
            )}
          </div>
          <div className="mt-4 grid gap-2">
            {hourlyTimeline.length === 0 ? (
              <p className="rounded-md bg-linen p-3 text-sm font-semibold text-ink/55">Aucune donnée pour ce service.</p>
            ) : (
              hourlyTimeline.map((item) => (
                <div key={item.time} className="grid grid-cols-[56px_1fr_88px] items-center gap-3 text-sm font-bold">
                  <span>{item.time}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-linen">
                    <span className="block h-full rounded-full bg-moss" style={{ width: `${Math.max(8, (item.covers / maxHourlyCovers) * 100)}%` }} />
                  </span>
                  <span className="text-right">{item.covers} couverts</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <h3 className="font-black">Clients & performance</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SettingCard label="Nouveaux clients" value={String(Math.max(clients.length - returning, 0))} />
            <SettingCard label="Habitués" value={String(returning)} />
            <SettingCard label="VIP" value={String(clients.filter((client) => client.vip).length)} />
            <SettingCard label="Réservations VIP" value={String(vipReservations)} />
            <SettingCard label="No-show" value={String(noShowCount)} />
            <SettingCard label="Annulations" value={`${cancellationRate}%`} />
            <SettingCard label="Visiteurs page réservation" value={String(reservationPageVisitors)} />
            <SettingCard label="Conversion" value={`${conversionEstimate}%`} />
            <SettingCard label="Waitlist" value={`${waitlist.length} attente(s)`} />
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <h3 className="font-black">Évolution sur la période</h3>
        <div className="mt-4 grid gap-2">
          {dailyStats.map((item) => (
            <div key={item.date} className="grid grid-cols-[92px_1fr_130px] items-center gap-3 text-sm font-bold">
              <span>{formatDate(item.date)}</span>
              <span className="h-3 overflow-hidden rounded-full bg-linen">
                <span className="block h-full rounded-full bg-moss" style={{ width: `${Math.max(5, (item.guests / maxDailyGuests) * 100)}%` }} />
              </span>
              <span className="text-right">{item.reservations} résa · {item.guests} couverts</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function clientFrequencyLabel(client: Client) {
  if (client.reservations.length >= 3) {
    return "Habitué";
  }

  if (client.reservations.length === 0) {
    return "Prospect";
  }

  return "Nouveau";
}

function clientCancellationRisk(client: Client) {
  const total = Math.max(client.reservations.length, 1);
  const cancelled = client.reservations.filter((reservation) => reservation.status === "CANCELLED").length;
  const weightedNoShow = Math.round((client.noShowRisk ?? 0) * 0.25);

  return Math.min(100, Math.round((cancelled / total) * 75) + weightedNoShow);
}

type SubscriptionPlanName = "Essentiel" | "Pro" | "Signature";
type SubscriptionBillingCycle = "MONTHLY" | "QUARTERLY" | "ANNUAL";
type SubscriptionCommitment = "NONE" | "TWELVE_MONTHS";
type SubscriptionPlanConfig = {
  description: string;
  displayName?: string;
  features: string[];
  modelingFeeCents: number;
  name: SubscriptionPlanName;
  popular?: boolean;
  prices: Record<SubscriptionCommitment, Record<SubscriptionBillingCycle, number>>;
  stripeProductId?: string | null;
};

const subscriptionBillingOptions: Array<{ id: SubscriptionBillingCycle; label: string; detail: string }> = [
  { id: "MONTHLY", label: "Mensuel", detail: "Prélevé chaque mois" },
  { id: "QUARTERLY", label: "Trimestriel", detail: "Prélevé tous les 3 mois" },
  { id: "ANNUAL", label: "Annuel", detail: "Prélevé une fois par an" }
];

const subscriptionCommitmentOptions: Array<{ id: SubscriptionCommitment; label: string; detail: string }> = [
  { id: "TWELVE_MONTHS", label: "Engagement 12 mois", detail: "modélisation 2D/3D incluse" },
  { id: "NONE", label: "Sans engagement", detail: "modélisation facturée au démarrage" }
];

const subscriptionPlans: SubscriptionPlanConfig[] = [
  {
    description: "Pour lancer la réservation en ligne simplement.",
    features: ["Site vitrine", "Réservations 24/7", "Intégration Google et réseaux", "Emails de confirmation"],
    modelingFeeCents: 39000,
    name: "Essentiel",
    prices: {
      NONE: { MONTHLY: 4900, QUARTERLY: 13500, ANNUAL: 46800 },
      TWELVE_MONTHS: { MONTHLY: 3900, QUARTERLY: 11700, ANNUAL: 46800 }
    }
  },
  {
    description: "Le cockpit complet pour un restaurant actif.",
    features: ["Tout Essentiel", "Plan 2D/3D", "SMS et emails", "CRM clients", "Statistiques avancées"],
    modelingFeeCents: 59000,
    name: "Pro",
    popular: true,
    prices: {
      NONE: { MONTHLY: 8900, QUARTERLY: 23700, ANNUAL: 82800 },
      TWELVE_MONTHS: { MONTHLY: 6900, QUARTERLY: 20700, ANNUAL: 82800 }
    }
  },
  {
    description: "Pour groupes, multi-sites et besoins premium.",
    features: ["Multi-restaurants", "Reporting avancé", "Automatisations", "Accompagnement dédié"],
    modelingFeeCents: 0,
    name: "Signature",
    prices: {
      NONE: { MONTHLY: 14900, QUARTERLY: 40230, ANNUAL: 143040 },
      TWELVE_MONTHS: { MONTHLY: 14900, QUARTERLY: 40230, ANNUAL: 143040 }
    }
  }
];

const subscriptionFeatureComparison: Array<{
  label: string;
  values: Record<SubscriptionPlanName, string>;
}> = [
  { label: "Site vitrine restaurant", values: { Essentiel: "Inclus", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Réservations en ligne 24/7", values: { Essentiel: "Inclus", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Intégration Google et réseaux sociaux", values: { Essentiel: "Inclus", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Emails de confirmation", values: { Essentiel: "Inclus", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Dashboard Live", values: { Essentiel: "Inclus", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Plan de salle 2D", values: { Essentiel: "Option", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Plan de salle 3D", values: { Essentiel: "Option", Pro: "Inclus", Signature: "Inclus" } },
  { label: "CRM clients", values: { Essentiel: "Basique", Pro: "Avancé", Signature: "Avancé" } },
  { label: "Liste d’attente", values: { Essentiel: "Option", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Rappels SMS/email", values: { Essentiel: "Email", Pro: "Email + SMS", Signature: "Email + SMS" } },
  { label: "Menus digitaux", values: { Essentiel: "Option", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Cartes cadeaux", values: { Essentiel: "Option", Pro: "Inclus", Signature: "Inclus" } },
  { label: "Statistiques avancées", values: { Essentiel: "Basique", Pro: "Avancé", Signature: "Multi-sites" } },
  { label: "Multi-restaurants", values: { Essentiel: "Non", Pro: "Option", Signature: "Inclus" } },
  { label: "Accompagnement dédié", values: { Essentiel: "Support standard", Pro: "Prioritaire", Signature: "Dédié" } }
];

function normalizeSubscriptionPlanName(value: unknown): SubscriptionPlanName {
  const plan = typeof value === "string" ? value.toLowerCase() : "";

  if (plan.includes("essentiel")) {
    return "Essentiel";
  }

  if (plan.includes("signature")) {
    return "Signature";
  }

  return "Pro";
}

function subscriptionPlanRank(planName: SubscriptionPlanName) {
  return {
    Essentiel: 1,
    Pro: 2,
    Signature: 3
  }[planName];
}

function normalizeSubscriptionBillingCycle(value: unknown): SubscriptionBillingCycle {
  const cycle = typeof value === "string" ? value.toUpperCase() : "";

  if (cycle.includes("TRIM") || cycle.includes("QUART")) {
    return "QUARTERLY";
  }

  if (cycle.includes("ANNU") || cycle.includes("YEAR")) {
    return "ANNUAL";
  }

  return "MONTHLY";
}

function subscriptionBillingCycleLabel(value: unknown) {
  const cycle = normalizeSubscriptionBillingCycle(value);

  if (cycle === "ANNUAL") {
    return "Annuel";
  }

  if (cycle === "QUARTERLY") {
    return "Trimestriel";
  }

  return "Mensuel";
}

function subscriptionStatusLabel(value: unknown) {
  const status = typeof value === "string" ? value.toUpperCase() : "";

  if (["ACTIVE", "PAID", "COMPLETE"].includes(status)) {
    return "En cours";
  }

  if (["TRIAL", "TRIALING"].includes(status)) {
    return "Période d’essai";
  }

  if (["PAST_DUE", "UNPAID"].includes(status)) {
    return "Paiement à régulariser";
  }

  if (["PAUSED", "SUSPENDED"].includes(status)) {
    return "Suspendu";
  }

  if (["CANCELED", "CANCELLED"].includes(status)) {
    return "Résilié";
  }

  if (status === "PENDING") {
    return "En attente";
  }

  return "Aucun forfait";
}

function isActiveSubscriptionStatus(value: unknown) {
  const status = typeof value === "string" ? value.toUpperCase() : "";
  return ["ACTIVE", "PAID", "COMPLETE"].includes(status);
}

function isTrialSubscriptionStatus(value: unknown) {
  const status = typeof value === "string" ? value.toUpperCase() : "";
  return ["TRIAL", "TRIALING"].includes(status);
}

function isPastDueSubscriptionStatus(value: unknown, billingStatus?: unknown) {
  const status = typeof value === "string" ? value.toUpperCase() : "";
  const billing = typeof billingStatus === "string" ? billingStatus.toUpperCase() : "";
  return ["PAST_DUE", "UNPAID"].includes(status) || billing === "LATE";
}

function isSuspendedSubscriptionStatus(value: unknown) {
  const status = typeof value === "string" ? value.toUpperCase() : "";
  return ["PAUSED", "SUSPENDED"].includes(status);
}

function isCancelledSubscriptionStatus(value: unknown) {
  const status = typeof value === "string" ? value.toUpperCase() : "";
  return ["CANCELED", "CANCELLED"].includes(status);
}

function subscriptionStatusClass(value: unknown, billingStatus?: unknown) {
  const status = typeof value === "string" ? value.toUpperCase() : "";

  if (isPastDueSubscriptionStatus(value, billingStatus)) {
    return "bg-red-600 text-white";
  }

  if (isSuspendedSubscriptionStatus(value) || isCancelledSubscriptionStatus(value)) {
    return "bg-ink/70 text-white";
  }

  if (isTrialSubscriptionStatus(value)) {
    return "bg-gold/25 text-ink";
  }

  if (["ACTIVE", "PAID", "COMPLETE"].includes(status)) {
    return "bg-moss text-white";
  }

  if (!status || status === "FREE") {
    return "bg-ink/10 text-ink/60";
  }

  return "bg-ink/10 text-ink/60";
}

function subscriptionCycleMonths(cycle: SubscriptionBillingCycle) {
  if (cycle === "ANNUAL") {
    return 12;
  }

  if (cycle === "QUARTERLY") {
    return 3;
  }

  return 1;
}

function subscriptionDiscountPercent(plan: SubscriptionPlanConfig, commitment: SubscriptionCommitment, cycle: SubscriptionBillingCycle) {
  if (cycle === "MONTHLY") {
    return 0;
  }

  const monthlyPrice = plan.prices[commitment].MONTHLY;
  const cyclePrice = plan.prices[commitment][cycle];
  const fullPrice = monthlyPrice * subscriptionCycleMonths(cycle);

  if (!monthlyPrice || !cyclePrice || !fullPrice || cyclePrice >= fullPrice) {
    return 0;
  }

  return Math.round((1 - cyclePrice / fullPrice) * 100);
}

function subscriptionSettingsFromRestaurant(settings?: Record<string, unknown>) {
  const subscription = settings?.subscription && typeof settings.subscription === "object" && !Array.isArray(settings.subscription)
    ? settings.subscription as Record<string, unknown>
    : {};
  const billing = settings?.billing && typeof settings.billing === "object" && !Array.isArray(settings.billing)
    ? settings.billing as Record<string, unknown>
    : {};

  return { billing, subscription };
}

function subscriptionStateFromSettings(settings?: Record<string, unknown>) {
  const { billing, subscription } = subscriptionSettingsFromRestaurant(settings);
  const status = typeof subscription.status === "string"
    ? subscription.status
    : typeof billing.status === "string" ? billing.status : "";
  const billingStatus = typeof billing.status === "string" ? billing.status : "";
  const stripeSubscriptionId = typeof subscription.stripeSubscriptionId === "string" ? subscription.stripeSubscriptionId : "";
  const trialEndsAt = typeof subscription.trialEndsAt === "string" ? subscription.trialEndsAt : "";
  const nextBillingDate = typeof subscription.nextBillingDate === "string"
    ? subscription.nextBillingDate
    : typeof settings?.nextInvoiceDate === "string" ? settings.nextInvoiceDate : "";
  const billingDueDate = typeof billing.dueDate === "string"
    ? billing.dueDate
    : typeof billing.paidUntil === "string" ? billing.paidUntil : nextBillingDate;
  const todayDate = today();
  const active = Boolean(stripeSubscriptionId) && isActiveSubscriptionStatus(status);
  const trial = isTrialSubscriptionStatus(status);
  const pastDue = Boolean(stripeSubscriptionId) && isPastDueSubscriptionStatus(status, billingStatus);
  const suspended = Boolean(stripeSubscriptionId) && isSuspendedSubscriptionStatus(status);
  const trialExpired = trial && Boolean(trialEndsAt) && trialEndsAt < todayDate;
  const overdueDays = pastDue && billingDueDate && billingDueDate < todayDate ? daysBetweenDateStrings(billingDueDate, todayDate) : 0;
  const serviceSuspended = suspended || overdueDays >= 15;

  return {
    active,
    billingDueDate,
    overdueDays,
    pastDue,
    serviceSuspended,
    status,
    stripeSubscriptionId,
    suspended,
    trial,
    trialEndsAt,
    trialExpired
  };
}

function SubscriptionPanel({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<"success" | "cancelled" | null>(null);
  const subscriptionSettings = restaurant.settings.subscription && typeof restaurant.settings.subscription === "object" && !Array.isArray(restaurant.settings.subscription)
    ? restaurant.settings.subscription as Record<string, unknown>
    : {};
  const billingSettings = restaurant.settings.billing && typeof restaurant.settings.billing === "object" && !Array.isArray(restaurant.settings.billing)
    ? restaurant.settings.billing as Record<string, unknown>
    : {};
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanName>(() =>
    normalizeSubscriptionPlanName(subscriptionSettings.plan ?? restaurant.settings.subscriptionPlan)
  );
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<SubscriptionBillingCycle>(() =>
    normalizeSubscriptionBillingCycle(subscriptionSettings.billing ?? restaurant.settings.billingCycle)
  );
  const [selectedCommitment, setSelectedCommitment] = useState<SubscriptionCommitment>("TWELVE_MONTHS");
  const [embeddedClientSecret, setEmbeddedClientSecret] = useState<string | null>(null);
  const [showCancellationForm, setShowCancellationForm] = useState(false);
  const [acceptedSubscriptionTerms, setAcceptedSubscriptionTerms] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeResult = params.get("stripe");

    if (stripeResult === "success" || stripeResult === "embedded-success") {
      setPaymentResult("success");
      setEmbeddedClientSecret(null);
      setSubscriptionMessage("Paiement validé. Votre abonnement est en cours de mise à jour.");
      void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
      void queryClient.invalidateQueries({ queryKey: ["stripe-invoices", restaurant.id] });
      void queryClient.invalidateQueries({ queryKey: ["stripe-plans", restaurant.id] });
      params.delete("stripe");
      params.delete("session_id");
      const nextSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
    }

    if (stripeResult === "cancelled") {
      setPaymentResult("cancelled");
      setSubscriptionMessage("Paiement annulé. Aucun changement n’a été appliqué à votre abonnement.");
      params.delete("stripe");
      const nextSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
    }
  }, [queryClient, restaurant.id]);

  const stripePlansQuery = useQuery({
    queryKey: ["stripe-plans", restaurant.id],
    queryFn: () =>
      apiFetch<{
        plans: Array<{
          description: string;
          displayName: string;
          features: string[];
          modelingFeeCents: number;
          name: SubscriptionPlanName;
          prices: Record<SubscriptionCommitment, Record<SubscriptionBillingCycle, {
            amountCents: number;
            currency: string;
            interval: string;
            intervalCount: number;
            lookupKey: string;
            stripePriceId: string | null;
          }>>;
          stripeProductId: string | null;
        }>;
      }>("/api/stripe/plans", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id
        })
      }),
    select: (payload) => payload.plans.map((plan) => ({
      description: plan.description,
      displayName: plan.displayName,
      features: plan.features,
      modelingFeeCents: plan.modelingFeeCents,
      name: plan.name,
      popular: plan.name === "Pro",
      prices: {
        NONE: {
          MONTHLY: plan.prices.NONE.MONTHLY.amountCents,
          QUARTERLY: plan.prices.NONE.QUARTERLY.amountCents,
          ANNUAL: plan.prices.NONE.ANNUAL.amountCents
        },
        TWELVE_MONTHS: {
          MONTHLY: plan.prices.TWELVE_MONTHS.MONTHLY.amountCents,
          QUARTERLY: plan.prices.TWELVE_MONTHS.QUARTERLY.amountCents,
          ANNUAL: plan.prices.TWELVE_MONTHS.ANNUAL.amountCents
        }
      },
      stripeProductId: plan.stripeProductId
    } satisfies SubscriptionPlanConfig))
  });
  const availableSubscriptionPlans = stripePlansQuery.data?.length ? stripePlansQuery.data : subscriptionPlans;
  const selectedPlanConfig = availableSubscriptionPlans.find((plan) => plan.name === selectedPlan) ?? availableSubscriptionPlans[1] ?? subscriptionPlans[1];
  const selectedPlanLabel = selectedPlanConfig.displayName ?? selectedPlanConfig.name;
  const recurringAmountCents = selectedPlanConfig.prices[selectedCommitment][selectedBillingCycle];
  const modelingFeeCents = selectedCommitment === "NONE" ? selectedPlanConfig.modelingFeeCents : 0;
  const selectedPlanHasStripePrice = recurringAmountCents > 0;
  const dueTodayCents = recurringAmountCents + modelingFeeCents;
  const embeddedCheckoutMutation = useMutation({
    mutationFn: async () =>
      apiFetch<{ clientSecret: string | null }>("/api/stripe/embedded-checkout", {
        method: "POST",
        body: JSON.stringify({
          billingCycle: selectedBillingCycle,
          commitment: selectedCommitment,
          planName: selectedPlan,
          restaurantId: restaurant.id
        })
      }),
    onError: (error) => {
      setSubscriptionMessage(error instanceof Error ? error.message : "Impossible de joindre Stripe.");
    },
    onSuccess: (payload) => {
      if (payload.clientSecret) {
        setEmbeddedClientSecret(payload.clientSecret);
        setSubscriptionMessage(null);
        return;
      }

      setSubscriptionMessage("Stripe n’a pas retourné de module de paiement.");
    }
  });
  const billingPortalMutation = useMutation({
    mutationFn: async () =>
      apiFetch<{ url: string }>("/api/stripe/portal", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id
        })
      }),
    onError: (error) => {
      setSubscriptionMessage(error instanceof Error ? error.message : "Impossible d’ouvrir la gestion du moyen de paiement.");
    },
    onSuccess: (payload) => {
      if (payload.url) {
        window.location.assign(payload.url);
        return;
      }

      setSubscriptionMessage("Impossible d’ouvrir la gestion du moyen de paiement.");
    }
  });
  const invoicesQuery = useQuery({
    enabled: Boolean(subscriptionSettings.stripeCustomerId),
    queryKey: ["stripe-invoices", restaurant.id, subscriptionSettings.stripeCustomerId],
    queryFn: () =>
      apiFetch<{
        invoices: Array<{
          amountDue: number;
          amountPaid: number;
          currency: string;
          date: string | null;
          hostedInvoiceUrl: string | null;
          id: string;
          invoicePdf: string | null;
          number: string | null;
          status: string | null;
        }>;
      }>("/api/stripe/invoices", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id
        })
      })
  });
  const planName = typeof subscriptionSettings.plan === "string"
    ? subscriptionSettings.plan
    : typeof restaurant.settings.subscriptionPlan === "string" ? restaurant.settings.subscriptionPlan : "ToqueTop Pro";
  const currentPlanName = normalizeSubscriptionPlanName(planName);
  const currentPlanConfig = availableSubscriptionPlans.find((plan) => plan.name === currentPlanName);
  const currentPlanLabel = currentPlanConfig?.displayName ?? currentPlanConfig?.name ?? planName;
  const currentBillingCycle = normalizeSubscriptionBillingCycle(subscriptionSettings.billing ?? restaurant.settings.billingCycle);
  const billingCycle = subscriptionBillingCycleLabel(currentBillingCycle);
  const stripeCustomerId = typeof subscriptionSettings.stripeCustomerId === "string" ? subscriptionSettings.stripeCustomerId : "";
  const stripeSubscriptionId = typeof subscriptionSettings.stripeSubscriptionId === "string" ? subscriptionSettings.stripeSubscriptionId : "";
  const currentCommitment = typeof subscriptionSettings.commitment === "string" ? subscriptionSettings.commitment : "";
  const currentCommitmentKey: SubscriptionCommitment = currentCommitment === "TWELVE_MONTHS" ? "TWELVE_MONTHS" : "NONE";
  const currentCommitmentLabel = currentCommitment === "TWELVE_MONTHS" ? "Engagement 12 mois" : "Sans engagement";
  const currentPlanPriceCents = currentPlanConfig?.prices[currentCommitmentKey]?.[currentBillingCycle] ?? 0;
  const commitmentEndDate = typeof subscriptionSettings.commitmentEndDate === "string" ? subscriptionSettings.commitmentEndDate : "";
  const subscriptionUnderCommitment = Boolean(stripeSubscriptionId && currentCommitment === "TWELVE_MONTHS" && (!commitmentEndDate || commitmentEndDate >= today()));
  const storedNextBillingDate = typeof subscriptionSettings.nextBillingDate === "string" && subscriptionSettings.nextBillingDate
    ? subscriptionSettings.nextBillingDate
    : typeof restaurant.settings.nextInvoiceDate === "string" ? restaurant.settings.nextInvoiceDate : "";
  const subscriptionStartDate =
    subscriptionSettings.startedAt ??
    subscriptionSettings.startDate ??
    subscriptionSettings.createdAt ??
    subscriptionSettings.subscribedAt ??
    billingSettings.lastPaymentDate ??
    today();
  const subscriptionStatus = typeof subscriptionSettings.status === "string"
    ? subscriptionSettings.status
    : typeof billingSettings.status === "string" ? billingSettings.status : "";
  const billingStatus = typeof billingSettings.status === "string" ? billingSettings.status : "";
  const activeSubscription = Boolean(stripeSubscriptionId) && isActiveSubscriptionStatus(subscriptionStatus);
  const hasStripeSubscription = Boolean(stripeSubscriptionId) && !isCancelledSubscriptionStatus(subscriptionStatus);
  const trialEndsAt = typeof subscriptionSettings.trialEndsAt === "string" ? subscriptionSettings.trialEndsAt : "";
  const trialExpired = isTrialSubscriptionStatus(subscriptionStatus) && Boolean(trialEndsAt) && trialEndsAt < today();
  const paymentPastDue = hasStripeSubscription && isPastDueSubscriptionStatus(subscriptionStatus, billingStatus);
  const suspendedSubscription = hasStripeSubscription && isSuspendedSubscriptionStatus(subscriptionStatus);
  const currentPlanRank = subscriptionPlanRank(currentPlanName);
  const selectedPlanRank = subscriptionPlanRank(selectedPlan);
  const canPurchaseSelectedPlan = !hasStripeSubscription || (activeSubscription && selectedPlanRank > currentPlanRank);
  const invoices = [
    { id: "INV-2026-06", date: "01/06/2026", amount: "79 €", status: "Payée" },
    { id: "INV-2026-05", date: "01/05/2026", amount: "79 €", status: "Payée" },
    { id: "INV-2026-04", date: "01/04/2026", amount: "79 €", status: "Payée" }
  ];
  const stripeInvoices = invoicesQuery.data?.invoices ?? [];
  const nextBillingDate = storedNextBillingDate || (activeSubscription ? addMonthsToDateString(subscriptionStartDate, 1) : "");
  const nextPaymentLabel = activeSubscription && nextBillingDate
    ? formatLongDate(nextBillingDate)
    : "Créé après le premier paiement";
  const currentPlanTitle = hasStripeSubscription
    ? currentPlanLabel
    : isTrialSubscriptionStatus(subscriptionStatus) ? "Période d’essai ToqueTop" : "Aucun forfait actif";
  const canStartEmbeddedPayment = selectedPlanHasStripePrice &&
    !embeddedCheckoutMutation.isPending &&
    Boolean(stripePublishableKey) &&
    canPurchaseSelectedPlan &&
    acceptedSubscriptionTerms;

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Abonnement"
        description="Gérez le forfait, l’engagement, les factures et le paiement intégré sans quitter ToqueTop."
      />

      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        {paymentResult ? (
          <div className={clsx(
            "mb-4 flex items-start justify-between gap-3 rounded-lg border p-4",
            paymentResult === "success" ? "border-moss/20 bg-moss/10 text-moss" : "border-gold/30 bg-gold/10 text-ink"
          )}>
            <div className="flex gap-3">
              <span className={clsx(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                paymentResult === "success" ? "bg-moss text-white" : "bg-gold/30 text-ink"
              )}>
                {paymentResult === "success" ? <Check className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-black">{paymentResult === "success" ? "Paiement validé" : "Paiement annulé"}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-ink/65">
                  {paymentResult === "success"
                    ? "Votre abonnement est en cours de mise à jour. Les informations ci-dessous se mettent à jour automatiquement."
                    : "Aucun paiement n’a été prélevé et votre abonnement reste inchangé."}
                </p>
              </div>
            </div>
            <button className="icon-button h-8 w-8 shrink-0" type="button" onClick={() => setPaymentResult(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Forfait actuel</p>
            <h3 className="mt-1 text-2xl font-black">{currentPlanTitle}</h3>
            {hasStripeSubscription ? <p className="mt-1 text-sm font-semibold text-ink/55">{billingCycle}</p> : null}
            {activeSubscription ? <p className="mt-1 text-sm font-black text-moss">Prochain prélèvement : {nextPaymentLabel}</p> : null}
            {isTrialSubscriptionStatus(subscriptionStatus) && trialEndsAt ? (
              <p className={clsx("mt-1 text-sm font-black", trialExpired ? "text-red-700" : "text-ink/60")}>
                {trialExpired ? "Période d’essai terminée" : `Essai offert jusqu’au ${formatLongDate(trialEndsAt)}`}
              </p>
            ) : null}
            {paymentPastDue ? (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm font-black text-red-700">
                Paiement en retard : régularisez votre facture pour éviter la suspension du service.
              </p>
            ) : null}
            {suspendedSubscription ? (
              <p className="mt-2 rounded-md bg-ink/10 px-3 py-2 text-sm font-black text-ink/70">
                Abonnement suspendu : contactez ToqueTop ou régularisez la situation depuis votre espace de paiement.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={clsx("rounded-full px-3 py-1 text-xs font-black", subscriptionStatusClass(subscriptionStatus, billingStatus))}>
              {subscriptionStatusLabel(subscriptionStatus)}
            </span>
            {hasStripeSubscription ? (
              <button
                className="secondary-button h-9 px-3 text-xs"
                disabled={billingPortalMutation.isPending}
                type="button"
                onClick={() => billingPortalMutation.mutate()}
              >
                {billingPortalMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {paymentPastDue ? "Régulariser le paiement" : "Modifier le mode de paiement"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SettingCard label="Prix actuel" value={currentPlanPriceCents > 0 ? formatCurrencyCents(currentPlanPriceCents) : "Sur mesure"} />
          <SettingCard label="Restaurants" value="1 établissement" />
          <SettingCard label="Engagement" value={currentCommitmentLabel} />
        </div>
        {subscriptionMessage ? (
          <p className={clsx(
            "mt-3 rounded-md p-3 text-xs font-semibold",
            paymentResult === "success" ? "bg-moss/10 text-moss" : "bg-red-50 text-red-700"
          )}>{subscriptionMessage}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-black">Choisir un forfait</h3>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              Choisissez une formule adaptée à votre restaurant.
              {stripePlansQuery.isFetching ? " Actualisation en cours..." : null}
            </p>
          </div>
          <span className="rounded-full bg-sage px-3 py-1 text-xs font-black text-moss">Paiement sécurisé</span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {availableSubscriptionPlans.map((plan) => {
            const planPrice = plan.prices[selectedCommitment][selectedBillingCycle];
            const planRank = subscriptionPlanRank(plan.name);
            const planIsCurrent = hasStripeSubscription && plan.name === currentPlanName;
            const planBlocked = hasStripeSubscription && planRank <= currentPlanRank;
            const discountPercent = subscriptionDiscountPercent(plan, selectedCommitment, selectedBillingCycle);

            return (
            <button
              key={plan.name}
              className={clsx(
                "relative overflow-hidden rounded-lg border p-4 text-left transition focus-ring",
                selectedPlan === plan.name ? "border-moss bg-sage shadow-soft" : "border-ink/10 bg-linen hover:bg-sage/50",
                planBlocked ? "cursor-not-allowed opacity-60 hover:bg-linen" : null
              )}
              disabled={planBlocked}
              type="button"
              onClick={() => {
                if (planBlocked) {
                  return;
                }
                setEmbeddedClientSecret(null);
                setSelectedPlan(plan.name);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{plan.displayName ?? plan.name}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">{plan.description}</p>
                </div>
                {plan.popular ? (
                  <span className="rounded-full bg-moss px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-soft ring-2 ring-gold/40">
                    Populaire
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-2xl font-black">
                {planPrice > 0 ? formatCurrencyCents(planPrice) : "Sur mesure"}
              </p>
              {discountPercent > 0 ? (
                <p className="mt-1 inline-flex rounded-full bg-gold/25 px-2.5 py-1 text-[11px] font-black text-ink">
                  -{discountPercent}% par rapport au mensuel
                </p>
              ) : null}
              {planIsCurrent || planBlocked ? (
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-ink/55">Un abonnement est déjà en cours</p>
              ) : hasStripeSubscription ? (
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-moss">Passer au forfait supérieur</p>
              ) : null}
              <ul className="mt-3 grid gap-1 text-xs font-semibold text-ink/60">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-moss" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Périodicité</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {subscriptionBillingOptions.map((option) => (
                  <button
                    key={option.id}
                    className={clsx(
                      "rounded-md border p-3 text-left text-sm transition focus-ring",
                      selectedBillingCycle === option.id ? "border-moss bg-sage text-moss" : "border-ink/10 bg-linen",
                      hasStripeSubscription ? "cursor-not-allowed opacity-60" : null
                    )}
                    disabled={hasStripeSubscription}
                    type="button"
                    onClick={() => {
                      if (hasStripeSubscription) {
                        return;
                      }
                      setEmbeddedClientSecret(null);
                      setSelectedBillingCycle(option.id);
                    }}
                  >
                    <span className="block font-black">{option.label}</span>
                    <span className="mt-1 block text-xs font-semibold text-ink/55">{option.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Engagement</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {subscriptionCommitmentOptions.map((option) => (
                  <button
                    key={option.id}
                    className={clsx(
                      "rounded-md border p-3 text-left text-sm transition focus-ring",
                      selectedCommitment === option.id ? "border-moss bg-sage text-moss" : "border-ink/10 bg-linen",
                      hasStripeSubscription ? "cursor-not-allowed opacity-60" : null
                    )}
                    disabled={hasStripeSubscription}
                    type="button"
                    onClick={() => {
                      if (hasStripeSubscription) {
                        return;
                      }
                      setEmbeddedClientSecret(null);
                      setSelectedCommitment(option.id);
                    }}
                  >
                    <span className="flex items-center gap-2 font-black">
                      {option.label}
                      <span className="group relative inline-flex" aria-label={`Information ${option.label}`}>
                        <Info className="h-3.5 w-3.5 text-moss" />
                        <span className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-80 -translate-x-1/2 rounded-md border border-ink/10 bg-white p-3 text-left text-[11px] font-semibold leading-5 text-ink/70 opacity-0 shadow-soft transition group-hover:opacity-100">
                          {option.id === "TWELVE_MONTHS"
                            ? "La modélisation 2D/3D de votre restaurant est incluse dans votre abonnement avec engagement. Plutôt que de régler des frais de création au démarrage, ceux-ci sont répartis dans vos mensualités. Un membre de l’équipe ToqueTop modélise votre établissement à votre image afin d’offrir à vos clients une expérience de réservation immersive, claire et moderne."
                            : "Avec l’abonnement sans engagement, vous restez libre à tout moment. La modélisation 2D/3D de votre restaurant est facturée une seule fois lors de la mise en place. Cette étape importante mobilise un membre de l’équipe ToqueTop pour créer un espace fidèle à votre établissement et offrir à vos clients une expérience de réservation immersive."}
                        </span>
                      </span>
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-ink/55">{option.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-ink/10 bg-linen p-4">
            <p className="text-sm font-black">Récapitulatif</p>
            <div className="mt-3 grid gap-2 text-sm font-semibold">
              <div className="flex justify-between gap-3">
                <span>Forfait</span>
                <span className="font-black">{selectedPlanLabel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Abonnement</span>
                <span className="font-black">{selectedPlanHasStripePrice ? formatCurrencyCents(recurringAmountCents) : "Sur devis"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Modélisation 2D/3D</span>
                <span className="font-black">{modelingFeeCents > 0 ? formatCurrencyCents(modelingFeeCents) : "Incluse"}</span>
              </div>
              <div className="border-t border-ink/10 pt-2 flex justify-between gap-3 text-base">
                <span>À payer aujourd’hui</span>
                <span className="font-black">{selectedPlanHasStripePrice ? formatCurrencyCents(dueTodayCents) : "Sur mesure"}</span>
              </div>
            </div>
            <button
              className="primary-button mt-4 h-10 w-full text-xs"
              disabled={!canStartEmbeddedPayment}
              type="button"
              onClick={() => embeddedCheckoutMutation.mutate()}
            >
              {embeddedCheckoutMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Payer dans ToqueTop
            </button>
            {selectedPlanHasStripePrice && canPurchaseSelectedPlan ? (
              <label className="mt-3 flex items-start gap-2 rounded-md bg-white p-3 text-xs font-semibold leading-5 text-ink/65">
                <input
                  className="mt-1 h-4 w-4 accent-moss"
                  checked={acceptedSubscriptionTerms}
                  type="checkbox"
                  onChange={(event) => setAcceptedSubscriptionTerms(event.target.checked)}
                />
                <span>
                  J’accepte les{" "}
                  <a className="font-black text-moss hover:underline" href="https://help.toquetop.com/legal/conditions-generales-vente" rel="noreferrer" target="_blank">CGV</a>
                  , les{" "}
                  <a className="font-black text-moss hover:underline" href="https://help.toquetop.com/legal/conditions-generales-utilisation" rel="noreferrer" target="_blank">CGU</a>
                  {" "}et la{" "}
                  <a className="font-black text-moss hover:underline" href="https://help.toquetop.com/legal/protection-donnees" rel="noreferrer" target="_blank">Politique de confidentialité</a>.
                </span>
              </label>
            ) : null}
            {selectedPlanHasStripePrice && canPurchaseSelectedPlan && !acceptedSubscriptionTerms ? (
              <p className="mt-2 text-xs font-semibold text-ink/50">L’acceptation des conditions est nécessaire pour souscrire.</p>
            ) : null}
            {!selectedPlanHasStripePrice ? (
              <p className="mt-3 rounded-md bg-white p-3 text-xs font-semibold leading-5 text-ink/60">Ce forfait n’a pas encore de prix Stripe actif pour cette périodicité.</p>
            ) : null}
            {!stripePublishableKey ? (
              <p className="mt-3 rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700">La clé publique Stripe n’est pas disponible dans cet environnement.</p>
            ) : null}
            {!canPurchaseSelectedPlan ? (
              <p className="mt-3 rounded-md bg-white p-3 text-xs font-semibold leading-5 text-ink/60">
                Votre abonnement est déjà en cours. Vous pouvez uniquement passer à un forfait supérieur.
              </p>
            ) : null}
          </aside>
        </div>

        {embeddedClientSecret ? (
          <div className="mt-4 rounded-lg border border-moss/20 bg-white p-3 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-black">Paiement sécurisé</h4>
                <p className="text-xs font-semibold text-ink/55">Avec ToqueTop, ne laissez plus vos réservations mijoter !</p>
              </div>
              <button className="icon-button h-8 w-8" type="button" onClick={() => setEmbeddedClientSecret(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <StripeEmbeddedCheckout clientSecret={embeddedClientSecret} />
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <h3 className="font-black">Comparatif des fonctionnalités</h3>
        <p className="mt-1 text-sm font-semibold text-ink/55">Vue claire des options incluses selon la formule choisie.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-[0.12em] text-ink/45">
                <th className="border-b border-ink/10 bg-linen px-3 py-3">Option</th>
                {availableSubscriptionPlans.map((plan) => (
                  <th key={plan.name} className="border-b border-ink/10 bg-linen px-3 py-3 text-center">{plan.displayName ?? plan.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptionFeatureComparison.map((feature) => (
                <tr key={feature.label}>
                  <td className="border-b border-ink/10 px-3 py-3 font-bold text-ink">{feature.label}</td>
                  {availableSubscriptionPlans.map((plan) => {
                    const value = feature.values[plan.name];
                    const positive = value === "Inclus" || value === "Avancé" || value === "Dédié" || value === "Email + SMS" || value === "Multi-sites";

                    return (
                      <td key={`${feature.label}-${plan.name}`} className="border-b border-ink/10 px-3 py-3 text-center">
                        <span className={clsx(
                          "inline-flex min-w-20 items-center justify-center rounded-full px-2.5 py-1 text-xs font-black",
                          positive ? "bg-moss/10 text-moss" : value === "Non" ? "bg-ink/10 text-ink/45" : "bg-gold/15 text-ink"
                        )}>
                          {value}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black">Facturation</h3>
          <button className="secondary-button h-9 px-3 text-xs" disabled={invoicesQuery.isFetching || !stripeCustomerId} type="button" onClick={() => void invoicesQuery.refetch()}>
            {invoicesQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Actualiser
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {(stripeInvoices.length > 0 ? stripeInvoices : invoices).map((invoice) => (
            <article key={invoice.id} className="grid gap-3 rounded-md bg-linen p-3 text-sm md:grid-cols-[1fr_120px_110px_110px] md:items-center">
              <span className="min-w-0">
                <span className="block truncate font-black">{"number" in invoice && invoice.number ? invoice.number : invoice.id}</span>
                {"invoicePdf" in invoice && invoice.invoicePdf ? (
                  <a className="text-xs font-bold text-moss hover:underline" href={invoice.invoicePdf} rel="noreferrer" target="_blank">PDF</a>
                ) : null}
              </span>
              <span className="text-xs font-bold text-ink/60">{"date" in invoice && invoice.date ? formatDate(invoice.date) : "Date à définir"}</span>
              <span className="font-black">{"amountPaid" in invoice ? formatCurrencyCents(invoice.amountPaid || invoice.amountDue, invoice.currency) : invoice.amount}</span>
              <span className="rounded-full bg-moss/10 px-2 py-1 text-center text-xs font-black text-moss">{invoice.status ?? "Payée"}</span>
            </article>
          ))}
          {!stripeCustomerId ? (
            <p className="rounded-md bg-linen p-3 text-sm font-semibold text-ink/55">Les factures Stripe apparaîtront ici après le premier paiement.</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black">Résiliation</h3>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {subscriptionUnderCommitment
                ? `Contrat sous engagement : votre abonnement pourra être résilié le ${commitmentEndDate ? formatLongDate(commitmentEndDate) : "à la fin de l’engagement"}.`
                : "Vous pouvez envoyer une demande de résiliation à l’équipe ToqueTop."}
            </p>
          </div>
          <button
            className={clsx("secondary-button h-9 px-3 text-xs", subscriptionUnderCommitment ? "cursor-not-allowed opacity-50" : "text-red-700")}
            disabled={subscriptionUnderCommitment}
            type="button"
            onClick={() => setShowCancellationForm((value) => !value)}
          >
            Demander la résiliation
          </button>
        </div>
        {showCancellationForm && !subscriptionUnderCommitment ? (
          <form
            className="mt-4 grid gap-3 rounded-md bg-linen p-3"
            onSubmit={(event) => {
              event.preventDefault();
              setShowCancellationForm(false);
              setSubscriptionMessage("Votre demande de résiliation a été enregistrée. L’équipe ToqueTop reviendra vers vous pour la traiter.");
            }}
          >
            <label className="text-sm font-bold">
              Raison
              <select className="control mt-1 w-full" name="reason">
                <option>Budget</option>
                <option>Changement d’outil</option>
                <option>Fonctionnalité manquante</option>
                <option>Fermeture temporaire</option>
                <option>Autre</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              Commentaire
              <textarea className="control mt-1 min-h-20 w-full" name="comment" placeholder="Précisez votre demande..." />
            </label>
            <button className="primary-button h-9 text-xs" type="submit">Envoyer la demande</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function TemplatesPanel({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const smsBalance = settingNumber(restaurant.settings, ["smsBalance", "smsRemaining"], 0);
  const smsSent = settingNumber(restaurant.settings, ["smsSent", "smsSentCount"], 0);
  const smsPrice = settingNumber(restaurant.settings, ["smsPriceCents"], 12) / 100;
  const waitlistSmsEnabled = restaurant.settings.waitlistSmsEnabled !== false;
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          settings
        })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["current-restaurants"] });
    }
  });
  const emailOptions = [
    "Confirmation de réservation par email",
    "Modification de réservation",
    "Annulation de réservation",
    "Rappel email si réservation prise plus de 3 jours avant",
    "Sondage de satisfaction après service",
    "Demande d’avis Google / Tripadvisor"
  ];
  const smsOptions = [
    "Confirmation de réservation par SMS",
    "Rappel SMS 24h avant",
    "Rappel SMS 3h avant",
    "Rappel SMS 30 min avant",
    "SMS d’annulation",
    "SMS de modification de réservation"
  ];

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Notifications"
        description="Activation des emails, SMS, rappels, avis et messages automatiques du restaurant."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black">
                <Mail className="h-4 w-4 text-moss" />
                Paramètres mails
              </h3>
              <p className="mt-1 text-sm font-semibold text-ink/55">Emails transactionnels, rappels longs et demandes d’avis.</p>
            </div>
            <span className="rounded-full bg-sage px-3 py-1 text-xs font-black text-moss">Email</span>
          </div>
          <div className="mt-4 grid gap-2">
            {emailOptions.map((option) => (
              <label key={option} className="flex items-center justify-between gap-3 rounded-md bg-linen p-3 text-sm font-bold">
                <span>{option}</span>
                <input className="h-4 w-4 accent-moss" defaultChecked type="checkbox" />
              </label>
            ))}
          </div>
          <p className="mt-3 rounded-md bg-sage/60 p-3 text-xs font-semibold leading-5 text-moss">
            Info : le rappel email “plus de 3 jours avant” évite de sur-solliciter les réservations proches, tout en gardant un rappel utile pour les réservations anticipées.
          </p>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black">
                <MessageSquare className="h-4 w-4 text-moss" />
                Paramètres SMS
              </h3>
              <p className="mt-1 text-sm font-semibold text-ink/55">Confirmations, rappels courts et suivi du crédit SMS.</p>
            </div>
            <span className="rounded-full bg-moss px-3 py-1 text-xs font-black text-white">SMS</span>
          </div>
          <div className="mt-4 grid gap-2">
            {smsOptions.map((option) => (
              <label key={option} className="flex items-center justify-between gap-3 rounded-md bg-linen p-3 text-sm font-bold">
                <span>{option}</span>
                <input className="h-4 w-4 accent-moss" defaultChecked={!option.includes("30 min")} type="checkbox" />
              </label>
            ))}
            <label className="flex items-center justify-between gap-3 rounded-md bg-linen p-3 text-sm font-bold">
              <span className="flex items-center gap-2">
                Autoriser les SMS Waitlist
                <span className="group relative inline-flex">
                  <Info className="h-4 w-4 text-ink/45" />
                  <span className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-64 -translate-x-1/2 rounded-md bg-ink p-2 text-xs font-semibold leading-5 text-white opacity-0 shadow-soft transition group-hover:opacity-100">
                    La waitlist permet de prévenir automatiquement un client en attente lorsqu’une table peut se libérer. Les SMS consomment le crédit SMS du restaurant.
                  </span>
                </span>
              </span>
              <input
                className="h-4 w-4 accent-moss"
                defaultChecked={waitlistSmsEnabled}
                type="checkbox"
                onChange={(event) =>
                  updateSettingsMutation.mutate({
                    ...restaurant.settings,
                    waitlistSmsEnabled: event.target.checked
                  })
                }
              />
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SettingCard label="SMS restants" value={smsBalance.toString()} />
            <SettingCard label="SMS envoyés" value={smsSent.toString()} />
            <SettingCard label="Tarif estimé / SMS" value={`${smsPrice.toFixed(2)} €`} />
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-ink/55">
            L’activation commerciale et le crédit SMS global restent pilotables depuis l’espace ToqueTop central.
          </p>
        </div>
      </div>
    </section>
  );
}

function PlaceholderPanel({ section }: { section: string }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <h2 className="text-lg font-black">{section}</h2>
      <p className="mt-1 text-sm font-semibold text-ink/55">Section prête pour les réglages V1. Les actions critiques restent dans le Dashboard Live.</p>
    </section>
  );
}

function InputField({
  autoFocus,
  defaultValue,
  label,
  name,
  onChange,
  required,
  type = "text",
  value
}: {
  autoFocus?: boolean;
  defaultValue?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        className="control mt-1 w-full"
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        name={name}
        required={required ?? ["firstName", "lastName", "email"].includes(name)}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
  render
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: string[];
  render?: (value: string) => string;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select className="control mt-1 w-full" defaultValue={defaultValue} name={name}>
        {options.map((option) => (
          <option key={option || "none"} value={option}>
            {render ? render(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditReservationForm({
  openingHours,
  reservation,
  reservations,
  selectedService,
  settings,
  tableBlocks,
  tables,
  onSubmit
}: {
  openingHours: OpeningHours;
  reservation: Reservation;
  reservations: Reservation[];
  selectedService: ServiceFilter;
  settings: Record<string, unknown>;
    tableBlocks: TableBlock[];
    tables: FloorTable[];
    onSubmit: (formData: FormData) => void;
}) {
  const duration = settingNumber(settings, ["reservationDurationMinutes"], 120);
  const [startTime, setStartTime] = useState(reservation.startTime);
  const [numberOfGuests, setNumberOfGuests] = useState(reservation.numberOfGuests);
  const endTime = minutesToTime(parseTimeToMinutes(startTime) + duration);
  const reservationDate = reservation.date.slice(0, 10);
  const serviceTimeOptions = timeOptionsForService(openingHours, reservationDate, selectedService);
  const availableStartTimes = serviceTimeOptions.filter((time) => {
    const nextEndTime = minutesToTime(parseTimeToMinutes(time) + duration);

    return tables.some((table) => {
      if (!table.active || table.capacity < numberOfGuests) {
        return false;
      }

      const overlapsReservation = reservations.some((otherReservation) =>
        otherReservation.id !== reservation.id &&
        otherReservation.status !== "CANCELLED" &&
        otherReservation.date.slice(0, 10) === reservationDate &&
        otherReservation.table?.id === table.id &&
        overlapsTime(otherReservation.startTime, otherReservation.endTime, time, nextEndTime)
      );
      const overlapsBlock = tableBlocks.some((block) =>
        block.tableId === table.id &&
        block.date.slice(0, 10) === reservationDate &&
        overlapsTime(block.startTime, block.endTime, time, nextEndTime)
      );

      return !overlapsReservation && !overlapsBlock;
    });
  });
  const startTimeOptions = [...new Set([reservation.startTime, ...availableStartTimes])]
    .sort((first, second) => parseTimeToMinutes(first) - parseTimeToMinutes(second));
  const availableTables = tables.filter((table) => {
    if (!table.active || table.capacity < numberOfGuests) {
      return false;
    }

    const overlapsReservation = reservations.some((otherReservation) =>
      otherReservation.id !== reservation.id &&
      otherReservation.status !== "CANCELLED" &&
      otherReservation.date.slice(0, 10) === reservationDate &&
      otherReservation.table?.id === table.id &&
      overlapsTime(otherReservation.startTime, otherReservation.endTime, startTime, endTime)
    );
    const overlapsBlock = tableBlocks.some((block) =>
      block.tableId === table.id &&
      block.date.slice(0, 10) === reservationDate &&
      overlapsTime(block.startTime, block.endTime, startTime, endTime)
    );

    return !overlapsReservation && !overlapsBlock;
  });
  const [tableId, setTableId] = useState(() => {
    const currentTableId = reservation.table?.id;

    return currentTableId && availableTables.some((table) => table.id === currentTableId)
      ? currentTableId
      : availableTables[0]?.id ?? "";
  });
  const availableTableIds = availableTables.map((table) => table.id).join("|");

  useEffect(() => {
    if (!availableTables.some((table) => table.id === tableId)) {
      setTableId(availableTables[0]?.id ?? "");
    }
  }, [availableTableIds, availableTables, tableId]);

  useEffect(() => {
    if (!startTimeOptions.includes(startTime)) {
      setStartTime(startTimeOptions[0] ?? reservation.startTime);
    }
  }, [reservation.startTime, startTime, startTimeOptions]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">
          Heure
          <select className="control mt-1 w-full" name="startTime" value={startTime} onChange={(event) => setStartTime(event.target.value)}>
            {startTimeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Couverts
          <input
            className="control mt-1 w-full"
            min="1"
            name="numberOfGuests"
            type="number"
            value={numberOfGuests}
            onChange={(event) => setNumberOfGuests(Number(event.target.value))}
          />
        </label>
        <SelectField
          defaultValue={reservation.status}
          label="Statut"
          name="status"
          options={["PENDING", "CONFIRMED", "CANCELLED"]}
          render={(value) => statusLabel(value as Reservation["status"])}
        />
      </div>

      <input name="endTime" type="hidden" value={endTime} />

      <label className="text-sm font-bold">
        Numéro de table disponible
        <select
          className="control mt-1 w-full"
          disabled={availableTables.length === 0}
          name="tableId"
          required
          value={tableId}
          onChange={(event) => setTableId(event.target.value)}
        >
          {availableTables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.label} · {table.capacity} couverts
            </option>
          ))}
        </select>
      </label>
      {availableTables.length === 0 ? (
        <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
          Aucune table disponible pour {numberOfGuests} couvert(s) à {startTime}. Modifiez l’horaire ou le nombre de couverts.
        </p>
      ) : (
        <p className="rounded-md bg-linen p-3 text-xs font-bold text-ink/60">
          Les tables affichées respectent la capacité et les blocages/réservations du créneau {startTime} - {endTime}.
        </p>
      )}

      <label className="text-sm font-bold">
        Notes
        <textarea className="control mt-1 min-h-24 w-full" defaultValue={reservation.notes ?? ""} name="notes" />
      </label>
      <button className="primary-button w-full" disabled={availableTables.length === 0} type="submit">Enregistrer</button>
    </form>
  );
}

function waitlistTimeOptionsForDate(openingHours: OpeningHours, date: string) {
  const windows = normalizeServiceWindows(openingHours[getDayKey(date)]);
  const options: string[] = [];

  for (const serviceWindow of windows) {
    for (let minutes = serviceWindow.openMinutes; minutes < serviceWindow.closeMinutes; minutes += 15) {
      options.push(minutesToTime(minutes));
    }
  }

  return [...new Set(options)].sort((first, second) => parseTimeToMinutes(first) - parseTimeToMinutes(second));
}

function timeOptionsForService(openingHours: OpeningHours, date: string, service: ServiceFilter) {
  const windows = normalizeServiceWindows(openingHours[getDayKey(date)])
    .filter((serviceWindow) => serviceWindow.service === service);
  const options: string[] = [];

  for (const serviceWindow of windows) {
    for (let minutes = serviceWindow.openMinutes; minutes < serviceWindow.closeMinutes; minutes += 15) {
      options.push(minutesToTime(minutes));
    }
  }

  return [...new Set(options)].sort((first, second) => parseTimeToMinutes(first) - parseTimeToMinutes(second));
}

function waitlistServiceOptionsForDate(openingHours: OpeningHours, date: string) {
  const windows = normalizeServiceWindows(openingHours[getDayKey(date)]);
  const services = new Set(windows.map((window) => window.service));

  return [
    services.has("lunch") ? { value: "lunch" as const, label: "Midi" } : null,
    services.has("dinner") ? { value: "dinner" as const, label: "Soir" } : null
  ].filter((service): service is { value: ServiceFilter; label: string } => Boolean(service));
}

function ReservationForm({
  clients,
  defaultDate,
  defaultTableId,
  openingHours,
  reservations,
  settings,
  tableBlocks,
  tables,
  onClientSearchChange,
  onSubmit
}: {
  clients: Client[];
  defaultDate: string;
  defaultTableId?: string;
  openingHours: OpeningHours;
  reservations: Reservation[];
  settings: Record<string, unknown>;
  tableBlocks: TableBlock[];
  tables: FloorTable[];
  onClientSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [crmSearch, setCrmSearch] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(() => waitlistTimeOptionsForDate(openingHours, defaultDate)[0] ?? "20:00");
  const [numberOfGuests, setNumberOfGuests] = useState(2);
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const duration = settingNumber(settings, ["reservationDurationMinutes"], 120);
  const endTime = minutesToTime(parseTimeToMinutes(startTime) + duration);
  const dateTimeOptions = waitlistTimeOptionsForDate(openingHours, date);
  const availableTables = tables.filter((table) => {
    if (!table.active || table.capacity < numberOfGuests) {
      return false;
    }

    const reserved = reservations.some((reservation) =>
      reservation.status !== "CANCELLED" &&
      reservation.date.slice(0, 10) === date &&
      reservation.table?.id === table.id &&
      overlapsTime(reservation.startTime, reservation.endTime, startTime, endTime)
    );
    const blocked = tableBlocks.some((block) =>
      block.tableId === table.id &&
      block.date.slice(0, 10) === date &&
      overlapsTime(block.startTime, block.endTime, startTime, endTime)
    );

    return !reserved && !blocked;
  });
  const visibleClients = clients.slice(0, 4);
  const selectedTableDefault = defaultTableId && availableTables.some((table) => table.id === defaultTableId)
    ? defaultTableId
    : availableTables[0]?.id ?? "";
  const [tableId, setTableId] = useState(selectedTableDefault);
  const availableTableIds = availableTables.map((table) => table.id).join("|");

  useEffect(() => {
    if (!dateTimeOptions.includes(startTime)) {
      setStartTime(dateTimeOptions[0] ?? "20:00");
    }
  }, [dateTimeOptions, startTime]);

  useEffect(() => {
    if (!availableTables.some((table) => table.id === tableId)) {
      setTableId(availableTables[0]?.id ?? "");
    }
  }, [availableTableIds, availableTables, tableId]);

  function selectClient(client: Client) {
    setDraft({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email ?? "",
      phone: client.phone ?? ""
    });
    setCrmSearch(`${client.firstName} ${client.lastName}`);
  }

  return (
    <form className="grid gap-2 text-sm" onSubmit={onSubmit}>
      <label className="text-xs font-bold text-ink/70">
        Rechercher dans le CRM
        <input
          className="control mt-1 h-8 w-full text-sm"
          placeholder="Nom, téléphone, email"
          type="search"
          value={crmSearch}
          onChange={(event) => {
            setCrmSearch(event.target.value);
            onClientSearchChange(event.target.value);
          }}
        />
      </label>
      {crmSearch && visibleClients.length > 0 ? (
        <div className="grid gap-1 rounded-md bg-linen p-2 sm:grid-cols-2">
          {visibleClients.map((client) => (
            <button
              key={client.id}
              className="rounded border border-ink/10 bg-white px-2 py-1.5 text-left text-xs font-bold transition hover:border-moss"
              type="button"
              onClick={() => selectClient(client)}
            >
              <span className="block font-black">{client.firstName} {client.lastName}</span>
              <span className="block truncate text-ink/55">{client.phone ?? client.email ?? "Contact incomplet"}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <InputField label="Prénom" name="firstName" value={draft.firstName} onChange={(value) => setDraft((current) => ({ ...current, firstName: value }))} />
        <InputField label="Nom" name="lastName" value={draft.lastName} onChange={(value) => setDraft((current) => ({ ...current, lastName: value }))} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <InputField label="Email" name="email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
        <InputField label="Téléphone" name="phone" required value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-bold">
          Date
          <input className="control mt-1 h-8 w-full text-sm" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="text-xs font-bold">
          Horaire
          <select className="control mt-1 h-8 w-full text-sm" name="startTime" value={startTime} onChange={(event) => setStartTime(event.target.value)}>
            {dateTimeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Couverts
          <input className="control mt-1 h-8 w-full text-sm" min="1" name="numberOfGuests" type="number" value={numberOfGuests} onChange={(event) => setNumberOfGuests(Number(event.target.value))} />
        </label>
      </div>
      <label className="text-xs font-bold">
        Table disponible
        <select className="control mt-1 h-8 w-full text-sm" disabled={!availableTables.length} name="tableId" required value={tableId} onChange={(event) => setTableId(event.target.value)}>
          {availableTables.map((table) => (
            <option key={table.id} value={table.id}>{table.label} · {table.capacity} couverts</option>
          ))}
        </select>
      </label>
      {!availableTables.length ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          Aucune table disponible pour {numberOfGuests} couvert(s) à {startTime}.
        </p>
      ) : null}
      <PreferenceCheckboxes compact />
      <label className="flex items-center justify-between gap-3 rounded-md bg-linen px-3 py-2 text-xs font-bold">
        <span className="flex items-center gap-1">
          <Phone className="h-3.5 w-3.5 text-moss" />
          Notification confirmation SMS
          <span className="group relative inline-flex">
            <Info className="h-3.5 w-3.5 text-ink/45" />
            <span className="pointer-events-none absolute bottom-5 left-1/2 z-20 w-52 -translate-x-1/2 rounded-md bg-ink p-2 text-[11px] font-semibold text-white opacity-0 shadow-soft transition group-hover:opacity-100">
              Le client recevra une confirmation SMS de sa réservation si le service SMS est actif.
            </span>
          </span>
        </span>
        <input className="h-4 w-4 accent-moss" name="sendConfirmationSms" type="checkbox" />
      </label>
      <label className="text-xs font-bold">
        Note
        <textarea className="control mt-1 min-h-12 w-full text-sm" name="notes" />
      </label>
      <button className="primary-button h-9 w-full" disabled={!availableTables.length} type="submit">Créer la réservation</button>
    </form>
  );
}

function WaitlistForm({
  clients,
  defaultDate,
  defaultService,
  openingHours,
  onClientSearchChange,
  onSubmit
}: {
  clients: Client[];
  defaultDate: string;
  defaultService: ServiceFilter;
  openingHours: OpeningHours;
  onClientSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [crmSearch, setCrmSearch] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [requestedTime, setRequestedTime] = useState("");
  const [requestedService, setRequestedService] = useState<ServiceFilter>(defaultService);
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const timeOptionsForDate = waitlistTimeOptionsForDate(openingHours, date);
  const serviceOptionsForDate = waitlistServiceOptionsForDate(openingHours, date);
  const serviceOptionsKey = serviceOptionsForDate.map((service) => service.value).join("|");
  const visibleClients = clients.slice(0, 4);

  useEffect(() => {
    if (!serviceOptionsForDate.some((service) => service.value === requestedService)) {
      setRequestedService(serviceOptionsForDate[0]?.value ?? defaultService);
    }
  }, [defaultService, requestedService, serviceOptionsKey, serviceOptionsForDate]);

  function selectClient(client: Client) {
    setDraft({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email ?? "",
      phone: client.phone ?? ""
    });
    setCrmSearch(`${client.firstName} ${client.lastName}`);
  }

  return (
    <form className="grid gap-2 text-sm" onSubmit={onSubmit}>
      <label className="text-xs font-bold text-ink/70">
        Rechercher dans le CRM
        <input
          className="control mt-1 h-8 w-full text-sm"
          placeholder="Nom, téléphone, email"
          type="search"
          value={crmSearch}
          onChange={(event) => {
            setCrmSearch(event.target.value);
            onClientSearchChange(event.target.value);
          }}
        />
      </label>
      {crmSearch && visibleClients.length > 0 ? (
        <div className="grid gap-1 rounded-md bg-linen p-2 sm:grid-cols-2">
          {visibleClients.map((client) => (
            <button
              key={client.id}
              className="rounded border border-ink/10 bg-white px-2 py-1.5 text-left text-xs font-bold transition hover:border-moss"
              type="button"
              onClick={() => selectClient(client)}
            >
              <span className="flex items-center gap-2 font-black">
                {client.firstName} {client.lastName}
                {client.vip ? <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">VIP</span> : null}
              </span>
              <span className="block truncate text-ink/55">{client.phone ?? client.email ?? "Contact incomplet"}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <InputField label="Prénom" name="firstName" value={draft.firstName} onChange={(value) => setDraft((current) => ({ ...current, firstName: value }))} />
        <InputField label="Nom" name="lastName" value={draft.lastName} onChange={(value) => setDraft((current) => ({ ...current, lastName: value }))} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <InputField label="Email" name="email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
        <InputField label="Téléphone" name="phone" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-bold">
          Date
          <input className="control mt-1 h-8 w-full text-sm" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="text-xs font-bold">
          Heure souhaitée
          <select className="control mt-1 h-8 w-full text-sm" name="requestedTime" value={requestedTime} onChange={(event) => setRequestedTime(event.target.value)}>
            <option value="">Flexible</option>
            {timeOptionsForDate.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </label>
        <InputField defaultValue="2" label="Couverts" name="numberOfGuests" type="number" />
      </div>
      {!requestedTime ? (
        <label className="text-xs font-bold">
          Service souhaité
          <select className="control mt-1 h-8 w-full text-sm" name="requestedService" value={requestedService} onChange={(event) => setRequestedService(event.target.value as ServiceFilter)}>
            {serviceOptionsForDate.length > 0 ? (
              serviceOptionsForDate.map((service) => (
                <option key={service.value} value={service.value}>{service.label}</option>
              ))
            ) : (
              <option value={defaultService}>Service indisponible</option>
            )}
          </select>
        </label>
      ) : null}
      {timeOptionsForDate.length === 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          Aucun service ouvert sur cette date. Choisissez une autre date.
        </p>
      ) : null}
      <PreferenceCheckboxes compact />
      <label className="text-xs font-bold">
        Note
        <textarea className="control mt-1 min-h-12 w-full text-sm" name="notes" />
      </label>
      <button className="primary-button h-9 w-full" type="submit">Ajouter à la liste</button>
    </form>
  );
}

function ClientForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField label="Prénom" name="firstName" />
        <InputField label="Nom" name="lastName" />
      </div>
      <InputField label="Email" name="email" type="email" />
      <InputField label="Téléphone" name="phone" />
      <InputField label="Anniversaire" name="birthday" type="date" />
      <InputField label="Allergies" name="allergies" />
      <InputField label="Préférences (séparées par virgule)" name="preferences" />
      <label className="text-sm font-bold">
        Notes internes
        <textarea className="control mt-1 min-h-20 w-full" name="internalNotes" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input className="h-4 w-4 accent-moss" name="vip" type="checkbox" />
          Statut VIP
        </label>
        <InputField defaultValue="0" label="Risque no-show" name="noShowRisk" type="number" />
      </div>
      <button className="primary-button w-full" type="submit">Créer la fiche client</button>
    </form>
  );
}

function PreferenceCheckboxes({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx("grid gap-2 sm:grid-cols-2", compact && "sm:grid-cols-3")}>
      {[
        ["QUIET", "Table au calme"],
        ["ACCESSIBLE", "PMR"],
        ["KIDS", "Enfants en bas âge"],
        ["WINDOW", "Près d’une fenêtre"]
      ].map(([value, label]) => (
        <label key={value} className={clsx("flex items-center gap-2 rounded-md bg-linen font-bold", compact ? "p-1.5 text-[11px]" : "p-2 text-sm")}>
          <input className="h-4 w-4 accent-moss" name={value} type="checkbox" />
          {label}
        </label>
      ))}
      <label className={clsx("flex items-center gap-2 rounded-md bg-linen font-bold", compact ? "p-1.5 text-[11px]" : "p-2 text-sm")}>
        <input className="h-4 w-4 accent-moss" name="highChair" type="checkbox" />
        Chaise haute
      </label>
      <label className={clsx("flex items-center gap-2 rounded-md bg-linen font-bold", compact ? "p-1.5 text-[11px]" : "p-2 text-sm")}>
        <input className="h-4 w-4 accent-moss" name="birthday" type="checkbox" />
        Anniversaire
      </label>
      <label className={clsx("flex items-center gap-2 rounded-md bg-linen font-bold", compact ? "p-1.5 text-[11px]" : "p-2 text-sm")}>
        <input className="h-4 w-4 accent-moss" name="romanticDinner" type="checkbox" />
        Dîner romantique
      </label>
    </div>
  );
}
