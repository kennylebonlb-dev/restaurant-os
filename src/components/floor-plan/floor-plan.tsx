"use client";

import clsx from "clsx";
import { Armchair, Lock } from "lucide-react";
import { PointerEvent, useEffect, useRef, useState } from "react";
import { FloorPlan3D } from "@/components/floor-plan/floor-plan-3d";
import type { DetectedGlbTable, FloorTable } from "@/lib/domain";
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
  onSelect?: (table: FloorTable) => void;
  onMove?: (tableId: string, position: { positionX: number; positionY: number }) => void;
  onDetectedTablesChange?: (tables: DetectedGlbTable[]) => void;
};

type DragState = {
  tableId: string;
  offsetX: number;
  offsetY: number;
};

export function FloorPlan({
  tables,
  mode,
  viewMode = "2d",
  zoom = 1,
  selectedTableId,
  availableTableIds,
  layoutLocked = false,
  onSelect,
  onMove,
  onDetectedTablesChange
}: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draftTables, setDraftTables] = useState(tables);
  const availableSet = availableTableIds ? new Set(availableTableIds) : undefined;
  const { t } = useI18n();

  useEffect(() => {
    setDraftTables(tables);
  }, [tables]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, table: FloorTable) {
    onSelect?.(table);

    if (mode !== "admin" || layoutLocked) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    dragRef.current = {
      tableId: table.id,
      offsetX: (event.clientX - rect.left) / zoom - table.positionX,
      offsetY: (event.clientY - rect.top) / zoom - table.positionY
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
      Math.min((event.clientX - rect.left) / zoom - drag.offsetX, PLAN_WIDTH - 96)
    );
    const positionY = Math.max(
      12,
      Math.min((event.clientY - rect.top) / zoom - drag.offsetY, PLAN_HEIGHT - 76)
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
      onMove?.(table.id, {
        positionX: Math.round(table.positionX),
        positionY: Math.round(table.positionY)
      });
    }
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{t("floor.title")}</h2>
          <p className="text-xs font-medium uppercase text-ink/55">
            {t("floor.zones")}
          </p>
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
          zoom={zoom}
          onSelect={onSelect}
          onMove={onMove}
          onDetectedTablesChange={onDetectedTablesChange}
        />
      ) : (
        <div className="overflow-auto rounded-md border border-ink/10 bg-white">
          <div
            ref={containerRef}
            className="relative bg-[linear-gradient(90deg,rgba(22,32,29,0.05)_1px,transparent_1px),linear-gradient(rgba(22,32,29,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"
            style={{
              width: PLAN_WIDTH,
              height: PLAN_HEIGHT,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              marginRight: PLAN_WIDTH * (zoom - 1),
              marginBottom: PLAN_HEIGHT * (zoom - 1)
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
          <div className="absolute inset-y-0 left-0 w-1/3 bg-sage/35" />
          <div className="absolute inset-y-0 left-1/3 w-1/3 bg-linen/75" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-clay/10" />
          <div className="absolute left-4 top-4 rounded-md bg-white/85 px-2 py-1 text-xs font-bold text-ink/70">
            {t("floor.indoor")}
          </div>
          <div className="absolute left-[calc(33.333%+1rem)] top-4 rounded-md bg-white/85 px-2 py-1 text-xs font-bold text-ink/70">
            {t("floor.terrace")}
          </div>
          <div className="absolute right-4 top-4 rounded-md bg-white/85 px-2 py-1 text-xs font-bold text-ink/70">
            {t("floor.vip")}
          </div>

          {draftTables.map((table) => {
            const disabled =
              mode === "booking" ? (availableSet ? !availableSet.has(table.id) : !table.active) : false;
            const selected = table.id === selectedTableId;

            return (
              <button
                key={table.id}
                type="button"
                title={t("floor.tableTitle", { label: table.label, capacity: table.capacity })}
                disabled={disabled}
                className={clsx(
                  "absolute flex h-16 w-24 touch-none select-none flex-col items-center justify-center gap-1 rounded-md border text-xs font-bold shadow-sm transition focus-ring",
                  selected
                    ? "border-clay bg-clay text-white"
                    : "border-ink/15 bg-white text-ink hover:border-moss hover:bg-sage",
                  !table.active && mode === "admin" && "border-dashed opacity-60",
                  disabled && "cursor-not-allowed opacity-35 hover:border-ink/15 hover:bg-white"
                )}
                style={{
                  left: table.positionX,
                  top: table.positionY,
                  transform: `rotate(${table.rotation}deg)`
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
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
