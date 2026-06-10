"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock, Search, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { apiFetch } from "@/hooks/use-api";
import { useRestaurantSocket } from "@/hooks/use-socket-events";
import type { FloorTable, OpeningHours } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { useBookingStore } from "@/stores/booking-store";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  openingHours: OpeningHours;
  menu: Array<{
    name?: string;
    price?: string;
    category?: string;
  }>;
  tables: FloorTable[];
};

type RestaurantsResponse = {
  restaurants: Restaurant[];
};

type AvailabilityResponse = {
  tables: FloorTable[];
};

type ReservationResponse = {
  reservation: {
    id: string;
  };
};

export function BookingExperience() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState<string>();
  const booking = useBookingStore();
  const { t } = useI18n();

  const restaurantsQuery = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => apiFetch<RestaurantsResponse>("/api/restaurants")
  });

  const restaurants = restaurantsQuery.data?.restaurants ?? [];
  const restaurant = restaurants.find((item) => item.id === restaurantId) ?? restaurants[0];

  useEffect(() => {
    if (!restaurantId && restaurants[0]) {
      setRestaurantId(restaurants[0].id);
    }
  }, [restaurantId, restaurants]);

  useRestaurantSocket(restaurant?.id);

  const availabilityQuery = useQuery({
    queryKey: [
      "availability",
      restaurant?.id,
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.numberOfGuests
    ],
    enabled: searched && Boolean(restaurant?.id),
    queryFn: () =>
      apiFetch<AvailabilityResponse>(`/api/restaurants/${restaurant?.id}/availability`, {
        method: "POST",
        body: JSON.stringify({
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          numberOfGuests: booking.numberOfGuests
        })
      })
  });

  const availableTables = availabilityQuery.data?.tables ?? [];
  const availableIds = useMemo(() => availableTables.map((table) => table.id), [availableTables]);

  const reservationMutation = useMutation({
    mutationFn: () =>
      apiFetch<ReservationResponse>(`/api/restaurants/${restaurant?.id}/reservations`, {
        method: "POST",
        body: JSON.stringify({
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          numberOfGuests: booking.numberOfGuests,
          tableId: booking.selectedTableId
        })
    }),
    onSuccess: (data) => {
      setMessage(t("booking.confirmed", { id: data.reservation.id }));
      queryClient.invalidateQueries({ queryKey: ["availability", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["me", "reservations"] });
      booking.resetTable();
    }
  });

  function searchTables() {
    setMessage(undefined);
    booking.resetTable();
    setSearched(true);
    queryClient.invalidateQueries({ queryKey: ["availability", restaurant?.id] });
  }

  const menu = restaurant?.menu ?? [];

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

          {restaurants.length > 1 ? (
            <label className="mb-3 block text-sm font-semibold text-ink">
              {t("booking.restaurant")}
              <select
                className="control mt-1 w-full"
                value={restaurant?.id}
                onChange={(event) => setRestaurantId(event.target.value)}
              >
                {restaurants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-3">
            <label className="text-sm font-semibold text-ink">
              {t("booking.date")}
              <div className="relative mt-1">
                <CalendarDays className="field-icon" />
                <input
                  className="control with-leading-icon w-full"
                  type="date"
                  value={booking.date}
                  onChange={(event) => booking.setBookingField("date", event.target.value)}
                />
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-ink">
                {t("booking.start")}
                <div className="relative mt-1">
                  <Clock className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    type="time"
                    value={booking.startTime}
                    onChange={(event) => booking.setBookingField("startTime", event.target.value)}
                  />
                </div>
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("booking.end")}
                <div className="relative mt-1">
                  <Clock className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    type="time"
                    value={booking.endTime}
                    onChange={(event) => booking.setBookingField("endTime", event.target.value)}
                  />
                </div>
              </label>
            </div>
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
                    booking.setBookingField("numberOfGuests", Number(event.target.value))
                  }
                />
              </div>
            </label>
            <button
              className="primary-button w-full"
              type="button"
              disabled={!restaurant || availabilityQuery.isFetching}
              onClick={searchTables}
            >
              <Search className="h-4 w-4" />
              {availabilityQuery.isFetching ? t("booking.checking") : t("booking.findTables")}
            </button>
          </div>

          {searched ? (
            <div className="mt-4 rounded-md bg-sage/60 p-3 text-sm font-semibold text-ink">
              {availableTables.length}{" "}
              {availableTables.length === 1
                ? t("booking.tableAvailable")
                : t("booking.tablesAvailable")}
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
              {reservationMutation.error.message}
            </div>
          ) : null}

          {session ? (
            <button
              className="primary-button mt-4 w-full"
              type="button"
              disabled={!restaurant || !booking.selectedTableId || reservationMutation.isPending}
              onClick={() => reservationMutation.mutate()}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("booking.confirmReservation")}
            </button>
          ) : (
            <Link className="primary-button mt-4 w-full" href="/login">
              <CheckCircle2 className="h-4 w-4" />
              {t("booking.signInToReserve")}
            </Link>
          )}
        </div>

        {restaurant ? (
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="text-base font-bold text-ink">{restaurant.name}</h2>
            {restaurant.description ? (
              <p className="mt-2 text-sm text-ink/70">{restaurant.description}</p>
            ) : null}
            {restaurant.address ? <p className="mt-3 text-sm text-ink/70">{restaurant.address}</p> : null}
            <div className="mt-4 divide-y divide-ink/10">
              {menu.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-ink/55">{item.category}</p>
                  </div>
                  {item.price ? <span className="text-sm font-bold text-clay">{item.price}</span> : null}
                </div>
              ))}
              {menu.length === 0 ? (
                <p className="py-2 text-sm font-semibold text-ink/65">{t("booking.menuUnavailable")}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <FloorPlan
          mode="booking"
          tables={restaurant?.tables ?? []}
          selectedTableId={booking.selectedTableId}
          availableTableIds={searched ? availableIds : undefined}
          onSelect={(table) => {
            if (!searched || availableIds.includes(table.id)) {
              booking.setBookingField("selectedTableId", table.id);
            }
          }}
        />
      </section>
    </div>
  );
}
