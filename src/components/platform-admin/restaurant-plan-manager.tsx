"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Box, Eye, RotateCw, Save, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { apiFetch } from "@/hooks/use-api";
import type { FloorTable } from "@/lib/domain";

type PlanResponse = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    layoutLocked: boolean;
    backgroundImageUrl?: string;
    modelUrl?: string;
  } | null;
  tables: FloorTable[];
};

export function RestaurantPlanManager({ restaurantId }: { restaurantId: string }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [zoom, setZoom] = useState(1);
  const [selectedTableId, setSelectedTableId] = useState<string>();
  const planQuery = useQuery({
    queryKey: ["platform-admin", "restaurant-plan", restaurantId],
    queryFn: () => apiFetch<PlanResponse>(`/api/platform-admin/sites/${restaurantId}/plans`)
  });
  const moveMutation = useMutation({
    mutationFn: (payload: { tableId: string; positionX: number; positionY: number; rotation?: number }) =>
      apiFetch(`/api/platform-admin/sites/${restaurantId}/plans`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "restaurant-plan", restaurantId] });
    }
  });
  const restaurant = planQuery.data?.restaurant;
  const tables = planQuery.data?.tables ?? [];
  const selectedTable = tables.find((table) => table.id === selectedTableId);

  return (
    <main className="min-h-screen bg-[#f4efe7] px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="inline-flex items-center gap-2 text-sm font-black text-moss hover:underline" href="/cmt-admin">
              <ArrowLeft className="h-4 w-4" />
              Retour gestion des restaurants
            </Link>
            <h1 className="mt-2 text-3xl font-black">
              Plans 2D et 3D {restaurant ? `- ${restaurant.name}` : ""}
            </h1>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              Déplace les tables visuellement. Les positions sont sauvegardées en base de données.
            </p>
          </div>
          <Link className="secondary-button" href={restaurant ? `/sites/${restaurant.slug}` : "#"} target="_blank">
            <Eye className="h-4 w-4" />
            Voir le site
          </Link>
        </div>

        <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-md border border-ink/10 bg-linen p-1">
              {(["2d", "3d"] as const).map((mode) => (
                <button
                  key={mode}
                  className={`h-9 rounded px-4 text-sm font-black ${viewMode === mode ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
                  type="button"
                  onClick={() => setViewMode(mode)}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-button" type="button" title="Dézoomer" onClick={() => setZoom((current) => Math.max(0.6, current - 0.1))}>
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-16 text-center text-sm font-black">{Math.round(zoom * 100)}%</span>
              <button className="icon-button" type="button" title="Zoomer" onClick={() => setZoom((current) => Math.min(1.8, current + 0.1))}>
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          {planQuery.isLoading ? (
            <div className="grid h-[620px] place-items-center rounded-md bg-linen text-sm font-black text-ink/60">
              Chargement du plan...
            </div>
          ) : restaurant ? (
            <FloorPlan
              tables={tables}
              mode="admin"
              viewMode={viewMode}
              zoom={zoom}
              selectedTableId={selectedTableId}
              layoutLocked={restaurant.layoutLocked}
              modelUrl={restaurant.modelUrl}
              backgroundImageUrl={restaurant.backgroundImageUrl}
              onSelect={(table) => setSelectedTableId(table.id)}
              onMove={(tableId, position) => moveMutation.mutate({ tableId, ...position })}
              onRotate={(table) =>
                moveMutation.mutate({
                  tableId: table.id,
                  positionX: table.positionX,
                  positionY: table.positionY,
                  rotation: (table.rotation + 90) % 360
                })
              }
            />
          ) : (
            <div className="grid h-[420px] place-items-center rounded-md bg-linen text-sm font-black text-ink/60">
              Restaurant introuvable.
            </div>
          )}
        </section>

        <aside className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-black">Tables du plan</h2>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => (
                <button
                  key={table.id}
                  className={`rounded-md border p-3 text-left text-sm font-semibold ${
                    selectedTableId === table.id ? "border-moss bg-moss/10" : "border-ink/10 bg-linen"
                  }`}
                  type="button"
                  onClick={() => setSelectedTableId(table.id)}
                >
                  <span className="block font-black">{table.label}</span>
                  <span className="text-xs text-ink/55">{table.capacity} couverts · {table.zone}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="text-lg font-black">Table sélectionnée</h2>
            {selectedTable ? (
              <div className="mt-4 grid gap-3 text-sm font-semibold text-ink/70">
                <p><strong className="text-ink">Nom :</strong> {selectedTable.label}</p>
                <p><strong className="text-ink">Capacité :</strong> {selectedTable.capacity}</p>
                <p><strong className="text-ink">Position :</strong> {Math.round(selectedTable.positionX)} / {Math.round(selectedTable.positionY)}</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    moveMutation.mutate({
                      tableId: selectedTable.id,
                      positionX: selectedTable.positionX,
                      positionY: selectedTable.positionY,
                      rotation: (selectedTable.rotation + 90) % 360
                    })
                  }
                >
                  <RotateCw className="h-4 w-4" />
                  Pivoter à 90 degrés
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-linen p-3 text-sm font-semibold text-ink/60">
                Sélectionne une table sur le plan.
              </p>
            )}
            {moveMutation.isPending ? (
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-moss">
                <Save className="h-4 w-4" />
                Chargement...
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
