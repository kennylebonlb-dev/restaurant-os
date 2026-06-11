import { tableFeatures, type FloorTable, type TableFeature, type TableShape } from "@/lib/domain";

const DEFAULT_2D_PLAN_IMAGE = "/floor-plans/restaurant-2d.png";
const MIN_TABLE_DISPLAY_SCALE = 0.6;
const MAX_TABLE_DISPLAY_SCALE = 1.8;

export function isTableShape(value: unknown): value is TableShape {
  return value === "ROUND" || value === "SQUARE" || value === "RECTANGLE";
}

export function isTableFeature(value: unknown): value is TableFeature {
  return tableFeatures.some((feature) => feature === value);
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

export function applyFloorPlanSettings(
  tables: FloorTable[],
  settings?: Record<string, unknown> | null
) {
  const shapes = tableShapesFromSettings(settings);
  const features = tableFeaturesFromSettings(settings);
  const displayScales = tableDisplayScalesFromSettings(settings);

  return tables.map((table) => ({
    ...table,
    features: features[table.id] ?? table.features ?? [],
    shape: shapes[table.id] ?? table.shape ?? "ROUND",
    displayScale: displayScales[table.id] ?? table.displayScale ?? 1
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
