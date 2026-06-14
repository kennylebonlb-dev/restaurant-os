"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Mail, Phone, Save, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  birthDate: string | null;
  createdAt: string;
};

type GuestAccess = {
  referenceName: string;
  phone: string;
};

function dateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function reservationEndDate(reservation: Reservation) {
  return new Date(`${dateOnly(reservation.date)}T${reservation.endTime}:00`);
}

function isPastOrCancelled(reservation: Reservation) {
  return reservation.status === "CANCELLED" || reservationEndDate(reservation) < new Date();
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
  const { data: session } = useSession();
  const [guestAccess, setGuestAccess] = useState<GuestAccess | null>(null);
  const [guestPassword, setGuestPassword] = useState("");
  const [guestAccountCreated, setGuestAccountCreated] = useState(false);
  const [reservationNotes, setReservationNotes] = useState<Record<string, string>>({});
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: ""
  });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const rawGuestAccess = window.sessionStorage.getItem("toquetop_guest_reservation_access");

    if (!rawGuestAccess) {
      return;
    }

    try {
      const parsed = JSON.parse(rawGuestAccess) as GuestAccess;

      if (parsed.referenceName && parsed.phone) {
        setGuestAccess(parsed);
      }
    } catch {
      window.sessionStorage.removeItem("toquetop_guest_reservation_access");
    }
  }, []);

  const isGuestAccess = Boolean(!session?.user && guestAccess);

  const reservationsQuery = useQuery({
    queryKey: isGuestAccess ? ["guest", "reservations", guestAccess] : ["me", "reservations"],
    enabled: Boolean(session?.user || guestAccess),
    queryFn: () =>
      isGuestAccess
        ? apiFetch<{ reservations: Reservation[] }>("/api/guest-reservations", {
            method: "POST",
            body: JSON.stringify(guestAccess)
          })
        : apiFetch<{ reservations: Reservation[] }>("/api/me/reservations")
  });

  const profileQuery = useQuery({
    queryKey: ["me", "profile"],
    enabled: Boolean(session?.user),
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
      phone: profile.phone ?? "",
      birthDate: profile.birthDate ? dateOnly(profile.birthDate) : ""
    });
  }, [profileQuery.data?.profile?.id]);

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) =>
      isGuestAccess
        ? apiFetch<void>(`/api/guest-reservations/${reservationId}`, {
            method: "DELETE",
            body: JSON.stringify(guestAccess)
          })
        : apiFetch<void>(`/api/reservations/${reservationId}`, {
            method: "DELETE"
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "reservations"] });
      queryClient.invalidateQueries({ queryKey: ["guest", "reservations"] });
    }
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

  const updateReservationMutation = useMutation({
    mutationFn: ({ reservationId, notes }: { reservationId: string; notes: string }) =>
      isGuestAccess
        ? apiFetch<void>(`/api/guest-reservations/${reservationId}`, {
            method: "PATCH",
            body: JSON.stringify({
              referenceName: guestAccess?.referenceName ?? "",
              phone: guestAccess?.phone ?? "",
              notes
            })
          })
        : apiFetch<void>(`/api/reservations/${reservationId}`, {
            method: "PATCH",
            body: JSON.stringify({
              notes
            })
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "reservations"] });
      queryClient.invalidateQueries({ queryKey: ["guest", "reservations"] });
    }
  });

  const guestRegisterMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ user: { id: string } }>("/api/guest-reservations/register", {
        method: "POST",
        body: JSON.stringify({
          referenceName: guestAccess?.referenceName ?? "",
          phone: guestAccess?.phone ?? "",
          password: guestPassword
        })
      }),
    onSuccess: () => {
      setGuestAccountCreated(true);
      setGuestPassword("");
    }
  });

  const reservations = reservationsQuery.data?.reservations ?? [];
  const currentReservations = useMemo(
    () =>
      reservations.filter((reservation) => !isPastOrCancelled(reservation)),
    [reservations]
  );
  const latestReservations = useMemo(
    () => reservations.filter(isPastOrCancelled).slice(0, 6),
    [reservations]
  );
  const profile = profileQuery.data?.profile;

  useEffect(() => {
    if (reservations.length === 0) {
      return;
    }

    setReservationNotes((current) => {
      const next = { ...current };
      for (const reservation of reservations) {
        if (!(reservation.id in next)) {
          next[reservation.id] = reservation.notes ?? "";
        }
      }
      return next;
    });
  }, [reservations]);

  if (!session?.user && !guestAccess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-ink/10 bg-white p-6 text-center shadow-soft">
          <h1 className="text-2xl font-black text-ink">{t("my.profile")}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">
            {t("my.guestAccessRequired")}
          </p>
          <Link className="primary-button mt-5 w-full" href="/login">
            {t("my.findReservation")}
          </Link>
        </div>
      </div>
    );
  }

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
          {isGuestAccess ? (
            <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
              <h2 className="mb-2 text-base font-bold text-ink">{t("my.guestAccess")}</h2>
              <p className="text-sm font-semibold text-ink/65">
                {t("my.guestAccessHint")}
              </p>
              <div className="mt-4 rounded-md bg-linen p-3 text-sm font-semibold text-ink/70">
                {guestAccess?.referenceName} · {guestAccess?.phone}
              </div>
              <div className="mt-4">
                <label className="text-sm font-semibold text-ink">
                  {t("my.createPassword")}
                  <input
                    className="control mt-1 w-full"
                    minLength={8}
                    type="password"
                    value={guestPassword}
                    onChange={(event) => setGuestPassword(event.target.value)}
                  />
                </label>
                {guestAccountCreated ? (
                  <p className="mt-3 rounded-md bg-moss/10 p-2 text-sm font-semibold text-moss">
                    {t("my.accountCreated")}
                  </p>
                ) : null}
                {guestRegisterMutation.error ? (
                  <p className="mt-3 rounded-md bg-red-50 p-2 text-sm font-semibold text-red-700">
                    {guestRegisterMutation.error.message}
                  </p>
                ) : null}
                <button
                  className="primary-button mt-3 w-full"
                  disabled={guestRegisterMutation.isPending || guestPassword.length < 8}
                  type="button"
                  onClick={() => guestRegisterMutation.mutate()}
                >
                  {t("my.createAccountFromReservation")}
                </button>
              </div>
            </div>
          ) : (
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
              <label className="text-sm font-semibold text-ink">
                {t("my.birthDate")}
                <div className="relative mt-1">
                  <CalendarDays className="field-icon" />
                  <input
                    className="control with-leading-icon w-full"
                    type="date"
                    value={profileForm.birthDate}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, birthDate: event.target.value }))
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
          )}
        </aside>

        <section className="space-y-4">
          <ReservationList
            reservations={currentReservations}
            title={t("my.currentReservations")}
            empty={t("my.noReservations")}
            onCancel={(reservationId) => cancelMutation.mutate(reservationId)}
            onSaveNotes={(reservationId) =>
              updateReservationMutation.mutate({
                reservationId,
                notes: reservationNotes[reservationId] ?? ""
              })
            }
            onUpdateNotes={(reservationId, notes) =>
              setReservationNotes((current) => ({ ...current, [reservationId]: notes }))
            }
            cancelling={cancelMutation.isPending}
            noteDrafts={reservationNotes}
            savingNotes={updateReservationMutation.isPending}
            editable
          />
          <ReservationList
            reservations={latestReservations}
            title={t("my.latestReservations")}
            empty={t("my.noReservations")}
            onCancel={(reservationId) => cancelMutation.mutate(reservationId)}
            cancelling={cancelMutation.isPending}
            noteDrafts={reservationNotes}
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
  cancelling,
  editable = false,
  noteDrafts,
  onSaveNotes,
  onUpdateNotes,
  savingNotes = false
}: {
  reservations: Reservation[];
  title: string;
  empty: string;
  onCancel: (reservationId: string) => void;
  cancelling: boolean;
  editable?: boolean;
  noteDrafts: Record<string, string>;
  onSaveNotes?: (reservationId: string) => void;
  onUpdateNotes?: (reservationId: string, notes: string) => void;
  savingNotes?: boolean;
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
                {editable && reservation.status !== "CANCELLED" ? (
                  <div className="mt-3 max-w-xl">
                    <label className="text-xs font-bold uppercase tracking-wide text-ink/55">
                      {t("booking.notes")}
                      <textarea
                        className="control mt-1 min-h-16 w-full py-2 text-sm normal-case tracking-normal"
                        value={noteDrafts[reservation.id] ?? ""}
                        onChange={(event) => onUpdateNotes?.(reservation.id, event.target.value)}
                      />
                    </label>
                    <button
                      className="secondary-button mt-2 h-9"
                      disabled={savingNotes}
                      type="button"
                      onClick={() => onSaveNotes?.(reservation.id)}
                    >
                      <Save className="h-4 w-4" />
                      {t("my.saveReservation")}
                    </button>
                  </div>
                ) : null}
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
