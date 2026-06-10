"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Trash2 } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  restaurant: {
    name: string;
    address: string | null;
  };
  table: {
    label: string;
  } | null;
};

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const reservationsQuery = useQuery({
    queryKey: ["me", "reservations"],
    queryFn: () => apiFetch<{ reservations: Reservation[] }>("/api/me/reservations")
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) =>
      apiFetch<void>(`/api/reservations/${reservationId}`, {
        method: "DELETE"
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "reservations"] })
  });

  const reservations = reservationsQuery.data?.reservations ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">{t("my.title")}</h1>
          <p className="mt-1 text-sm text-ink/65">
            {reservations.length}{" "}
            {reservations.length === 1 ? t("my.bookingRecord") : t("my.bookingRecords")}
          </p>
        </div>
        <Link className="primary-button" href="/">
          <CalendarDays className="h-4 w-4" />
          {t("my.book")}
        </Link>
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="divide-y divide-ink/10">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-ink">{reservation.restaurant.name}</p>
                <p className="text-sm text-ink/65">
                  {new Date(reservation.date).toISOString().slice(0, 10)} · {reservation.startTime}-
                  {reservation.endTime} · {reservation.numberOfGuests} {t("common.guests")} ·{" "}
                  {reservation.table?.label ?? t("my.noTable")}
                </p>
                <p className="mt-1 text-xs font-semibold text-clay">{t(`status.${reservation.status}`)}</p>
              </div>
              {reservation.status !== "CANCELLED" ? (
                <button
                  className="danger-button"
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(reservation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("admin.cancel")}
                </button>
              ) : null}
            </div>
          ))}
          {reservations.length === 0 ? (
            <p className="rounded-md bg-sage/45 p-3 text-sm font-semibold text-ink">
              {t("my.noReservations")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
