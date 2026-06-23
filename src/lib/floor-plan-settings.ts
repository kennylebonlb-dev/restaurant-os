import {
  tableFeatures,
  type FloorRoom,
  type FloorTable,
  type TableAutoAssignPriority,
  type TableCombination,
  type TableFeature,
  type TableShape,
  type TableViewImageCrop
} from "@/lib/domain";

const DEFAULT_2D_PLAN_IMAGE = "/floor-plans/restaurant-2d.png";
const MIN_TABLE_DISPLAY_SCALE = 0.5;
const MAX_TABLE_DISPLAY_SCALE = 2.4;
const DEFAULT_TABLE_VIEW_IMAGE_CROP: TableViewImageCrop = { x: 50, y: 50, zoom: 1 };
const MIN_TABLE_VIEW_IMAGE_ZOOM = 1;
const MAX_TABLE_VIEW_IMAGE_ZOOM = 2.4;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.round(Math.min(max, Math.max(min, numericValue)) * 100) / 100;
}

export function isTableShape(value: unknown): value is TableShape {
  return value === "ROUND" || value === "SQUARE" || value === "RECTANGLE";
}

export function isTableFeature(value: unknown): value is TableFeature {
  return tableFeatures.some((feature) => feature === value);
}

export function isTableAutoAssignPriority(value: unknown): value is TableAutoAssignPriority {
  return value === "DISABLED" || value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

export function tableShapesFromSettings(settings?: Record<string, unknown> | null) {
  const tableShapes = settings?.tableShapes;

  if (!tableShapes || typeof tableShapes !== "object" || Array.isArray(tableShapes)) {
    return {};
  }

  return Object.entries(tableShapes).reduce<Record<string, TableShape>>((shapes, [tableId, shape]) => {
    if (isTableShape(shape)) {
      shapes[tableId] = shape;
    }

    return shapes;
  }, {});
}

export function tableFeaturesFromSettings(settings?: Record<string, unknown> | null) {
  const tableFeaturesById = settings?.tableFeatures;

  if (!tableFeaturesById || typeof tableFeaturesById !== "object" || Array.isArray(tableFeaturesById)) {
    return {};
  }

  return Object.entries(tableFeaturesById).reduce<Record<string, TableFeature[]>>((features, [tableId, value]) => {
    if (!Array.isArray(value)) {
      return features;
    }

    const validFeatures = value.filter(isTableFeature);

    if (validFeatures.length > 0) {
      features[tableId] = validFeatures;
    }

    return features;
  }, {});
}

export function normalizeTableDisplayScale(value: unknown) {
  return clampNumber(value, MIN_TABLE_DISPLAY_SCALE, MAX_TABLE_DISPLAY_SCALE, 1);
}

export function defaultTableViewImageCrop(): TableViewImageCrop {
  return { ...DEFAULT_TABLE_VIEW_IMAGE_CROP };
}

export function normalizeTableViewImageCrop(value: unknown): TableViewImageCrop {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultTableViewImageCrop();
  }

  const record = value as Record<string, unknown>;

  return {
    x: clampNumber(record.x, 0, 100, DEFAULT_TABLE_VIEW_IMAGE_CROP.x),
    y: clampNumber(record.y, 0, 100, DEFAULT_TABLE_VIEW_IMAGE_CROP.y),
    zoom: clampNumber(
      record.zoom,
      MIN_TABLE_VIEW_IMAGE_ZOOM,
      MAX_TABLE_VIEW_IMAGE_ZOOM,
      DEFAULT_TABLE_VIEW_IMAGE_CROP.zoom
    )
  };
}

export function tableViewImageStyle(crop?: TableViewImageCrop) {
  const normalizedCrop = normalizeTableViewImageCrop(crop);

  return {
    objectPosition: `${normalizedCrop.x}% ${normalizedCrop.y}%`,
    transform: `scale(${normalizedCrop.zoom})`,
    transformOrigin: `${normalizedCrop.x}% ${normalizedCrop.y}%`
  };
}

export function tableDisplayScalesFromSettings(settings?: Record<string, unknown> | null) {
  const tableDisplayScales = settings?.tableDisplayScales;

  if (
    !tableDisplayScales ||
    typeof tableDisplayScales !== "object" ||
    Array.isArray(tableDisplayScales)
  ) {
    return {};
  }

  return Object.entries(tableDisplayScales).reduce<Record<string, number>>((sizes, [tableId, value]) => {
    const displayScale = normalizeTableDisplayScale(value);

    if (displayScale !== 1) {
      sizes[tableId] = displayScale;
    }

    return sizes;
  }, {});
}

export function tableViewImagesFromSettings(settings?: Record<string, unknown> | null) {
  const tableViewImages = settings?.tableViewImages;

  if (!tableViewImages || typeof tableViewImages !== "object" || Array.isArray(tableViewImages)) {
    return {};
  }

  return Object.entries(tableViewImages).reduce<Record<string, string>>((images, [tableId, value]) => {
    if (typeof value === "string" && value.startsWith("data:")) {
      images[tableId] = value;
    }

    return images;
  }, {});
}

