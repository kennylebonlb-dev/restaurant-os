"use client";

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { Billboard, Html, OrbitControls, PerspectiveCamera, Text, useGLTF } from "@react-three/drei";
import clsx from "clsx";
import { Eye, UserRound, X } from "lucide-react";
import { type MutableRefObject, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DetectedGlbTable, FloorTable, TableShape } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

const PLAN_WIDTH = 960;
const PLAN_HEIGHT = 560;
const SCALE = 36;
const SCENE_WIDTH = PLAN_WIDTH / SCALE;
const SCENE_DEPTH = PLAN_HEIGHT / SCALE;
const WALL_HEIGHT = 3.1;
const GLB_MODEL_PATH = "/models/plan.glb";

type TableBadge = {
  title: string;
  detail: string;
  tone?: "reserved" | "blocked" | "warning" | "vip" | "cancelled";
  guestCount?: number;
  reservationId?: string;
  startTime?: string;
  isCombined?: boolean;
  delayLabel?: string | null;
};

type FloorPlan3DProps = {
  tables: FloorTable[];
  mode: "booking" | "admin";
  selectedTableId?: string;
  selectedTableIds?: string[];
  tableBadges?: Record<string, TableBadge>;
  tableTones?: Record<string, TableBadge["tone"]>;
  availableTableIds?: string[];
  allowUnavailableSelect?: boolean;
  showTableViewButtons?: boolean;
  layoutLocked?: boolean;
  deleteMode?: boolean;
  modelUrl?: string;
  zoom: number;
  onSelect?: (table: FloorTable, options?: { additive: boolean }) => void;
  onDeselect?: () => void;
  onMove?: (tableId: string, position: { positionX: number; positionY: number }) => void;
  onDelete?: (tableId: string) => void;
  onView?: (table: FloorTable) => void;
  onBadgeSelect?: (reservationId: string) => void;
  onDetectedTablesChange?: (tables: DetectedGlbTable[]) => void;
};

type RestaurantSceneProps = FloorPlan3DProps & {
  draftTables: FloorTable[];
  setDraftTables: (updater: (tables: FloorTable[]) => FloorTable[]) => void;
  onOptimisticMove: (tableId: string, position: { positionX: number; positionY: number }) => void;
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

type ModelFit = {
  scale: number;
  center: THREE.Vector3;
  floorY: number;
};

type MeshInfo = {
  object: THREE.Mesh;
  box: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  name: string;
};

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh === true;
}

function getModelFit(object: THREE.Object3D): ModelFit {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const scale = Math.min(
    (SCENE_WIDTH * 0.94) / Math.max(size.x, 1),
    (SCENE_DEPTH * 0.94) / Math.max(size.z, 1)
  );

  return {
    center,
    floorY: Number.isFinite(box.min.y) ? box.min.y : 0,
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1
  };
}

function fitPoint(point: THREE.Vector3, fit: ModelFit) {
  return {
    x: (point.x - fit.center.x) * fit.scale,
    y: (point.y - fit.floorY) * fit.scale,
    z: (point.z - fit.center.z) * fit.scale
  };
}

function listMeshInfo(scene: THREE.Object3D) {
  const meshes: MeshInfo[] = [];

  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!isMesh(object)) {
      return;
    }

    const box = new THREE.Box3().setFromObject(object);

    if (box.isEmpty() || !Number.isFinite(box.min.x)) {
      return;
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    meshes.push({
      object,
      box,
      center,
      name: object.name || "mesh",
      size
    });
  });

  return meshes;
}

function isTableTopCandidate(info: MeshInfo, floorY: number) {
  const minSide = Math.min(info.size.x, info.size.z);
  const maxSide = Math.max(info.size.x, info.size.z);
  const elevated = info.center.y > floorY + 0.35 && info.center.y < floorY + 2.4;

  return (
    elevated &&
    info.size.y >= 0.015 &&
    info.size.y <= 0.16 &&
    minSide >= 0.65 &&
    minSide <= 2.2 &&
    maxSide >= 0.75 &&
    maxSide <= 3.45
  );
}

