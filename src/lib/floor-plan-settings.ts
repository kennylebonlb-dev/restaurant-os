import {
  tableFeatures,
  type FloorTable,
  type TableAutoAssignPriority,
  type TableCombination,
  type TableFeature,
  type TableShape
} from "@/lib/domain";

const DEFAULT_2D_PLAN_IMAGE = "/floor-plans/restaurant-2d.png";
const MIN_TABLE_DISPLAY_SCALE = 0.6;
const MAX_TABLE_DISPLAY_SCALE = 1.8;

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
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Math.round(
    Math.min(MAX_TABLE_DISPLAY_SCALE, Math.max(MIN_TABLE_DISPLAY_SCALE, numericValue)) * 100
  ) / 100;
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

      if (!id || !label || tableIds.length < 2) {
        return null;
      }

      return {
        id,
        label,
        tableIds: Array.from(new Set(tableIds))
      };
    })
    .filter((combination): combination is TableCombination => Boolean(combination));
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

export function applyFloorPlanSettings(
  tables: FloorTable[],
  settings?: Record<string, unknown> | null
) {
  const shapes = tableShapesFromSettings(settings);
  const features = tableFeaturesFromSettings(settings);
  const displayScales = tableDisplayScalesFromSettings(settings);
  const viewImages = tableViewImagesFromSettings(settings);
  const priorities = tableAutoAssignPrioritiesFromSettings(settings);

  return tables.map((table) => ({
    ...table,
    features: features[table.id] ?? table.features ?? [],
    shape: shapes[table.id] ?? table.shape ?? "ROUND",
    displayScale: displayScales[table.id] ?? table.displayScale ?? 1,
    viewImageUrl: viewImages[table.id] ?? table.viewImageUrl,
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
