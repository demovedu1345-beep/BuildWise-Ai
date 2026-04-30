import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  SoftShadows,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, N8AO, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo } from "react";
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

type AssetKey = "bed" | "sofa" | "table" | "lamp" | "wardrobe" | "cabinet" | "chair" | "rug" | "frame";
type MatKey =
  | "oak"
  | "walnut"
  | "fabric"
  | "velvet"
  | "leather"
  | "rug"
  | "plaster"
  | "charcoalPlaster"
  | "tile"
  | "brass"
  | "brushedMetal"
  | "glass"
  | "blackGlass"
  | "warmShade";

type TexturePack = {
  base: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
  metalness: THREE.Texture;
};

type MaterialLibrary = Record<MatKey, THREE.Material> & {
  textures: Record<Exclude<MatKey, "glass" | "blackGlass" | "warmShade">, TexturePack>;
};

const MODEL_PATHS: Record<AssetKey, string> = {
  bed: "/models/buildwise/bed.gltf",
  sofa: "/models/buildwise/sofa.gltf",
  table: "/models/buildwise/table.gltf",
  lamp: "/models/buildwise/lamp.gltf",
  wardrobe: "/models/buildwise/wardrobe.gltf",
  cabinet: "/models/buildwise/cabinet.gltf",
  chair: "/models/buildwise/chair.gltf",
  rug: "/models/buildwise/rug.gltf",
  frame: "/models/buildwise/frame.gltf",
};

const texturePath = (name: string) => `/textures/buildwise/${name}`;

const textureUrls = {
  oakBase: texturePath("oak_base.jpg"),
  oakNormal: texturePath("oak_normal.jpg"),
  oakRough: texturePath("oak_roughness.jpg"),
  oakMetal: texturePath("oak_metalness.jpg"),
  walnutBase: texturePath("walnut_base.jpg"),
  walnutNormal: texturePath("walnut_normal.jpg"),
  walnutRough: texturePath("walnut_roughness.jpg"),
  walnutMetal: texturePath("walnut_metalness.jpg"),
  fabricBase: texturePath("fabric_base.jpg"),
  fabricNormal: texturePath("fabric_normal.jpg"),
  fabricRough: texturePath("fabric_roughness.jpg"),
  fabricMetal: texturePath("fabric_metalness.jpg"),
  velvetBase: texturePath("velvet_base.jpg"),
  velvetNormal: texturePath("velvet_normal.jpg"),
  velvetRough: texturePath("velvet_roughness.jpg"),
  velvetMetal: texturePath("velvet_metalness.jpg"),
  leatherBase: texturePath("leather_base.jpg"),
  leatherNormal: texturePath("leather_normal.jpg"),
  leatherRough: texturePath("leather_roughness.jpg"),
  leatherMetal: texturePath("leather_metalness.jpg"),
  rugBase: texturePath("rug_base.jpg"),
  rugNormal: texturePath("rug_normal.jpg"),
  rugRough: texturePath("rug_roughness.jpg"),
  rugMetal: texturePath("rug_metalness.jpg"),
  plasterBase: texturePath("plaster_base.jpg"),
  plasterNormal: texturePath("plaster_normal.jpg"),
  plasterRough: texturePath("plaster_roughness.jpg"),
  plasterMetal: texturePath("plaster_metalness.jpg"),
  charcoalBase: texturePath("charcoal_plaster_base.jpg"),
  charcoalNormal: texturePath("charcoal_plaster_normal.jpg"),
  charcoalRough: texturePath("charcoal_plaster_roughness.jpg"),
  charcoalMetal: texturePath("charcoal_plaster_metalness.jpg"),
  tileBase: texturePath("tile_base.jpg"),
  tileNormal: texturePath("tile_normal.jpg"),
  tileRough: texturePath("tile_roughness.jpg"),
  tileMetal: texturePath("tile_metalness.jpg"),
  brassBase: texturePath("brass_base.jpg"),
  brassNormal: texturePath("brass_normal.jpg"),
  brassRough: texturePath("brass_roughness.jpg"),
  brassMetal: texturePath("brass_metalness.jpg"),
  metalBase: texturePath("brushed_metal_base.jpg"),
  metalNormal: texturePath("brushed_metal_normal.jpg"),
  metalRough: texturePath("brushed_metal_roughness.jpg"),
  metalMetal: texturePath("brushed_metal_metalness.jpg"),
};

