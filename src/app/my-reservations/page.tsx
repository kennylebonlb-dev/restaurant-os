"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Mail, Phone, Save, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";

type Reservation = {
  id: string;
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
  restaurant: {
    name: string;
    address: string | null;
  };
  table: {
    label: string;
  } | null;
};

type Profile = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  contactEmail: string | null;
  phone: string | null;
  createdAt: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function splitName(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ")
  };
}

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const reservationsQuery = useQuery({
    queryKey: ["me", "reservations"],
    queryFn: () => apiFetch<{ reservations: Reservation[] }>("/api/me/reservations")
  });

  const profileQuery = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => apiFetch<{ profile: Profile }>("/api/me/profile")
  });

  useEffect(() => {
    const profile = profileQuery.data?.profile;

    if (!profile) {
      return;
    }

    const fallback = splitName(profile.name);
    setProfileForm({
      firstName: profile.firstName ?? fallback.firstName,
      lastName: profile.lastName ?? fallback.lastName,
      email: profile.contactEmail ?? profile.email,
      phone: profile.phone ?? ""
    });
  }, [profileQuery.data?.profile?.id]);

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) =>
      apiFetch<void>(`/api/reservations/${reservationId}`, {
        method: "DELETE"
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "reservations"] })
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ profile: Profile }>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm)
      }),
    onSuccess: () => {
      setProfileSaved(true);
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      window.setTimeout(() => setProfileSaved(false), 2500);
    }
  });

  const reservations = reservationsQuery.data?.reservations ?? [];
  const currentReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) => reservation.status !== "CANCELLED" && dateOnly(reservation.date) >= today()
      ),
    [reservations]
  );
  const latestReservations = useMemo(() => reservations.slice(0, 6), [reservations]);
  const profile = profileQuery.data?.profile;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">{t("my.profile")}</h1>
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

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-base font-bold text-ink">{t("my.profileInfo")}</h2>
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-ink">
                {t("booking.firstName")}
                <div className="relative mt-1">
                  <UserRound className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    value={profileForm.firstName}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                </div>
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("booking.lastName")}
                <div className="relative mt-1">
                  <UserRound className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    value={profileForm.lastName}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, lastName: event.target.value }))
                    }
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
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, email: event.target.value }))
                    }
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
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </div>
              </label>
              {profile ? (
                <p className="text-xs font-semibold text-ink/55">
                  {t("my.memberSince")} {dateOnly(profile.createdAt)}
                </p>
              ) : null}
              {profileSaved ? (
                <p className="rounded-md bg-moss/10 p-2 text-sm font-semibold text-moss">
                  {t("my.profileSaved")}
                </p>
              ) : null}
              {profileMutation.error ? (
                <p className="rounded-md bg-red-50 p-2 text-sm font-semibold text-red-700">
                  {profileMutation.error.message}
                </p>
              ) : null}
              <button
                className="primary-button"
                type="button"
                disabled={profileMutation.isPending}
                onClick={() => profileMutation.mutate()}
              >
                <Save className="h-4 w-4" />
                {t("my.saveProfile")}
              </button>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <ReservationList
            reservations={currentReservations}
            title={t("my.currentReservations")}
            empty={t("my.noReservations")}
            onCancel={(reservationId) => cancelMutation.mutate(reservationId)}
            cancelling={cancelMutation.isPending}
          />
          <ReservationList
            reservations={latestReservations}
            title={t("my.latestReservations")}
            empty={t("my.noReservations")}
            onCancel={(reservationId) => cancelMutation.mutate(reservationId)}
            cancelling={cancelMutation.isPending}
          />
        </section>
      </div>
    </div>
  );
}

function ReservationList({
  reservations,
  title,
  empty,
  onCancel,
  cancelling
}: {
  reservations: Reservation[];
  title: string;
  empty: string;
  onCancel: (reservationId: string) => void;
  cancelling: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <h2 className="mb-2 text-base font-bold text-ink">{title}</h2>
      <div className="divide-y divide-ink/10">
        {reservations.map((reservation) => {
          const guestName =
            [reservation.guestFirstName, reservation.guestLastName].filter(Boolean).join(" ") ||
            reservation.guestEmail;

          return (
            <div key={reservation.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-ink">{reservation.restaurant.name}</p>
                <p className="text-sm text-ink/65">
                  {dateOnly(reservation.date)} · {reservation.startTime}-{reservation.endTime} ·{" "}
                  {reservation.numberOfGuests} {t("common.guests")} ·{" "}
                  {reservation.table?.label ?? t("my.noTable")}
                </p>
                <p className="mt-1 text-xs font-semibold text-clay">{t(`status.${reservation.status}`)}</p>
                {guestName ? <p className="mt-1 text-xs text-ink/55">{guestName}</p> : null}
                {reservation.notes ? <p className="mt-1 text-xs text-ink/55">{reservation.notes}</p> : null}
              </div>
              {reservation.status !== "CANCELLED" ? (
                <button
                  className="danger-button"
                  type="button"
                  disabled={cancelling}
                  onClick={() => onCancel(reservation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("admin.cancel")}
                </button>
              ) : null}
            </div>
          );
        })}
        {reservations.length === 0 ? (
          <p className="rounded-md bg-sage/45 p-3 text-sm font-semibold text-ink">{empty}</p>
        ) : null}
      </div>
    </div>
  );
}
