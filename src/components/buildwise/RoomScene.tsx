import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { PlacedItem, StudioPlan } from "@/lib/studio";

interface RoomSceneProps {
  plan: StudioPlan;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  night: boolean;
}

const Walls = ({ W, D, H, palette }: { W: number; D: number; H: number; palette: StudioPlan["palette"] }) => {
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.wall, roughness: 0.95, side: THREE.BackSide }),
    [palette.wall]
  );
  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.floor, roughness: 0.6, metalness: 0.05 }),
    [palette.floor]
  );
  const ceilMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 1 }),
    []
  );

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceilMat}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Walls — back/front/left/right */}
      <mesh position={[0, H / 2, -D / 2]} material={wallMat}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]} material={wallMat}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[D, H]} />
      </mesh>
    </group>
  );
};

const Item = ({
  item,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  item: PlacedItem;
  hovered: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) => {
  const emissive = selected ? "#3B82F6" : hovered ? "#D4AF37" : "#000000";
  const emissiveIntensity = selected ? 0.6 : hovered ? 0.45 : 0;

  const common = {
    onPointerOver: (e: any) => { e.stopPropagation(); onHover(item.id); document.body.style.cursor = "pointer"; },
    onPointerOut: (e: any) => { e.stopPropagation(); onHover(null); document.body.style.cursor = "default"; },
    onClick: (e: any) => { e.stopPropagation(); onSelect(item.id); },
    castShadow: true,
    receiveShadow: true,
  };

  if (item.shape === "lamp") {
    // Lamp = small box + point light
    return (
      <group position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
        <mesh {...common}>
          <boxGeometry args={item.size} />
          <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.6} />
        </mesh>
        {selected && (
          <mesh>
            <boxGeometry args={[item.size[0] + 0.04, item.size[1] + 0.04, item.size[2] + 0.04]} />
            <meshBasicMaterial color="#3B82F6" wireframe />
          </mesh>
        )}
        <pointLight intensity={0.4} distance={4} color="#FFE9A8" />
      </group>
    );
  }

  if (item.shape === "rug") {
    return (
      <mesh
        {...common}
        position={item.pos}
        rotation={[-Math.PI / 2, 0, item.rot ?? 0]}
      >
        <planeGeometry args={[item.size[0], item.size[2]]} />
        <meshStandardMaterial color={item.color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={1} />
      </mesh>
    );
  }

  if (item.shape === "cylinder") {
    return (
      <mesh {...common} position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
        <cylinderGeometry args={[item.size[0] / 2, item.size[0] / 2, item.size[1], 24]} />
        <meshStandardMaterial color={item.color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.5} metalness={0.2} />
      </mesh>
    );
  }

  // default box / frame
  return (
    <mesh {...common} position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
      <boxGeometry args={item.size} />
      <meshStandardMaterial
        color={item.color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={item.shape === "frame" ? 0.4 : 0.7}
        metalness={item.shape === "frame" ? 0.2 : 0.05}
      />
    </mesh>
  );
};

export const RoomScene = ({ plan, hoveredId, selectedId, onHover, onSelect, night }: RoomSceneProps) => {
  const W = plan.input.width;
  const D = plan.input.depth;
  const H = plan.input.height ?? 2.7;

  const camDist = Math.max(W, D) * 1.5;

  return (
    <Canvas
      shadows
      camera={{ position: [camDist, camDist * 0.9, camDist], fov: 45 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={[night ? "#0A0E18" : "#1A1D24"]} />
      <fog attach="fog" args={[night ? "#0A0E18" : "#1A1D24", 12, 30]} />

      <Suspense fallback={null}>
        {/* Ambient + directional */}
        <ambientLight intensity={night ? 0.18 : 0.55} />
        <directionalLight
          position={[6, 8, 4]}
          intensity={night ? 0.25 : 1.1}
          color={night ? "#6688CC" : "#FFF4E0"}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <hemisphereLight args={[night ? "#1A2440" : "#FFFFFF", "#222222", night ? 0.2 : 0.4]} />

        <Walls W={W} D={D} H={H} palette={plan.palette} />

        {plan.items
          .filter((it) => it.size[0] > 0 && it.size[1] > 0)
          .map((it) => (
            <Item
              key={it.id}
              item={it}
              hovered={hoveredId === it.id}
              selected={selectedId === it.id}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))}

        <Environment preset={night ? "night" : "apartment"} />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 1, 0]}
        />
      </Suspense>
    </Canvas>
  );
};
