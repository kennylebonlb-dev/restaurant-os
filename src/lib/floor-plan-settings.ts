import { tableFeatures, type FloorTable, type TableFeature, type TableShape } from "@/lib/domain";

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

export function applyFloorPlanSettings(
  tables: FloorTable[],
  settings?: Record<string, unknown> | null
) {
  const shapes = tableShapesFromSettings(settings);
  const features = tableFeaturesFromSettings(settings);

  return tables.map((table) => ({
    ...table,
    features: features[table.id] ?? table.features ?? [],
    shape: shapes[table.id] ?? table.shape ?? "ROUND"
  }));
}

export function floorPlanModelUrlFromSettings(settings?: Record<string, unknown> | null) {
  const modelUrl = settings?.floorPlanModelDataUrl;

  return typeof modelUrl === "string" && modelUrl.startsWith("data:")
    ? modelUrl
    : undefined;
}
