import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Float } from "@react-three/drei";
import { useMemo } from "react";

interface Props {
  bhk: number;
  sqft: number;
}

export const HouseModel = ({ bhk, sqft }: Props) => {
  // Scale base size with sqft
  const scale = useMemo(() => Math.max(0.7, Math.min(1.6, sqft / 1200)), [sqft]);
  const width = 4 * scale;
  const depth = 3 * scale;
  const height = bhk >= 3 ? 2.6 : 2;

  const blue = "#3aa9ff";
  const gold = "#e0b24a";

  // Room layout inside the house (subdivisions)
  const rooms = useMemo(() => {
    const r: { x: number; z: number; w: number; d: number; tone: string }[] = [];
    const halfW = width / 2;
    const halfD = depth / 2;
    if (bhk <= 2) {
      r.push({ x: -halfW / 2, z: 0, w: width / 2, d: depth, tone: blue });
      r.push({ x: halfW / 2, z: -halfD / 2, w: width / 2, d: depth / 2, tone: gold });
      r.push({ x: halfW / 2, z: halfD / 2, w: width / 2, d: depth / 2, tone: blue });
    } else {
      r.push({ x: -halfW / 1.5, z: -halfD / 2, w: width / 3, d: depth / 2, tone: blue });
      r.push({ x: -halfW / 1.5, z: halfD / 2, w: width / 3, d: depth / 2, tone: blue });
      r.push({ x: 0, z: 0, w: width / 3, d: depth, tone: gold });
      r.push({ x: halfW / 1.5, z: -halfD / 2, w: width / 3, d: depth / 2, tone: blue });
      r.push({ x: halfW / 1.5, z: halfD / 2, w: width / 3, d: depth / 2, tone: gold });
    }
    return r;
  }, [bhk, width, depth]);

  return (
    <Canvas camera={{ position: [6, 5, 7], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#0a0d12"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#a9d8ff" />
      <directionalLight position={[-5, 3, -5]} intensity={0.6} color="#e0b24a" />
      <pointLight position={[0, 4, 0]} intensity={0.6} color="#3aa9ff" />

      {/* Ground plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#0d1118" metalness={0.3} roughness={0.8} />
      </mesh>

      {/* Subtle grid */}
      <gridHelper args={[16, 32, "#1a2330", "#10161e"]} position={[0, 0, 0]} />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
        {/* Outer shell wireframe */}
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={blue}
            transparent
            opacity={0.06}
            metalness={0.6}
            roughness={0.2}
            emissive={blue}
            emissiveIntensity={0.15}
          />
          <Edges color={blue} threshold={15} />
        </mesh>

        {/* Roof */}
        <mesh position={[0, height + 0.4, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[Math.max(width, depth) * 0.75, 0.8, 4]} />
          <meshStandardMaterial color={gold} transparent opacity={0.12} emissive={gold} emissiveIntensity={0.2} />
          <Edges color={gold} />
        </mesh>

        {/* Room divisions */}
        {rooms.map((r, i) => (
          <mesh key={i} position={[r.x, height / 2, r.z]}>
            <boxGeometry args={[r.w * 0.95, height * 0.92, r.d * 0.95]} />
            <meshStandardMaterial color={r.tone} transparent opacity={0.04} />
            <Edges color={r.tone} threshold={15} />
          </mesh>
        ))}

        {/* Door */}
        <mesh position={[0, 0.5, depth / 2 + 0.001]}>
          <planeGeometry args={[0.6, 1]} />
          <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.4} transparent opacity={0.5} />
        </mesh>
      </Float>

      <OrbitControls enablePan={false} minDistance={6} maxDistance={14} maxPolarAngle={Math.PI / 2.1} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  );
};
