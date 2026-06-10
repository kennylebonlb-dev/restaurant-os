"use client";

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { FloorTable } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

const PLAN_WIDTH = 960;
const PLAN_HEIGHT = 560;
const SCALE = 36;
const SCENE_WIDTH = PLAN_WIDTH / SCALE;
const SCENE_DEPTH = PLAN_HEIGHT / SCALE;
const WALL_HEIGHT = 2.4;

type FloorPlan3DProps = {
  tables: FloorTable[];
  mode: "booking" | "admin";
  selectedTableId?: string;
  availableTableIds?: string[];
  layoutLocked?: boolean;
  zoom: number;
  onSelect?: (table: FloorTable) => void;
  onMove?: (tableId: string, position: { positionX: number; positionY: number }) => void;
};

type RestaurantSceneProps = FloorPlan3DProps & {
  draftTables: FloorTable[];
  setDraftTables: (updater: (tables: FloorTable[]) => FloorTable[]) => void;
  zoneLabels: {
    indoor: string;
    terrace: string;
    vip: string;
  };
};

function toScenePosition(positionX: number, positionY: number) {
  return {
    x: (positionX - PLAN_WIDTH / 2) / SCALE,
    z: (positionY - PLAN_HEIGHT / 2) / SCALE
  };
}

function toPlanPosition(x: number, z: number) {
  return {
    positionX: Math.round(Math.max(12, Math.min(x * SCALE + PLAN_WIDTH / 2, PLAN_WIDTH - 96))),
    positionY: Math.round(Math.max(12, Math.min(z * SCALE + PLAN_HEIGHT / 2, PLAN_HEIGHT - 76)))
  };
}

function zoneTheme(zone: FloorTable["zone"]) {
  if (zone === "TERRACE") {
    return {
      floor: "#f2d7c7",
      table: "#c37c52",
      accent: "#8f4d2f"
    };
  }

  if (zone === "VIP") {
    return {
      floor: "#d8e5df",
      table: "#345f53",
      accent: "#1d4038"
    };
  }

  return {
    floor: "#e7efe5",
    table: "#8fae91",
    accent: "#4a694f"
  };
}

function tableDimensions(capacity: number) {
  if (capacity >= 7) {
    return { width: 2.75, depth: 1.55 };
  }

  if (capacity >= 5) {
    return { width: 2.25, depth: 1.4 };
  }

  if (capacity <= 2) {
    return { width: 1.45, depth: 1.05 };
  }

  return { width: 1.85, depth: 1.22 };
}

function CameraRig({
  zoom,
  selectedTable,
  controlsRef
}: {
  zoom: number;
  selectedTable?: FloorTable;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, Math.max(7, 16 / zoom), Math.max(10, 20 / zoom));
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
  }, [camera, controlsRef, zoom]);

  useEffect(() => {
    if (!selectedTable || !controlsRef.current) {
      return;
    }

    const position = toScenePosition(selectedTable.positionX, selectedTable.positionY);
    controlsRef.current.target.set(position.x, 0.55, position.z);
    controlsRef.current.update();
  }, [controlsRef, selectedTable]);

  return null;
}

