"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CalendarDays,
  CakeSlice,
  Check,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gauge,
  Heart,
  LayoutGrid,
  List,
  Lock,
  Milk,
  Minus,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Signal,
  Sparkles,
  Trash2,
  Users,
  Unlock,
  Upload
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { apiFetch } from "@/hooks/use-api";
import { useRestaurantSocket } from "@/hooks/use-socket-events";
import {
  tableFeatures,
  type DetectedGlbTable,
  type FloorTable,
  type OpeningHours,
  type TableBlockReason,
  type TableFeature,
  type TableShape,
  type TableZone,
  type VacationClosure
} from "@/lib/domain";
import {
  applyFloorPlanSettings,
  floorPlanModelUrlFromSettings,
  isTableShape,
  tableFeaturesFromSettings,
  withTableFeatures,
  withTableShape
} from "@/lib/floor-plan-settings";
import { useI18n } from "@/lib/i18n";
import { addDaysToDateString, minutesToTime } from "@/lib/time";
import { useFloorPlanStore } from "@/stores/floor-plan-store";
import { useRealtimeStore } from "@/stores/realtime-store";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
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
  highChair: boolean;
  birthday: boolean;
  romanticDinner: boolean;
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
  customerFirstName: string | null;
  customerLastName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
};

type TableDraft = Pick<FloorTable, "label" | "capacity" | "zone" | "rotation" | "active">;
type AdminPanel = "restaurant" | "hours" | "rules" | "vacations" | "tables" | "blocks";
type DayKey = keyof OpeningHours;

const dayKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const satisfies DayKey[];

const timeOptions = Array.from({ length: 24 * 4 }, (_, index) => minutesToTime(index * 15));
const reservationDurationOptions = [60, 75, 90, 105, 120, 135, 150, 180, 210, 240];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function settingNumber(settings: Record<string, unknown>, key: string, fallback: number) {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readVacationClosures(settings: Record<string, unknown>): VacationClosure[] {
  const closures = settings.vacationClosures;

  if (!Array.isArray(closures)) {
    return [];
  }

  return closures
    .map((closure): VacationClosure | null => {
      if (!closure || typeof closure !== "object" || Array.isArray(closure)) {
        return null;
      }

      const record = closure as Record<string, unknown>;
      const startDate = record.startDate;
      const endDate = record.endDate;

      if (typeof startDate !== "string" || typeof endDate !== "string") {
        return null;
      }

      return {
        id: typeof record.id === "string" ? record.id : `${startDate}-${endDate}`,
        startDate,
        endDate,
        label: typeof record.label === "string" ? record.label : ""
      };
    })
    .filter((closure): closure is VacationClosure => Boolean(closure));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Invalid file."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Invalid file."));
    reader.readAsDataURL(file);
  });
}

