"use client";

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import { type MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { FloorTable } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

const PLAN_WIDTH = 960;
const PLAN_HEIGHT = 560;
const SCALE = 36;
const SCENE_WIDTH = PLAN_WIDTH / SCALE;
const SCENE_DEPTH = PLAN_HEIGHT / SCALE;
const WALL_HEIGHT = 3.1;

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
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspectBoost = size.width > 0 && size.height > 0 ? Math.max(1, 1.25 / (size.width / size.height)) : 1;
    const baseDistance = 24 * aspectBoost;
    const cameraDistance = baseDistance / Math.max(0.75, zoom);

    camera.position.set(
      -cameraDistance * 0.24,
      Math.max(9, cameraDistance * 0.76),
      Math.max(13, cameraDistance * 0.92)
    );
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
  }, [camera, controlsRef, size.height, size.width, zoom]);

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

type BoxMeshProps = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  castShadow?: boolean;
  metalness?: number;
  opacity?: number;
  receiveShadow?: boolean;
  roughness?: number;
  rotation?: [number, number, number];
};

function BoxMesh({
  position,
  size,
  color,
  castShadow = true,
  metalness = 0,
  opacity = 1,
  receiveShadow = false,
  roughness = 0.68,
  rotation
}: BoxMeshProps) {
  return (
    <mesh castShadow={castShadow} position={position} receiveShadow={receiveShadow} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        opacity={opacity}
        roughness={roughness}
        transparent={opacity < 1}
      />
    </mesh>
  );
}

function GlassPanel({
  position,
  size,
  opacity = 0.26
}: {
  position: [number, number, number];
  size: [number, number, number];
  opacity?: number;
}) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#d9f5f1" metalness={0.1} opacity={opacity} roughness={0.05} transparent />
    </mesh>
  );
}

function WoodFloor() {
  const planks = useMemo(() => {
    const colors = ["#d8bd98", "#e6cfac", "#cfae84", "#ead7b8", "#d2b38c"];
    const stripCount = 42;
    const segmentCount = 4;
    const stripWidth = SCENE_WIDTH / stripCount;
    const segmentDepth = SCENE_DEPTH / segmentCount;

    return Array.from({ length: stripCount * segmentCount }, (_, index) => {
      const strip = index % stripCount;
      const segment = Math.floor(index / stripCount);
      return {
        color: colors[(strip + segment * 2) % colors.length],
        key: `${strip}-${segment}`,
        position: [
          -SCENE_WIDTH / 2 + stripWidth * strip + stripWidth / 2,
          0.015,
          -SCENE_DEPTH / 2 + segmentDepth * segment + segmentDepth / 2
        ] as [number, number, number],
        size: [stripWidth - 0.025, 0.03, segmentDepth - 0.04] as [number, number, number]
      };
    });
  }, []);

  return (
    <group>
      <BoxMesh
        color="#bfa27c"
        position={[0, -0.08, 0]}
        receiveShadow
        size={[SCENE_WIDTH + 0.65, 0.16, SCENE_DEPTH + 0.65]}
      />
      {planks.map((plank) => (
        <BoxMesh
          key={plank.key}
          castShadow={false}
          color={plank.color}
          position={plank.position}
          receiveShadow
          roughness={0.92}
          size={plank.size}
        />
      ))}
    </group>
  );
}

function ProductDisplay({ x, width = 2.3 }: { x: number; width?: number }) {
  const z = -SCENE_DEPTH / 2 + 0.34;
  const products = useMemo(() => {
    const colors = ["#bf3f35", "#2e7a5b", "#f0c84c", "#252b2a", "#d96f3f", "#f6f1df"];
    return Array.from({ length: 42 }, (_, index) => {
      const col = index % 7;
      const row = Math.floor(index / 7);
      return {
        color: colors[(index + row) % colors.length],
        key: index,
        position: [
          x - width / 2 + 0.28 + col * ((width - 0.55) / 6),
          0.63 + row * 0.24,
          z + 0.14
        ] as [number, number, number]
      };
    });
  }, [width, x, z]);

  return (
    <group>
      <BoxMesh color="#fffef9" position={[x, 1.17, z]} receiveShadow size={[width, 1.72, 0.24]} />
      <BoxMesh color="#d8d1c4" position={[x, 1.17, z + 0.13]} size={[width + 0.08, 1.82, 0.05]} />
      {[0.78, 1.05, 1.32, 1.59].map((y) => (
        <BoxMesh key={y} color="#e8dcc8" position={[x, y, z + 0.25]} size={[width - 0.22, 0.035, 0.28]} />
      ))}
      {products.map((product) => (
        <BoxMesh
          key={product.key}
          color={product.color}
          position={product.position}
          roughness={0.45}
          size={[0.12, 0.18, 0.12]}
        />
      ))}
    </group>
  );
}

