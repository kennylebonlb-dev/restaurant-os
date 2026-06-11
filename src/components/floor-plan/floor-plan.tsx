"use client";

import clsx from "clsx";
import { Armchair, Lock, X } from "lucide-react";
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
  onSelect?: (table: FloorTable) => void;
  onMove?: (tableId: string, position: { positionX: number; positionY: number }) => void;
  onDelete?: (tableId: string) => void;
  onDetectedTablesChange?: (tables: DetectedGlbTable[]) => void;
};

type DragState = {
  tableId: string;
  offsetX: number;
  offsetY: number;
};

function tableFootprint(capacity: number, shape: TableShape = "ROUND") {
  if (shape === "RECTANGLE") {
    return capacity >= 7
      ? { width: 136, height: 58, rounded: "rounded-md" }
      : { width: 112, height: 58, rounded: "rounded-md" };
  }

  if (shape === "SQUARE") {
    return { width: 78, height: 78, rounded: "rounded-md" };
  }

  return capacity >= 7
    ? { width: 104, height: 104, rounded: "rounded-[999px]" }
    : { width: 82, height: 82, rounded: "rounded-[999px]" };
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
  onSelect,
  onMove,
  onDelete,
  onDetectedTablesChange
}: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const optimisticPositionsRef = useRef<Record<string, { positionX: number; positionY: number }>>({});
  const [draftTables, setDraftTables] = useState(tables);
  const availableSet = availableTableIds ? new Set(availableTableIds) : undefined;
  const twoDZoom = 1;
  const { t } = useI18n();

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

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, table: FloorTable) {
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
      offsetX: (event.clientX - rect.left) / twoDZoom - table.positionX,
      offsetY: (event.clientY - rect.top) / twoDZoom - table.positionY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;

    if (!drag || !container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const positionX = Math.max(
      12,
      Math.min((event.clientX - rect.left) / twoDZoom - drag.offsetX, PLAN_WIDTH - 96)
    );
    const positionY = Math.max(
      12,
      Math.min((event.clientY - rect.top) / twoDZoom - drag.offsetY, PLAN_HEIGHT - 76)
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
  }

  function handlePointerUp() {
    const drag = dragRef.current;

    if (!drag) {
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
          onDetectedTablesChange={onDetectedTablesChange}
        />
      ) : (
        <div
          className="overflow-auto rounded-md border border-ink/10 bg-[#30302f]"
          style={{ height: PLAN_HEIGHT }}
        >
          <div
            ref={containerRef}
            className="relative overflow-hidden bg-[#30302f]"
            style={{
              width: PLAN_WIDTH,
              height: PLAN_HEIGHT,
              transform: `scale(${twoDZoom})`,
              transformOrigin: "top left",
              marginRight: PLAN_WIDTH * (twoDZoom - 1),
              marginBottom: PLAN_HEIGHT * (twoDZoom - 1)
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
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
          {draftTables.map((table) => {
            const disabled =
              mode === "booking" ? (availableSet ? !availableSet.has(table.id) : !table.active) : false;
            const selected = table.id === selectedTableId;
            const footprint = tableFootprint(table.capacity, table.shape);

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
                  const chairX = Math.cos(angle) * (footprint.width / 2 + 12) + footprint.width / 2 - 6;
                  const chairY = Math.sin(angle) * (footprint.height / 2 + 12) + footprint.height / 2 - 6;

                  return (
                    <span
                      key={index}
                      className="absolute h-3 w-3 rounded-sm border border-ink/10 bg-[#f6f2e8] shadow-sm"
                      style={{
                        left: chairX,
                        top: chairY
                      }}
                    />
                  );
                })}
                <button
                  type="button"
                  title={t("floor.tableTitle", { label: table.label, capacity: table.capacity })}
                  disabled={disabled}
                  className={clsx(
                    "relative z-10 flex touch-none select-none flex-col items-center justify-center gap-1 border text-xs font-bold shadow-sm transition focus-ring",
                    footprint.rounded,
                    selected
                      ? "border-clay bg-clay text-white"
                      : "border-ink/15 bg-white text-ink hover:border-moss hover:bg-sage",
                    !table.active && mode === "admin" && "border-dashed opacity-60",
                    disabled && "cursor-not-allowed opacity-35 hover:border-ink/15 hover:bg-white"
                  )}
                  style={{
                    width: footprint.width,
                    height: footprint.height
                  }}
                  onClick={() => onSelect?.(table)}
                  onPointerDown={(event) => handlePointerDown(event, table)}
                >
                  <Armchair className="h-4 w-4" />
                  <span className="max-w-[5.25rem] truncate">{table.label}</span>
                  <span className="text-[10px] font-semibold opacity-75">
                    {t("floor.seats", { count: table.capacity })}
                  </span>
                </button>
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