function ZoneFloor({ index, color }: { index: number; color: string }) {
  const zoneWidth = SCENE_WIDTH / 3;

  return (
    <mesh position={[(index - 1) * zoneWidth, -0.02, 0]} receiveShadow rotation-x={-Math.PI / 2}>
      <planeGeometry args={[zoneWidth, SCENE_DEPTH]} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}

function Wall({
  position,
  scale
}: {
  position: [number, number, number];
  scale: [number, number, number];
}) {
  return (
    <mesh castShadow position={position} receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial color="#f7f1e8" roughness={0.72} />
    </mesh>
  );
}

function RestaurantShell({
  zoneLabels
}: {
  zoneLabels: {
    indoor: string;
    terrace: string;
    vip: string;
  };
}) {
  const zoneWidth = SCENE_WIDTH / 3;

  return (
    <group>
      <ZoneFloor index={0} color={zoneTheme("INDOOR").floor} />
      <ZoneFloor index={1} color={zoneTheme("TERRACE").floor} />
      <ZoneFloor index={2} color={zoneTheme("VIP").floor} />

      <gridHelper args={[SCENE_WIDTH, 32, "#16201d", "#16201d"]} position={[0, 0.01, 0]} />

      <Wall position={[0, WALL_HEIGHT / 2, -SCENE_DEPTH / 2 - 0.14]} scale={[SCENE_WIDTH + 0.45, WALL_HEIGHT, 0.28]} />
      <Wall position={[-SCENE_WIDTH / 2 - 0.14, WALL_HEIGHT / 2, 0]} scale={[0.28, WALL_HEIGHT, SCENE_DEPTH + 0.45]} />
      <Wall position={[SCENE_WIDTH / 2 + 0.14, WALL_HEIGHT / 2, 0]} scale={[0.28, WALL_HEIGHT, SCENE_DEPTH + 0.45]} />
      <Wall position={[zoneWidth / 2, 0.68, SCENE_DEPTH / 2 + 0.1]} scale={[zoneWidth * 1.92, 1.36, 0.2]} />

      <mesh castShadow position={[-SCENE_WIDTH / 2 + 2.8, 0.42, -SCENE_DEPTH / 2 + 1.15]}>
        <boxGeometry args={[4.6, 0.85, 1.15]} />
        <meshStandardMaterial color="#16201d" roughness={0.64} />
      </mesh>
      <mesh castShadow position={[-SCENE_WIDTH / 2 + 2.8, 1.05, -SCENE_DEPTH / 2 + 1.15]}>
        <boxGeometry args={[4.25, 0.16, 0.85]} />
        <meshStandardMaterial color="#d7b28b" roughness={0.5} />
      </mesh>

      <mesh castShadow position={[0, 0.5, SCENE_DEPTH / 2 - 1.2]}>
        <boxGeometry args={[4.25, 1, 0.5]} />
        <meshStandardMaterial color="#c37c52" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[SCENE_WIDTH / 2 - 3.1, 0.9, -SCENE_DEPTH / 2 + 2.4]}>
        <boxGeometry args={[3.7, 1.8, 0.22]} />
        <meshStandardMaterial color="#345f53" roughness={0.75} />
      </mesh>

      <Billboard position={[-zoneWidth, 0.08, -SCENE_DEPTH / 2 + 0.6]}>
        <Text anchorX="center" anchorY="middle" color="#16201d" fontSize={0.34} outlineColor="#ffffff" outlineWidth={0.015}>
          {zoneLabels.indoor}
        </Text>
      </Billboard>
      <Billboard position={[0, 0.08, -SCENE_DEPTH / 2 + 0.6]}>
        <Text anchorX="center" anchorY="middle" color="#16201d" fontSize={0.34} outlineColor="#ffffff" outlineWidth={0.015}>
          {zoneLabels.terrace}
        </Text>
      </Billboard>
      <Billboard position={[zoneWidth, 0.08, -SCENE_DEPTH / 2 + 0.6]}>
        <Text anchorX="center" anchorY="middle" color="#16201d" fontSize={0.34} outlineColor="#ffffff" outlineWidth={0.015}>
          {zoneLabels.vip}
        </Text>
      </Billboard>
    </group>
  );
}

