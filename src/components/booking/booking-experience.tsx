"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  FileText,
  LayoutGrid,
  Mail,
  Phone,
  Sparkles,
  UserRound,
  Users
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { apiFetch } from "@/hooks/use-api";
import { useRestaurantSocket } from "@/hooks/use-socket-events";
import {
  tableFeatures,
  type AvailabilitySlot,
  type FloorTable,
  type OpeningHours,
  type TableCombination,
  type TableFeature
} from "@/lib/domain";
import {
  applyFloorPlanSettings,
  defaultFloorRoom,
  floorPlan2dImageUrlFromSettings,
  floorPlanModelUrlFromSettings,
  floorRoomsFromSettings,
  tableRoomsFromSettings,
  tableViewImageStyle
} from "@/lib/floor-plan-settings";
import { useI18n } from "@/lib/i18n";
import { addDaysToDateString, inferTimeZoneFromAddress, todayInTimeZone } from "@/lib/time";
import { useBookingStore } from "@/stores/booking-store";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
  openingHours: OpeningHours;
  settings: Record<string, unknown>;
  tables: FloorTable[];
};

type RestaurantsResponse = {
  restaurants: Restaurant[];
};

type AvailabilityResponse = {
  tables: FloorTable[];
  combinations?: AvailableTableCombination[];
};

type AvailableTableCombination = {
  capacity: number;
  combination: TableCombination;
  tableIds: string[];
  tables: FloorTable[];
};

type SlotsResponse = {
  slots: AvailabilitySlot[];
};

type ProfileResponse = {
  profile: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    contactEmail: string | null;
    phone: string | null;
  };
};

type ReservationResponse = {
  reservation: {
    id: string;
    referenceCode: string | null;
  };
};

const roomTypeLabels = {
  MAIN: "Salle principale",
  FLOOR: "Étage",
  TERRACE: "Terrasse",
  PRIVATE: "Salon privé",
  ROOFTOP: "Rooftop"
} as const;

function splitName(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ")
  };
}

function slotDotClass(slot: AvailabilitySlot) {
  if (slot.status === "GREEN") {
    return "bg-emerald-600";
  }

  if (slot.status === "ORANGE") {
    return "bg-orange-500";
  }

  if (slot.status === "RED") {
    return "bg-red-600";
  }

  return "bg-ink/25";
}

function reservationErrorMessage(
  message: string | undefined,
  locale: string,
  t: ReturnType<typeof useI18n>["t"]
) {
  if (!message) {
    return undefined;
  }

  if (locale !== "fr") {
    return message;
  }

  const translations: Record<string, string> = {
    "A table matching the party size is available.": t("error.exactCapacityAvailable"),
    "Table already has a reservation for this time.": t("error.tableAlreadyReserved"),
    "Table capacity is too small for this reservation.": t("error.tableTooSmall"),
    "Table does not match the requested preferences.": t("error.tablePreferenceMismatch"),
    "Restaurant is closed for this time.": t("error.restaurantClosedTime"),
    "Restaurant is closed during this vacation period.": t("error.restaurantClosedVacation")
  };

  return translations[message] ?? message;
}

