import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  SoftShadows,
  AccumulativeShadows,
  RandomizedLight,
  BakeShadows,
} from "@react-three/drei";
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

/* ----------------------------- Materials ---------------------------------- */
/** Procedural fine-grain noise texture used to break up flat PBR surfaces. */
function makeNoiseTexture(size = 256, contrast = 18) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * contrast * 2;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Wood-plank albedo + grain. */
function makeWoodTexture(base = "#9C7A52", planks = 8, size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const plankH = size / planks;
  for (let i = 0; i < planks; i++) {
    // tonal variation per plank
    const shade = 0.85 + Math.random() * 0.3;
    const col = new THREE.Color(base).multiplyScalar(shade);
    ctx.fillStyle = `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
    ctx.fillRect(0, i * plankH, size, plankH);
    // grain streaks
    for (let j = 0; j < 40; j++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      const y = i * plankH + Math.random() * plankH;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 4, size * 0.6, y + (Math.random() - 0.5) * 4, size, y);
      ctx.stroke();
    }
    // dark seam between planks
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, i * plankH, size, 1.5);
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Subtle plaster/wall normal-ish bumpiness via noise. */
function makeWallBumpTexture(size = 512) {
  return makeNoiseTexture(size, 10);
}

/* --------------------------------- Walls ---------------------------------- */
const Walls = ({ W, D, H, palette }: { W: number; D: number; H: number; palette: StudioPlan["palette"] }) => {
  const wallBump = useMemo(() => makeWallBumpTexture(), []);
  const woodTex = useMemo(() => {
    const t = makeWoodTexture(palette.floor, 10, 512);
    t.repeat.set(Math.max(2, W / 1.2), Math.max(2, D / 1.2));
    return t;
  }, [palette.floor, W, D]);
  const floorBump = useMemo(() => {
    const t = makeNoiseTexture(256, 8);
    t.repeat.set(Math.max(2, W / 1.2), Math.max(2, D / 1.2));
    return t;
  }, [W, D]);

  const wallMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: palette.wall,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.BackSide,
      bumpMap: wallBump,
      bumpScale: 0.015,
    });
    return m;
  }, [palette.wall, wallBump]);

  const floorMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.55,
      metalness: 0.04,
      bumpMap: floorBump,
      bumpScale: 0.02,
      envMapIntensity: 0.7,
    });
    return m;
  }, [woodTex, floorBump]);

  const ceilMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#F5F2EE", roughness: 1, metalness: 0 }),
    []
  );

  const trimMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.6, metalness: 0.05 }),
    [palette.trim]
  );

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceilMat} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, H / 2, -D / 2]} material={wallMat} receiveShadow>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[D, H]} />
      </mesh>

      {/* Skirting / baseboards on all 4 walls — adds architectural realism */}
      {[
        { p: [0, 0.05, -D / 2 + 0.01] as [number, number, number], s: [W, 0.1, 0.02] as [number, number, number] },
        { p: [0, 0.05, D / 2 - 0.01] as [number, number, number],  s: [W, 0.1, 0.02] as [number, number, number] },
        { p: [-W / 2 + 0.01, 0.05, 0] as [number, number, number], s: [0.02, 0.1, D] as [number, number, number] },
        { p: [W / 2 - 0.01, 0.05, 0] as [number, number, number],  s: [0.02, 0.1, D] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.p} material={trimMat} receiveShadow>
          <boxGeometry args={b.s} />
        </mesh>
      ))}

      {/* Window on back wall — adds light realism */}
      <mesh position={[0, H * 0.55, -D / 2 + 0.03]}>
        <planeGeometry args={[Math.min(W * 0.5, 2.2), Math.min(H * 0.45, 1.3)]} />
        <meshStandardMaterial
          color="#BBD8F0"
          emissive="#FFE9C8"
          emissiveIntensity={0.65}
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
};

/* --------------------------------- Items ---------------------------------- */
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
  // Highlight via emissive + thin outline ring
  const emissive = selected ? "#3B82F6" : hovered ? "#D4AF37" : "#000000";
  const emissiveIntensity = selected ? 0.35 : hovered ? 0.25 : 0;

  // Per-shape PBR tuning for realism
  const isMetalAccent = item.material?.toLowerCase().includes("metal") || item.material?.toLowerCase().includes("brass") || item.material?.toLowerCase().includes("steel");
  const isGlass = item.material?.toLowerCase().includes("glass");
  const isFabric = item.material?.toLowerCase().includes("fabric") || item.material?.toLowerCase().includes("velvet") || item.material?.toLowerCase().includes("wool");
  const isLeather = item.material?.toLowerCase().includes("leather");
  const isWood = item.material?.toLowerCase().includes("wood") || item.material?.toLowerCase().includes("plywood") || item.material?.toLowerCase().includes("laminate");

  let roughness = 0.6;
  let metalness = 0.02;
  let envMapIntensity = 0.8;
  if (isGlass)        { roughness = 0.05; metalness = 0.0; envMapIntensity = 1.4; }
  else if (isMetalAccent) { roughness = 0.25; metalness = 0.85; envMapIntensity = 1.2; }
  else if (isFabric)  { roughness = 0.95; metalness = 0.0;  envMapIntensity = 0.5; }
  else if (isLeather) { roughness = 0.55; metalness = 0.05; envMapIntensity = 0.9; }
  else if (isWood)    { roughness = 0.55; metalness = 0.04; envMapIntensity = 0.7; }

  const common = {
    onPointerOver: (e: any) => { e.stopPropagation(); onHover(item.id); document.body.style.cursor = "pointer"; },
    onPointerOut:  (e: any) => { e.stopPropagation(); onHover(null);     document.body.style.cursor = "default"; },
    onClick:       (e: any) => { e.stopPropagation(); onSelect(item.id); },
    castShadow: true,
    receiveShadow: true,
  };

  /* ----- LAMP ----- */
  if (item.shape === "lamp") {
    return (
      <group position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
        {/* Lamp shade */}
        <mesh {...common}>
          <cylinderGeometry args={[item.size[0] / 2, item.size[0] / 2 * 0.85, item.size[1], 24]} />
          <meshStandardMaterial
            color={item.color}
            emissive={"#FFE6B0"}
            emissiveIntensity={0.9}
            roughness={0.6}
            metalness={0.0}
          />
        </mesh>
        {selected && (
          <mesh>
            <boxGeometry args={[item.size[0] + 0.04, item.size[1] + 0.04, item.size[2] + 0.04]} />
            <meshBasicMaterial color="#3B82F6" wireframe />
          </mesh>
        )}
        <pointLight
          intensity={1.2}
          distance={5}
          decay={2}
          color="#FFE2A8"
          castShadow
          shadow-mapSize={[512, 512]}
        />
      </group>
    );
  }

  /* ----- RUG ----- */
  if (item.shape === "rug") {
    return (
      <mesh
        {...common}
        position={item.pos}
        rotation={[-Math.PI / 2, 0, item.rot ?? 0]}
      >
        <planeGeometry args={[item.size[0], item.size[2]]} />
        <meshStandardMaterial
          color={item.color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={1}
          metalness={0}
        />
      </mesh>
    );
  }

  /* ----- CYLINDER ----- */
  if (item.shape === "cylinder") {
    return (
      <mesh {...common} position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
        <cylinderGeometry args={[item.size[0] / 2, item.size[0] / 2, item.size[1], 32]} />
        <meshStandardMaterial
          color={item.color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={roughness}
          metalness={metalness}
          envMapIntensity={envMapIntensity}
        />
      </mesh>
    );
  }

  /* ----- FRAME / FLAT (art, mirror, TV, etc.) ----- */
  if (item.shape === "frame") {
    return (
      <mesh {...common} position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
        <boxGeometry args={item.size} />
        <meshStandardMaterial
          color={item.color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.25}
          envMapIntensity={1.1}
        />
      </mesh>
    );
  }

  /* ----- DEFAULT BOX (sofas, beds, cabinets...) ----- */
  // For glass we use MeshPhysicalMaterial for transmission
  if (isGlass) {
    return (
      <mesh {...common} position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
        <boxGeometry args={item.size} />
        <meshPhysicalMaterial
          color={item.color}
          roughness={0.05}
          metalness={0}
          transmission={0.9}
          thickness={0.4}
          ior={1.45}
          transparent
          opacity={0.6}
          envMapIntensity={1.4}
        />
      </mesh>
    );
  }

  return (
    <mesh {...common} position={item.pos} rotation={[0, item.rot ?? 0, 0]}>
      <boxGeometry args={[...item.size]} />
      <meshStandardMaterial
        color={item.color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={roughness}
        metalness={metalness}
        envMapIntensity={envMapIntensity}
      />
    </mesh>
  );
};

/* --------------------------------- Scene ---------------------------------- */
export const RoomScene = ({ plan, hoveredId, selectedId, onHover, onSelect, night }: RoomSceneProps) => {
  const W = plan.input.width;
  const D = plan.input.depth;
  const H = plan.input.height ?? 2.7;

  const camDist = Math.max(W, D) * 1.5;

  return (
    <Canvas
      shadows="soft"
      camera={{ position: [camDist, camDist * 0.9, camDist], fov: 38, near: 0.1, far: 100 }}
      onPointerMissed={() => onSelect(null)}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[night ? "#08090C" : "#15171C"]} />
      <fog attach="fog" args={[night ? "#08090C" : "#15171C", 16, 40]} />

      <SoftShadows size={25} samples={16} focus={0.8} />

      <Suspense fallback={null}>
        {/* Base ambient (very low — let env light do the work) */}
        <ambientLight intensity={night ? 0.08 : 0.22} />
        <hemisphereLight
          args={[night ? "#1A2440" : "#FFF5E1", "#1A1A1A", night ? 0.15 : 0.35]}
        />

        {/* Key light — sun through "window" */}
        <directionalLight
          position={[W * 0.6, H * 2.2, -D * 0.4]}
          intensity={night ? 0.35 : 2.4}
          color={night ? "#7A93C8" : "#FFE6BC"}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
          shadow-camera-left={-W}
          shadow-camera-right={W}
          shadow-camera-top={D}
          shadow-camera-bottom={-D}
        />

        {/* Fill light — opposite side, cooler */}
        <directionalLight
          position={[-W * 0.8, H * 1.4, D * 0.8]}
          intensity={night ? 0.15 : 0.55}
          color={night ? "#384E78" : "#D6E4FF"}
        />

        {/* Walls + floor + ceiling */}
        <Walls W={W} D={D} H={H} palette={plan.palette} />

        {/* Items */}
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

        {/* Soft contact shadows under furniture for grounded realism */}
        <ContactShadows
          position={[0, 0.005, 0]}
          opacity={night ? 0.45 : 0.7}
          scale={Math.max(W, D) * 1.2}
          blur={2.4}
          far={2.5}
          resolution={1024}
          color="#000000"
        />

        {/* Image-based lighting for realistic reflections & color bleed */}
        <Environment
          preset={night ? "night" : "apartment"}
          environmentIntensity={night ? 0.25 : 0.85}
        />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 1, 0]}
          enableDamping
          dampingFactor={0.08}
        />
      </Suspense>
    </Canvas>
  );
};