const makePack = (base: THREE.Texture, normal: THREE.Texture, roughness: THREE.Texture, metalness: THREE.Texture): TexturePack => ({
  base,
  normal,
  roughness,
  metalness,
});

const prepareTexture = (texture: THREE.Texture, isColor = false) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
};

const cloneWithRepeat = (texture: THREE.Texture, repeatX: number, repeatY: number) => {
  const cloned = texture.clone();
  cloned.wrapS = THREE.RepeatWrapping;
  cloned.wrapT = THREE.RepeatWrapping;
  cloned.repeat.set(repeatX, repeatY);
  cloned.anisotropy = 16;
  cloned.colorSpace = texture.colorSpace;
  cloned.needsUpdate = true;
  return cloned;
};

const makePBR = (pack: TexturePack, options: { roughness?: number; metalness?: number; tint?: string; env?: number } = {}) =>
  new THREE.MeshStandardMaterial({
    map: pack.base,
    normalMap: pack.normal,
    roughnessMap: pack.roughness,
    metalnessMap: pack.metalness,
    roughness: options.roughness ?? 0.75,
    metalness: options.metalness ?? 0.02,
    color: options.tint ?? "#ffffff",
    envMapIntensity: options.env ?? 0.75,
  });

const cloneMaterial = (material: THREE.Material, highlighted: boolean, selected: boolean) => {
  const cloned = material.clone();
  if ("emissive" in cloned && cloned instanceof THREE.MeshStandardMaterial) {
    cloned.emissive = new THREE.Color(selected ? "#78B8FF" : highlighted ? "#D8B86A" : "#000000");
    cloned.emissiveIntensity = selected ? 0.12 : highlighted ? 0.08 : 0;
  }
  if ("envMapIntensity" in cloned && cloned instanceof THREE.MeshStandardMaterial) {
    cloned.envMapIntensity = Math.max(cloned.envMapIntensity, selected ? 1 : 0.7);
  }
  return cloned;
};

function useMaterialLibrary(): MaterialLibrary {
  const textures = useTexture(textureUrls) as Record<keyof typeof textureUrls, THREE.Texture>;

  useMemo(() => {
    Object.entries(textures).forEach(([key, texture]) => prepareTexture(texture, key.endsWith("Base")));
  }, [textures]);

  return useMemo(() => {
    const packs = {
      oak: makePack(textures.oakBase, textures.oakNormal, textures.oakRough, textures.oakMetal),
      walnut: makePack(textures.walnutBase, textures.walnutNormal, textures.walnutRough, textures.walnutMetal),
      fabric: makePack(textures.fabricBase, textures.fabricNormal, textures.fabricRough, textures.fabricMetal),
      velvet: makePack(textures.velvetBase, textures.velvetNormal, textures.velvetRough, textures.velvetMetal),
      leather: makePack(textures.leatherBase, textures.leatherNormal, textures.leatherRough, textures.leatherMetal),
      rug: makePack(textures.rugBase, textures.rugNormal, textures.rugRough, textures.rugMetal),
      plaster: makePack(textures.plasterBase, textures.plasterNormal, textures.plasterRough, textures.plasterMetal),
      charcoalPlaster: makePack(textures.charcoalBase, textures.charcoalNormal, textures.charcoalRough, textures.charcoalMetal),
      tile: makePack(textures.tileBase, textures.tileNormal, textures.tileRough, textures.tileMetal),
      brass: makePack(textures.brassBase, textures.brassNormal, textures.brassRough, textures.brassMetal),
      brushedMetal: makePack(textures.metalBase, textures.metalNormal, textures.metalRough, textures.metalMetal),
    };

    const glass = new THREE.MeshPhysicalMaterial({
      color: "#DCEEFF",
      map: packs.plaster.base,
      normalMap: packs.plaster.normal,
      roughnessMap: packs.plaster.roughness,
      metalness: 0,
      roughness: 0.04,
      transmission: 0.65,
      thickness: 0.18,
      ior: 1.45,
      transparent: true,
      opacity: 0.48,
      envMapIntensity: 1.8,
    });

    const blackGlass = new THREE.MeshPhysicalMaterial({
      color: "#050608",
      map: packs.charcoalPlaster.base,
      normalMap: packs.charcoalPlaster.normal,
      roughnessMap: packs.charcoalPlaster.roughness,
      roughness: 0.16,
      metalness: 0.05,
      clearcoat: 0.7,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.5,
    });

    const warmShade = new THREE.MeshStandardMaterial({
      map: packs.fabric.base,
      normalMap: packs.fabric.normal,
      roughnessMap: packs.fabric.roughness,
      metalnessMap: packs.fabric.metalness,
      color: "#F2D7A1",
      roughness: 0.92,
      metalness: 0,
      emissive: "#FFE0A3",
      emissiveIntensity: 0.55,
    });

    return {
      oak: makePBR(packs.oak, { roughness: 0.58, metalness: 0.03, env: 0.75 }),
      walnut: makePBR(packs.walnut, { roughness: 0.62, metalness: 0.02, env: 0.7 }),
      fabric: makePBR(packs.fabric, { roughness: 0.96, metalness: 0, env: 0.42 }),
      velvet: makePBR(packs.velvet, { roughness: 0.9, metalness: 0, env: 0.48 }),
      leather: makePBR(packs.leather, { roughness: 0.58, metalness: 0.02, env: 0.82 }),
      rug: makePBR(packs.rug, { roughness: 1, metalness: 0, env: 0.25 }),
      plaster: makePBR(packs.plaster, { roughness: 0.98, metalness: 0, env: 0.22 }),
      charcoalPlaster: makePBR(packs.charcoalPlaster, { roughness: 0.96, metalness: 0, env: 0.24 }),
      tile: makePBR(packs.tile, { roughness: 0.68, metalness: 0, env: 0.82 }),
      brass: makePBR(packs.brass, { roughness: 0.32, metalness: 0.95, env: 1.25 }),
      brushedMetal: makePBR(packs.brushedMetal, { roughness: 0.28, metalness: 0.9, env: 1.2 }),
      glass,
      blackGlass,
      warmShade,
      textures: packs,
    };
  }, [textures]);
}

