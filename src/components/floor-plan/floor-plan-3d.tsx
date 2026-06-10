"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FloorTable } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

const PLAN_WIDTH = 960;
const PLAN_HEIGHT = 560;
const SCALE = 36;

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

function zoneColor(zone: FloorTable["zone"]) {
  if (zone === "TERRACE") {
    return 0xb66f45;
  }

  if (zone === "VIP") {
    return 0x2e5d50;
  }

  return 0xdfe9df;
}

function makeLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.fillStyle = "rgba(255,255,255,0.92)";
  context.roundRect(12, 18, 232, 58, 12);
  context.fill();
  context.fillStyle = "#16201d";
  context.font = "700 28px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 48);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.8, 0.68, 1);
  sprite.position.set(0, 1.35, 0);
  return sprite;
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
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    const container = mount;

    const availableSet = availableTableIds ? new Set(availableTableIds) : undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f1e8);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 15 / zoom, 19 / zoom);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(3, 12, 8);
    light.castShadow = true;
    scene.add(light);

    const floor = new THREE.Group();
    const zoneMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xdfe9df, roughness: 0.78 }),
      new THREE.MeshStandardMaterial({ color: 0xf7f1e8, roughness: 0.78 }),
      new THREE.MeshStandardMaterial({ color: 0xf0d8c8, roughness: 0.78 })
    ];
    const zoneWidth = PLAN_WIDTH / SCALE / 3;
    const zoneDepth = PLAN_HEIGHT / SCALE;

    zoneMaterials.forEach((material, index) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(zoneWidth, zoneDepth), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.x = (index - 1) * zoneWidth;
      mesh.receiveShadow = true;
      floor.add(mesh);
    });

    const grid = new THREE.GridHelper(PLAN_WIDTH / SCALE, 30, 0x16201d, 0x16201d);
    (grid.material as THREE.Material).opacity = 0.12;
    (grid.material as THREE.Material).transparent = true;
    floor.add(grid);
    scene.add(floor);

    const tableMeshes = new Map<string, THREE.Group>();
    const selectable: THREE.Object3D[] = [];

    for (const table of tables) {
      const disabled = mode === "booking" ? (availableSet ? !availableSet.has(table.id) : !table.active) : false;
      const selected = table.id === selectedTableId;
      const group = new THREE.Group();
      const position = toScenePosition(table.positionX, table.positionY);
      group.position.set(position.x, 0.2, position.z);
      group.rotation.y = THREE.MathUtils.degToRad(-table.rotation);
      group.userData.tableId = table.id;
      group.userData.disabled = disabled;

      const color = selected ? 0xb66f45 : zoneColor(table.zone);
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.24, 1.25),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.55,
          transparent: disabled || !table.active,
          opacity: disabled || !table.active ? 0.38 : 1
        })
      );
      top.castShadow = true;
      top.receiveShadow = true;
      top.userData.tableId = table.id;
      top.userData.disabled = disabled;
      group.add(top);
      selectable.push(top);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.34, 0.6, 18),
        new THREE.MeshStandardMaterial({ color: 0x16201d, roughness: 0.7 })
      );
      base.position.y = -0.35;
      base.castShadow = true;
      group.add(base);

      const chairMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 });
      const chairCount = Math.min(8, Math.max(2, table.capacity));

      for (let index = 0; index < chairCount; index += 1) {
        const angle = (index / chairCount) * Math.PI * 2;
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), chairMaterial);
        chair.position.set(Math.cos(angle) * 1.2, -0.02, Math.sin(angle) * 0.9);
        chair.castShadow = true;
        group.add(chair);
      }

      const label = makeLabel(`${table.label} · ${table.capacity}`);
      if (label) {
        group.add(label);
      }

      scene.add(group);
      tableMeshes.set(table.id, group);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dragPoint = new THREE.Vector3();
    let draggingTableId: string | null = null;
    let moved = false;

    function resize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function setPointer(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function findTable(event: PointerEvent) {
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(selectable, false)[0];
      const tableId = hit?.object.userData.tableId as string | undefined;
      return tableId ? tables.find((table) => table.id === tableId) : undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      const table = findTable(event);
      if (!table) {
        return;
      }

      onSelect?.(table);

      if (mode !== "admin" || layoutLocked) {
        return;
      }

      draggingTableId = table.id;
      moved = false;
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!draggingTableId) {
        return;
      }

      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(dragPlane, dragPoint);

      const group = tableMeshes.get(draggingTableId);
      if (!group) {
        return;
      }

      const next = toPlanPosition(dragPoint.x, dragPoint.z);
      const scenePosition = toScenePosition(next.positionX, next.positionY);
      group.position.x = scenePosition.x;
      group.position.z = scenePosition.z;
      moved = true;
    }

    function handlePointerUp(event: PointerEvent) {
      if (!draggingTableId) {
        return;
      }

      const group = tableMeshes.get(draggingTableId);
      const tableId = draggingTableId;
      draggingTableId = null;

      if (moved && group) {
        onMove?.(tableId, toPlanPosition(group.position.x, group.position.z));
      }

      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    let animationId = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material: THREE.Material) => material.dispose());
        }

        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
    };
  }, [
    availableTableIds,
    layoutLocked,
    mode,
    onMove,
    onSelect,
    selectedTableId,
    tables,
    zoom
  ]);

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-md border border-ink/10 bg-linen">
      <div ref={mountRef} className="absolute inset-0" aria-label={t("floor.title")} />
    </div>
  );
}