function MenuBand() {
  const z = -SCENE_DEPTH / 2 + 0.5;

  return (
    <group>
      <BoxMesh color="#fffaf1" position={[0.5, 2.42, z + 0.05]} size={[13.8, 0.88, 0.08]} />
      <Text anchorX="left" color="#2e2d2a" fontSize={0.34} maxWidth={4.5} position={[-6.1, 2.48, z + 0.11]}>
        Restaurant OS
      </Text>
      {[-2.3, 1.6, 5.1].map((x, index) => (
        <group key={x}>
          <Text anchorX="center" color="#6d8a37" fontSize={0.16} maxWidth={1.7} position={[x, 2.63, z + 0.12]}>
            {index === 0 ? "Menu du jour" : index === 1 ? "Cuisine ouverte" : "Bar & cafe"}
          </Text>
          <BoxMesh color="#86a957" position={[x - 0.3, 2.34, z + 0.13]} size={[0.65, 0.08, 0.035]} />
          <BoxMesh color="#d9784a" position={[x + 0.34, 2.34, z + 0.13]} size={[0.42, 0.08, 0.035]} />
          <mesh position={[x - 0.65, 2.42, z + 0.13]}>
            <circleGeometry args={[0.12, 24]} />
            <meshStandardMaterial color="#f5c14b" roughness={0.6} />
          </mesh>
          <mesh position={[x + 0.72, 2.48, z + 0.13]}>
            <circleGeometry args={[0.1, 24]} />
            <meshStandardMaterial color="#79a65d" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ServiceCounter() {
  const z = -SCENE_DEPTH / 2 + 2.18;

  return (
    <group>
      <BoxMesh color="#f9f7f0" position={[1.05, 0.46, z]} receiveShadow size={[9.6, 0.92, 0.82]} />
      <GlassPanel opacity={0.38} position={[1.05, 1.02, z + 0.02]} size={[9.2, 0.28, 0.72]} />
      <BoxMesh color="#e8d5a3" position={[1.05, 1.2, z - 0.45]} size={[9.8, 0.14, 0.12]} />
      <BoxMesh color="#f4efe4" position={[5.65, 0.54, z + 1.1]} size={[1.1, 1.08, 2.75]} />
      <BoxMesh color="#111817" position={[5.65, 1.16, z + 1.1]} size={[0.78, 0.12, 2.32]} />
      {Array.from({ length: 18 }, (_, index) => (
        <mesh key={index} castShadow position={[5.65 + (index % 3) * 0.22 - 0.22, 1.28, z + 0.28 + Math.floor(index / 3) * 0.28]}>
          <cylinderGeometry args={[0.08, 0.08, 0.08, 18]} />
          <meshStandardMaterial color="#fbfbf4" roughness={0.45} />
        </mesh>
      ))}
      {Array.from({ length: 20 }, (_, index) => (
        <BoxMesh
          key={index}
          color={index % 3 === 0 ? "#d64a3c" : index % 3 === 1 ? "#f0bd3c" : "#5c9a62"}
          position={[-2.9 + index * 0.31, 1.2, z + 0.1]}
          size={[0.16, 0.26, 0.16]}
        />
      ))}
    </group>
  );
}

function CentralIsland() {
  return (
    <group>
      <BoxMesh color="#f8f6ef" position={[0.6, 0.55, 0.15]} receiveShadow size={[4.8, 1.1, 3.85]} />
      <BoxMesh color="#776b5f" position={[0.6, 1.12, 2.12]} size={[4.9, 0.16, 0.16]} />
      <BoxMesh color="#ffffff" position={[0.6, 1.18, 0.15]} roughness={0.5} size={[4.38, 0.1, 3.35]} />
      <mesh castShadow position={[2.78, 1.45, 0.2]}>
        <cylinderGeometry args={[0.18, 0.24, 1.55, 24]} />
        <meshStandardMaterial color="#191f1d" roughness={0.42} />
      </mesh>
      <mesh castShadow position={[2.78, 2.25, 0.2]}>
        <cylinderGeometry args={[0.27, 0.2, 0.2, 24]} />
        <meshStandardMaterial color="#2c2f2d" roughness={0.36} />
      </mesh>
    </group>
  );
}

function LoungeArea() {
  return (
    <group>
      <BoxMesh color="#f7f6f1" position={[-8.5, 0.32, 4.25]} receiveShadow size={[3.6, 0.64, 0.78]} />
      <BoxMesh color="#c8c2b9" position={[-6.98, 0.32, 5.5]} receiveShadow size={[0.78, 0.64, 3.0]} />
      <BoxMesh color="#4a4a48" position={[-8.5, 0.72, 4.72]} size={[3.6, 0.55, 0.16]} />
      <BoxMesh color="#4a4a48" position={[-7.42, 0.72, 5.5]} size={[0.16, 0.55, 3.0]} />
      {[-9.35, -8.0, -6.85].map((x, index) => (
        <mesh key={x} castShadow position={[x, 0.24, 5.95 - index * 0.45]}>
          <cylinderGeometry args={[0.5, 0.54, 0.32, 32]} />
          <meshStandardMaterial color="#1f211f" roughness={0.5} />
        </mesh>
      ))}
      <BoxMesh color="#e3c78f" position={[-11.25, 0.72, 4.52]} receiveShadow size={[0.72, 1.44, 1.72]} />
      <BoxMesh color="#e3c78f" position={[-10.56, 0.9, 5.82]} receiveShadow size={[0.72, 1.8, 0.72]} />
      <mesh castShadow position={[-10.75, 1.54, 5.35]}>
        <sphereGeometry args={[0.32, 24, 16]} />
        <meshStandardMaterial color="#79a65d" roughness={0.75} />
      </mesh>
    </group>
  );
}

function PatioDetails() {
  const x = SCENE_WIDTH / 2 - 1.05;

  return (
    <group>
      <BoxMesh color="#d8d0c6" position={[x, 0.16, 0]} receiveShadow size={[1.65, 0.08, SCENE_DEPTH - 1.2]} />
      {[-4.9, -2.6, -0.3, 2.0, 4.3].map((z) => (
        <group key={z}>
          <BoxMesh color="#ffffff" position={[x, 0.62, z]} receiveShadow size={[0.9, 0.12, 0.9]} />
          <mesh castShadow position={[x, 0.32, z]}>
            <cylinderGeometry args={[0.07, 0.11, 0.5, 16]} />
            <meshStandardMaterial color="#a98253" roughness={0.6} />
          </mesh>
          <BoxMesh color="#d3cdc1" position={[x + 0.72, 0.42, z]} size={[0.34, 0.36, 0.5]} />
          <BoxMesh color="#efe7d2" position={[x - 0.72, 0.42, z]} size={[0.34, 0.36, 0.5]} />
        </group>
      ))}
    </group>
  );
}

function CommunalTable() {
  return (
    <group>
      <BoxMesh color="#ead09a" position={[3.55, 0.68, 4.55]} receiveShadow size={[1.6, 0.2, 4.2]} />
      {[-1.65, -0.85, -0.05, 0.75, 1.55].flatMap((zOffset) => [
        <BoxMesh key={`l-${zOffset}`} color="#f4f0e8" position={[2.48, 0.48, 4.55 + zOffset]} size={[0.42, 0.5, 0.5]} />,
        <BoxMesh key={`r-${zOffset}`} color="#f4f0e8" position={[4.62, 0.48, 4.55 + zOffset]} size={[0.42, 0.5, 0.5]} />
      ])}
    </group>
  );
}

function ArchitecturalShell({
  zoneLabels
}: {
  zoneLabels: {
    indoor: string;
    terrace: string;
    vip: string;
  };
}) {
  const backZ = -SCENE_DEPTH / 2 - 0.17;
  const frontZ = SCENE_DEPTH / 2 + 0.16;
  const leftX = -SCENE_WIDTH / 2 - 0.17;
  const rightX = SCENE_WIDTH / 2 + 0.16;
  const frameColor = "#e6d998";
  const panelWidth = SCENE_WIDTH / 6;
  const zoneWidth = SCENE_WIDTH / 3;

  return (
    <group>
      <WoodFloor />

      <BoxMesh color="#fffdf8" position={[0, WALL_HEIGHT / 2, backZ]} receiveShadow size={[SCENE_WIDTH + 0.55, WALL_HEIGHT, 0.34]} />
      <BoxMesh color="#fffdf8" position={[leftX, WALL_HEIGHT / 2, 0]} receiveShadow size={[0.34, WALL_HEIGHT, SCENE_DEPTH + 0.55]} />
      <BoxMesh color="#ffffff" position={[-12.05, 2.15, -6.35]} receiveShadow size={[2.15, 4.3, 2.35]} />
      <BoxMesh color="#ffffff" position={[-11.25, 1.2, 0.15]} receiveShadow size={[2.75, 2.4, 0.28]} />
      <BoxMesh color="#746f67" position={[-11.25, 1.6, 0.32]} size={[2.9, 0.12, 0.12]} />

      {Array.from({ length: 6 }, (_, index) => (
        <group key={`front-${index}`}>
          <GlassPanel
            position={[-SCENE_WIDTH / 2 + panelWidth * index + panelWidth / 2, 1.38, frontZ]}
            size={[panelWidth - 0.14, 2.55, 0.06]}
          />
          <BoxMesh
            color={frameColor}
            metalness={0.08}
            position={[-SCENE_WIDTH / 2 + panelWidth * index, 1.42, frontZ + 0.02]}
            roughness={0.42}
            size={[0.06, 2.75, 0.1]}
          />
        </group>
      ))}
      <BoxMesh color={frameColor} metalness={0.08} position={[0, 2.82, frontZ + 0.03]} size={[SCENE_WIDTH + 0.18, 0.1, 0.12]} />
      <BoxMesh color={frameColor} metalness={0.08} position={[0, 0.08, frontZ + 0.03]} size={[SCENE_WIDTH + 0.18, 0.16, 0.12]} />

      {Array.from({ length: 4 }, (_, index) => (
        <group key={`right-${index}`}>
          <GlassPanel
            position={[rightX, 1.38, -SCENE_DEPTH / 2 + (SCENE_DEPTH / 4) * index + SCENE_DEPTH / 8]}
            size={[0.06, 2.55, SCENE_DEPTH / 4 - 0.12]}
          />
          <BoxMesh
            color={frameColor}
            metalness={0.08}
            position={[rightX + 0.02, 1.42, -SCENE_DEPTH / 2 + (SCENE_DEPTH / 4) * index]}
            roughness={0.42}
            size={[0.1, 2.75, 0.06]}
          />
        </group>
      ))}

      {[-SCENE_WIDTH / 2 + 0.7, -3.2, 3.2, SCENE_WIDTH / 2 - 0.7].map((x) => (
        <BoxMesh key={`column-${x}`} color="#d4d0c7" position={[x, 1.9, backZ - 0.15]} size={[0.42, 3.8, 0.42]} />
      ))}
      {[frontZ + 1.1, backZ - 1.1].map((z) => (
        <BoxMesh key={`terrace-slab-${z}`} color="#c6c1b8" position={[0, -0.16, z]} receiveShadow size={[SCENE_WIDTH + 1.0, 0.18, 1.8]} />
      ))}

      <ProductDisplay x={-5.25} width={2.35} />
      <ProductDisplay x={-2.3} width={2.35} />
      <ProductDisplay x={1.05} width={2.2} />
      <ProductDisplay x={4.1} width={2.35} />
      <MenuBand />
      <ServiceCounter />
      <CentralIsland />
      <LoungeArea />
      <CommunalTable />
      <PatioDetails />

      <Billboard position={[-zoneWidth, 0.22, SCENE_DEPTH / 2 - 0.8]}>
        <Text anchorX="center" anchorY="middle" color="#33433a" fontSize={0.24} outlineColor="#ffffff" outlineWidth={0.012}>
          {zoneLabels.indoor}
        </Text>
      </Billboard>
      <Billboard position={[0, 0.22, SCENE_DEPTH / 2 - 0.8]}>
        <Text anchorX="center" anchorY="middle" color="#8a6840" fontSize={0.24} outlineColor="#ffffff" outlineWidth={0.012}>
          {zoneLabels.terrace}
        </Text>
      </Billboard>
      <Billboard position={[zoneWidth, 0.22, SCENE_DEPTH / 2 - 0.8]}>
        <Text anchorX="center" anchorY="middle" color="#263d37" fontSize={0.24} outlineColor="#ffffff" outlineWidth={0.012}>
          {zoneLabels.vip}
        </Text>
      </Billboard>
    </group>
  );
}

function ChairRing({
  capacity,
  width,
  depth,
  opacity
}: {
  capacity: number;
  width: number;
  depth: number;
  opacity: number;
}) {
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
            <mesh castShadow position={[0, 0.05, 0]}>
              <boxGeometry args={[0.42, 0.12, 0.42]} />
              <meshStandardMaterial color="#f7f2e8" opacity={opacity} roughness={0.72} transparent={opacity < 1} />
            </mesh>
            <mesh castShadow position={[0, 0.36, -0.21]}>
              <boxGeometry args={[0.46, 0.5, 0.08]} />
              <meshStandardMaterial color="#d8d1c4" opacity={opacity} roughness={0.76} transparent={opacity < 1} />
            </mesh>
            <mesh castShadow position={[0, -0.17, 0]}>
              <cylinderGeometry args={[0.055, 0.07, 0.34, 12]} />
              <meshStandardMaterial color="#b99160" opacity={opacity} roughness={0.55} transparent={opacity < 1} />
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
  const edgeColor = selected ? "#b66f45" : theme.accent;
  const tableTopColor = table.capacity >= 7 ? "#ead09a" : "#fffdf7";

  return (
    <group
      position={[position.x, 0.42, position.z]}
      rotation-y={THREE.MathUtils.degToRad(-table.rotation)}
      onPointerDown={(event) => onPointerDown(event, table)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {selected ? (
        <BoxMesh
          color="#c88658"
          opacity={0.42}
          position={[0, -0.26, 0]}
          receiveShadow
          size={[width + 0.38, 0.045, depth + 0.38]}
        />
      ) : null}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, 0.22, depth]} />
        <meshStandardMaterial color={tableTopColor} opacity={opacity} roughness={0.42} transparent={opacity < 1} />
      </mesh>
      <mesh castShadow position={[0, -0.14, 0]}>
        <boxGeometry args={[width + 0.08, 0.08, depth + 0.08]} />
        <meshStandardMaterial color={edgeColor} opacity={opacity} roughness={0.5} transparent={opacity < 1} />
      </mesh>
      <mesh castShadow position={[0, -0.34, 0]}>
        <cylinderGeometry args={[0.16, 0.26, 0.62, 18]} />
        <meshStandardMaterial color="#8c6b43" opacity={opacity} roughness={0.68} transparent={opacity < 1} />
      </mesh>
      <ChairRing capacity={table.capacity} depth={depth} opacity={opacity} width={width} />
      <mesh castShadow position={[-width * 0.18, 0.16, 0.02]}>
        <cylinderGeometry args={[0.16, 0.16, 0.035, 24]} />
        <meshStandardMaterial color="#f7f2e8" opacity={opacity} roughness={0.6} transparent={opacity < 1} />
      </mesh>
      <mesh castShadow position={[width * 0.18, 0.17, -0.02]}>
        <cylinderGeometry args={[0.1, 0.1, 0.16, 16]} />
        <meshStandardMaterial color="#d65345" opacity={opacity} roughness={0.45} transparent={opacity < 1} />
      </mesh>
      <Billboard position={[0, 1.05, 0]}>
        <mesh>
          <planeGeometry args={[1.7, 0.44]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.92} />
        </mesh>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#16201d"
          fontSize={0.19}
          maxWidth={1.5}
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
      <PerspectiveCamera makeDefault fov={36} position={[-6 / zoom, 18 / zoom, 22 / zoom]} />
      <CameraRig controlsRef={controlsRef} selectedTable={selectedTable} zoom={zoom} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        enablePan
        enableRotate
        enableZoom
        maxDistance={42}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={7}
        target={[0, 0.4, 0]}
      />

      <ambientLight intensity={0.8} />
      <directionalLight castShadow intensity={1.65} position={[4, 12, 8]} shadow-mapSize={[2048, 2048]} />
      <directionalLight intensity={0.75} position={[-7, 8, -6]} />
      <pointLight intensity={0.55} position={[-6, 4, -4]} />

      <color attach="background" args={["#2f302f"]} />
      <fog attach="fog" args={["#2f302f", 32, 58]} />

      <ArchitecturalShell zoneLabels={zoneLabels} />

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
    <div
      className="relative w-full overflow-hidden rounded-md border border-ink/10 bg-linen"
      style={{
        height: mode === "admin" ? "clamp(560px, 72vh, 760px)" : "clamp(500px, 64vh, 680px)"
      }}
    >
      <Canvas
        aria-label={t("floor.title")}
        className="restaurant-floor-canvas absolute inset-0 h-full w-full"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance"
        }}
        style={{
          height: "100%",
          width: "100%"
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