const chooseAsset = (item: PlacedItem): AssetKey | null => {
  const token = `${item.id} ${item.name}`.toLowerCase();
  if (token.includes("flooring") || token.includes("paint")) return null;
  if (token.includes("bed") && !token.includes("bedside")) return "bed";
  if (token.includes("sofa")) return "sofa";
  if (token.includes("wardrobe")) return "wardrobe";
  if (token.includes("rug")) return "rug";
  if (token.includes("lamp") || token.includes("light") || token.includes("chandelier") || token.includes("pendant")) return "lamp";
  if (token.includes("coffee") || token.includes("table")) return "table";
  if (token.includes("armchair") || token.includes("stool") || token.includes("chair")) return "chair";
  if (token.includes("art") || token.includes("mirror") || token.includes("tv") || token.includes("headboard")) return "frame";
  if (token.includes("cabinet") || token.includes("dresser") || token.includes("unit") || token.includes("vanity") || token.includes("island")) return "cabinet";
  return null;
};

const isFixture = (item: PlacedItem) => {
  const token = `${item.id} ${item.name}`.toLowerCase();
  return token.includes("chimney") || token.includes("hob") || token.includes("counter") || token.includes("shower") || token.includes("wc");
};

const pickSurfaceMaterial = (item: PlacedItem, meshName: string, materials: MaterialLibrary, highlighted: boolean, selected: boolean) => {
  const itemText = `${item.id} ${item.name} ${item.material}`.toLowerCase();
  const meshText = meshName.toLowerCase();

  let key: MatKey = "oak";
  if (meshText.includes("glass") || meshText.includes("mirror")) key = itemText.includes("tv") ? "blackGlass" : "glass";
  else if (meshText.includes("metal") || meshText.includes("handle") || meshText.includes("leg") || itemText.includes("brass")) key = itemText.includes("brass") ? "brass" : "brushedMetal";
  else if (meshText.includes("shade") || meshText.includes("diffuser")) key = "warmShade";
  else if (meshText.includes("fabric") || meshText.includes("mattress") || meshText.includes("pillow") || meshText.includes("cushion") || meshText.includes("canvas")) {
    key = itemText.includes("leather") ? "leather" : itemText.includes("velvet") || itemText.includes("luxury") ? "velvet" : "fabric";
  } else if (itemText.includes("rug")) key = "rug";
  else if (itemText.includes("granite") || itemText.includes("ceramic") || itemText.includes("tile")) key = "tile";
  else if (itemText.includes("luxury") || itemText.includes("walnut")) key = "walnut";

  return cloneMaterial(materials[key], highlighted, selected);
};

