"use client";

import clsx from "clsx";
import { Armchair, Copy, Eye, Lock, RotateCw, Trash2, X } from "lucide-react";
import { PointerEvent, useEffect, useRef, useState } from "react";
import { FloorPlan3D } from "@/components/floor-plan/floor-plan-3d";
import type { DetectedGlbTable, FloorTable, TableShape } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

const PLAN_WIDTH = 960;
const PLAN_HEIGHT = 560;

type FloorPlanProps = {
  tables: FloorTable[];
  mode: "booking" | "admin";
  viewMode?: "2d" | "3d";
  zoom?: number;
  selectedTableId?: string;
  availableTableIds?: string[];
  layoutLocked?: boolean;
  deleteMode?: boolean;
  modelUrl?: string;
  backgroundImageUrl?: string;
  onSelect?: (table: FloorTable) => void;
  onMove?: (tableId: string, position: { positionX: number; positionY: number }) => void;
  onDelete?: (tableId: string) => void;
  onDuplicate?: (table: FloorTable) => void;
  onRotate?: (table: FloorTable) => void;
  onView?: (table: FloorTable) => void;
  onZoomChange?: (zoom: number) => void;
  onDetectedTablesChange?: (tables: DetectedGlbTable[]) => void;
};

type DragState = {
  tableId: string;
  offsetX: number;
  offsetY: number;
};

type PanState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

function tableFootprint(capacity: number, shape: TableShape = "ROUND", displayScale = 1) {
  const scale = Math.min(1.8, Math.max(0.6, displayScale));
  const applyScale = (value: number) => Math.round(value * scale);

  if (shape === "RECTANGLE") {
    const base = capacity >= 7
      ? { width: 136, height: 58, rounded: "rounded-md" }
      : { width: 112, height: 58, rounded: "rounded-md" };

    return {
      ...base,
      width: applyScale(base.width),
      height: applyScale(base.height)
    };
  }

  if (shape === "SQUARE") {
    return { width: applyScale(78), height: applyScale(78), rounded: "rounded-md" };
  }

  const base = capacity >= 7
    ? { width: 104, height: 104, rounded: "rounded-[999px]" }
    : { width: 82, height: 82, rounded: "rounded-[999px]" };

  return {
    ...base,
    width: applyScale(base.width),
    height: applyScale(base.height)
  };
}

function tableZoneTheme(zone: FloorTable["zone"]) {
  if (zone === "TERRACE") {
    return {
      background: "#fff0dc",
      border: "#c37c52",
      selected: "#b4663d",
      text: "#3f2418"
    };
  }

  if (zone === "VIP") {
    return {
      background: "#e7f0ed",
      border: "#345f53",
      selected: "#345f53",
      text: "#172a25"
    };
  }

  return {
    background: "#f7f4eb",
    border: "#6b8a71",
    selected: "#5f7f65",
    text: "#17201d"
  };
}