export function BookingExperience({ initialRestaurantSlug }: { initialRestaurantSlug?: string } = {}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [floorViewMode, setFloorViewMode] = useState<"2d" | "3d">("3d");
  const [floorZoom, setFloorZoom] = useState(1);
  const [viewPreviewTableId, setViewPreviewTableId] = useState<string>();
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>();
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const booking = useBookingStore();
  const { locale, t } = useI18n();

  const restaurantsQuery = useQuery({
    queryKey: ["restaurants", initialRestaurantSlug ?? "all"],
    queryFn: () =>
      apiFetch<RestaurantsResponse>(
        initialRestaurantSlug ? `/api/restaurants?slug=${encodeURIComponent(initialRestaurantSlug)}` : "/api/restaurants"
      )
  });

  const restaurants = restaurantsQuery.data?.restaurants ?? [];
  const restaurantForSlug = initialRestaurantSlug
    ? restaurants.find((item) => item.slug === initialRestaurantSlug)
    : undefined;
  const restaurant =
    restaurants.find((item) => item.id === restaurantId) ??
    restaurantForSlug ??
    (initialRestaurantSlug ? undefined : restaurants[0]);
  const restaurantTimeZone = restaurant?.timezone || inferTimeZoneFromAddress(restaurant?.address);
  const restaurantToday = todayInTimeZone(restaurantTimeZone);

  useEffect(() => {
    if (!restaurantId && restaurantForSlug) {
      setRestaurantId(restaurantForSlug.id);
      return;
    }

    if (!restaurantId && !initialRestaurantSlug && restaurants[0]) {
      setRestaurantId(restaurants[0].id);
    }
  }, [initialRestaurantSlug, restaurantForSlug, restaurantId, restaurants]);

  useRestaurantSocket(restaurant?.id);

  const profileQuery = useQuery({
    queryKey: ["me", "profile"],
    enabled: Boolean(session),
    queryFn: () => apiFetch<ProfileResponse>("/api/me/profile")
  });

  useEffect(() => {
    const profile = profileQuery.data?.profile;

    if (!profile) {
      const fallback = splitName(session?.user?.name);

      if (!booking.firstName && fallback.firstName) {
        booking.setBookingField("firstName", fallback.firstName);
      }

      if (!booking.lastName && fallback.lastName) {
        booking.setBookingField("lastName", fallback.lastName);
      }

      if (!booking.email && session?.user?.email) {
        booking.setBookingField("email", session.user.email);
      }

      return;
    }

    const fallback = splitName(profile.name);

    if (!booking.firstName) {
      booking.setBookingField("firstName", profile.firstName ?? fallback.firstName);
    }

    if (!booking.lastName) {
      booking.setBookingField("lastName", profile.lastName ?? fallback.lastName);
    }

    if (!booking.email) {
      booking.setBookingField("email", profile.contactEmail ?? profile.email);
    }

    if (!booking.phone && profile.phone) {
      booking.setBookingField("phone", profile.phone);
    }
  }, [profileQuery.data?.profile?.id, session?.user?.email, session?.user?.name]);

  const slotsQuery = useQuery({
    queryKey: [
      "availability-slots",
      restaurant?.id,
      booking.date,
      booking.numberOfGuests,
      booking.tablePreferences
    ],
    enabled: Boolean(restaurant?.id),
    queryFn: () =>
      apiFetch<SlotsResponse>(`/api/restaurants/${restaurant?.id}/availability/slots`, {
        method: "POST",
        body: JSON.stringify({
          date: booking.date,
          numberOfGuests: booking.numberOfGuests,
          tablePreferences: booking.tablePreferences
        })
      })
  });

  const slots = slotsQuery.data?.slots ?? [];
  const nextDate = addDaysToDateString(booking.date, 1);
  const hasSelectableSlots = slots.some((slot) => slot.selectable);
  const shouldLoadNextDaySlots = !slotsQuery.isFetching && !hasSelectableSlots;
  const nextDaySlotsQuery = useQuery({
    queryKey: [
      "availability-slots",
      restaurant?.id,
      nextDate,
      booking.numberOfGuests,
      booking.tablePreferences,
      "fallback"
    ],
    enabled: Boolean(restaurant?.id && shouldLoadNextDaySlots),
    queryFn: () =>
      apiFetch<SlotsResponse>(`/api/restaurants/${restaurant?.id}/availability/slots`, {
        method: "POST",
        body: JSON.stringify({
          date: nextDate,
          numberOfGuests: booking.numberOfGuests,
          tablePreferences: booking.tablePreferences
        })
      })
  });
  const nextDaySlots = nextDaySlotsQuery.data?.slots ?? [];
  const showingNextDaySlots = shouldLoadNextDaySlots && nextDaySlots.length > 0;
  const displayedSlots = showingNextDaySlots ? nextDaySlots : slots;
  const displayedSlotsDate = showingNextDaySlots ? nextDate : booking.date;
  const selectedSlot =
    displayedSlotsDate === booking.date
      ? displayedSlots.find((slot) => slot.startTime === booking.startTime)
      : undefined;

  const availabilityQuery = useQuery({
    queryKey: [
      "availability",
      restaurant?.id,
      booking.date,
      booking.startTime,
      booking.numberOfGuests,
      booking.tablePreferences
    ],
    enabled: Boolean(restaurant?.id && booking.startTime && selectedSlot?.selectable),
    queryFn: () =>
      apiFetch<AvailabilityResponse>(`/api/restaurants/${restaurant?.id}/availability`, {
        method: "POST",
        body: JSON.stringify({
          date: booking.date,
          startTime: booking.startTime,
          numberOfGuests: booking.numberOfGuests,
          tablePreferences: booking.tablePreferences
        })
      })
  });

	  const restaurantTables = useMemo(
	    () => applyFloorPlanSettings(restaurant?.tables ?? [], restaurant?.settings),
	    [restaurant?.settings, restaurant?.tables]
	  );
  const floorRooms = useMemo(
    () => floorRoomsFromSettings(restaurant?.settings).filter((room) => room.active && room.draftStatus !== "DRAFT"),
    [restaurant?.settings]
  );
  const activeFloorRooms = floorRooms.length > 0 ? floorRooms : [defaultFloorRoom()];
  const tableRooms = useMemo(() => tableRoomsFromSettings(restaurant?.settings), [restaurant?.settings]);
  const currentRoom = activeFloorRooms.find((room) => room.id === selectedRoomId) ?? activeFloorRooms[0];
  const currentRoomId = currentRoom?.id ?? "main-room";
  const displayedRestaurantTables = useMemo(
    () =>
      restaurantTables.filter((table) => (tableRooms[table.id] ?? activeFloorRooms[0]?.id ?? "main-room") === currentRoomId),
    [activeFloorRooms, currentRoomId, restaurantTables, tableRooms]
  );
	  const selectedTable = useMemo(
	    () => restaurantTables.find((table) => table.id === booking.selectedTableId),
	    [booking.selectedTableId, restaurantTables]
	  );
  const viewPreviewTable = useMemo(
    () => restaurantTables.find((table) => table.id === viewPreviewTableId),
    [restaurantTables, viewPreviewTableId]
  );
  const tableViewPreview = viewPreviewTable?.viewImageUrl ? viewPreviewTable : undefined;
  const floorPlanModelUrl = currentRoom?.modelDataUrl ?? floorPlanModelUrlFromSettings(restaurant?.settings);
  const floorPlan2dImageUrl = currentRoom?.plan2dDataUrl ?? floorPlan2dImageUrlFromSettings(restaurant?.settings);
	  const availableTables = availabilityQuery.data?.tables ?? [];
  const availableCombinations = availabilityQuery.data?.combinations ?? [];
  const selectedCombination = availableCombinations.find((combination) => combination.combination.id === selectedCombinationId);
  const availabilityOptionCount = availableTables.length + availableCombinations.length;
	  const availableIds = useMemo(
    () => Array.from(new Set([
      ...availableTables.map((table) => table.id),
      ...availableCombinations.flatMap((combination) => combination.tableIds)
    ])),
    [availableCombinations, availableTables]
  );
  const selectedTableIds = selectedCombination?.tableIds;
	  const contactComplete = Boolean(
	    booking.firstName.trim() &&
	      booking.lastName.trim() &&
	      booking.email.trim() &&
	      booking.phone.trim()
	  );

  useEffect(() => {
    if (!currentRoom || selectedRoomId === currentRoom.id) {
      return;
    }

    setSelectedRoomId(currentRoom.id);
  }, [currentRoom?.id, selectedRoomId]);

  const reservationMutation = useMutation({
    mutationFn: () =>
      apiFetch<ReservationResponse>(`/api/restaurants/${restaurant?.id}/reservations`, {
        method: "POST",
        body: JSON.stringify({
          date: booking.date,
          startTime: booking.startTime,
          numberOfGuests: booking.numberOfGuests,
          tableId: booking.autoAssignTable || selectedCombinationId ? undefined : booking.selectedTableId,
          combinationId: selectedCombinationId,
          autoAssignTable: booking.autoAssignTable || Boolean(selectedCombinationId),
          tablePreferences: booking.tablePreferences,
          firstName: booking.firstName,
          lastName: booking.lastName,
          email: booking.email,
          phone: booking.phone,
          highChair: booking.highChair,
          birthday: booking.birthday,
          romanticDinner: booking.romanticDinner,
          notes: booking.notes || undefined
        })
    }),
    onSuccess: (data) => {
      setMessage(t("booking.confirmed", { id: data.reservation.referenceCode ?? t("booking.referencePending") }));
      queryClient.invalidateQueries({ queryKey: ["availability", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["me", "reservations"] });
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      booking.resetTable();
      setSelectedCombinationId(undefined);
      booking.setBookingField("notes", "");
      booking.setBookingField("highChair", false);
      booking.setBookingField("birthday", false);
      booking.setBookingField("romanticDinner", false);
    }
  });

  function selectSlot(slot: AvailabilitySlot) {
    if (!slot.selectable) {
      return;
    }

    setMessage(undefined);
    if (displayedSlotsDate !== booking.date) {
      booking.setBookingField("date", displayedSlotsDate);
    }
    booking.setBookingField("startTime", slot.startTime);
    booking.resetTable();
    setSelectedCombinationId(undefined);
  }

  function updateGuests(value: number) {
    setMessage(undefined);
    booking.setBookingField("numberOfGuests", value);
    booking.resetTable();
    setSelectedCombinationId(undefined);
  }

  function updateDate(date: string) {
    setMessage(undefined);
    booking.setBookingField("date", date);
    booking.resetTable();
    setSelectedCombinationId(undefined);
  }

  function shiftBookingDate(days: number) {
    updateDate(addDaysToDateString(booking.date, days));
  }

  function toggleTablePreference(feature: TableFeature) {
    setMessage(undefined);
    booking.resetTable();
    setSelectedCombinationId(undefined);
    booking.setBookingField(
      "tablePreferences",
      booking.tablePreferences.includes(feature)
        ? booking.tablePreferences.filter((item) => item !== feature)
        : [...booking.tablePreferences, feature]
    );
  }

  function selectCombination(combination: AvailableTableCombination) {
    setMessage(undefined);
    setSelectedCombinationId(combination.combination.id);
    booking.setBookingField("autoAssignTable", false);
    booking.setBookingField("selectedTableId", undefined);
  }

  useEffect(() => {
    if (booking.date < restaurantToday) {
      booking.setBookingField("date", restaurantToday);
      booking.resetTable();
    }
  }, [booking.date, booking.resetTable, booking.setBookingField, restaurantToday]);

  useEffect(() => {
    if (
      booking.selectedTableId &&
      availabilityQuery.data &&
      !availableIds.includes(booking.selectedTableId)
    ) {
      booking.resetTable();
    }
  }, [availabilityQuery.data, availableIds, booking.selectedTableId, booking.resetTable]);

  useEffect(() => {
    if (
      selectedCombinationId &&
      availabilityQuery.data &&
      !availableCombinations.some((combination) => combination.combination.id === selectedCombinationId)
    ) {
      setSelectedCombinationId(undefined);
      booking.resetTable();
    }
  }, [availabilityQuery.data, availableCombinations, booking.resetTable, selectedCombinationId]);

  useEffect(() => {
    if (viewPreviewTableId && !restaurantTables.some((table) => table.id === viewPreviewTableId)) {
      setViewPreviewTableId(undefined);
    }
  }, [restaurantTables, viewPreviewTableId]);

  useEffect(() => {
    if (
      viewPreviewTableId &&
      (!selectedSlot?.selectable || !availableIds.includes(viewPreviewTableId))
    ) {
      setViewPreviewTableId(undefined);
    }
  }, [availableIds, selectedSlot?.selectable, viewPreviewTableId]);

  if (!restaurant && restaurantsQuery.isLoading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-linen px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-8 text-center shadow-soft">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage text-moss">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
          </span>
          <h1 className="mt-5 text-2xl font-black text-ink">Chargement du restaurant</h1>
          <p className="mt-2 text-sm font-semibold text-ink/60">
            Préparation de la page de réservation
            <span className="ml-1 inline-flex w-6 justify-start">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce [animation-delay:120ms]">.</span>
              <span className="animate-bounce [animation-delay:240ms]">.</span>
            </span>
          </p>
        </div>
      </main>
    );
  }

  if (!restaurant && initialRestaurantSlug && restaurantsQuery.isSuccess) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-linen px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-8 text-center shadow-soft">
          <h1 className="text-2xl font-black text-ink">Restaurant introuvable</h1>
          <p className="mt-2 text-sm font-semibold text-ink/60">
            La page de réservation demandée n’est pas encore configurée.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
      <section className="space-y-4">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-4">
            <h1 className="text-2xl font-black text-ink">{t("booking.title")}</h1>
            {restaurant ? (
              <p className="mt-1 text-sm text-ink/65">{restaurant.name}</p>
            ) : (
              <p className="mt-1 text-sm text-ink/65">{t("booking.noRestaurant")}</p>
            )}
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-semibold text-ink">
              {t("booking.date")}
              <div className="mt-1 flex items-center gap-1">
                <button
                  className="icon-button h-10 w-10"
                  title={t("admin.previousDay")}
                  type="button"
                  onClick={() => shiftBookingDate(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="relative flex-1">
                  <CalendarDays className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    type="date"
                    value={booking.date}
                    onChange={(event) => updateDate(event.target.value)}
                  />
                </div>
                <button
                  className="icon-button h-10 w-10"
                  title={t("admin.nextDay")}
                  type="button"
                  onClick={() => shiftBookingDate(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </label>
            <label className="text-sm font-semibold text-ink">
              {t("booking.guests")}
              <div className="relative mt-1">
                <Users className="field-icon" />
                <input
                  className="control with-leading-icon w-full"
                  min={1}
                  max={40}
                  type="number"
                  value={booking.numberOfGuests}
                  onChange={(event) =>
                    updateGuests(Number(event.target.value))
                  }
                />
              </div>
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{t("booking.selectTime")}</p>
              </div>
              {showingNextDaySlots ? (
                <p className="mb-2 rounded-md bg-sage/50 px-3 py-2 text-xs font-bold text-ink/70">
                  {t("booking.showingNextDaySlots")}
                </p>
              ) : null}
              <div className="grid max-h-52 grid-cols-3 gap-2 overflow-auto rounded-md border border-ink/10 bg-linen p-2">
                {displayedSlots.map((slot) => (
                  <button
                    key={slot.startTime}
                    className={`flex h-10 items-center justify-center gap-2 rounded-md border px-2 text-sm font-bold transition ${
                      displayedSlotsDate === booking.date && slot.startTime === booking.startTime
                        ? "border-moss bg-white text-moss shadow-sm"
                        : "border-ink/10 bg-white/80 text-ink hover:border-moss"
                    } ${!slot.selectable ? "cursor-not-allowed opacity-60 hover:border-ink/10" : ""} ${
                      slot.status === "RED" ? "text-red-800 line-through" : ""
                    }`}
                    disabled={!slot.selectable}
                    title={
                      slot.reason === "FULL"
                        ? t("booking.slotFull")
                        : slot.reason === "TOO_SOON"
                          ? t("booking.slotTooSoon")
                          : `${slot.availableTables}/${slot.totalTables}`
                    }
                    type="button"
                    onClick={() => selectSlot(slot)}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${slotDotClass(slot)}`} />
                    {slot.startTime}
                  </button>
                ))}
                {slotsQuery.isFetching || nextDaySlotsQuery.isFetching ? (
                  <p className="col-span-3 py-3 text-center text-sm font-semibold text-ink/60">
                    {t("booking.slotsLoading")}
                  </p>
                ) : null}
                {!slotsQuery.isFetching && !nextDaySlotsQuery.isFetching && displayedSlots.length === 0 ? (
                  <p className="col-span-3 py-3 text-center text-sm font-semibold text-ink/60">
                    {t("booking.noSlots")}
                  </p>
                ) : null}
              </div>
              {selectedSlot ? (
                <p className="mt-2 text-xs font-semibold text-ink/60">
                  {t("booking.selectedSlot")} : {selectedSlot.startTime}-{selectedSlot.endTime} ·{" "}
                  {selectedSlot.availableTables}/{selectedSlot.totalTables} {t("booking.tablesAvailable")}
                </p>
              ) : null}
            </div>

            <label className="flex items-start gap-3 rounded-md border border-ink/10 bg-linen p-3 text-sm font-semibold text-ink">
              <input
                className="mt-1 h-5 w-5 accent-moss"
                type="checkbox"
                checked={booking.autoAssignTable}
                onChange={(event) => {
                  booking.setBookingField("autoAssignTable", event.target.checked);
                  booking.resetTable();
                  setSelectedCombinationId(undefined);
                }}
              />
              <span>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-moss" />
                  {t("booking.autoAssignTable")}
                </span>
                <span className="mt-1 block text-xs font-medium text-ink/60">
                  {t("booking.autoAssignHint")}
                </span>
              </span>
            </label>

            <div className="rounded-md border border-ink/10 bg-linen p-3">
              <p className="text-sm font-bold text-ink">{t("booking.tablePreferences")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {tableFeatures.map((feature) => (
                  <label
                    key={feature}
                    className="flex items-start gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink"
                  >
                    <input
                      className="mt-1 h-4 w-4 accent-moss"
                      type="checkbox"
                      checked={booking.tablePreferences.includes(feature)}
                      onChange={() => toggleTablePreference(feature)}
                    />
                    <span className="whitespace-pre-line leading-snug">{t(`feature.${feature}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-ink/10 bg-linen p-3">
              <p className="text-sm font-bold text-ink">{t("booking.specialRequests")}</p>
              <div className="mt-3 grid gap-2">
                <label className="flex items-start gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink">
                  <input
                    className="mt-1 h-4 w-4 accent-moss"
                    type="checkbox"
                    checked={booking.highChair}
                    onChange={(event) => booking.setBookingField("highChair", event.target.checked)}
                  />
                  {t("request.highChair")}
                </label>
                <label className="flex items-start gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink">
                  <input
                    className="mt-1 h-4 w-4 accent-moss"
                    type="checkbox"
                    checked={booking.birthday}
                    onChange={(event) => booking.setBookingField("birthday", event.target.checked)}
                  />
                  {t("request.birthday")}
                </label>
                <label className="flex items-start gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink">
                  <input
                    className="mt-1 h-4 w-4 accent-moss"
                    type="checkbox"
                    checked={booking.romanticDinner}
                    onChange={(event) => booking.setBookingField("romanticDinner", event.target.checked)}
                  />
                  {t("request.romanticDinner")}
                </label>
              </div>
            </div>

            <div className="rounded-md border border-ink/10 bg-white p-3">
              <h2 className="mb-3 text-sm font-bold text-ink">{t("booking.customerInfo")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink">
                  {t("booking.firstName")}
                  <div className="relative mt-1">
                    <UserRound className="field-icon" />
                    <input
                      className="control with-leading-icon w-full"
                      value={booking.firstName}
                      onChange={(event) => booking.setBookingField("firstName", event.target.value)}
                    />
                  </div>
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("booking.lastName")}
                  <div className="relative mt-1">
                    <UserRound className="field-icon" />
                    <input
                      className="control with-leading-icon w-full"
                      value={booking.lastName}
                      onChange={(event) => booking.setBookingField("lastName", event.target.value)}
                    />
                  </div>
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("booking.email")}
                  <div className="relative mt-1">
                    <Mail className="field-icon" />
                    <input
                      className="control with-leading-icon w-full"
                      type="email"
                      value={booking.email}
                      onChange={(event) => booking.setBookingField("email", event.target.value)}
                    />
                  </div>
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("booking.phone")}
                  <div className="relative mt-1">
                    <Phone className="field-icon" />
                    <input
                      className="control with-leading-icon w-full"
                      type="tel"
                      value={booking.phone}
                      onChange={(event) => booking.setBookingField("phone", event.target.value)}
                    />
                  </div>
                </label>
              </div>
              <label className="mt-3 block text-sm font-semibold text-ink">
                {t("booking.notes")}
                <div className="relative mt-1">
                  <FileText className="field-icon top-5" />
                  <textarea
                    className="control with-leading-icon min-h-20 w-full py-2"
                    placeholder={t("booking.notesPlaceholder")}
                    value={booking.notes}
                    onChange={(event) => booking.setBookingField("notes", event.target.value)}
                  />
                </div>
              </label>
            </div>

          </div>

          {selectedSlot?.selectable ? (
            <div className="mt-4 rounded-md bg-sage/60 p-3 text-sm font-semibold text-ink">
              {availabilityQuery.isFetching
                ? t("booking.checking")
                : `${availabilityOptionCount} ${
                    availabilityOptionCount === 1
                      ? t("booking.tableAvailable")
                      : t("booking.tablesAvailable")
                  }`}
            </div>
          ) : null}

          {availableCombinations.length > 0 ? (
            <div className="mt-4 rounded-md border border-moss/20 bg-white p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-moss" />
                <div>
                  <p className="text-sm font-black text-ink">Combinaison de tables proposée</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/60">
                    Aucune table seule ne correspond à {booking.numberOfGuests} couverts, mais ces tables peuvent être réunies.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {availableCombinations.map((combination) => (
                  <button
                    key={combination.combination.id}
                    className={`rounded-md border p-3 text-left transition ${
                      selectedCombinationId === combination.combination.id
                        ? "border-moss bg-sage text-moss"
                        : "border-ink/10 bg-linen hover:border-moss"
                    }`}
                    type="button"
                    onClick={() => selectCombination(combination)}
                  >
                    <span className="block text-sm font-black">
                      {combination.tables.map((table) => table.label).join(" + ")}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-ink/60">
                      {combination.capacity} places au total · {combination.combination.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-moss/10 p-3 text-sm font-semibold text-moss">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              {message}
            </div>
          ) : null}

          {reservationMutation.error ? (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
              {reservationErrorMessage(reservationMutation.error.message, locale, t)}
            </div>
          ) : null}

          {!contactComplete ? (
            <div className="mt-4 rounded-md bg-orange-50 p-3 text-sm font-semibold text-orange-800">
              {t("booking.contactRequired")}
            </div>
          ) : null}

          <button
            className="primary-button mt-4 w-full"
            type="button"
            disabled={
              !restaurant ||
              !selectedSlot?.selectable ||
              (!booking.autoAssignTable && !booking.selectedTableId && !selectedCombinationId) ||
              !contactComplete ||
              reservationMutation.isPending
            }
            onClick={() => reservationMutation.mutate()}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t("booking.confirmReservation")}
          </button>
          {!session ? (
            <p className="mt-2 text-center text-xs font-semibold text-ink/55">
              {t("booking.guestReservationHint")}
            </p>
          ) : null}
        </div>

        {restaurant ? (
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="text-base font-bold text-ink">{restaurant.name}</h2>
            {restaurant.description ? (
              <p className="mt-2 text-sm text-ink/70">{restaurant.description}</p>
            ) : null}
            {restaurant.address ? <p className="mt-3 text-sm text-ink/70">{restaurant.address}</p> : null}
            {restaurant.phone ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink/70">
                <Phone className="h-4 w-4 text-moss" />
                {t("booking.restaurantPhone")} : {restaurant.phone}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

	      <section>
	        <div className="mb-3 grid gap-3 rounded-lg border border-ink/10 bg-white p-3 shadow-soft lg:grid-cols-[220px_minmax(0,1fr)_240px] lg:items-center">
	          <div className="grid grid-cols-2 rounded-md border border-ink/10 bg-linen p-1">
            <button
              className={`inline-flex h-9 items-center justify-center gap-2 rounded text-sm font-semibold ${
                floorViewMode === "2d" ? "bg-white shadow-sm" : "text-ink/65"
              }`}
              type="button"
              onClick={() => setFloorViewMode("2d")}
            >
              <LayoutGrid className="h-4 w-4" />
              {t("floor.view2d")}
            </button>
            <button
              className={`inline-flex h-9 items-center justify-center gap-2 rounded text-sm font-semibold ${
                floorViewMode === "3d" ? "bg-white shadow-sm" : "text-ink/65"
              }`}
              type="button"
              onClick={() => setFloorViewMode("3d")}
            >
              <Box className="h-4 w-4" />
              {t("floor.view3d")}
            </button>
          </div>
	          <label className="text-sm font-semibold text-ink">
	            {t("floor.zoom")}
            <input
              className="mt-2 w-full accent-moss"
              min={60}
              max={180}
              step={5}
              type="range"
              value={Math.round(floorZoom * 100)}
              onChange={(event) => setFloorZoom(Number(event.target.value) / 100)}
	            />
	          </label>
          {activeFloorRooms.length > 1 ? (
            <label className="text-sm font-semibold text-ink">
              Salle
              <select
                className="control mt-2 w-full"
                value={currentRoomId}
                onChange={(event) => {
                  setSelectedRoomId(event.target.value);
                  booking.setBookingField("selectedTableId", undefined);
                  setSelectedCombinationId(undefined);
                }}
              >
                {activeFloorRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} · {roomTypeLabels[room.type]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
	        </div>
	        <div className="relative">
	          <FloorPlan
	            mode="booking"
	            tables={displayedRestaurantTables}
            viewMode={floorViewMode}
            zoom={floorZoom}
            selectedTableId={booking.selectedTableId}
            selectedTableIds={selectedTableIds}
            availableTableIds={selectedSlot?.selectable ? availableIds : []}
            modelUrl={floorPlanModelUrl}
            backgroundImageUrl={floorPlan2dImageUrl}
            onZoomChange={setFloorZoom}
            onView={(table) => {
              if (selectedSlot?.selectable && availableIds.includes(table.id)) {
                setViewPreviewTableId(table.id);
              }
            }}
            onSelect={(table) => {
              const matchingCombination = availableCombinations.find((combination) => combination.tableIds.includes(table.id));

              if (matchingCombination) {
                selectCombination(matchingCombination);
                return;
              }

              if (!booking.autoAssignTable && availableIds.includes(table.id)) {
                setSelectedCombinationId(undefined);
                booking.setBookingField("selectedTableId", table.id);
              }
            }}
          />
          {tableViewPreview?.viewImageUrl ? (
            <div
              className="absolute left-1/2 top-1/2 z-[2147483647] w-[min(6.1in,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-white/70 bg-white/95 shadow-2xl backdrop-blur"
              onMouseLeave={() => setViewPreviewTableId(undefined)}
            >
              <div className="flex items-center gap-2 border-b border-ink/10 px-3 py-2 text-sm font-bold text-ink">
                <Eye className="h-4 w-4 text-moss" />
                {t("floor.viewPhoto")} · {tableViewPreview.label}
              </div>
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={tableViewPreview.viewImageUrl}
                  style={tableViewImageStyle(tableViewPreview.viewImageCrop)}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