const useInteractiveHandlers = (item: PlacedItem, onHover: (id: string | null) => void, onSelect: (id: string | null) => void) => ({
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(item.id);
    document.body.style.cursor = "pointer";
  },
  onPointerOut: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(null);
    document.body.style.cursor = "default";
  },
  onClick: (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(item.id);
  },
});

const SelectionGlow = ({ item, active }: { item: PlacedItem; active: boolean }) => {
  if (!active) return null;
  const radius = Math.max(item.size[0], item.size[2]) * 0.62;
  return (
    <mesh position={[item.pos[0], 0.018, item.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.88, radius, 80]} />
      <meshBasicMaterial color="#8FC7FF" transparent opacity={0.46} side={THREE.DoubleSide} />
    </mesh>
  );
};

const FurnitureModel = ({
  item,
  asset,
  materials,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  item: PlacedItem;
  asset: AssetKey;
  materials: MaterialLibrary;
  hovered: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) => {
  const gltf = useGLTF(MODEL_PATHS[asset]);
  const highlighted = hovered || selected;
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.material = pickSurfaceMaterial(item, `${node.name} ${(node.material as THREE.Material | undefined)?.name ?? ""}`, materials, highlighted, selected);
      }
    });
    return cloned;
  }, [gltf.scene, item, materials, highlighted, selected]);

  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const sx = item.size[0] / Math.max(size.x, 0.001);
    const sy = Math.max(item.size[1], 0.04) / Math.max(size.y, 0.001);
    const sz = item.size[2] / Math.max(size.z, 0.001);
    return {
      scale: [sx, sy, sz] as [number, number, number],
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, item.size]);

  const bottomY = Math.max(0, item.pos[1] - item.size[1] / 2);
  const position: [number, number, number] = [item.pos[0], bottomY, item.pos[2]];
  const handlers = useInteractiveHandlers(item, onHover, onSelect);

  return (
    <group position={position} rotation={[0, item.rot ?? 0, 0]} scale={scale} {...handlers}>
      <primitive object={scene} position={offset} />
      {asset === "lamp" && (
        <pointLight
          position={[0, Math.max(0.25, item.size[1] * 0.74), 0]}
          intensity={item.id.includes("ceiling") || item.id.includes("pendant") || item.id.includes("ceil") ? 0.55 : 0.85}
          distance={item.id.includes("floor") ? 5.2 : 3.6}
          decay={2}
          color="#FFDCA8"
          castShadow
          shadow-mapSize={[768, 768]}
        />
      )}
    </group>
  );
};