function nextTableLabel(tables: FloorTable[]) {
  const usedNumbers = new Set(
    tables
      .map((table) => /^T(\d+)$/i.exec(table.label)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value))
  );

  for (let number = 1; number <= tables.length + 20; number += 1) {
    if (!usedNumbers.has(number)) {
      return `T${number}`;
    }
  }

  return `T${tables.length + 1}`;
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [selectedDate, setSelectedDate] = useState(today());
  const [view, setView] = useState<"calendar" | "list" | "timeline">("calendar");
  const [floorViewMode, setFloorViewMode] = useState<"2d" | "3d">("2d");
  const [floorZoom, setFloorZoom] = useState(1);
  const [deleteMode, setDeleteMode] = useState(false);
  const [adminPanel, setAdminPanel] = useState<AdminPanel>("restaurant");
  const [tableForm, setTableForm] = useState({
    label: "",
    capacity: 2,
    zone: "INDOOR" as TableZone,
    shape: "ROUND" as TableShape
  });
  const [blockForm, setBlockForm] = useState({
    date: today(),
    startTime: "12:00",
    endTime: "14:00",
    reason: "ADMIN" as TableBlockReason,
    customerFirstName: "",
    customerLastName: "",
    customerEmail: "",
    customerPhone: "",
    notes: ""
  });
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    phone: "",
    openingHours: JSON.stringify(defaultOpeningHours(), null, 2),
    settings: "{}"
  });
  const [restaurantFormError, setRestaurantFormError] = useState<string>();
  const [restaurantSaved, setRestaurantSaved] = useState(false);
  const [selectedTableDraft, setSelectedTableDraft] = useState<TableDraft | null>(null);
  const [detectedGlbTables, setDetectedGlbTables] = useState<DetectedGlbTable[]>([]);
  const lastSavedTableDraftRef = useRef("");
  const detectedGlbTablesSignatureRef = useRef("");
  const { selectedTableId, setSelectedTableId } = useFloorPlanStore();
  const realtime = useRealtimeStore();
  const { t } = useI18n();
  const adminMenuItems = useMemo(
    () => [
      { id: "restaurant" as const, label: t("admin.menuRestaurant") },
      { id: "hours" as const, label: t("admin.menuHours") },
      { id: "rules" as const, label: t("admin.menuRules") },
      { id: "vacations" as const, label: t("admin.menuVacations") },
      { id: "tables" as const, label: t("admin.menuTables") },
      { id: "blocks" as const, label: t("admin.menuBlocks") }
    ],
    [t]
  );

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
      phone: restaurant.phone ?? "",
      openingHours: JSON.stringify(restaurant.openingHours, null, 2),
      settings: JSON.stringify(restaurant.settings ?? {}, null, 2)
    });
  }, [restaurant]);

  useEffect(() => {
    setBlockForm((current) => ({ ...current, date: selectedDate }));
  }, [selectedDate]);

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
    mutationFn: (
      overrides?: Partial<TableDraft> &
        Partial<Pick<FloorTable, "positionX" | "positionY">> & { shape?: TableShape }
    ) => {
      const { shape: _shape, ...payload } = {
        ...tableForm,
        positionX: 120,
        positionY: 120,
        rotation: 0,
        active: true,
        ...overrides
      };

      return apiFetch<{ table: FloorTable }>(`/api/restaurants/${restaurant?.id}/tables`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (data, variables) => {
      setTableForm((current) => ({ ...current, label: "" }));
      void persistTableShape(data.table.id, variables?.shape ?? tableForm.shape).catch((error) => {
        setRestaurantFormError(error instanceof Error ? error.message : t("admin.invalidJson"));
      });
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

  const uploadGlbModelMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".glb")) {
        throw new Error(t("admin.invalidGlb"));
      }

      const dataUrl = await readFileAsDataUrl(file);
      return patchRestaurantSettings({
        ...getRestaurantSettingsFromForm(),
        floorPlanModelDataUrl: dataUrl
      });
    },
    onSuccess: () => {
      setFloorViewMode("3d");
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    }
  });

  const saveRestaurantMutation = useMutation({
    mutationFn: async () => {
      setRestaurantFormError(undefined);
      setRestaurantSaved(false);

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
        slug: buildRestaurantSlug(restaurantForm.name, restaurant?.slug),
        description: restaurantForm.description || undefined,
        address: restaurantForm.address || undefined,
        phone: restaurantForm.phone || undefined,
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
      setRestaurantSaved(true);
      window.setTimeout(() => setRestaurantSaved(false), 3500);
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
          date: blockForm.date,
          startTime: blockForm.startTime,
          endTime: blockForm.endTime,
          reason: blockForm.reason,
          customerFirstName: blockForm.customerFirstName || undefined,
          customerLastName: blockForm.customerLastName || undefined,
          customerEmail: blockForm.customerEmail || undefined,
          customerPhone: blockForm.customerPhone || undefined,
          notes: blockForm.notes || undefined
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

  const reservations = reservationsQuery.data?.reservations ?? [];
  const analytics = analyticsQuery.data?.analytics;
  const blocks = blocksQuery.data?.blocks ?? [];
  const rawTables = tablesQuery.data?.tables ?? restaurant?.tables ?? [];
  const parsedRestaurantSettings = useMemo(() => {
    try {
      return JSON.parse(restaurantForm.settings) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [restaurantForm.settings]);
  const tables = useMemo(
    () => applyFloorPlanSettings(rawTables, parsedRestaurantSettings),
    [parsedRestaurantSettings, rawTables]
  );
  const floorPlanModelUrl = useMemo(
    () => floorPlanModelUrlFromSettings(parsedRestaurantSettings),
    [parsedRestaurantSettings]
  );
  const selectedTable = tables.find((table) => table.id === selectedTableId);
  const selectedTableFeatures = selectedTable
    ? tableFeaturesFromSettings(parsedRestaurantSettings)[selectedTable.id] ?? selectedTable.features ?? []
    : [];
  const openingHoursDraft = useMemo(() => {
    try {
      return JSON.parse(restaurantForm.openingHours) as OpeningHours;
    } catch {
      return defaultOpeningHours();
    }
  }, [restaurantForm.openingHours]);
  const reservationDurationMinutes = settingNumber(
    parsedRestaurantSettings,
    "reservationDurationMinutes",
    120
  );
  const minimumLeadTimeEnabled = parsedRestaurantSettings.minimumLeadTimeEnabled !== false;
  const releaseTableAfterDuration = parsedRestaurantSettings.oneReservationPerTablePerService !== false;
  const strictCapacityMatching = parsedRestaurantSettings.strictCapacityMatching !== false;
  const vacationClosures = useMemo(
    () => readVacationClosures(parsedRestaurantSettings),
    [parsedRestaurantSettings]
  );
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
  const availableTableCapacityCounts = useMemo(() => {
    const availableTablesForDay = activeTables.filter((table) => !occupiedTableIds.has(table.id));

    return {
      two: availableTablesForDay.filter((table) => table.capacity === 2).length,
      four: availableTablesForDay.filter((table) => table.capacity === 4).length,
      sixPlus: availableTablesForDay.filter((table) => table.capacity >= 6).length
    };
  }, [activeTables, occupiedTableIds]);
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

  function updateVacationClosures(nextClosures: VacationClosure[]) {
    updateRestaurantSetting("vacationClosures", nextClosures);
  }

  function addVacationClosure() {
    updateVacationClosures([
      ...vacationClosures,
      {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`,
        startDate: selectedDate,
        endDate: selectedDate,
        label: ""
      }
    ]);
  }

  function updateVacationClosure(id: string, data: Partial<VacationClosure>) {
    updateVacationClosures(
      vacationClosures.map((closure) =>
        closure.id === id
          ? {
              ...closure,
              ...data
            }
          : closure
      )
    );
  }

  function removeVacationClosure(id: string) {
    updateVacationClosures(vacationClosures.filter((closure) => closure.id !== id));
  }

  function getRestaurantSettingsFromForm() {
    try {
      return JSON.parse(restaurantForm.settings) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  function getOpeningHoursFromForm() {
    try {
      return JSON.parse(restaurantForm.openingHours) as OpeningHours;
    } catch {
      return defaultOpeningHours();
    }
  }

  async function patchRestaurantSettings(settings: Record<string, unknown>) {
    if (!restaurant) {
      throw new Error(t("admin.createRestaurant"));
    }

    setRestaurantForm((current) => ({
      ...current,
      settings: JSON.stringify(settings, null, 2)
    }));

    const payload = {
      name: restaurantForm.name || restaurant.name,
      slug: buildRestaurantSlug(restaurantForm.name || restaurant.name, restaurant.slug),
      description: restaurantForm.description || undefined,
      address: restaurantForm.address || undefined,
      phone: restaurantForm.phone || undefined,
      timezone: "Europe/Paris",
      openingHours: getOpeningHoursFromForm(),
      settings
    };

    return apiFetch<{ restaurant: Restaurant }>(`/api/restaurants/${restaurant.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  async function persistTableShape(tableId: string, shape: TableShape) {
    const settings = withTableShape(getRestaurantSettingsFromForm(), tableId, shape);
    await patchRestaurantSettings(settings);
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
  }

  async function persistTableFeatures(tableId: string, features: TableFeature[]) {
    const settings = withTableFeatures(getRestaurantSettingsFromForm(), tableId, features);
    await patchRestaurantSettings(settings);
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
  }

  function updateOpeningHour(day: DayKey, value: Partial<OpeningHours[string]>) {
    setRestaurantForm((current) => {
      let openingHours: OpeningHours;

      try {
        openingHours = JSON.parse(current.openingHours) as OpeningHours;
      } catch {
        openingHours = defaultOpeningHours();
      }

      return {
        ...current,
        openingHours: JSON.stringify(
          {
            ...openingHours,
            [day]: {
              ...openingHours[day],
              ...value
            }
          },
          null,
          2
        )
      };
    });
  }

  function shiftSelectedDate(days: number) {
    setSelectedDate((current) => addDaysToDateString(current, days));
  }

  function handleQuickCreateTable() {
    setDeleteMode(false);
    setAdminPanel("tables");
    setTableForm((current) => ({
      ...current,
      label: current.label || nextTableLabel(tables)
    }));
  }

  function handleCreateTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTableMutation.mutate({
      label: tableForm.label.trim() || nextTableLabel(tables),
      positionX: 430,
      positionY: 270
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">{t("admin.title")}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink/65">
            <span>{restaurant?.name ?? t("admin.createRestaurant")}</span>
            {realtime.connected ? (
              <span className="inline-flex items-center gap-2 rounded-md border border-moss/15 bg-moss/10 px-2 py-1 text-xs font-bold text-moss">
                <Signal className="h-3.5 w-3.5" />
                {t("admin.liveConnected")}
              </span>
            ) : null}
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
          <div className="relative flex items-center gap-1">
            <button
              className="icon-button h-10 w-10"
              title={t("admin.previousDay")}
              type="button"
              onClick={() => shiftSelectedDate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="relative">
              <CalendarDays className="field-icon" />
            <input
              className="control with-leading-icon"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            </span>
            <button
              className="icon-button h-10 w-10"
              title={t("admin.nextDay")}
              type="button"
              onClick={() => shiftSelectedDate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
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
          icon={<Users className="h-5 w-5" />}
          label={t("admin.availableTwoTop")}
          value={availableTableCapacityCounts.two}
          detail={t("admin.availableTablesDetail")}
        />
        <DashboardMetric
          icon={<Users className="h-5 w-5" />}
          label={t("admin.availableFourTop")}
          value={availableTableCapacityCounts.four}
          detail={t("admin.availableTablesDetail")}
        />
        <DashboardMetric
          icon={<Users className="h-5 w-5" />}
          label={t("admin.availableSixPlus")}
          value={availableTableCapacityCounts.sixPlus}
          detail={t("admin.availableTablesDetail")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-lg border border-ink/10 bg-white p-3 shadow-soft">
            <div className="grid grid-cols-2 gap-2">
              {adminMenuItems.map((item) => (
                <button
                  key={item.id}
                  className={`h-10 rounded-md border px-3 text-sm font-bold transition ${
                    adminPanel === item.id
                      ? "border-moss bg-moss text-white"
                      : "border-ink/10 bg-linen text-ink hover:border-moss/40"
                  }`}
                  type="button"
                  onClick={() => setAdminPanel(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {adminPanel === "restaurant" ||
          adminPanel === "hours" ||
          adminPanel === "rules" ||
          adminPanel === "vacations" ? (
          <div className="overflow-hidden rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-base font-bold text-ink">
              {adminPanel === "restaurant"
                ? t("admin.restaurant")
                : adminPanel === "hours"
                  ? t("admin.openingHours")
                  : adminPanel === "rules"
                    ? t("admin.settings")
                    : t("admin.vacations")}
            </h2>
            <div className="grid gap-3">
              {adminPanel === "restaurant" ? (
                <>
              <label className="text-sm font-semibold text-ink">
                {t("admin.name")}
                <input
                  className="control mt-1 w-full"
                  value={restaurantForm.name}
	                  onChange={(event) =>
	                    setRestaurantForm((current) => ({
	                      ...current,
	                      name: event.target.value,
	                      slug: slugify(event.target.value)
	                    }))
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
                {t("admin.phone")}
                <input
                  className="control mt-1 w-full"
                  type="tel"
                  value={restaurantForm.phone}
                  onChange={(event) =>
                    setRestaurantForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
                </>
              ) : null}
              {adminPanel === "hours" ? (
              <div className="rounded-md border border-ink/10 bg-linen p-3">
                <p className="mb-3 text-sm font-bold text-ink">{t("admin.openingHours")}</p>
                <div className="grid gap-2">
                  {dayKeys.map((day) => {
                    const hours = openingHoursDraft[day] ?? defaultOpeningHours()[day];

                    return (
                      <div
                        key={day}
                        className="grid gap-3 rounded-md border border-ink/10 bg-white/70 p-3"
                      >
                        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <input
                            className="h-4 w-4 accent-moss"
                            type="checkbox"
                            checked={!hours.closed}
                            onChange={(event) => updateOpeningHour(day, { closed: !event.target.checked })}
                          />
                          {t(`day.${day}`)}
                        </label>
                        <div className="grid gap-2 sm:grid-cols-[1fr_minmax(0,92px)_minmax(0,92px)] sm:items-end">
                          <p className="text-xs font-bold uppercase text-ink/50">{t("admin.firstService")}</p>
                          <select
                            className="control h-10 w-full min-w-0"
                            disabled={hours.closed}
                            value={hours.open}
                            onChange={(event) => updateOpeningHour(day, { open: event.target.value })}
                          >
                            {timeOptions.map((time) => (
                              <option key={`${day}-open-${time}`} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                          <select
                            className="control h-10 w-full min-w-0"
                            disabled={hours.closed}
                            value={hours.close}
                            onChange={(event) => updateOpeningHour(day, { close: event.target.value })}
                          >
                            {timeOptions.map((time) => (
                              <option key={`${day}-close-${time}`} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <input
                            className="h-4 w-4 accent-moss"
                            type="checkbox"
                            disabled={hours.closed}
                            checked={Boolean(hours.secondServiceEnabled)}
                            onChange={(event) =>
                              updateOpeningHour(day, {
                                secondServiceEnabled: event.target.checked,
                                secondOpen: hours.secondOpen ?? "19:00",
                                secondClose: hours.secondClose ?? "23:00"
                              })
                            }
                          />
                          {t("admin.enableSecondService")}
                        </label>
                        {hours.secondServiceEnabled ? (
                          <div className="grid gap-2 sm:grid-cols-[1fr_minmax(0,92px)_minmax(0,92px)] sm:items-end">
                            <p className="text-xs font-bold uppercase text-ink/50">{t("admin.secondService")}</p>
                            <select
                              className="control h-10 w-full min-w-0"
                              disabled={hours.closed}
                              value={hours.secondOpen ?? "19:00"}
                              onChange={(event) => updateOpeningHour(day, { secondOpen: event.target.value })}
                            >
                              {timeOptions.map((time) => (
                                <option key={`${day}-second-open-${time}`} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                            <select
                              className="control h-10 w-full min-w-0"
                              disabled={hours.closed}
                              value={hours.secondClose ?? "23:00"}
                              onChange={(event) => updateOpeningHour(day, { secondClose: event.target.value })}
                            >
                              {timeOptions.map((time) => (
                                <option key={`${day}-second-close-${time}`} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              ) : null}
              {adminPanel === "rules" ? (
                <>
              <div className="rounded-md border border-ink/10 bg-linen p-3">
                <p className="mb-3 text-sm font-bold text-ink">{t("admin.settings")}</p>
                <div className="grid gap-3">
                  <label className="text-sm font-semibold text-ink">
                    {t("admin.reservationDuration")}
                    <select
                      className="control mt-1 w-full"
                      value={reservationDurationMinutes}
                      onChange={(event) =>
                        updateRestaurantSetting("reservationDurationMinutes", Number(event.target.value))
                      }
                    >
                      {reservationDurationOptions.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {t("admin.durationMinutes", { count: minutes })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-start justify-between gap-3 text-sm font-semibold text-ink">
                    <span>{t("admin.minimumLeadTime")}</span>
                    <input
                      className="h-5 w-5 shrink-0 accent-moss"
                      type="checkbox"
                      checked={minimumLeadTimeEnabled}
                      onChange={(event) =>
                        updateRestaurantSetting("minimumLeadTimeEnabled", event.target.checked)
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-md border border-ink/10 bg-linen p-3">
                <p className="mb-2 text-sm font-bold text-ink">{t("admin.bookingRules")}</p>
                <label className="flex items-start justify-between gap-3 text-sm font-semibold text-ink">
                  <span>{t("admin.oneReservationPerService")}</span>
                  <input
                    className="h-5 w-5 shrink-0 accent-moss"
                    type="checkbox"
                    checked={releaseTableAfterDuration}
                    onChange={(event) =>
                      updateRestaurantSetting("oneReservationPerTablePerService", event.target.checked)
                    }
                  />
                </label>
                <label className="mt-3 flex items-start justify-between gap-3 border-t border-ink/10 pt-3 text-sm font-semibold text-ink">
                  <span>{t("admin.strictCapacityMatching")}</span>
                  <input
                    className="h-5 w-5 shrink-0 accent-moss"
                    type="checkbox"
                    checked={strictCapacityMatching}
                    onChange={(event) =>
                      updateRestaurantSetting("strictCapacityMatching", event.target.checked)
                    }
                  />
                </label>
              </div>
                </>
              ) : null}
              {adminPanel === "vacations" ? (
                <div className="rounded-md border border-ink/10 bg-linen p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-ink">{t("admin.vacations")}</p>
                    <button
                      className="secondary-button h-9 px-3 text-xs"
                      type="button"
                      onClick={addVacationClosure}
                    >
                      <Plus className="h-4 w-4" />
                      {t("admin.addVacation")}
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {vacationClosures.map((closure) => (
                      <div key={closure.id} className="grid gap-2 rounded-md border border-ink/10 bg-white p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-sm font-semibold text-ink">
                            {t("admin.vacationStart")}
                            <input
                              className="control mt-1 w-full"
                              type="date"
                              value={closure.startDate}
                              onChange={(event) =>
                                updateVacationClosure(closure.id, { startDate: event.target.value })
                              }
                            />
                          </label>
                          <label className="text-sm font-semibold text-ink">
                            {t("admin.vacationEnd")}
                            <input
                              className="control mt-1 w-full"
                              type="date"
                              value={closure.endDate}
                              onChange={(event) =>
                                updateVacationClosure(closure.id, { endDate: event.target.value })
                              }
                            />
                          </label>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                          <label className="text-sm font-semibold text-ink">
                            {t("admin.vacationLabel")}
                            <input
                              className="control mt-1 w-full"
                              value={closure.label ?? ""}
                              onChange={(event) =>
                                updateVacationClosure(closure.id, { label: event.target.value })
                              }
                            />
                          </label>
                          <button
                            className="icon-button h-10 w-10"
                            title={t("admin.removeVacation")}
                            type="button"
                            onClick={() => removeVacationClosure(closure.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {vacationClosures.length === 0 ? (
                      <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink/60">
                        {t("admin.noVacations")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {restaurantFormError || saveRestaurantMutation.error ? (
                <p className="text-sm font-semibold text-red-700">
                  {restaurantFormError ?? saveRestaurantMutation.error?.message}
                </p>
              ) : null}
              {restaurantSaved ? (
                <p className="text-sm font-bold text-moss">{t("admin.savedChanges")}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="primary-button"
                  type="button"
                  disabled={saveRestaurantMutation.isPending || !restaurantForm.name}
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
          ) : null}

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="grid grid-cols-3 gap-2">
              <Metric label={t("admin.reservationsMetric")} value={analytics?.reservations ?? 0} />
              <Metric label={t("admin.seatsMetric")} value={analytics?.reservedSeats ?? 0} />
              <Metric label={t("admin.occupancyMetric")} value={`${analytics?.occupancyRate ?? 0}%`} />
            </div>
          </div>

          {adminPanel === "tables" ? (
          <div className="space-y-4">
          <form className="overflow-hidden rounded-lg border border-ink/10 bg-white p-4 shadow-soft" onSubmit={handleCreateTable}>
            <h2 className="mb-3 text-base font-bold text-ink">{t("admin.addTable")}</h2>
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
              <label className="text-sm font-semibold text-ink">
                {t("admin.shape")}
                <select
                  className="control mt-1 w-full"
                  disabled={restaurant?.layoutLocked}
                  value={tableForm.shape}
                  onChange={(event) =>
                    setTableForm((current) => ({
                      ...current,
                      shape: event.target.value as TableShape
                    }))
                  }
                >
                  <option value="ROUND">{t("shape.ROUND")}</option>
                  <option value="SQUARE">{t("shape.SQUARE")}</option>
                  <option value="RECTANGLE">{t("shape.RECTANGLE")}</option>
                </select>
              </label>
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

          <div className="overflow-hidden rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
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
                  {t("admin.shape")}
                  <select
                    className="control mt-1 w-full"
                    disabled={restaurant?.layoutLocked}
                    value={selectedTable.shape ?? "ROUND"}
                    onChange={(event) => {
                      const shape = event.target.value;

                      if (isTableShape(shape)) {
                        void persistTableShape(selectedTable.id, shape).catch((error) => {
                          setRestaurantFormError(
                            error instanceof Error ? error.message : t("admin.invalidJson")
                          );
                        });
                      }
                    }}
                  >
                    <option value="ROUND">{t("shape.ROUND")}</option>
                    <option value="SQUARE">{t("shape.SQUARE")}</option>
                    <option value="RECTANGLE">{t("shape.RECTANGLE")}</option>
                  </select>
                </label>
                <div className="rounded-md border border-ink/10 bg-linen p-3">
                  <p className="text-sm font-bold text-ink">{t("admin.tableTools")}</p>
                  <div className="mt-3 grid gap-2">
                    {tableFeatures.map((feature) => (
                      <label
                        key={feature}
                        className="flex items-start justify-between gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink"
                      >
                        <span>{t(`feature.${feature}`)}</span>
                        <input
                          className="h-5 w-5 shrink-0 accent-moss"
                          type="checkbox"
                          checked={selectedTableFeatures.includes(feature)}
                          disabled={restaurant?.layoutLocked}
                          onChange={(event) => {
                            const nextFeatures = event.target.checked
                              ? [...selectedTableFeatures, feature]
                              : selectedTableFeatures.filter((item) => item !== feature);

                            void persistTableFeatures(selectedTable.id, nextFeatures).catch((error) => {
                              setRestaurantFormError(
                                error instanceof Error ? error.message : t("admin.invalidJson")
                              );
                            });
                          }}
                        />
                      </label>
                    ))}
                  </div>
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
          </div>
          ) : null}

          {adminPanel === "blocks" ? (
          <div className="overflow-hidden rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-base font-bold text-ink">{t("admin.blocks")}</h2>
            <p className="mb-3 rounded-md bg-linen p-3 text-sm font-semibold text-ink/65">
              {t("admin.blocksHint")}
            </p>
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-ink">
                {t("admin.selectedTable")}
                <select
                  className="control mt-1 w-full"
                  value={selectedTableId ?? ""}
                  onChange={(event) => setSelectedTableId(event.target.value || undefined)}
                >
                  <option value="">{t("admin.noTableSelected")}</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.label} · {table.capacity} {t("common.guests")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-ink">
                {t("booking.date")}
                <input
                  className="control mt-1 w-full"
                  type="date"
                  value={blockForm.date}
                  onChange={(event) => setBlockForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink">
                  {t("booking.firstName")}
                  <input
                    className="control mt-1 w-full"
                    value={blockForm.customerFirstName}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, customerFirstName: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("booking.lastName")}
                  <input
                    className="control mt-1 w-full"
                    value={blockForm.customerLastName}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, customerLastName: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink">
                  {t("booking.email")}
                  <input
                    className="control mt-1 w-full"
                    type="email"
                    value={blockForm.customerEmail}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, customerEmail: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-ink">
                  {t("booking.phone")}
                  <input
                    className="control mt-1 w-full"
                    type="tel"
                    value={blockForm.customerPhone}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, customerPhone: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="text-sm font-semibold text-ink">
                {t("booking.notes")}
                <textarea
                  className="control mt-1 min-h-20 w-full py-2"
                  value={blockForm.notes}
                  onChange={(event) => setBlockForm((current) => ({ ...current, notes: event.target.value }))}
                />
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
                    <div>
                      <p className="font-bold text-ink">
                        {String(block.date).slice(0, 10)} · {block.startTime}-{block.endTime} ·{" "}
                        {t(`reason.${block.reason}`)}
                      </p>
                      {block.customerFirstName || block.customerLastName || block.customerEmail || block.customerPhone ? (
                        <p className="text-xs font-semibold text-ink/55">
                          {[block.customerFirstName, block.customerLastName].filter(Boolean).join(" ")}
                          {block.customerEmail ? ` · ${block.customerEmail}` : ""}
                          {block.customerPhone ? ` · ${block.customerPhone}` : ""}
                        </p>
                      ) : null}
                      {block.notes ? <p className="text-xs text-ink/60">{block.notes}</p> : null}
                    </div>
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
          ) : null}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-soft">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid grid-cols-2 rounded-md border border-ink/10 bg-linen p-1 sm:w-56">
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="icon-button"
                  title={restaurant?.layoutLocked ? t("admin.unlock") : t("admin.lock")}
                  type="button"
                  disabled={!restaurant}
                  onClick={() => toggleLayoutMutation.mutate()}
                >
                  {restaurant?.layoutLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </button>
                <button
                  className="icon-button"
                  title={t("admin.addTable")}
                  type="button"
                  disabled={!restaurant || restaurant.layoutLocked || createTableMutation.isPending}
                  onClick={handleQuickCreateTable}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  className={`icon-button ${deleteMode ? "border-red-200 bg-red-50 text-red-700" : ""}`}
                  title={t("admin.deleteMode")}
                  type="button"
                  disabled={!restaurant || restaurant.layoutLocked}
                  onClick={() => setDeleteMode((current) => !current)}
                >
                  <Minus className="h-4 w-4" />
                </button>
                {floorViewMode === "3d" ? (
                  <label className="ml-1 min-w-48 text-sm font-semibold text-ink">
                    {t("floor.zoom")}
                    <input
                      className="mt-1 w-full accent-moss"
                      min={60}
                      max={180}
                      step={5}
                      type="range"
                      value={Math.round(floorZoom * 100)}
                      onChange={(event) => setFloorZoom(Number(event.target.value) / 100)}
                    />
                  </label>
                ) : null}
              </div>
            </div>
            {floorViewMode === "3d" ? (
              <div className="mt-3 rounded-md border border-ink/10 bg-linen p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                    <Sparkles className="h-4 w-4 text-moss" />
                    {t("admin.glbAi")}
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-ink">
                    {t("admin.detectedTables", { count: detectedGlbTables.length })}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label
                    className={`secondary-button cursor-pointer ${
                      !restaurant || uploadGlbModelMutation.isPending ? "opacity-60" : ""
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    {uploadGlbModelMutation.isPending ? t("admin.uploadingGlb") : t("admin.uploadGlb")}
                    <input
                      className="sr-only"
                      type="file"
                      accept=".glb,model/gltf-binary"
                      disabled={!restaurant || uploadGlbModelMutation.isPending}
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          uploadGlbModelMutation.mutate(file);
                          event.currentTarget.value = "";
                        }
                      }}
                    />
                  </label>
                  <button
                    className="secondary-button"
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
                  <p className="text-xs font-medium text-ink/60">
                    {detectedGlbTables.length > 0 ? t("admin.glbDetectedHint") : t("admin.noGlbTables")}
                  </p>
                </div>
                {syncGlbTablesMutation.error ? (
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    {syncGlbTablesMutation.error.message}
                  </p>
                ) : null}
                {uploadGlbModelMutation.error ? (
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    {uploadGlbModelMutation.error.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <FloorPlan
            mode="admin"
            viewMode={floorViewMode}
            zoom={floorZoom}
            tables={visualTables}
            selectedTableId={selectedTableId}
            layoutLocked={restaurant?.layoutLocked}
            deleteMode={deleteMode}
            modelUrl={floorPlanModelUrl}
            onSelect={(table) => setSelectedTableId(table.id)}
            onMove={(tableId, position) =>
              updateTableMutation.mutate({
                tableId,
                data: position
              })
            }
            onDelete={(tableId) => deleteTableMutation.mutate(tableId)}
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
            <SpecialRequestsLegend />

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

function defaultOpeningHours(): OpeningHours {
  return {
    monday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    tuesday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    wednesday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    thursday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "22:00" },
    friday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "23:00" },
    saturday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "23:00" },
    sunday: { open: "12:00", close: "14:00", secondServiceEnabled: true, secondOpen: "19:00", secondClose: "21:00" }
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildRestaurantSlug(name: string, fallback?: string) {
  return slugify(name) || fallback || "restaurant";
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

function SpecialRequestsLegend() {
  const { t } = useI18n();

  return (
    <div className="mb-4 flex flex-wrap gap-2 rounded-md bg-linen p-2 text-xs font-bold text-ink/65">
      <span className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1">
        <Milk className="h-3.5 w-3.5 text-moss" />
        {t("request.highChair")}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1">
        <CakeSlice className="h-3.5 w-3.5 text-clay" />
        {t("request.birthday")}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1">
        <Heart className="h-3.5 w-3.5 text-red-600" />
        {t("request.romanticDinner")}
      </span>
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
  const specialRequests = [
    {
      active: reservation.highChair,
      label: t("request.highChair"),
      icon: <Milk className="h-3.5 w-3.5" />,
      className: "bg-moss/10 text-moss"
    },
    {
      active: reservation.birthday,
      label: t("request.birthday"),
      icon: <CakeSlice className="h-3.5 w-3.5" />,
      className: "bg-clay/10 text-clay"
    },
    {
      active: reservation.romanticDinner,
      label: t("request.romanticDinner"),
      icon: <Heart className="h-3.5 w-3.5" />,
      className: "bg-red-50 text-red-700"
    }
  ].filter((item) => item.active);

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
        {specialRequests.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {specialRequests.map((request) => (
              <span
                key={request.label}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold ${request.className}`}
                title={request.label}
              >
                {request.icon}
                {request.label}
              </span>
            ))}
          </div>
        ) : null}
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