export function FloorPlan({
  tables,
  mode,
  viewMode = "2d",
  zoom = 1,
  selectedTableId,
  availableTableIds,
  layoutLocked = false,
  deleteMode = false,
  modelUrl,
  backgroundImageUrl,
  onSelect,
  onMove,
  onDelete,
  onDuplicate,
  onRotate,
  onView,
  onZoomChange,
  onDetectedTablesChange
}: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const optimisticPositionsRef = useRef<Record<string, { positionX: number; positionY: number }>>({});
  const [draftTables, setDraftTables] = useState(tables);
  const [twoDScale, setTwoDScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const effectiveTwoDScale = twoDScale * zoom;
  const availableSet = availableTableIds ? new Set(availableTableIds) : undefined;
  const { t } = useI18n();

  useEffect(() => {
    if (viewMode !== "2d") {
      return;
    }

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    function updateScale() {
      const width = viewport?.clientWidth ?? PLAN_WIDTH;
      setTwoDScale(Math.min(1, width / PLAN_WIDTH));
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "2d") {
      return;
    }

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [viewMode, zoom, onZoomChange, pan.x, pan.y, effectiveTwoDScale, twoDScale]);

  useEffect(() => {
    if (viewMode !== "2d") {
      return;
    }

    setPan((current) => {
      const nextPan = clampPan(current);
      return nextPan.x === current.x && nextPan.y === current.y ? current : nextPan;
    });
  }, [effectiveTwoDScale, viewMode]);

  useEffect(() => {
    const nextTables = tables.map((table) => {
      const optimisticPosition = optimisticPositionsRef.current[table.id];

      if (!optimisticPosition) {
        return table;
      }

      if (
        Math.round(table.positionX) === optimisticPosition.positionX &&
        Math.round(table.positionY) === optimisticPosition.positionY
      ) {
        delete optimisticPositionsRef.current[table.id];
        return table;
      }

      return {
        ...table,
        ...optimisticPosition
      };
    });

    setDraftTables(nextTables);
  }, [tables]);

  function clampPan(position: { x: number; y: number }, scale = effectiveTwoDScale) {
    const viewport = viewportRef.current;
    const viewportWidth = viewport?.clientWidth ?? PLAN_WIDTH;
    const viewportHeight = viewport?.clientHeight ?? PLAN_HEIGHT;
    const scaledWidth = PLAN_WIDTH * scale;
    const scaledHeight = PLAN_HEIGHT * scale;

    function clampAxis(value: number, viewportSize: number, scaledSize: number) {
      if (scaledSize <= viewportSize) {
        return (viewportSize - scaledSize) / 2;
      }

      return Math.max(viewportSize - scaledSize, Math.min(0, value));
    }

    return {
      x: clampAxis(position.x, viewportWidth, scaledWidth),
      y: clampAxis(position.y, viewportHeight, scaledHeight)
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, table: FloorTable) {
    event.stopPropagation();
    onSelect?.(table);

    if (mode !== "admin" || layoutLocked || deleteMode) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    dragRef.current = {
      tableId: table.id,
      offsetX: (event.clientX - rect.left) / effectiveTwoDScale - table.positionX,
      offsetY: (event.clientY - rect.top) / effectiveTwoDScale - table.positionY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleViewportPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleWheel(event: globalThis.WheelEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!onZoomChange || viewMode !== "2d") {
      return;
    }

    const nextZoom = Math.round(Math.min(1.8, Math.max(0.6, zoom - event.deltaY * 0.0015)) * 100) / 100;

    if (nextZoom === zoom) {
      return;
    }

    const viewport = viewportRef.current;
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      const oldScale = effectiveTwoDScale;
      const nextScale = twoDScale * nextZoom;
      const planX = (event.clientX - rect.left - pan.x) / oldScale;
      const planY = (event.clientY - rect.top - pan.y) / oldScale;
      const nextPan = clampPan(
        {
          x: event.clientX - rect.left - planX * nextScale,
          y: event.clientY - rect.top - planY * nextScale
        },
        nextScale
      );
      setPan(nextPan);
    }

    onZoomChange(nextZoom);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;

    if (drag && container) {
      const rect = container.getBoundingClientRect();
      const positionX = Math.max(
        12,
        Math.min((event.clientX - rect.left) / effectiveTwoDScale - drag.offsetX, PLAN_WIDTH - 96)
      );
      const positionY = Math.max(
        12,
        Math.min((event.clientY - rect.top) / effectiveTwoDScale - drag.offsetY, PLAN_HEIGHT - 76)
      );

      setDraftTables((current) =>
        current.map((table) =>
          table.id === drag.tableId
            ? {
                ...table,
                positionX,
                positionY
              }
            : table
        )
      );
      return;
    }

    const panState = panRef.current;

    if (!panState) {
      return;
    }

    setPan(
      clampPan({
        x: panState.originX + event.clientX - panState.startX,
        y: panState.originY + event.clientY - panState.startY
      })
    );
  }

  function handlePointerUp() {
    const drag = dragRef.current;

    if (!drag) {
      panRef.current = null;
      setIsPanning(false);
      return;
    }

    const table = draftTables.find((item) => item.id === drag.tableId);
    dragRef.current = null;

    if (table) {
      const nextPosition = {
        positionX: Math.round(table.positionX),
        positionY: Math.round(table.positionY)
      };
      optimisticPositionsRef.current[table.id] = nextPosition;
      onMove?.(table.id, {
        positionX: nextPosition.positionX,
        positionY: nextPosition.positionY
      });
    }

    panRef.current = null;
    setIsPanning(false);
  }

  return (
    <div className="max-w-full overflow-hidden rounded-lg border border-ink/10 bg-white p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{t("floor.title")}</h2>
        </div>
        {layoutLocked ? (
          <span className="inline-flex items-center gap-2 rounded-md border border-ink/10 bg-sage px-3 py-2 text-xs font-semibold text-ink">
            <Lock className="h-3.5 w-3.5" />
            {t("floor.locked")}
          </span>
        ) : null}
      </div>
      {viewMode === "3d" ? (
        <FloorPlan3D
          tables={tables}
          mode={mode}
          selectedTableId={selectedTableId}
          availableTableIds={availableTableIds}
          layoutLocked={layoutLocked}
          deleteMode={deleteMode}
          modelUrl={modelUrl}
          zoom={zoom}
          onSelect={onSelect}
          onMove={onMove}
          onDelete={onDelete}
          onView={onView}
          onDetectedTablesChange={onDetectedTablesChange}
        />
      ) : (
        <div
          ref={viewportRef}
          className={clsx(
            "relative w-full max-w-full touch-none overflow-hidden rounded-md border border-ink/10 bg-[#30302f]",
            isPanning ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ height: PLAN_HEIGHT, overscrollBehavior: "contain" }}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            ref={containerRef}
            className="absolute left-0 top-0 overflow-hidden bg-[#30302f]"
            style={{
              width: PLAN_WIDTH,
              height: PLAN_HEIGHT,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveTwoDScale})`,
              transformOrigin: "top left"
            }}
          >
          {backgroundImageUrl ? (
            <img
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
              draggable={false}
              src={backgroundImageUrl}
            />
          ) : (
            <>
              <div className="absolute left-[76px] top-[52px] h-[454px] w-[800px] rounded-sm bg-[#f4f1e9] shadow-[0_0_0_10px_rgba(255,255,255,0.88)]" />
              <div className="absolute left-[142px] top-[70px] h-[56px] w-[520px] rounded-sm bg-[#8a674d]" />
              <div className="absolute left-[150px] top-[78px] h-[40px] w-[504px] bg-[repeating-linear-gradient(90deg,#7a5843_0_22px,#957159_22px_44px)] opacity-90" />
              <div className="absolute left-[106px] top-[132px] h-[256px] w-[176px] rounded-sm bg-[#e9f0ee]" />
              <div className="absolute left-[306px] top-[134px] h-[196px] w-[184px] rounded-sm bg-[#f5f8f7]" />
              <div className="absolute left-[522px] top-[116px] h-[180px] w-[204px] rounded-sm bg-[#f1ece1]" />
              <div className="absolute left-[542px] top-[132px] h-[62px] w-[164px] rounded-sm bg-[repeating-linear-gradient(45deg,#c78d5e_0_10px,#e6c198_10px_20px)]" />
              <div className="absolute left-[220px] top-[360px] h-[112px] w-[196px] rounded-sm bg-[repeating-linear-gradient(90deg,#d8bd98_0_8px,#e9d2ad_8px_16px)]" />
              <div className="absolute left-[468px] top-[358px] h-[120px] w-[222px] rounded-sm bg-[repeating-linear-gradient(90deg,#d8bd98_0_8px,#e9d2ad_8px_16px)]" />
              <div className="absolute left-[656px] top-[76px] h-[392px] w-[12px] rounded-full bg-[#1f2624]" />
              <div className="absolute left-[694px] top-[92px] h-[330px] w-[132px] rounded-sm border border-[#d5ece7] bg-[#dff4ef]/45" />
              <div className="absolute left-[126px] top-[242px] h-[28px] w-[146px] rounded-sm bg-[#1d2322]" />
              <div className="absolute left-[312px] top-[210px] h-[40px] w-[166px] rounded-sm bg-[#1d2322]" />
              <div className="absolute left-[280px] top-[390px] h-[54px] w-[118px] rounded-sm bg-[#f8f5ee]" />
              <div className="absolute left-[424px] top-[392px] h-[54px] w-[182px] rounded-sm bg-[#f8f5ee]" />
              <div className="absolute left-[420px] top-[276px] h-[58px] w-[94px] rounded-sm bg-[#f8f5ee]" />
              <div className="absolute left-[452px] top-[288px] h-[34px] w-[30px] rounded-full bg-[#cf473d]" />
              <div className="absolute bottom-6 left-[76px] h-[12px] w-[800px] bg-[#d5ece7]/75" />
            </>
          )}
          {draftTables.map((table) => {
            const disabled =
              mode === "booking" ? (availableSet ? !availableSet.has(table.id) : !table.active) : false;
            const selected = table.id === selectedTableId;
            const displayScale = table.displayScale ?? 1;
            const footprint = tableFootprint(table.capacity, table.shape, displayScale);
            const chairSize = Math.max(8, Math.min(16, 12 * displayScale));
            const chairGap = Math.max(8, 12 * displayScale);
            const zoneTheme = tableZoneTheme(table.zone);
            const compactTable = displayScale <= 0.72;
            const labelFontSize = Math.max(9, Math.min(12, 11 * displayScale));
            const seatsFontSize = Math.max(8, Math.min(10, 10 * displayScale));

            return (
              <div
                key={table.id}
                className="absolute"
                style={{
                  left: table.positionX,
                  top: table.positionY,
                  transform: `rotate(${table.rotation}deg)`
                }}
              >
                {Array.from({ length: Math.min(table.capacity, 10) }, (_, index) => {
                  const angle = (index / Math.min(table.capacity, 10)) * Math.PI * 2;
                  const chairX =
                    Math.cos(angle) * (footprint.width / 2 + chairGap) +
                    footprint.width / 2 -
                    chairSize / 2;
                  const chairY =
                    Math.sin(angle) * (footprint.height / 2 + chairGap) +
                    footprint.height / 2 -
                    chairSize / 2;

                  return (
                    <span
                      key={index}
                      className="absolute rounded-sm border border-ink/10 bg-[#f6f2e8] shadow-sm"
                      style={{
                        left: chairX,
                        top: chairY,
                        width: chairSize,
                        height: chairSize
                      }}
                    />
                  );
                })}
                <button
                  type="button"
                  title={t("floor.tableTitle", { label: table.label, capacity: table.capacity })}
                  disabled={disabled}
                  className={clsx(
                    "relative z-10 flex touch-none select-none flex-col items-center justify-center gap-0.5 border text-xs font-bold shadow-sm transition focus-ring",
                    footprint.rounded,
                    selected ? "text-white" : "hover:brightness-105",
                    !table.active && mode === "admin" && "border-dashed opacity-60",
                    disabled && "cursor-not-allowed opacity-35"
                  )}
                  style={{
                    width: footprint.width,
                    height: footprint.height,
                    backgroundColor: selected ? zoneTheme.selected : zoneTheme.background,
                    borderColor: selected ? zoneTheme.selected : zoneTheme.border,
                    color: selected ? "#ffffff" : zoneTheme.text
                  }}
                  onClick={() => onSelect?.(table)}
                  onPointerDown={(event) => handlePointerDown(event, table)}
                >
                  {compactTable ? null : <Armchair className="h-4 w-4" />}
                  <span
                    className="max-w-full px-1 text-center leading-none"
                    style={{
                      fontSize: labelFontSize,
                      overflowWrap: "anywhere"
                    }}
                  >
                    {table.label}
                  </span>
                  <span
                    className="max-w-full px-1 text-center font-semibold leading-none opacity-75"
                    style={{ fontSize: seatsFontSize, overflowWrap: "anywhere" }}
                  >
                    {t("floor.seats", { count: table.capacity })}
                  </span>
                </button>
                {mode === "booking" && table.viewImageUrl ? (
                  <button
                    className="absolute -right-3 -top-3 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-white text-ink shadow-md transition hover:bg-sage focus-ring"
                    title={t("floor.viewPhoto")}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onView?.(table);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {mode === "admin" && selected && !deleteMode ? (
                  <div className="absolute -right-3 top-1/2 z-20 flex -translate-y-1/2 translate-x-full flex-col gap-1">
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-white text-ink shadow-md transition hover:bg-sage"
                      title={t("admin.duplicateTable")}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicate?.(table);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-white text-ink shadow-md transition hover:bg-sage"
                      title={t("admin.rotateTable")}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRotate?.(table);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-white text-ink shadow-md transition hover:bg-sage"
                      title={t("admin.tableViewPhoto")}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onView?.(table);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-red-600 text-white shadow-md transition hover:bg-red-700"
                      title={t("admin.deleteTable")}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete?.(table.id);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
                {mode === "admin" && deleteMode ? (
                  <button
                    className="absolute -right-3 -top-3 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-red-600 text-white shadow-md transition hover:bg-red-700"
                    title={t("admin.deleteTable")}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete?.(table.id);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