const Walls = ({ W, D, H, plan, materials }: { W: number; D: number; H: number; plan: StudioPlan; materials: MaterialLibrary }) => {
  const floorPack = plan.input.room === "bathroom" || plan.input.room === "kitchen" ? materials.textures.tile : plan.input.style === "luxury" ? materials.textures.walnut : materials.textures.oak;
  const wallPack = plan.input.style === "luxury" ? materials.textures.charcoalPlaster : materials.textures.plaster;

  const floorMat = useMemo(() => {
    const rx = Math.max(2, W / 1.15);
    const ry = Math.max(2, D / 1.15);
    return new THREE.MeshStandardMaterial({
      map: cloneWithRepeat(floorPack.base, rx, ry),
      normalMap: cloneWithRepeat(floorPack.normal, rx, ry),
      roughnessMap: cloneWithRepeat(floorPack.roughness, rx, ry),
      metalnessMap: cloneWithRepeat(floorPack.metalness, rx, ry),
      roughness: plan.input.room === "bathroom" || plan.input.room === "kitchen" ? 0.64 : 0.58,
      metalness: 0.02,
      envMapIntensity: 0.78,
    });
  }, [D, W, floorPack, plan.input.room]);

  const wallMat = useMemo(() => {
    const rx = Math.max(1.5, W / 1.7);
    const ry = Math.max(1.5, H / 1.2);
    return new THREE.MeshStandardMaterial({
      map: cloneWithRepeat(wallPack.base, rx, ry),
      normalMap: cloneWithRepeat(wallPack.normal, rx, ry),
      roughnessMap: cloneWithRepeat(wallPack.roughness, rx, ry),
      metalnessMap: cloneWithRepeat(wallPack.metalness, rx, ry),
      roughness: 0.98,
      metalness: 0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.18,
    });
  }, [H, W, wallPack]);

  const sideWallMat = useMemo(() => wallMat.clone(), [wallMat]);
  const ceilingMat = useMemo(() => cloneMaterial(materials.plaster, false, false), [materials.plaster]);
  const trimMat = useMemo(() => cloneMaterial(plan.input.style === "luxury" ? materials.brass : materials.walnut, false, false), [materials, plan.input.style]);
  const glassMat = useMemo(() => cloneMaterial(materials.glass, false, false), [materials.glass]);
  const frameMat = useMemo(() => cloneMaterial(plan.input.style === "luxury" ? materials.brass : materials.brushedMetal, false, false), [materials, plan.input.style]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[W, D, 12, 12]} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceilingMat} receiveShadow>
        <planeGeometry args={[W, D, 4, 4]} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]} material={wallMat} receiveShadow>
        <planeGeometry args={[W, H, 10, 6]} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={sideWallMat} receiveShadow>
        <planeGeometry args={[D, H, 10, 6]} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={sideWallMat} receiveShadow>
        <planeGeometry args={[D, H, 10, 6]} />
      </mesh>

      {[
        { p: [0, 0.055, -D / 2 + 0.018] as [number, number, number], s: [W, 0.11, 0.035] as [number, number, number] },
        { p: [-W / 2 + 0.018, 0.055, 0] as [number, number, number], s: [0.035, 0.11, D] as [number, number, number] },
        { p: [W / 2 - 0.018, 0.055, 0] as [number, number, number], s: [0.035, 0.11, D] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.p} material={trimMat} castShadow receiveShadow>
          <boxGeometry args={b.s} />
        </mesh>
      ))}

      <group position={[0, H * 0.56, -D / 2 + 0.022]}>
        <mesh material={glassMat}>
          <planeGeometry args={[Math.min(W * 0.48, 2.4), Math.min(H * 0.45, 1.32)]} />
        </mesh>
        <mesh position={[0, 0, 0.018]} material={frameMat} castShadow>
          <boxGeometry args={[Math.min(W * 0.48, 2.4) + 0.12, 0.06, 0.055]} />
        </mesh>
        <mesh position={[0, Math.min(H * 0.225, 0.66), 0.018]} material={frameMat} castShadow>
          <boxGeometry args={[Math.min(W * 0.48, 2.4) + 0.12, 0.055, 0.055]} />
        </mesh>
        <mesh position={[0, -Math.min(H * 0.225, 0.66), 0.018]} material={frameMat} castShadow>
          <boxGeometry args={[Math.min(W * 0.48, 2.4) + 0.12, 0.055, 0.055]} />
        </mesh>
        <mesh position={[-Math.min(W * 0.24, 1.2), 0, 0.018]} material={frameMat} castShadow>
          <boxGeometry args={[0.055, Math.min(H * 0.45, 1.32) + 0.12, 0.055]} />
        </mesh>
        <mesh position={[Math.min(W * 0.24, 1.2), 0, 0.018]} material={frameMat} castShadow>
          <boxGeometry args={[0.055, Math.min(H * 0.45, 1.32) + 0.12, 0.055]} />
        </mesh>
      </group>
    </group>
  );
};