export function tableViewImageCropsFromSettings(settings?: Record<string, unknown> | null) {
  const tableViewImageCrops = settings?.tableViewImageCrops;

  if (!tableViewImageCrops || typeof tableViewImageCrops !== "object" || Array.isArray(tableViewImageCrops)) {
    return {};
  }

  return Object.entries(tableViewImageCrops).reduce<Record<string, TableViewImageCrop>>(
    (crops, [tableId, value]) => {
      crops[tableId] = normalizeTableViewImageCrop(value);
      return crops;
    },
    {}
  );
}

export function tableAutoAssignPrioritiesFromSettings(settings?: Record<string, unknown> | null) {
  const tablePriorities = settings?.tableAutoAssignPriorities;

  if (!tablePriorities || typeof tablePriorities !== "object" || Array.isArray(tablePriorities)) {
    return {};
  }

  return Object.entries(tablePriorities).reduce<Record<string, TableAutoAssignPriority>>(
    (priorities, [tableId, priority]) => {
      if (isTableAutoAssignPriority(priority)) {
        priorities[tableId] = priority;
      }

      return priorities;
    },
    {}
  );
}

export function tableCombinationsFromSettings(settings?: Record<string, unknown> | null): TableCombination[] {
  const combinations = settings?.tableCombinations;

  if (!Array.isArray(combinations)) {
    return [];
  }

  return combinations
    .map((combination): TableCombination | null => {
      if (!combination || typeof combination !== "object" || Array.isArray(combination)) {
        return null;
      }

      const record = combination as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const label = typeof record.label === "string" ? record.label : "";
      const tableIds = Array.isArray(record.tableIds)
        ? record.tableIds.filter((tableId): tableId is string => typeof tableId === "string")
        : [];
      const placement =
        record.placement === "LEFT" || record.placement === "BOTTOM" || record.placement === "TOP"
          ? record.placement
          : "RIGHT";

      if (!id || !label || tableIds.length < 2) {
        return null;
      }

      return {
        id,
        label,
        tableIds: Array.from(new Set(tableIds)),
        placement
      };
    })
    .filter((combination): combination is TableCombination => Boolean(combination));
}

export function tableBasePositionsFromSettings(settings?: Record<string, unknown> | null) {
  const basePositions = settings?.tableBasePositions;

  if (!basePositions || typeof basePositions !== "object" || Array.isArray(basePositions)) {
    return {} as Record<string, { positionX: number; positionY: number }>;
  }

  return Object.entries(basePositions as Record<string, unknown>).reduce<Record<string, { positionX: number; positionY: number }>>(
    (positions, [tableId, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return positions;
      }

      const record = value as Record<string, unknown>;

      if (typeof record.positionX === "number" && typeof record.positionY === "number") {
        positions[tableId] = {
          positionX: record.positionX,
          positionY: record.positionY
        };
      }

      return positions;
    },
    {}
  );
}

export function defaultTableDisplayScaleFromSettings(settings?: Record<string, unknown> | null) {
  return normalizeTableDisplayScale(settings?.defaultTableDisplayScale);
}

export function tableDisplayScaleLockedFromSettings(settings?: Record<string, unknown> | null) {
  return settings?.lockTableDisplayScale === true;
}

export function withTableShape(
  settings: Record<string, unknown>,
  tableId: string,
  shape: TableShape
) {
  return {
    ...settings,
    tableShapes: {
      ...tableShapesFromSettings(settings),
      [tableId]: shape
    }
  };
}

export function withTableFeatures(
  settings: Record<string, unknown>,
  tableId: string,
  features: TableFeature[]
) {
  return {
    ...settings,
    tableFeatures: {
      ...tableFeaturesFromSettings(settings),
      [tableId]: features
    }
  };
}

export function withTableDisplayScale(
  settings: Record<string, unknown>,
  tableId: string,
  displayScale: number
) {
  return {
    ...settings,
    tableDisplayScales: {
      ...tableDisplayScalesFromSettings(settings),
      [tableId]: normalizeTableDisplayScale(displayScale)
    }
  };
}

export function withTableViewImage(
  settings: Record<string, unknown>,
  tableId: string,
  imageUrl: string
) {
  return {
    ...settings,
    tableViewImages: {
      ...tableViewImagesFromSettings(settings),
      [tableId]: imageUrl
    }
  };
}

export function withTableViewImageCrop(
  settings: Record<string, unknown>,
  tableId: string,
  crop: TableViewImageCrop
) {
  return {
    ...settings,
    tableViewImageCrops: {
      ...tableViewImageCropsFromSettings(settings),
      [tableId]: normalizeTableViewImageCrop(crop)
    }
  };
}

export function withTableAutoAssignPriority(
  settings: Record<string, unknown>,
  tableId: string,
  priority: TableAutoAssignPriority
) {
  return {
    ...settings,
    tableAutoAssignPriorities: {
      ...tableAutoAssignPrioritiesFromSettings(settings),
      [tableId]: priority
    }
  };
}