function ChairRing({ capacity, width, depth }: { capacity: number; width: number; depth: number }) {
  const chairCount = Math.min(12, Math.max(2, capacity));
  const chairs = Array.from({ length: chairCount }, (_, index) => index);

  return (
    <>
      {chairs.map((index) => {
        const angle = (index / chairCount) * Math.PI * 2;
        const x = Math.cos(angle) * (width / 2 + 0.34);
        const z = Math.sin(angle) * (depth / 2 + 0.34);

        return (
          <group key={index} position={[x, 0.16, z]} rotation-y={-angle}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.32, 0.34]} />
              <meshStandardMaterial color="#fffaf2" roughness={0.72} />
            </mesh>
            <mesh castShadow position={[0, 0.26, -0.16]}>
              <boxGeometry args={[0.32, 0.34, 0.08]} />
              <meshStandardMaterial color="#efe3d2" roughness={0.74} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function TableModel({
  table,
  disabled,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: {
  table: FloorTable;
  disabled: boolean;
  selected: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>, table: FloorTable) => void;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const { width, depth } = tableDimensions(table.capacity);
  const position = toScenePosition(table.positionX, table.positionY);
  const theme = zoneTheme(table.zone);
  const opacity = disabled || !table.active ? 0.34 : 1;
  const tableColor = selected ? "#b66f45" : theme.table;

  return (
    <group
      position={[position.x, 0.42, position.z]}
      rotation-y={THREE.MathUtils.degToRad(-table.rotation)}
      onPointerDown={(event) => onPointerDown(event, table)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, 0.28, depth]} />
        <meshStandardMaterial color={tableColor} opacity={opacity} roughness={0.48} transparent={opacity < 1} />
      </mesh>
      <mesh castShadow position={[0, -0.34, 0]}>
        <cylinderGeometry args={[0.2, 0.34, 0.68, 20]} />
        <meshStandardMaterial color="#16201d" opacity={opacity} roughness={0.72} transparent={opacity < 1} />
      </mesh>
      <ChairRing capacity={table.capacity} depth={depth} width={width} />
      {selected ? (
        <mesh position={[0, 0.2, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[Math.max(width, depth) * 0.72, Math.max(width, depth) * 0.86, 48]} />
          <meshBasicMaterial color="#b66f45" transparent opacity={0.5} />
        </mesh>
      ) : null}
      <Billboard position={[0, 1.05, 0]}>
        <mesh>
          <planeGeometry args={[1.85, 0.52]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.92} />
        </mesh>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#16201d"
          fontSize={0.22}
          maxWidth={1.65}
          position={[0, 0.02, 0.01]}
        >
          {`${table.label} · ${table.capacity}`}
        </Text>
      </Billboard>
    </group>
  );
}

function RestaurantScene({
  draftTables,
  setDraftTables,
  mode,
  selectedTableId,
  availableTableIds,
  layoutLocked = false,
  zoom,
  zoneLabels,
  onSelect,
  onMove
}: RestaurantSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const draggingTableIdRef = useRef<string | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const dragPoint = useMemo(() => new THREE.Vector3(), []);
  const availableSet = useMemo(
    () => (availableTableIds ? new Set(availableTableIds) : undefined),
    [availableTableIds]
  );
  const selectedTable = draftTables.find((table) => table.id === selectedTableId);

  function moveDraggedTable(event: ThreeEvent<PointerEvent>) {
    const tableId = draggingTableIdRef.current;

    if (!tableId) {
      return;
    }

    event.stopPropagation();
    event.ray.intersectPlane(floorPlane, dragPoint);
    const next = toPlanPosition(dragPoint.x, dragPoint.z);

    setDraftTables((current) =>
      current.map((table) =>
        table.id === tableId
          ? {
              ...table,
              ...next
            }
          : table
      )
    );
  }

  function handleTablePointerDown(event: ThreeEvent<PointerEvent>, table: FloorTable) {
    event.stopPropagation();
    onSelect?.(table);

    if (mode !== "admin" || layoutLocked) {
      return;
    }

    draggingTableIdRef.current = table.id;
    setDraggingTableId(table.id);
    controlsRef.current && (controlsRef.current.enabled = false);

    const target = event.target as HTMLElement;
    target.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    const tableId = draggingTableIdRef.current;

    if (!tableId) {
      return;
    }

    event.stopPropagation();
    draggingTableIdRef.current = null;
    setDraggingTableId(null);
    controlsRef.current && (controlsRef.current.enabled = true);

    const table = draftTables.find((item) => item.id === tableId);

    if (table) {
      onMove?.(tableId, {
        positionX: Math.round(table.positionX),
        positionY: Math.round(table.positionY)
      });
    }

    const target = event.target as HTMLElement;
    target.releasePointerCapture?.(event.pointerId);
  }

  return (
    <>
      <PerspectiveCamera makeDefault fov={45} position={[0, 16 / zoom, 20 / zoom]} />
      <CameraRig controlsRef={controlsRef} selectedTable={selectedTable} zoom={zoom} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        enablePan
        enableRotate
        enableZoom
        maxDistance={36}
        maxPolarAngle={Math.PI / 2.08}
        minDistance={6}
        target={[0, 0.4, 0]}
      />

      <ambientLight intensity={0.64} />
      <directionalLight castShadow intensity={1.35} position={[5, 12, 7]} shadow-mapSize={[2048, 2048]} />
      <pointLight intensity={0.8} position={[-6, 4, -4]} />

      <color attach="background" args={["#f7f1e8"]} />
      <fog attach="fog" args={["#f7f1e8", 26, 48]} />

      <RestaurantShell zoneLabels={zoneLabels} />

      <mesh
        position={[0, 0.04, 0]}
        rotation-x={-Math.PI / 2}
        onPointerMove={moveDraggedTable}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <planeGeometry args={[SCENE_WIDTH, SCENE_DEPTH]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {draftTables.map((table) => {
        const disabled =
          mode === "booking" ? (availableSet ? !availableSet.has(table.id) : !table.active) : false;

        return (
          <TableModel
            key={table.id}
            disabled={disabled}
            selected={table.id === selectedTableId || table.id === draggingTableId}
            table={table}
            onPointerDown={handleTablePointerDown}
            onPointerMove={moveDraggedTable}
            onPointerUp={handlePointerUp}
          />
        );
      })}
    </>
  );
}

export function FloorPlan3D({
  tables,
  mode,
  selectedTableId,
  availableTableIds,
  layoutLocked = false,
  zoom,
  onSelect,
  onMove
}: FloorPlan3DProps) {
  const [draftTables, setDraftTables] = useState(tables);
  const { t } = useI18n();
  const zoneLabels = useMemo(
    () => ({
      indoor: t("floor.indoor"),
      terrace: t("floor.terrace"),
      vip: t("floor.vip")
    }),
    [t]
  );

  useEffect(() => {
    setDraftTables(tables);
  }, [tables]);

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-md border border-ink/10 bg-linen">
      <Canvas
        aria-label={t("floor.title")}
        className="absolute inset-0"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance"
        }}
        shadows
      >
        <RestaurantScene
          availableTableIds={availableTableIds}
          draftTables={draftTables}
          layoutLocked={layoutLocked}
          mode={mode}
          selectedTableId={selectedTableId}
          setDraftTables={setDraftTables}
          tables={tables}
          zoneLabels={zoneLabels}
          zoom={zoom}
          onMove={onMove}
          onSelect={onSelect}
        />
      </Canvas>
    </div>
  );
}