const DetailedFixture = ({
  item,
  materials,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  item: PlacedItem;
  materials: MaterialLibrary;
  hovered: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) => {
  const token = `${item.id} ${item.name}`.toLowerCase();
  const highlighted = hovered || selected;
  const handlers = useInteractiveHandlers(item, onHover, onSelect);
  const wood = useMemo(() => cloneMaterial(materials.walnut, highlighted, selected), [materials.walnut, highlighted, selected]);
  const metal = useMemo(() => cloneMaterial(materials.brushedMetal, highlighted, selected), [materials.brushedMetal, highlighted, selected]);
  const glass = useMemo(() => cloneMaterial(token.includes("hob") ? materials.blackGlass : materials.glass, highlighted, selected), [materials.blackGlass, materials.glass, highlighted, selected, token]);
  const tile = useMemo(() => cloneMaterial(materials.tile, highlighted, selected), [materials.tile, highlighted, selected]);
  const basePos: [number, number, number] = [item.pos[0], Math.max(0, item.pos[1] - item.size[1] / 2), item.pos[2]];

  if (token.includes("shower")) {
    return (
      <group position={basePos} rotation={[0, item.rot ?? 0, 0]} {...handlers}>
        <mesh position={[0, item.size[1] / 2, -item.size[2] / 2]} material={glass} castShadow receiveShadow>
          <boxGeometry args={[item.size[0], item.size[1], 0.035]} />
        </mesh>
        <mesh position={[-item.size[0] / 2, item.size[1] / 2, 0]} material={glass} castShadow receiveShadow>
          <boxGeometry args={[0.035, item.size[1], item.size[2]]} />
        </mesh>
        <mesh position={[0, 0.035, 0]} material={tile} receiveShadow>
          <boxGeometry args={[item.size[0], 0.07, item.size[2]]} />
        </mesh>
        {[[-item.size[0] / 2, item.size[1] * 0.5, -item.size[2] / 2], [item.size[0] / 2, item.size[1] * 0.5, -item.size[2] / 2]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} material={metal} castShadow>
            <cylinderGeometry args={[0.025, 0.025, item.size[1], 18]} />
          </mesh>
        ))}
      </group>
    );
  }

  if (token.includes("hob")) {
    return (
      <group position={basePos} rotation={[0, item.rot ?? 0, 0]} {...handlers}>
        <mesh position={[0, item.size[1] / 2, 0]} material={glass} castShadow receiveShadow>
          <boxGeometry args={item.size} />
        </mesh>
        {[-0.22, 0.22].flatMap((x) => [-0.14, 0.14].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, item.size[1] + 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} material={metal} castShadow>
            <torusGeometry args={[0.095, 0.008, 10, 36]} />
          </mesh>
        )))}
      </group>
    );
  }

  if (token.includes("chimney")) {
    return (
      <group position={basePos} rotation={[0, item.rot ?? 0, 0]} {...handlers}>
        <mesh position={[0, item.size[1] * 0.2, 0]} material={metal} castShadow receiveShadow>
          <coneGeometry args={[item.size[0] * 0.48, item.size[0] * 0.26, item.size[1] * 0.42, 4]} />
        </mesh>
        <mesh position={[0, item.size[1] * 0.65, 0]} material={metal} castShadow receiveShadow>
          <boxGeometry args={[item.size[0] * 0.34, item.size[1] * 0.7, item.size[2] * 0.45]} />
        </mesh>
      </group>
    );
  }

  if (token.includes("wc")) {
    return (
      <group position={basePos} rotation={[0, item.rot ?? 0, 0]} {...handlers}>
        <mesh position={[0, item.size[1] * 0.26, 0.05]} material={tile} castShadow receiveShadow>
          <cylinderGeometry args={[item.size[0] * 0.42, item.size[0] * 0.34, item.size[1] * 0.5, 32, 1, false]} />
        </mesh>
        <mesh position={[0, item.size[1] * 0.72, -item.size[2] * 0.28]} material={tile} castShadow receiveShadow>
          <boxGeometry args={[item.size[0] * 0.9, item.size[1] * 0.46, item.size[2] * 0.18]} />
        </mesh>
        <mesh position={[0, item.size[1] * 0.54, 0.05]} rotation={[-Math.PI / 2, 0, 0]} material={glass} castShadow>
          <torusGeometry args={[item.size[0] * 0.28, 0.018, 12, 44]} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={basePos} rotation={[0, item.rot ?? 0, 0]} {...handlers}>
      <mesh position={[0, item.size[1] * 0.5, 0]} material={wood} castShadow receiveShadow>
        <boxGeometry args={item.size} />
      </mesh>
      <mesh position={[0, item.size[1] + 0.035, 0]} material={tile} castShadow receiveShadow>
        <boxGeometry args={[item.size[0] * 1.02, 0.07, item.size[2] * 1.02]} />
      </mesh>
    </group>
  );
};

const RoomObjects = ({
  plan,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  materials,
}: {
  plan: StudioPlan;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  materials: MaterialLibrary;
}) => (
  <>
    {plan.items
      .filter((item) => item.size[0] > 0 && item.size[1] > 0 && !item.id.includes("flooring") && !item.id.includes("paint"))
      .map((item) => {
        const asset = chooseAsset(item);
        const hovered = hoveredId === item.id;
        const selected = selectedId === item.id;
        return (
          <group key={item.id}>
            <SelectionGlow item={item} active={hovered || selected} />
            {asset ? (
              <FurnitureModel
                item={item}
                asset={asset}
                materials={materials}
                hovered={hovered}
                selected={selected}
                onHover={onHover}
                onSelect={onSelect}
              />
            ) : isFixture(item) ? (
              <DetailedFixture
                item={item}
                materials={materials}
                hovered={hovered}
                selected={selected}
                onHover={onHover}
                onSelect={onSelect}
              />
            ) : null}
          </group>
        );
      })}
  </>
);