export function withTableCombinations(
  settings: Record<string, unknown>,
  combinations: TableCombination[]
) {
  return {
    ...settings,
    tableCombinations: combinations
      .map((combination) => ({
        ...combination,
        tableIds: Array.from(new Set(combination.tableIds))
      }))
      .filter((combination) => combination.label.trim() && combination.tableIds.length >= 2)
  };
}

export function withTableBasePosition(
  settings: Record<string, unknown>,
  tableId: string,
  position: { positionX: number; positionY: number }
) {
  return {
    ...settings,
    tableBasePositions: {
      ...tableBasePositionsFromSettings(settings),
      [tableId]: {
        positionX: position.positionX,
        positionY: position.positionY
      }
    }
  };
}

export function withDefaultTableDisplayScale(
  settings: Record<string, unknown>,
  displayScale: number,
  locked = true
) {
  return {
    ...settings,
    defaultTableDisplayScale: normalizeTableDisplayScale(displayScale),
    lockTableDisplayScale: locked
  };
}

export function defaultFloorRoom(): FloorRoom {
  return {
    id: "main-room",
    name: "Salle principale",
    type: "MAIN",
    active: true
  };
}

export function floorRoomsFromSettings(settings?: Record<string, unknown> | null): FloorRoom[] {
  const value = settings?.floorPlanRooms;

  if (!Array.isArray(value)) {
    return [defaultFloorRoom()];
  }

  const rooms = value
    .filter((room): room is Record<string, unknown> => Boolean(room) && typeof room === "object")
    .map((room, index): FloorRoom => {
      const type = room.type === "FLOOR" || room.type === "TERRACE" || room.type === "PRIVATE" || room.type === "ROOFTOP"
        ? room.type
        : index === 0 ? "MAIN" : "FLOOR";

      return {
        id: typeof room.id === "string" && room.id.trim() ? room.id : `room-${index + 1}`,
        name: typeof room.name === "string" && room.name.trim() ? room.name : `Salle ${index + 1}`,
        type,
        active: room.active !== false,
        activeEndDate: typeof room.activeEndDate === "string" ? room.activeEndDate : undefined,
        activeEndTime: typeof room.activeEndTime === "string" ? room.activeEndTime : undefined,
        activeStartDate: typeof room.activeStartDate === "string" ? room.activeStartDate : undefined,
        activeStartTime: typeof room.activeStartTime === "string" ? room.activeStartTime : undefined,
        draftStatus: room.draftStatus === "DRAFT" ? "DRAFT" : "PUBLISHED",
        locked: room.locked === true,
        plan2dDataUrl: typeof room.plan2dDataUrl === "string" && room.plan2dDataUrl.startsWith("data:") ? room.plan2dDataUrl : undefined,
        modelDataUrl: typeof room.modelDataUrl === "string" && room.modelDataUrl.startsWith("data:") ? room.modelDataUrl : undefined,
        scheduleEnabled: room.scheduleEnabled === true
      };
    });

  return rooms.length > 0 ? rooms : [defaultFloorRoom()];
}

export function tableRoomsFromSettings(settings?: Record<string, unknown> | null) {
  const value = settings?.tableRooms;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>((rooms, [tableId, roomId]) => {
    if (typeof roomId === "string" && roomId.trim()) {
      rooms[tableId] = roomId;
    }

    return rooms;
  }, {});
}

export function applyFloorPlanSettings(
  tables: FloorTable[],
  settings?: Record<string, unknown> | null
) {
  const shapes = tableShapesFromSettings(settings);
  const features = tableFeaturesFromSettings(settings);
  const displayScales = tableDisplayScalesFromSettings(settings);
  const viewImages = tableViewImagesFromSettings(settings);
  const viewImageCrops = tableViewImageCropsFromSettings(settings);
  const priorities = tableAutoAssignPrioritiesFromSettings(settings);

  return tables.map((table) => ({
    ...table,
    features: features[table.id] ?? table.features ?? [],
    shape: shapes[table.id] ?? table.shape ?? "ROUND",
    displayScale: displayScales[table.id] ?? table.displayScale ?? 1,
    viewImageUrl: viewImages[table.id] ?? table.viewImageUrl,
    viewImageCrop: viewImageCrops[table.id] ?? table.viewImageCrop,
    autoAssignPriority: priorities[table.id] ?? table.autoAssignPriority ?? "DISABLED"
  }));
}

export function floorPlanModelUrlFromSettings(settings?: Record<string, unknown> | null) {
  const modelUrl = settings?.floorPlanModelDataUrl;

  return typeof modelUrl === "string" && modelUrl.startsWith("data:")
    ? modelUrl
    : undefined;
}

export function floorPlan2dImageUrlFromSettings(settings?: Record<string, unknown> | null) {
  const imageUrl = settings?.floorPlan2dImageDataUrl;

  return typeof imageUrl === "string" && imageUrl.startsWith("data:")
    ? imageUrl
    : DEFAULT_2D_PLAN_IMAGE;
}