function isChairCandidate(info: MeshInfo, floorY: number) {
  const minSide = Math.min(info.size.x, info.size.z);
  const maxSide = Math.max(info.size.x, info.size.z);
  const elevated = info.center.y > floorY + 0.2 && info.center.y < floorY + 2.3;

  return elevated && info.size.y >= 0.45 && info.size.y <= 1.15 && minSide >= 0.35 && maxSide <= 1.25;
}

function horizontalDistance(first: THREE.Vector3, second: THREE.Vector3) {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function clusterChairCenters(chairs: MeshInfo[]) {
  const clusters: THREE.Vector3[] = [];

  for (const chair of chairs) {
    const existing = clusters.find((center) => horizontalDistance(center, chair.center) < 0.42);

    if (existing) {
      existing.add(chair.center).multiplyScalar(0.5);
    } else {
      clusters.push(chair.center.clone());
    }
  }

  return clusters;
}

function inferCapacity(table: MeshInfo, chairCenters: THREE.Vector3[]) {
  const radius = Math.max(table.size.x, table.size.z) * 0.72 + 1.0;
  const nearbyChairs = chairCenters.filter((chair) => horizontalDistance(chair, table.center) <= radius).length;

  if (nearbyChairs > 0) {
    return Math.max(2, Math.min(12, nearbyChairs));
  }

  const area = table.size.x * table.size.z;

  if (area >= 2.6) {
    return 6;
  }

  if (area >= 1.4) {
    return 4;
  }

  return 2;
}

function inferZone(position: { x: number; z: number }): FloorTable["zone"] {
  if (position.x > SCENE_WIDTH * 0.22) {
    return "VIP";
  }

  if (position.z > SCENE_DEPTH * 0.18) {
    return "TERRACE";
  }

  return "INDOOR";
}

function detectTablesFromGlb(scene: THREE.Object3D, fit: ModelFit): DetectedGlbTable[] {
  const meshes = listMeshInfo(scene);
  const chairCenters = clusterChairCenters(meshes.filter((info) => isChairCandidate(info, fit.floorY)));
  const tableTops = meshes
    .filter((info) => isTableTopCandidate(info, fit.floorY))
    .sort((first, second) => {
      const row = first.center.z - second.center.z;
      return Math.abs(row) > 0.35 ? row : first.center.x - second.center.x;
    });
  const uniqueTableTops: MeshInfo[] = [];

  for (const table of tableTops) {
    const duplicate = uniqueTableTops.some((existing) => horizontalDistance(existing.center, table.center) < 0.72);

    if (!duplicate) {
      uniqueTableTops.push(table);
    }
  }

  return uniqueTableTops.map((table, index) => {
    const fittedPosition = fitPoint(table.center, fit);
    const position = toPlanPosition(fittedPosition.x, fittedPosition.z);
    const capacity = inferCapacity(table, chairCenters);
    const rotation = table.size.x >= table.size.z ? 0 : 90;
    const fittedWidth = Math.max(0.56, table.size.x * fit.scale);
    const fittedDepth = Math.max(0.56, table.size.z * fit.scale);

    return {
      id: `glb-table-${index + 1}`,
      label: `IA ${String(index + 1).padStart(2, "0")}`,
      capacity,
      confidence: Math.min(0.96, 0.58 + Math.min(capacity, 8) * 0.045),
      positionX: position.positionX,
      positionY: position.positionY,
      rotation,
      scenePosition: fittedPosition,
      sceneSize: {
        depth: fittedDepth,
        width: fittedWidth
      },
      sourceName: table.name,
      zone: inferZone(fittedPosition)
    };
  });
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

function badgeTableTheme(badge?: TableBadge) {
  if (!badge) {
    return null;
  }

  if (badge.tone === "blocked" || badge.tone === "cancelled" || badge.tone === "warning") {
    return {
      table: "#dc2626",
      accent: "#991b1b"
    };
  }

  if (badge.tone === "reserved" || badge.tone === "vip") {
    return {
      table: "#ea580c",
      accent: "#9a3412"
    };
  }

  return null;
}

function tableDimensions(capacity: number, shape: TableShape = "ROUND", displayScale = 1) {
  const scale = Math.min(2.4, Math.max(0.5, displayScale));
  const applyScale = (size: { width: number; depth: number }) => ({
    width: size.width * scale,
    depth: size.depth * scale
  });

  if (shape === "RECTANGLE") {
    return applyScale({
      width: Math.min(4.8, 1.9 + Math.max(0, capacity - 2) * 0.24),
      depth: capacity >= 7 ? 1.35 : 1.18
    });
  }

  if (shape === "SQUARE") {
    return applyScale(capacity >= 5 ? { width: 1.72, depth: 1.72 } : { width: 1.42, depth: 1.42 });
  }

  if (capacity >= 7) {
    return applyScale({ width: 2.1, depth: 2.1 });
  }

  if (capacity >= 5) {
    return applyScale({ width: 1.72, depth: 1.72 });
  }

  if (capacity <= 2) {
    return applyScale({ width: 1.28, depth: 1.28 });
  }

  return applyScale({ width: 1.52, depth: 1.52 });
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
        C’est ma table
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

function ArchitecturalShell() {
  const backZ = -SCENE_DEPTH / 2 - 0.17;
  const frontZ = SCENE_DEPTH / 2 + 0.16;
  const leftX = -SCENE_WIDTH / 2 - 0.17;
  const rightX = SCENE_WIDTH / 2 + 0.16;
  const frameColor = "#e6d998";
  const panelWidth = SCENE_WIDTH / 6;
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
  badge,
  tone,
  deleteMode,
  mode,
  onDelete,
  onView,
  onBadgeSelect,
  showTableViewButtons,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: {
  table: FloorTable;
  disabled: boolean;
  selected: boolean;
  badge?: TableBadge;
  tone?: TableBadge["tone"];
  deleteMode: boolean;
  mode: "booking" | "admin";
  onDelete?: (tableId: string) => void;
  onView?: (table: FloorTable) => void;
  onBadgeSelect?: (reservationId: string) => void;
  showTableViewButtons: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>, table: FloorTable) => void;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const { t } = useI18n();
  const { width, depth } = tableDimensions(table.capacity, table.shape, table.displayScale);
  const position = toScenePosition(table.positionX, table.positionY);
  const theme = zoneTheme(table.zone);
  const opacity = disabled || !table.active ? 0.34 : 1;
  const edgeColor = selected ? "#b66f45" : theme.accent;
  const badgeTheme = badgeTableTheme(badge ?? (tone ? { title: "", detail: "", tone } : undefined));
  const tableTopColor = selected ? "#f4d0b5" : badgeTheme?.table ?? theme.table;
  const tableEdgeColor = selected ? edgeColor : badgeTheme?.accent ?? edgeColor;

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
      {table.shape === "ROUND" ? (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[width / 2, width / 2, 0.22, 48]} />
          <meshStandardMaterial color={tableTopColor} opacity={opacity} roughness={0.42} transparent={opacity < 1} />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, 0.22, depth]} />
          <meshStandardMaterial color={tableTopColor} opacity={opacity} roughness={0.42} transparent={opacity < 1} />
        </mesh>
      )}
      <mesh castShadow position={[0, -0.14, 0]}>
        <boxGeometry args={[width + 0.08, 0.08, depth + 0.08]} />
        <meshStandardMaterial color={tableEdgeColor} opacity={opacity} roughness={0.5} transparent={opacity < 1} />
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
          <planeGeometry args={[1.92, 0.64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.92} />
        </mesh>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#16201d"
          fontSize={0.23}
          maxWidth={1.7}
          position={[0, 0.1, 0.01]}
        >
          {table.label}
        </Text>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#46514c"
          fontSize={0.14}
          maxWidth={1.7}
          position={[0, -0.12, 0.01]}
        >
          {t("floor.seats", { count: table.capacity })}
        </Text>
      </Billboard>
      {badge ? (
        <Html center zIndexRange={[900, 0]} position={[-width / 2 - 0.38, 1.08, -depth / 2 - 0.22]}>
          <button
            className="group relative z-[900] text-left outline-none"
            data-dashboard-reservation-badge
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (badge.reservationId) {
                onBadgeSelect?.(badge.reservationId);
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span
              aria-label={badge.title}
              className={clsx(
                "grid h-7 w-7 place-items-center rounded-full border-2 border-white text-white shadow-md transition group-hover:scale-110",
                badge.tone === "vip" || badge.tone === "reserved" ? "bg-orange-500" : badge.tone === "warning" || badge.tone === "cancelled" || badge.tone === "blocked" ? "bg-red-500" : "bg-moss"
              )}
            >
              {badge.tone === "cancelled" ? <X className="h-4 w-4" aria-hidden="true" /> : <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            {badge.delayLabel ? (
              <span className="absolute -right-9 -top-1 rounded-full border border-white bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-md">
                {badge.delayLabel}
              </span>
            ) : null}
            <div className="pointer-events-none absolute left-0 top-6 z-[950] w-56 rounded-md border border-ink/10 bg-white p-3 text-left text-xs font-semibold leading-5 text-ink opacity-0 shadow-soft transition group-hover:opacity-100 group-focus:opacity-100">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-ink">{badge.title}</p>
                {badge.guestCount ? (
                  <span className="rounded-md bg-ink px-2 py-1 text-sm font-black leading-none text-white">
                    {badge.guestCount}
                  </span>
                ) : null}
              </div>
              {badge.startTime ? <p className="mt-1 text-lg font-black leading-none text-ink">{badge.startTime}</p> : null}
              {badge.isCombined ? <p className="mt-1 inline-block border-b border-moss text-[11px] font-black text-moss">Table combinée</p> : null}
              {badge.delayLabel ? <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[11px] font-black text-red-700">{badge.delayLabel}</p> : null}
              <p className="mt-1 text-ink/65">{badge.detail}</p>
            </div>
          </button>
        </Html>
      ) : null}
      {showTableViewButtons && mode === "booking" && table.viewImageUrl ? (
        <Html center position={[width / 2 + 0.42, 1.08, -depth / 2 - 0.24]}>
          <button
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-ink shadow-lg transition focus-ring",
              disabled ? "cursor-not-allowed opacity-40" : "hover:bg-sage"
            )}
            disabled={disabled}
            title={t("floor.viewPhoto")}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) {
                return;
              }
              onView?.(table);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </Html>
      ) : null}
      {deleteMode ? (
        <Html center position={[width / 2 + 0.44, 1.03, -depth / 2 - 0.24]}>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-600 text-sm font-black text-white shadow-lg transition hover:bg-red-700"
            title={t("admin.deleteTable")}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(table.id);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            ×
          </button>
        </Html>
      ) : null}
    </group>
  );
}

