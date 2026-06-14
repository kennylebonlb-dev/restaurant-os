"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Baby,
  Cake,
  CalendarDays,
  Heart,
  Mail,
  Phone,
  Save,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/hooks/use-api";
import { tableFeatures, type AvailabilitySlot, type FloorTable, type TableFeature } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  notes: string | null;
  highChair: boolean;
  birthday: boolean;
  romanticDinner: boolean;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  restaurant: {
    id: string;
    name: string;
    address: string | null;
  };
  table: {
    id: string;
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

type ReservationEditForm = {
  date: string;
  startTime: string;
  numberOfGuests: number;
  tableId: string | null;
  autoAssignTable: boolean;
  tablePreferences: TableFeature[];
  highChair: boolean;
  birthday: boolean;
  romanticDinner: boolean;
  notes: string;
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

function formFromReservation(reservation: Reservation): ReservationEditForm {
  return {
    date: dateOnly(reservation.date),
    startTime: reservation.startTime,
    numberOfGuests: reservation.numberOfGuests,
    tableId: reservation.table?.id ?? null,
    autoAssignTable: !reservation.table?.id,
    tablePreferences: [],
    highChair: reservation.highChair,
    birthday: reservation.birthday,
    romanticDinner: reservation.romanticDinner,
    notes: reservation.notes ?? ""
  };
}

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { data: session } = useSession();
  const [guestAccess, setGuestAccess] = useState<GuestAccess | null>(null);
  const [guestPassword, setGuestPassword] = useState("");
  const [guestAccountCreated, setGuestAccountCreated] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: ""
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, ReservationEditForm>>({});
  const [reservationSaved, setReservationSaved] = useState<string | null>(null);

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
    mutationFn: ({ form, reservationId }: { reservationId: string; form: ReservationEditForm }) =>
      isGuestAccess
        ? apiFetch<void>(`/api/guest-reservations/${reservationId}`, {
            method: "PATCH",
            body: JSON.stringify({
              referenceName: guestAccess?.referenceName ?? "",
              phone: guestAccess?.phone ?? "",
              ...form
            })
          })
        : apiFetch<void>(`/api/reservations/${reservationId}`, {
            method: "PATCH",
            body: JSON.stringify(form)
          }),
    onSuccess: (_, variables) => {
      setReservationSaved(variables.reservationId);
      setEditingReservationId(null);
      queryClient.invalidateQueries({ queryKey: ["me", "reservations"] });
      queryClient.invalidateQueries({ queryKey: ["guest", "reservations"] });
      window.setTimeout(() => setReservationSaved(null), 2500);
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
    () => reservations.filter((reservation) => !isPastOrCancelled(reservation)),
    [reservations]
  );
  const latestReservations = useMemo(
    () => reservations.filter(isPastOrCancelled).slice(0, 6),
    [reservations]
  );
  const profile = profileQuery.data?.profile;

  function openEditor(reservation: Reservation) {
    setEditingReservationId((current) => (current === reservation.id ? null : reservation.id));
    setEditForms((current) => ({
      ...current,
      [reservation.id]: current[reservation.id] ?? formFromReservation(reservation)
    }));
  }

  function updateEditForm(reservationId: string, patch: Partial<ReservationEditForm>) {
    setEditForms((current) => {
      const existing = current[reservationId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [reservationId]: {
          ...existing,
          ...patch
        }
      };
    });
  }

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
                <ProfileField icon={<UserRound className="field-icon" />} label={t("booking.firstName")} value={profileForm.firstName} onChange={(value) => setProfileForm((current) => ({ ...current, firstName: value }))} />
                <ProfileField icon={<UserRound className="field-icon" />} label={t("booking.lastName")} value={profileForm.lastName} onChange={(value) => setProfileForm((current) => ({ ...current, lastName: value }))} />
                <ProfileField icon={<Mail className="field-icon" />} label={t("booking.email")} type="email" value={profileForm.email} onChange={(value) => setProfileForm((current) => ({ ...current, email: value }))} />
                <ProfileField icon={<Phone className="field-icon" />} label={t("booking.phone")} type="tel" value={profileForm.phone} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} />
                <ProfileField icon={<CalendarDays className="field-icon" />} label={t("my.birthDate")} type="date" value={profileForm.birthDate} onChange={(value) => setProfileForm((current) => ({ ...current, birthDate: value }))} />
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
            cancelling={cancelMutation.isPending}
            editable
            editingReservationId={editingReservationId}
            editForms={editForms}
            guestAccess={guestAccess}
            isGuestAccess={isGuestAccess}
            savingReservation={updateReservationMutation.isPending}
            savedReservationId={reservationSaved}
            updateError={updateReservationMutation.error?.message}
            onCloseEditor={() => setEditingReservationId(null)}
            onOpenEditor={openEditor}
            onSave={(reservationId) => {
              const form = editForms[reservationId];

              if (form) {
                updateReservationMutation.mutate({ reservationId, form });
              }
            }}
            onUpdateForm={updateEditForm}
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

function ProfileField({
  icon,
  label,
  onChange,
  type = "text",
  value
}: {
  icon: ReactNode;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold text-ink">
      {label}
      <div className="relative mt-1">
        {icon}
        <input
          className="control with-leading-icon w-full"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function ReservationList({
  cancelling,
  editable = false,
  editForms = {},
  editingReservationId,
  empty,
  guestAccess,
  isGuestAccess,
  onCancel,
  onCloseEditor,
  onOpenEditor,
  onSave,
  onUpdateForm,
  reservations,
  savedReservationId,
  savingReservation = false,
  title,
  updateError
}: {
  reservations: Reservation[];
  title: string;
  empty: string;
  onCancel: (reservationId: string) => void;
  cancelling: boolean;
  editable?: boolean;
  editForms?: Record<string, ReservationEditForm>;
  editingReservationId?: string | null;
  guestAccess?: GuestAccess | null;
  isGuestAccess?: boolean;
  savingReservation?: boolean;
  savedReservationId?: string | null;
  updateError?: string;
  onCloseEditor?: () => void;
  onOpenEditor?: (reservation: Reservation) => void;
  onSave?: (reservationId: string) => void;
  onUpdateForm?: (reservationId: string, patch: Partial<ReservationEditForm>) => void;
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
          const editing = editingReservationId === reservation.id;

          return (
            <div key={reservation.id} className="grid gap-3 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reservation.highChair ? <RequestBadge icon={<Baby className="h-3.5 w-3.5" />} label={t("request.highChair")} /> : null}
                    {reservation.birthday ? <RequestBadge icon={<Cake className="h-3.5 w-3.5" />} label={t("request.birthday")} /> : null}
                    {reservation.romanticDinner ? <RequestBadge icon={<Heart className="h-3.5 w-3.5" />} label={t("request.romanticDinner")} /> : null}
                  </div>
                  {savedReservationId === reservation.id ? (
                    <p className="mt-2 rounded-md bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">
                      {t("my.reservationUpdated")}
                    </p>
                  ) : null}
                </div>
                {reservation.status !== "CANCELLED" ? (
                  <div className="flex flex-wrap gap-2">
                    {editable ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => (editing ? onCloseEditor?.() : onOpenEditor?.(reservation))}
                      >
                        {editing ? <X className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {editing ? t("my.closeEditReservation") : t("my.editReservation")}
                      </button>
                    ) : null}
                    <button
                      className="danger-button"
                      type="button"
                      disabled={cancelling}
                      onClick={() => onCancel(reservation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("admin.cancel")}
                    </button>
                  </div>
                ) : null}
              </div>

              {editable && editing && editForms[reservation.id] ? (
                <ReservationEditor
                  form={editForms[reservation.id]}
                  guestAccess={guestAccess}
                  isGuestAccess={Boolean(isGuestAccess)}
                  reservation={reservation}
                  saving={savingReservation}
                  updateError={updateError}
                  onChange={(patch) => onUpdateForm?.(reservation.id, patch)}
                  onSave={() => onSave?.(reservation.id)}
                />
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

function RequestBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-linen px-2.5 py-1 text-xs font-bold text-ink/65">
      {icon}
      {label}
    </span>
  );
}

function ReservationEditor({
  form,
  guestAccess,
  isGuestAccess,
  onChange,
  onSave,
  reservation,
  saving,
  updateError
}: {
  form: ReservationEditForm;
  guestAccess?: GuestAccess | null;
  isGuestAccess: boolean;
  onChange: (patch: Partial<ReservationEditForm>) => void;
  onSave: () => void;
  reservation: Reservation;
  saving: boolean;
  updateError?: string;
}) {
  const { t } = useI18n();
  const slotPayload = {
    date: form.date,
    numberOfGuests: form.numberOfGuests,
    tablePreferences: form.tablePreferences,
    ...(isGuestAccess
      ? {
          referenceName: guestAccess?.referenceName ?? "",
          phone: guestAccess?.phone ?? ""
        }
      : {})
  };
  const slotsQuery = useQuery({
    queryKey: ["reservation-edit", reservation.id, "slots", slotPayload],
    queryFn: () =>
      apiFetch<{ slots: AvailabilitySlot[] }>(
        `${isGuestAccess ? "/api/guest-reservations" : "/api/reservations"}/${reservation.id}/availability/slots`,
        {
          method: "POST",
          body: JSON.stringify(slotPayload)
        }
      )
  });
  const tablesPayload = {
    ...slotPayload,
    startTime: form.startTime
  };
  const tablesQuery = useQuery({
    queryKey: ["reservation-edit", reservation.id, "tables", tablesPayload],
    enabled: Boolean(form.startTime),
    queryFn: () =>
      apiFetch<{ tables: FloorTable[] }>(
        `${isGuestAccess ? "/api/guest-reservations" : "/api/reservations"}/${reservation.id}/availability`,
        {
          method: "POST",
          body: JSON.stringify(tablesPayload)
        }
      )
  });
  const slots = slotsQuery.data?.slots ?? [];
  const tables = tablesQuery.data?.tables ?? [];
  const availableTableIds = new Set(tables.map((table) => table.id));
  const originalTableUnavailable =
    Boolean(reservation.table?.id) &&
    form.tableId === reservation.table?.id &&
    Boolean(form.startTime) &&
    tablesQuery.isSuccess &&
    !availableTableIds.has(reservation.table.id);
  const selectedSlot = slots.find((slot) => slot.startTime === form.startTime);

  function togglePreference(feature: TableFeature) {
    onChange({
      tablePreferences: form.tablePreferences.includes(feature)
        ? form.tablePreferences.filter((item) => item !== feature)
        : [...form.tablePreferences, feature]
    });
  }

  return (
    <div className="rounded-lg border border-moss/15 bg-linen/70 p-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="text-sm font-semibold text-ink">
          {t("booking.date")}
          <input
            className="control mt-1 w-full"
            type="date"
            value={form.date}
            onChange={(event) => onChange({ date: event.target.value, startTime: "" })}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          {t("booking.guests")}
          <input
            className="control mt-1 w-full"
            min={1}
            max={40}
            type="number"
            value={form.numberOfGuests}
            onChange={(event) =>
              onChange({ numberOfGuests: Number(event.target.value), startTime: "", tableId: null })
            }
          />
        </label>
        <label className="flex items-end gap-2 rounded-md border border-ink/10 bg-white p-3 text-sm font-bold text-ink">
          <input
            className="h-4 w-4 accent-moss"
            type="checkbox"
            checked={form.autoAssignTable}
            onChange={(event) => onChange({ autoAssignTable: event.target.checked, tableId: null })}
          />
          {t("booking.autoAssignTable")}
        </label>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase text-ink/50">{t("booking.selectTime")}</p>
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              className={`rounded-md border px-3 py-2 text-sm font-black transition ${
                form.startTime === slot.startTime
                  ? "border-moss bg-moss text-white"
                  : slot.selectable
                    ? "border-ink/10 bg-white text-ink hover:border-moss"
                    : "border-ink/10 bg-white/60 text-ink/35 line-through"
              }`}
              disabled={!slot.selectable}
              type="button"
              onClick={() => onChange({ startTime: slot.startTime, tableId: reservation.table?.id ?? null })}
            >
              {slot.startTime}
            </button>
          ))}
          {slotsQuery.isLoading ? <span className="text-sm font-semibold text-ink/60">{t("booking.slotsLoading")}…</span> : null}
          {!slotsQuery.isLoading && slots.length === 0 ? <span className="text-sm font-semibold text-ink/60">{t("booking.noSlots")}</span> : null}
        </div>
        {selectedSlot ? (
          <p className="mt-2 text-xs font-semibold text-ink/55">
            {selectedSlot.availableTables}/{selectedSlot.totalTables} {t("booking.tablesAvailable")}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-black uppercase text-ink/50">{t("booking.tablePreferences")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {tableFeatures.map((feature) => (
              <label key={feature} className="flex items-center gap-2 rounded-md border border-ink/10 bg-white p-3 text-sm font-bold text-ink">
                <input
                  className="h-4 w-4 accent-moss"
                  type="checkbox"
                  checked={form.tablePreferences.includes(feature)}
                  onChange={() => togglePreference(feature)}
                />
                {t(`feature.${feature}`)}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase text-ink/50">{t("booking.specialRequests")}</p>
          <div className="grid gap-2">
            <SpecialRequestToggle checked={form.highChair} icon={<Baby className="h-4 w-4" />} label={t("request.highChair")} onChange={(value) => onChange({ highChair: value })} />
            <SpecialRequestToggle checked={form.birthday} icon={<Cake className="h-4 w-4" />} label={t("request.birthday")} onChange={(value) => onChange({ birthday: value })} />
            <SpecialRequestToggle checked={form.romanticDinner} icon={<Heart className="h-4 w-4" />} label={t("request.romanticDinner")} onChange={(value) => onChange({ romanticDinner: value })} />
          </div>
        </div>
      </div>

      {originalTableUnavailable ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-black text-amber-900">{t("my.currentTableUnavailable")}</p>
          <p className="mt-1 text-sm font-semibold text-amber-800">{t("my.selectAnotherTable")}</p>
          <button
            className="secondary-button mt-3"
            type="button"
            onClick={() => onChange({ tableId: tables[0]?.id ?? null, autoAssignTable: tables.length === 0 })}
          >
            {t("my.changeTable")}
          </button>
        </div>
      ) : null}

      {!form.autoAssignTable ? (
        <label className="mt-4 block text-sm font-semibold text-ink">
          {t("floor.title")}
          <select
            className="control mt-1 w-full"
            disabled={!form.startTime || tablesQuery.isLoading}
            value={form.tableId ?? ""}
            onChange={(event) => onChange({ tableId: event.target.value || null })}
          >
            <option value="">{t("my.changeTable")}</option>
            {reservation.table && availableTableIds.has(reservation.table.id) ? (
              <option value={reservation.table.id}>
                {t("my.keepCurrentTable")} - {reservation.table.label}
              </option>
            ) : null}
            {tables
              .filter((table) => table.id !== reservation.table?.id)
              .map((table) => (
                <option key={table.id} value={table.id}>
                  {table.label} - {table.capacity} {t("common.guests")}
                </option>
              ))}
          </select>
        </label>
      ) : null}

      <label className="mt-4 block text-sm font-semibold text-ink">
        {t("booking.notes")}
        <textarea
          className="control mt-1 min-h-20 w-full py-2"
          value={form.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder={t("booking.notesPlaceholder")}
        />
      </label>

      {updateError ? (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
          {updateError}
        </p>
      ) : null}

      <button
        className="primary-button mt-4"
        disabled={saving || !form.date || !form.startTime || (!form.autoAssignTable && !form.tableId)}
        type="button"
        onClick={onSave}
      >
        <Save className="h-4 w-4" />
        {t("my.saveReservation")}
      </button>
    </div>
  );
}

function SpecialRequestToggle({
  checked,
  icon,
  label,
  onChange
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-ink/10 bg-white p-3 text-sm font-bold text-ink">
      <input
        className="h-4 w-4 accent-moss"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {icon}
      {label}
    </label>
  );
}
