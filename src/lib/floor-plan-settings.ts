import type { FloorTable, TableShape } from "@/lib/domain";

export function isTableShape(value: unknown): value is TableShape {
  return value === "ROUND" || value === "SQUARE" || value === "RECTANGLE";
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

export function applyFloorPlanSettings(
  tables: FloorTable[],
  settings?: Record<string, unknown> | null
) {
  const shapes = tableShapesFromSettings(settings);

  return tables.map((table) => ({
    ...table,
    shape: shapes[table.id] ?? table.shape ?? "ROUND"
  }));
}

export function floorPlanModelUrlFromSettings(settings?: Record<string, unknown> | null) {
  const modelUrl = settings?.floorPlanModelDataUrl;

  return typeof modelUrl === "string" && modelUrl.startsWith("data:")
    ? modelUrl
    : undefined;
}