function LoadedRestaurantModel({
  modelUrl,
  onDetectedTablesChange
}: {
  modelUrl: string;
  onDetectedTablesChange?: (tables: DetectedGlbTable[]) => void;
}) {
  const gltf = useGLTF(modelUrl) as { scene: THREE.Group };
  const { detectedTables, fit, scene } = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((object) => {
      if (!isMesh(object)) {
        return;
      }

      object.castShadow = true;
      object.receiveShadow = true;

      const materials = Array.isArray(object.material) ? object.material : [object.material];

      for (const material of materials) {
        if (material) {
          material.side = THREE.DoubleSide;
        }
      }
    });

    const modelFit = getModelFit(clonedScene);

    return {
      detectedTables: detectTablesFromGlb(clonedScene, modelFit),
      fit: modelFit,
      scene: clonedScene
    };
  }, [gltf.scene]);

  useEffect(() => {
    onDetectedTablesChange?.(detectedTables);
  }, [detectedTables, onDetectedTablesChange]);

  return (
    <primitive
      object={scene}
      position={[-fit.center.x * fit.scale, -fit.floorY * fit.scale, -fit.center.z * fit.scale]}
      scale={fit.scale}
    />
  );
}

function DetectedTableHotspots({
  availableSet,
  detectedTables,
  mode,
  selectedTableId,
  tables,
  onSelect
}: {
  availableSet?: Set<string>;
  detectedTables: DetectedGlbTable[];
  mode: "booking" | "admin";
  selectedTableId?: string;
  tables: FloorTable[];
  onSelect?: (table: FloorTable, options?: { additive: boolean }) => void;
}) {
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const { t } = useI18n();

  function findMatchingTable(detectedTable: DetectedGlbTable) {
    let nearestTable: FloorTable | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const table of tables) {
      const distance = Math.hypot(table.positionX - detectedTable.positionX, table.positionY - detectedTable.positionY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestTable = table;
      }
    }

    return nearestDistance <= 96 ? nearestTable : undefined;
  }

  return (
    <group>
      {detectedTables.map((detectedTable) => {
        const matchingTable = findMatchingTable(detectedTable);
        const selectable =
          mode === "admin" || !matchingTable || !availableSet || availableSet.has(matchingTable.id);
        const selected =
          selectedDetectionId === detectedTable.id || Boolean(matchingTable && matchingTable.id === selectedTableId);
        const color = selected ? "#d98257" : matchingTable ? "#4e8060" : "#2f6f86";
        const opacity = selected ? 0.42 : 0.2;

        return (
          <group
            key={detectedTable.id}
            position={[
              detectedTable.scenePosition.x,
              Math.max(0.18, detectedTable.scenePosition.y + 0.08),
              detectedTable.scenePosition.z
            ]}
            rotation-y={THREE.MathUtils.degToRad(-detectedTable.rotation)}
          >
            <mesh
              onClick={(event) => {
                event.stopPropagation();
                setSelectedDetectionId(detectedTable.id);

                if (matchingTable && selectable) {
                  onSelect?.(matchingTable, {
                    additive: event.nativeEvent.metaKey || event.nativeEvent.ctrlKey || event.nativeEvent.shiftKey
                  });
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <boxGeometry
                args={[
                  Math.max(0.86, detectedTable.sceneSize.width + 0.28),
                  0.12,
                  Math.max(0.86, detectedTable.sceneSize.depth + 0.28)
                ]}
              />
              <meshStandardMaterial color={color} opacity={opacity} transparent />
            </mesh>
            {mode === "admin" || selected ? (
              <Billboard position={[0, 0.64, 0]}>
                <mesh>
                  <planeGeometry args={[1.82, 0.58]} />
                  <meshBasicMaterial color="#ffffff" opacity={0.9} transparent />
                </mesh>
                <Text
                  anchorX="center"
                  anchorY="middle"
                  color="#16201d"
                  fontSize={0.16}
                  maxWidth={1.58}
                  position={[0, 0.1, 0.01]}
                >
                  {matchingTable?.label ?? detectedTable.label}
                </Text>
                <Text
                  anchorX="center"
                  anchorY="middle"
                  color="#46514c"
                  fontSize={0.12}
                  maxWidth={1.58}
                  position={[0, -0.12, 0.01]}
                >
                  {t("floor.seats", { count: matchingTable?.capacity ?? detectedTable.capacity })}
                </Text>
              </Billboard>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function RestaurantScene({
  draftTables,
  setDraftTables,
  mode,
  selectedTableId,
  selectedTableIds,
  tableBadges,
  tableTones,
  availableTableIds,
  allowUnavailableSelect = false,
  showTableViewButtons = true,
  layoutLocked = false,
  deleteMode = false,
  modelUrl = GLB_MODEL_PATH,
  zoom,
  onDetectedTablesChange,
  onOptimisticMove,
  onSelect,
  onMove,
  onDelete,
  onView,
  onBadgeSelect
}: RestaurantSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const draggingTableIdRef = useRef<string | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [detectedGlbTables, setDetectedGlbTables] = useState<DetectedGlbTable[]>([]);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const dragPoint = useMemo(() => new THREE.Vector3(), []);
  const availableSet = useMemo(
    () => (availableTableIds ? new Set(availableTableIds) : undefined),
    [availableTableIds]
  );
  const selectedTable = draftTables.find((table) => table.id === selectedTableId);
  const selectedSet = useMemo(
    () => (selectedTableIds ? new Set(selectedTableIds) : undefined),
    [selectedTableIds]
  );
  const handleDetectedTablesChange = useCallback(
    (tables: DetectedGlbTable[]) => {
      setDetectedGlbTables(tables);
      onDetectedTablesChange?.(tables);
    },
    [onDetectedTablesChange]
  );

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
    onSelect?.(table, {
      additive: event.nativeEvent.metaKey || event.nativeEvent.ctrlKey || event.nativeEvent.shiftKey
    });

    if (selectedTableIds || mode !== "admin" || layoutLocked || deleteMode) {
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
      const nextPosition = {
        positionX: Math.round(table.positionX),
        positionY: Math.round(table.positionY)
      };
      onOptimisticMove(tableId, nextPosition);
      onMove?.(tableId, nextPosition);
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

      <Suspense fallback={<ArchitecturalShell />}>
        <LoadedRestaurantModel key={modelUrl} modelUrl={modelUrl} onDetectedTablesChange={handleDetectedTablesChange} />
      </Suspense>

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

      <DetectedTableHotspots
        availableSet={availableSet}
        detectedTables={detectedGlbTables}
        mode={mode}
        selectedTableId={selectedTableId}
        tables={draftTables}
        onSelect={onSelect}
      />

      {draftTables.map((table) => {
        const unavailable =
          mode === "booking" ? (availableSet ? !availableSet.has(table.id) : !table.active) : false;
        const disabled = unavailable && !allowUnavailableSelect;

        return (
          <TableModel
            key={table.id}
            deleteMode={mode === "admin" && deleteMode}
            disabled={disabled}
            mode={mode}
            onDelete={onDelete}
            onView={onView}
            onBadgeSelect={onBadgeSelect}
            badge={tableBadges?.[table.id]}
            tone={tableTones?.[table.id]}
            showTableViewButtons={showTableViewButtons}
            selected={table.id === selectedTableId || table.id === draggingTableId || Boolean(selectedSet?.has(table.id))}
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
  selectedTableIds,
  tableBadges,
  tableTones,
  availableTableIds,
  allowUnavailableSelect,
  showTableViewButtons = true,
  layoutLocked = false,
  deleteMode = false,
  modelUrl = GLB_MODEL_PATH,
  zoom,
  onDetectedTablesChange,
  onDeselect,
  onSelect,
  onMove,
  onDelete,
  onView,
  onBadgeSelect
}: FloorPlan3DProps) {
  const optimisticPositionsRef = useRef<Record<string, { positionX: number; positionY: number }>>({});
  const [draftTables, setDraftTables] = useState(tables);
  const { t } = useI18n();
  const rememberOptimisticMove = useCallback(
    (tableId: string, position: { positionX: number; positionY: number }) => {
      optimisticPositionsRef.current[tableId] = position;
    },
    []
  );

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

  return (
    <div
      className="relative w-full max-w-full overflow-hidden rounded-md border border-ink/10 bg-linen"
      style={{
        height: PLAN_HEIGHT
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
        onPointerMissed={onDeselect}
      >
        <RestaurantScene
          availableTableIds={availableTableIds}
          allowUnavailableSelect={allowUnavailableSelect}
          draftTables={draftTables}
          deleteMode={deleteMode}
          layoutLocked={layoutLocked}
          modelUrl={modelUrl}
          mode={mode}
          onOptimisticMove={rememberOptimisticMove}
          selectedTableId={selectedTableId}
          selectedTableIds={selectedTableIds}
          tableBadges={tableBadges}
          tableTones={tableTones}
          showTableViewButtons={showTableViewButtons}
          setDraftTables={setDraftTables}
          tables={tables}
          zoom={zoom}
          onDelete={onDelete}
          onDetectedTablesChange={onDetectedTablesChange}
          onMove={onMove}
          onSelect={onSelect}
          onView={onView}
          onBadgeSelect={onBadgeSelect}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(GLB_MODEL_PATH);