const SceneSettings = ({ night }: { night: boolean }) => {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMappingExposure = night ? 0.82 : 1.05;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, night]);
  return null;
};

const RealisticScene = ({ plan, hoveredId, selectedId, onHover, onSelect, night }: RoomSceneProps) => {
  const W = plan.input.width;
  const D = plan.input.depth;
  const H = plan.input.height ?? 2.7;
  const materials = useMaterialLibrary();

  return (
    <>
      <SceneSettings night={night} />
      <color attach="background" args={[night ? "#08090C" : "#15171C"]} />
      <fog attach="fog" args={[night ? "#08090C" : "#15171C", 12, 34]} />
      <SoftShadows size={24} samples={12} focus={0.7} />

      <ambientLight intensity={night ? 0.055 : 0.16} />
      <hemisphereLight args={[night ? "#1C2B4A" : "#FFF1D6", "#12100E", night ? 0.16 : 0.28]} />
      <directionalLight
        position={[W * 0.36, H * 2.35, D * 0.25]}
        intensity={night ? 0.34 : 2.7}
        color={night ? "#8BA4DC" : "#FFE0B2"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.025}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-W}
        shadow-camera-right={W}
        shadow-camera-top={D}
        shadow-camera-bottom={-D}
      />
      <directionalLight position={[-W * 0.8, H * 1.4, D * 0.7]} intensity={night ? 0.12 : 0.38} color={night ? "#344870" : "#DCEBFF"} />
      <pointLight position={[0, H - 0.35, 0]} intensity={night ? 0.8 : 0.28} distance={Math.max(W, D) * 1.25} decay={2} color="#FFD7A0" castShadow={false} />

      <Walls W={W} D={D} H={H} plan={plan} materials={materials} />
      <RoomObjects plan={plan} hoveredId={hoveredId} selectedId={selectedId} onHover={onHover} onSelect={onSelect} materials={materials} />

      <ContactShadows position={[0, 0.012, 0]} opacity={night ? 0.5 : 0.72} scale={Math.max(W, D) * 1.35} blur={2.6} far={2.6} resolution={512} color="#000000" />
      <Environment preset={night ? "night" : "apartment"} background={false} environmentIntensity={night ? 0.28 : 0.95} blur={0.35} />

      <EffectComposer multisampling={0} enableNormalPass>
        <N8AO aoRadius={1.0} distanceFalloff={0.8} intensity={1.4} quality="low" />
        <Bloom luminanceThreshold={1.15} luminanceSmoothing={0.22} intensity={night ? 0.12 : 0.06} mipmapBlur />
        <Vignette offset={0.42} darkness={0.32} />
      </EffectComposer>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={1.4}
        maxDistance={Math.max(W, D) * 2.15}
        maxPolarAngle={Math.PI / 2 - 0.035}
        minPolarAngle={Math.PI / 8}
        target={[0, 1.08, -D * 0.08]}
        enableDamping
        dampingFactor={0.075}
      />
    </>
  );
};

export const RoomScene = ({ plan, hoveredId, selectedId, onHover, onSelect, night }: RoomSceneProps) => {
  const W = plan.input.width;
  const D = plan.input.depth;
  const eyeX = Math.min(Math.max(W * 0.82, 2.8), 4.6);
  const eyeZ = Math.min(Math.max(D * 0.9, 3.1), 5.4);

  return (
    <Canvas
      shadows="soft"
      camera={{ position: [eyeX, 1.72, eyeZ], fov: 46, near: 0.1, far: 80 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      performance={{ min: 0.5 }}
    >
      <Suspense fallback={null}>
        <RealisticScene plan={plan} hoveredId={hoveredId} selectedId={selectedId} onHover={onHover} onSelect={onSelect} night={night} />
      </Suspense>
    </Canvas>
  );
};

Object.values(MODEL_PATHS).forEach((path) => useGLTF.preload(path));
