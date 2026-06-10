"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Ban,
  CalendarDays,
  Check,
  Box,
  Clock3,
  Gauge,
  LayoutGrid,
  List,
  Lock,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Signal,
  Sparkles,
  Trash2,
  Unlock
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { apiFetch } from "@/hooks/use-api";
import { useRestaurantSocket } from "@/hooks/use-socket-events";
import type { DetectedGlbTable, FloorTable, OpeningHours, TableBlockReason, TableZone } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { useFloorPlanStore } from "@/stores/floor-plan-store";
import { useRealtimeStore } from "@/stores/realtime-store";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  openingHours: OpeningHours;
  settings: Record<string, unknown>;
  layoutLocked: boolean;
  tables: FloorTable[];
};

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
  table: {
    id: string;
    label: string;
  } | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    contactEmail?: string | null;
    phone?: string | null;
  };
};

type Analytics = {
  date: string;
  reservations: number;
  reservedSeats: number;
  totalSeats: number;
  occupancyRate: number;
};

type TableBlock = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: TableBlockReason;
};

type TableDraft = Pick<FloorTable, "label" | "capacity" | "zone" | "rotation" | "active">;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [selectedDate, setSelectedDate] = useState(today());
  const [view, setView] = useState<"calendar" | "list" | "timeline">("calendar");
  const [floorViewMode, setFloorViewMode] = useState<"2d" | "3d">("2d");
  const [floorZoom, setFloorZoom] = useState(1);
  const [tableForm, setTableForm] = useState({
    label: "",
    capacity: 2,
    zone: "INDOOR" as TableZone
  });
  const [blockForm, setBlockForm] = useState({
    startTime: "12:00",
    endTime: "14:00",
    reason: "ADMIN" as TableBlockReason
  });
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    openingHours: JSON.stringify(defaultOpeningHours(), null, 2),
    settings: "{}"
  });
  const [restaurantFormError, setRestaurantFormError] = useState<string>();
  const [selectedTableDraft, setSelectedTableDraft] = useState<TableDraft | null>(null);
  const [detectedGlbTables, setDetectedGlbTables] = useState<DetectedGlbTable[]>([]);
  const lastSavedTableDraftRef = useRef("");
  const detectedGlbTablesSignatureRef = useRef("");
  const { selectedTableId, setSelectedTableId } = useFloorPlanStore();
  const realtime = useRealtimeStore();
  const { t } = useI18n();

  const restaurantsQuery = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => apiFetch<{ restaurants: Restaurant[] }>("/api/restaurants")
  });

  const restaurants = restaurantsQuery.data?.restaurants ?? [];
  const restaurant = restaurants.find((item) => item.id === restaurantId) ?? restaurants[0];

  useEffect(() => {
    if (!restaurantId && restaurants[0]) {
      setRestaurantId(restaurants[0].id);
    }
  }, [restaurantId, restaurants]);

  useEffect(() => {
    if (!restaurant) {
      return;
    }

    setRestaurantForm({
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description ?? "",
      address: restaurant.address ?? "",
      openingHours: JSON.stringify(restaurant.openingHours, null, 2),
      settings: JSON.stringify(restaurant.settings ?? {}, null, 2)
    });
  }, [restaurant]);

  useRestaurantSocket(restaurant?.id);

  const tablesQuery = useQuery({
    queryKey: ["tables", restaurant?.id],
    enabled: Boolean(restaurant?.id),
    queryFn: () => apiFetch<{ tables: FloorTable[] }>(`/api/restaurants/${restaurant?.id}/tables`)
  });

  const reservationsQuery = useQuery({
    queryKey: ["reservations", restaurant?.id, selectedDate],
    enabled: Boolean(restaurant?.id),
    queryFn: () =>
      apiFetch<{ reservations: Reservation[] }>(
        `/api/restaurants/${restaurant?.id}/reservations?date=${selectedDate}`
      )
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics", restaurant?.id, selectedDate],
    enabled: Boolean(restaurant?.id),
    queryFn: () =>
      apiFetch<{ analytics: Analytics }>(
        `/api/admin/analytics/${restaurant?.id}?date=${selectedDate}`
      )
  });

  const blocksQuery = useQuery({
    queryKey: ["blocks", selectedTableId],
    enabled: Boolean(selectedTableId),
    queryFn: () => apiFetch<{ blocks: TableBlock[] }>(`/api/tables/${selectedTableId}/blocks`)
  });

  const createTableMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ table: FloorTable }>(`/api/restaurants/${restaurant?.id}/tables`, {
        method: "POST",
        body: JSON.stringify({
          ...tableForm,
          positionX: 120,
          positionY: 120,
          rotation: 0,
          active: true
        })
      }),
    onSuccess: () => {
      setTableForm({ label: "", capacity: 2, zone: "INDOOR" });
      queryClient.invalidateQueries({ queryKey: ["tables", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onSettled: (data) => {
      if (data?.table.id) {
        setSelectedTableId(data.table.id);
      }
    }
  });

  const syncGlbTablesMutation = useMutation({
    mutationFn: async () => {
      if (!restaurant) {
        throw new Error(t("admin.createRestaurant"));
      }

      const orderedTables = [...tables].sort((first, second) => {
        const row = first.positionY - second.positionY;
        return Math.abs(row) > 24 ? row : first.positionX - second.positionX || first.label.localeCompare(second.label);
      });

      for (const [index, detectedTable] of detectedGlbTables.entries()) {
        const payload = {
          capacity: detectedTable.capacity,
          positionX: detectedTable.positionX,
          positionY: detectedTable.positionY,
          rotation: detectedTable.rotation,
          zone: detectedTable.zone,
          active: true
        };
        const existingTable = orderedTables[index];

        if (existingTable) {
          await apiFetch<{ table: FloorTable }>(`/api/tables/${existingTable.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          });
        } else {
          await apiFetch<{ table: FloorTable }>(`/api/restaurants/${restaurant.id}/tables`, {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              label: detectedTable.label
            })
          });
        }
      }

      return {
        count: detectedGlbTables.length
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", restaurant?.id] });
    }
  });

  const saveRestaurantMutation = useMutation({
    mutationFn: async () => {
      setRestaurantFormError(undefined);

      let openingHours: Record<string, unknown>;
      let settings: Record<string, unknown>;

      try {
        openingHours = JSON.parse(restaurantForm.openingHours) as Record<string, unknown>;
        settings = JSON.parse(restaurantForm.settings) as Record<string, unknown>;
      } catch {
        setRestaurantFormError(t("admin.invalidJson"));
        throw new Error(t("admin.invalidJson"));
      }

      const payload = {
        name: restaurantForm.name,
        slug: restaurantForm.slug,
        description: restaurantForm.description || undefined,
        address: restaurantForm.address || undefined,
        timezone: "Europe/Paris",
        openingHours,
        settings
      };

      return restaurant
        ? apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          })
        : apiFetch<{ restaurant: Restaurant }>("/api/restaurants", {
            method: "POST",
            body: JSON.stringify(payload)
          });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      setRestaurantId(data.restaurant.id);
    }
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: () =>
      apiFetch<void>(`/api/restaurants/${restaurant?.id}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      setRestaurantId(undefined);
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: ({
      tableId,
      data
    }: {
      tableId: string;
      data: Partial<FloorTable>;
    }) =>
      apiFetch<{ table: FloorTable }>(`/api/tables/${tableId}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    }
  });

  const deleteTableMutation = useMutation({
    mutationFn: (tableId: string) =>
      apiFetch<void>(`/api/tables/${tableId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      setSelectedTableId(undefined);
      queryClient.invalidateQueries({ queryKey: ["tables", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["analytics", restaurant?.id] });
    }
  });

  const toggleLayoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant?.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          layoutLocked: !restaurant?.layoutLocked
        })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["restaurants"] })
  });

  const createBlockMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ block: TableBlock }>(`/api/tables/${selectedTableId}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          ...blockForm
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks", selectedTableId] });
      queryClient.invalidateQueries({ queryKey: ["availability", restaurant?.id] });
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) =>
      apiFetch<void>(`/api/table-blocks/${blockId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks", selectedTableId] });
      queryClient.invalidateQueries({ queryKey: ["availability", restaurant?.id] });
    }
  });

  const reservationPatchMutation = useMutation({
    mutationFn: ({
      reservationId,
      data
    }: {
      reservationId: string;
      data: Record<string, unknown>;
    }) =>
      apiFetch<{ reservation: Reservation }>(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["analytics", restaurant?.id] });
    }
  });

  const cancelReservationMutation = useMutation({
    mutationFn: (reservationId: string) =>
      apiFetch<void>(`/api/reservations/${reservationId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ["analytics", restaurant?.id] });
    }
  });

  const tables = tablesQuery.data?.tables ?? restaurant?.tables ?? [];
  const selectedTable = tables.find((table) => table.id === selectedTableId);
  const reservations = reservationsQuery.data?.reservations ?? [];
  const analytics = analyticsQuery.data?.analytics;
  const blocks = blocksQuery.data?.blocks ?? [];
  const parsedRestaurantSettings = useMemo(() => {
    try {
      return JSON.parse(restaurantForm.settings) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [restaurantForm.settings]);
  const oneReservationPerTablePerService =
    parsedRestaurantSettings.oneReservationPerTablePerService === true;
  const visualTables = useMemo(() => {
    if (!selectedTableId || !selectedTableDraft) {
      return tables;
    }

    return tables.map((table) =>
      table.id === selectedTableId
        ? {
            ...table,
            ...selectedTableDraft
          }
        : table
    );
  }, [selectedTableDraft, selectedTableId, tables]);

  const groupedReservations = useMemo(() => {
    return reservations.reduce<Record<string, Reservation[]>>((groups, reservation) => {
      groups[reservation.startTime] = groups[reservation.startTime] ?? [];
      groups[reservation.startTime].push(reservation);
      return groups;
    }, {});
  }, [reservations]);
  const activeReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status !== "CANCELLED"),
    [reservations]
  );
  const occupiedTableIds = useMemo(
    () =>
      new Set(
        activeReservations
          .map((reservation) => reservation.table?.id)
          .filter((tableId): tableId is string => Boolean(tableId))
      ),
    [activeReservations]
  );
  const activeTables = useMemo(() => tables.filter((table) => table.active), [tables]);
  const occupiedTables = occupiedTableIds.size;
  const freeTables = Math.max(activeTables.length - occupiedTables, 0);
  const timelineReservations = useMemo(
    () =>
      [...activeReservations].sort((first, second) =>
        `${first.startTime}-${first.endTime}`.localeCompare(`${second.startTime}-${second.endTime}`)
      ),
    [activeReservations]
  );

  useEffect(() => {
    if (!selectedTable) {
      setSelectedTableDraft(null);
      lastSavedTableDraftRef.current = "";
      return;
    }

    const draft = {
      label: selectedTable.label,
      capacity: selectedTable.capacity,
      zone: selectedTable.zone,
      rotation: selectedTable.rotation,
      active: selectedTable.active
    };

    setSelectedTableDraft(draft);
    lastSavedTableDraftRef.current = JSON.stringify(draft);
  }, [selectedTable?.id]);

  useEffect(() => {
    if (!selectedTableId || !selectedTableDraft) {
      return;
    }

    const serialized = JSON.stringify(selectedTableDraft);

    if (serialized === lastSavedTableDraftRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      lastSavedTableDraftRef.current = serialized;
      updateTableMutation.mutate({
        tableId: selectedTableId,
        data: selectedTableDraft
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [selectedTableDraft, selectedTableId]);

  const handleDetectedGlbTablesChange = useCallback((nextTables: DetectedGlbTable[]) => {
    const signature = nextTables
      .map(
        (table) =>
          `${table.id}:${table.capacity}:${table.zone}:${table.positionX}:${table.positionY}:${table.rotation}`
      )
      .join("|");

    if (signature === detectedGlbTablesSignatureRef.current) {
      return;
    }

    detectedGlbTablesSignatureRef.current = signature;
    setDetectedGlbTables(nextTables);
  }, []);

  function updateSelectedTableDraft(data: Partial<TableDraft>) {
    setSelectedTableDraft((current) => (current ? { ...current, ...data } : current));
  }

  function updateRestaurantSetting(key: string, value: unknown) {
    setRestaurantForm((current) => {
      let settings: Record<string, unknown> = {};

      try {
        settings = JSON.parse(current.settings) as Record<string, unknown>;
      } catch {
        settings = {};
      }

      return {
        ...current,
        settings: JSON.stringify(
          {
            ...settings,
            [key]: value
          },
          null,
          2
        )
      };
    });
  }

  function handleCreateTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTableMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">{t("admin.title")}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink/65">
            <span>{restaurant?.name ?? t("admin.createRestaurant")}</span>
            <span className="inline-flex items-center gap-2 rounded-md border border-moss/15 bg-moss/10 px-2 py-1 text-xs font-bold text-moss">
              <Signal className="h-3.5 w-3.5" />
              {realtime.connected ? t("admin.liveConnected") : t("admin.liveDisconnected")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {restaurants.length > 1 ? (
            <select
              className="control"
              value={restaurant?.id}
              onChange={(event) => setRestaurantId(event.target.value)}
            >
              {restaurants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : null}
          <label className="relative">
            <CalendarDays className="field-icon" />
            <input
              className="control with-leading-icon"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <button
            className="icon-button"
            title={t("admin.refresh")}
            type="button"
            onClick={() => queryClient.invalidateQueries()}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetric
          icon={<CalendarDays className="h-5 w-5" />}
          label={t("admin.todayReservations")}
          value={activeReservations.length}
          detail={selectedDate}
        />
        <DashboardMetric
          icon={<Gauge className="h-5 w-5" />}
          label={t("admin.occupancyRate")}
          value={`${analytics?.occupancyRate ?? 0}%`}
          detail={`${analytics?.reservedSeats ?? 0}/${analytics?.totalSeats ?? 0} ${t("admin.seatsMetric").toLowerCase()}`}
        />
        <DashboardMetric
          icon={<LayoutGrid className="h-5 w-5" />}
          label={t("admin.freeTables")}
          value={freeTables}
          detail={`${activeTables.length} ${t("admin.tables").toLowerCase()}`}
        />
        <DashboardMetric
          icon={<Ban className="h-5 w-5" />}
          label={t("admin.occupiedTables")}
          value={occupiedTables}
          detail={t("admin.realtimeStats")}
        />
        <DashboardMetric
          icon={<Activity className="h-5 w-5" />}
          label={t("admin.realtimeStats")}
          value={realtime.eventCount}
          detail={realtime.lastEvent ? `${realtime.lastEvent}` : t("admin.waitingForEvents")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-base font-bold text-ink">{t("admin.restaurant")}</h2>
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-ink">
                {t("admin.name")}
                <input
                  className="control mt-1 w-full"
                  value={restaurantForm.name}
                  onChange={(event) =>
                    setRestaurantForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: current.slug || slugify(event.target.value)
                    }))
                  }
                />
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("admin.slug")}
                <input
                  className="control mt-1 w-full"
                  value={restaurantForm.slug}
                  onChange={(event) =>
                    setRestaurantForm((current) => ({ ...current, slug: slugify(event.target.value) }))
                  }
                />
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("admin.description")}
                <textarea
                  className="control mt-1 min-h-20 w-full py-2"
                  value={restaurantForm.description}
                  onChange={(event) =>
                    setRestaurantForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("admin.address")}
                <input
                  className="control mt-1 w-full"
                  value={restaurantForm.address}
                  onChange={(event) =>
                    setRestaurantForm((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("admin.openingHours")}
                <textarea
                  className="control mt-1 min-h-28 w-full py-2 font-mono text-xs"
                  value={restaurantForm.openingHours}
                  onChange={(event) =>
                    setRestaurantForm((current) => ({ ...current, openingHours: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("admin.settings")}
                <textarea
                  className="control mt-1 min-h-20 w-full py-2 font-mono text-xs"
                  value={restaurantForm.settings}
                  onChange={(event) =>
                    setRestaurantForm((current) => ({ ...current, settings: event.target.value }))
                  }
                />
              </label>
              <div className="rounded-md border border-ink/10 bg-linen p-3">
                <p className="mb-2 text-sm font-bold text-ink">{t("admin.bookingRules")}</p>
                <label className="flex items-start justify-between gap-3 text-sm font-semibold text-ink">
                  <span>{t("admin.oneReservationPerService")}</span>
                  <input
                    className="h-5 w-5 shrink-0 accent-moss"
                    type="checkbox"
                    checked={oneReservationPerTablePerService}
                    onChange={(event) =>
                      updateRestaurantSetting("oneReservationPerTablePerService", event.target.checked)
                    }
                  />
                </label>
              </div>
              {restaurantFormError || saveRestaurantMutation.error ? (
                <p className="text-sm font-semibold text-red-700">
                  {restaurantFormError ?? saveRestaurantMutation.error?.message}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="primary-button"
                  type="button"
                  disabled={saveRestaurantMutation.isPending || !restaurantForm.name || !restaurantForm.slug}
                  onClick={() => saveRestaurantMutation.mutate()}
                >
                  <Save className="h-4 w-4" />
                  {t("admin.save")}
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={!restaurant || deleteRestaurantMutation.isPending}
                  onClick={() => deleteRestaurantMutation.mutate()}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("admin.delete")}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="grid grid-cols-3 gap-2">
              <Metric label={t("admin.reservationsMetric")} value={analytics?.reservations ?? 0} />
              <Metric label={t("admin.seatsMetric")} value={analytics?.reservedSeats ?? 0} />
              <Metric label={t("admin.occupancyMetric")} value={`${analytics?.occupancyRate ?? 0}%`} />
            </div>
          </div>

          <form className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft" onSubmit={handleCreateTable}>
            <h2 className="mb-3 text-base font-bold text-ink">{t("admin.tables")}</h2>
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-ink">
                {t("admin.label")}
                <input
                  className="control mt-1 w-full"
                  value={tableForm.label}
                  onChange={(event) => setTableForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="T12"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold text-ink">
                  {t("admin.capacity")}
                  <input
                    className="control mt-1 w-full"
                    min={1}
                    max={40}
                    type="number"
                    value={tableForm.capacity}
                    onChange={(event) =>
                      setTableForm((current) => ({ ...current, capacity: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("admin.zone")}
                  <select
                    className="control mt-1 w-full"
                    disabled={restaurant?.layoutLocked}
                    value={tableForm.zone}
                    onChange={(event) =>
                      setTableForm((current) => ({
                        ...current,
                        zone: event.target.value as TableZone
                      }))
                    }
                  >
                    <option value="INDOOR">{t("floor.indoor")}</option>
                    <option value="TERRACE">{t("floor.terrace")}</option>
                    <option value="VIP">VIP</option>
                  </select>
                </label>
              </div>
              <button
                className="primary-button"
                disabled={!restaurant || restaurant.layoutLocked || createTableMutation.isPending}
                type="submit"
              >
                <Plus className="h-4 w-4" />
                {t("admin.addTable")}
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-ink">{t("admin.layout")}</h2>
              <button
                className="secondary-button"
                type="button"
                disabled={!restaurant}
                onClick={() => toggleLayoutMutation.mutate()}
              >
                {restaurant?.layoutLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {restaurant?.layoutLocked ? t("admin.unlock") : t("admin.lock")}
              </button>
            </div>
            <div className="grid gap-3">
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
              {floorViewMode === "3d" ? (
                <>
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
                  <div className="rounded-md border border-ink/10 bg-linen p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                        <Sparkles className="h-4 w-4 text-moss" />
                        {t("admin.glbAi")}
                      </span>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-ink">
                        {t("admin.detectedTables", { count: detectedGlbTables.length })}
                      </span>
                    </div>
                    <button
                      className="secondary-button w-full"
                      type="button"
                      disabled={
                        !restaurant ||
                        restaurant.layoutLocked ||
                        detectedGlbTables.length === 0 ||
                        syncGlbTablesMutation.isPending
                      }
                      onClick={() => syncGlbTablesMutation.mutate()}
                    >
                      <Sparkles className="h-4 w-4" />
                      {syncGlbTablesMutation.isPending ? t("admin.saving") : t("admin.applyGlbDetection")}
                    </button>
                    <p className="mt-2 text-xs font-medium text-ink/60">
                      {detectedGlbTables.length > 0 ? t("admin.glbDetectedHint") : t("admin.noGlbTables")}
                    </p>
                    {syncGlbTablesMutation.error ? (
                      <p className="mt-2 text-sm font-semibold text-red-700">
                        {syncGlbTablesMutation.error.message}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-ink">{t("admin.selectedTable")}</h2>
              <span className="rounded-md bg-sage/55 px-2 py-1 text-xs font-bold text-ink/70">
                {updateTableMutation.isPending ? t("admin.saving") : t("admin.saved")}
              </span>
            </div>
            {selectedTable ? (
              <div className="grid gap-3">
                <div className="rounded-md bg-sage/55 p-3 text-sm">
                  <p className="font-bold text-ink">{selectedTable.label}</p>
                  <p className="text-ink/65">
                    {t("floor.seats", { count: selectedTable.capacity })} · {t(`zone.${selectedTable.zone}`)}
                  </p>
                </div>
                <label className="text-sm font-semibold text-ink">
                  {t("admin.label")}
                  <input
                    className="control mt-1 w-full"
                    value={selectedTableDraft?.label ?? ""}
                    onChange={(event) => updateSelectedTableDraft({ label: event.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-semibold text-ink">
                    {t("admin.capacity")}
                    <input
                      className="control mt-1 w-full"
                      min={1}
                      max={40}
                      type="number"
                      value={selectedTableDraft?.capacity ?? 1}
                      onChange={(event) =>
                        updateSelectedTableDraft({ capacity: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold text-ink">
                    {t("admin.zone")}
                    <select
                      className="control mt-1 w-full"
                      disabled={restaurant?.layoutLocked}
                      value={selectedTableDraft?.zone ?? "INDOOR"}
                      onChange={(event) =>
                        updateSelectedTableDraft({ zone: event.target.value as TableZone })
                      }
                    >
                      <option value="INDOOR">{t("floor.indoor")}</option>
                      <option value="TERRACE">{t("floor.terrace")}</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </label>
                </div>
                <label className="text-sm font-semibold text-ink">
                  {t("admin.rotation")}
                  <div className="mt-2 flex items-center gap-3">
                    <RotateCw className="h-4 w-4 text-ink/55" />
                    <input
                      className="w-full accent-moss"
                      disabled={restaurant?.layoutLocked}
                      min={0}
                      max={359}
                      type="range"
                      value={selectedTableDraft?.rotation ?? 0}
                      onChange={(event) =>
                        updateSelectedTableDraft({ rotation: Number(event.target.value) })
                      }
                    />
                    <span className="w-12 text-right text-sm font-bold text-ink">
                      {Math.round(selectedTableDraft?.rotation ?? 0)}°
                    </span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-md border border-ink/10 bg-linen px-3 py-2 text-sm font-semibold text-ink">
                  {selectedTableDraft?.active ? t("admin.active") : t("admin.inactive")}
                  <input
                    className="h-5 w-5 accent-moss"
                    type="checkbox"
                    checked={selectedTableDraft?.active ?? false}
                    onChange={(event) => updateSelectedTableDraft({ active: event.target.checked })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!selectedTable}
                    onClick={() => selectedTable && updateSelectedTableDraft({ active: !selectedTableDraft?.active })}
                  >
                    <Ban className="h-4 w-4" />
                    {selectedTableDraft?.active ? t("admin.deactivate") : t("admin.activate")}
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    disabled={deleteTableMutation.isPending || restaurant?.layoutLocked}
                    onClick={() => deleteTableMutation.mutate(selectedTable.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("admin.deleteTable")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink/65">{t("admin.noTableSelected")}</p>
            )}
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-base font-bold text-ink">{t("admin.blocks")}</h2>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold text-ink">
                  {t("booking.start")}
                  <input
                    className="control mt-1 w-full"
                    type="time"
                    value={blockForm.startTime}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, startTime: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("booking.end")}
                  <input
                    className="control mt-1 w-full"
                    type="time"
                    value={blockForm.endTime}
                    onChange={(event) => setBlockForm((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </label>
              </div>
              <label className="text-sm font-semibold text-ink">
                {t("admin.reason")}
                <select
                  className="control mt-1 w-full"
                  value={blockForm.reason}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      reason: event.target.value as TableBlockReason
                    }))
                  }
                >
                  <option value="MAINTENANCE">{t("admin.maintenance")}</option>
                  <option value="ADMIN">Admin</option>
                  <option value="EVENT">{t("admin.event")}</option>
                </select>
              </label>
              <button
                className="primary-button"
                type="button"
                disabled={!selectedTableId || createBlockMutation.isPending}
                onClick={() => createBlockMutation.mutate()}
              >
                <Ban className="h-4 w-4" />
                {t("admin.blockTable")}
              </button>
              <div className="divide-y divide-ink/10">
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      {block.startTime}-{block.endTime} · {t(`reason.${block.reason}`)}
                    </span>
                    <button
                      className="icon-button h-8 w-8"
                      title={t("admin.removeBlock")}
                      type="button"
                      onClick={() => deleteBlockMutation.mutate(block.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {createBlockMutation.error ? (
                <p className="text-sm font-semibold text-red-700">{createBlockMutation.error.message}</p>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <FloorPlan
            mode="admin"
            viewMode={floorViewMode}
            zoom={floorZoom}
            tables={visualTables}
            selectedTableId={selectedTableId}
            layoutLocked={restaurant?.layoutLocked}
            onSelect={(table) => setSelectedTableId(table.id)}
            onMove={(tableId, position) =>
              updateTableMutation.mutate({
                tableId,
                data: position
              })
            }
            onDetectedTablesChange={handleDetectedGlbTablesChange}
          />

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-ink">{t("admin.reservations")}</h2>
              <div className="inline-flex rounded-md border border-ink/10 bg-linen p-1">
                <button
                  className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold ${
                    view === "calendar" ? "bg-white shadow-sm" : "text-ink/65"
                  }`}
                  type="button"
                  onClick={() => setView("calendar")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t("admin.calendar")}
                </button>
                <button
                  className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold ${
                    view === "list" ? "bg-white shadow-sm" : "text-ink/65"
                  }`}
                  type="button"
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" />
                  {t("admin.list")}
                </button>
                <button
                  className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold ${
                    view === "timeline" ? "bg-white shadow-sm" : "text-ink/65"
                  }`}
                  type="button"
                  onClick={() => setView("timeline")}
                >
                  <Clock3 className="h-4 w-4" />
                  {t("admin.timeline")}
                </button>
              </div>
            </div>

            {view === "calendar" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(groupedReservations).map(([time, items]) => (
                  <div key={time} className="rounded-md border border-ink/10 p-3">
                    <p className="mb-2 text-sm font-black text-ink">{time}</p>
                    <div className="space-y-2">
                      {items.map((reservation) => (
                        <ReservationRow
                          key={reservation.id}
                          reservation={reservation}
                          selectedTableId={selectedTableId}
                          onPatch={(data) =>
                            reservationPatchMutation.mutate({
                              reservationId: reservation.id,
                              data
                            })
                          }
                          onCancel={() => cancelReservationMutation.mutate(reservation.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {reservations.length === 0 ? (
                  <p className="rounded-md bg-sage/45 p-3 text-sm font-semibold text-ink">
                    {t("admin.noReservationsForDate")}
                  </p>
                ) : null}
              </div>
            ) : view === "list" ? (
              <div className="divide-y divide-ink/10">
                {reservations.map((reservation) => (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    selectedTableId={selectedTableId}
                    onPatch={(data) =>
                      reservationPatchMutation.mutate({
                        reservationId: reservation.id,
                        data
                      })
                    }
                    onCancel={() => cancelReservationMutation.mutate(reservation.id)}
                  />
                ))}
                {reservations.length === 0 ? (
                  <p className="rounded-md bg-sage/45 p-3 text-sm font-semibold text-ink">
                    {t("admin.noReservationsForDate")}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="relative space-y-3 pl-5">
                <div className="absolute bottom-3 left-2 top-3 w-px bg-ink/10" />
                {timelineReservations.map((reservation) => (
                  <div key={reservation.id} className="relative rounded-md border border-ink/10 bg-linen/70 p-3">
                    <span className="absolute -left-[1.15rem] top-4 h-3 w-3 rounded-full border-2 border-white bg-moss" />
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-ink">
                        {reservation.startTime}-{reservation.endTime}
                      </p>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-ink/65">
                        {t(`status.${reservation.status}`)}
                      </span>
                    </div>
                    <ReservationRow
                      reservation={reservation}
                      selectedTableId={selectedTableId}
                      onPatch={(data) =>
                        reservationPatchMutation.mutate({
                          reservationId: reservation.id,
                          data
                        })
                      }
                      onCancel={() => cancelReservationMutation.mutate(reservation.id)}
                    />
                  </div>
                ))}
                {timelineReservations.length === 0 ? (
                  <p className="rounded-md bg-sage/45 p-3 text-sm font-semibold text-ink">
                    {t("admin.noTimeline")}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function defaultOpeningHours() {
  return {
    monday: { open: "12:00", close: "22:00" },
    tuesday: { open: "12:00", close: "22:00" },
    wednesday: { open: "12:00", close: "22:00" },
    thursday: { open: "12:00", close: "22:00" },
    friday: { open: "12:00", close: "23:00" },
    saturday: { open: "12:00", close: "23:00" },
    sunday: { open: "12:00", close: "21:00" }
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-linen p-3">
      <p className="text-xs font-semibold text-ink/55">{label}</p>
      <p className="mt-1 text-xl font-black text-ink">{value}</p>
    </div>
  );
}

function DashboardMetric({
  icon,
  label,
  value,
  detail
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-ink/55">{label}</p>
          <p className="mt-2 text-3xl font-black text-ink">{value}</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink/55">{detail}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sage text-moss">
          {icon}
        </span>
      </div>
    </div>
  );
}

function ReservationRow({
  reservation,
  selectedTableId,
  onPatch,
  onCancel
}: {
  reservation: Reservation;
  selectedTableId?: string;
  onPatch: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const guestName =
    [reservation.guestFirstName, reservation.guestLastName].filter(Boolean).join(" ") ||
    reservation.user.name ||
    reservation.user.email;
  const guestEmail = reservation.guestEmail ?? reservation.user.contactEmail ?? reservation.user.email;
  const guestPhone = reservation.guestPhone ?? reservation.user.phone;

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-ink">
          {reservation.startTime}-{reservation.endTime} · {guestName}
        </p>
        <p className="text-sm text-ink/65">
          {reservation.numberOfGuests} {t("common.guests")} ·{" "}
          {reservation.table?.label ?? t("admin.noTable")} · {t(`status.${reservation.status}`)}
        </p>
        <p className="mt-1 text-xs font-semibold text-ink/50">
          {guestEmail}
          {guestPhone ? ` · ${guestPhone}` : ""}
        </p>
        {reservation.notes ? <p className="mt-1 text-xs text-ink/60">{reservation.notes}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {reservation.status !== "CONFIRMED" ? (
          <button className="secondary-button h-9" type="button" onClick={() => onPatch({ status: "CONFIRMED" })}>
            <Check className="h-4 w-4" />
            {t("admin.confirm")}
          </button>
        ) : null}
        {selectedTableId && reservation.table?.id !== selectedTableId ? (
          <button className="secondary-button h-9" type="button" onClick={() => onPatch({ tableId: selectedTableId })}>
            <Save className="h-4 w-4" />
            {t("admin.assign")}
          </button>
        ) : null}
        {reservation.status !== "CANCELLED" ? (
          <button className="danger-button h-9" type="button" onClick={onCancel}>
            <Trash2 className="h-4 w-4" />
            {t("admin.cancel")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
