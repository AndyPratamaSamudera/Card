import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface HologramCoreProps {
  coreTotal: number;
  overloadLimit: number;
}

export const HologramCore: React.FC<HologramCoreProps> = ({ coreTotal, overloadLimit }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const ratio = Math.min(1.2, coreTotal / (overloadLimit || 1));

  // Determine core color based on danger ratio
  const coreColor = ratio < 0.6
    ? '#06b6d4' // Safe Cyan
    : ratio < 0.85
    ? '#f59e0b' // Warning Amber
    : '#ef4444'; // Critical Red

  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * (0.8 + ratio * 2);
      coreRef.current.rotation.x += delta * (0.4 + ratio * 1.5);
      // Heartbeat pulse scale
      const pulse = 1 + Math.sin(Date.now() * 0.005 * (1 + ratio * 2)) * (0.05 + ratio * 0.12);
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * (1.2 + ratio * 2);
      ring1Ref.current.rotation.x += delta * 0.5;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * (1.5 + ratio * 2);
      ring2Ref.current.rotation.z -= delta * 0.7;
    }
  });

  return (
    <group position={[0, 0.8, 0]}>
      {/* Central Energy Reactor Orb */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={1.2 + ratio * 2}
          wireframe
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Inner Glowing Core */}
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.6} />
      </mesh>

      {/* Orbital Energy Rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.85, 0.02, 16, 48]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.7} />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.05, 0.02, 16, 48]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.5} />
      </mesh>

      {/* Upward Laser Light Pillar */}
      <mesh ref={beamRef} position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.45, 3.5, 16, 1, true]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.25 + ratio * 0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Point Light Illuminating Arena */}
      <pointLight color={coreColor} intensity={2.5 + ratio * 5} distance={7} decay={2} position={[0, 0.2, 0]} />

      {/* 3D Floating Hologram Value Text */}
      <group position={[0, 1.4, 0]}>
        <Text
          fontSize={0.35}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor={coreColor}
        >
          {`${coreTotal} / ${overloadLimit}`}
        </Text>
        <Text
          position={[0, -0.28, 0]}
          fontSize={0.14}
          color={coreColor}
          anchorX="center"
          anchorY="middle"
        >
          {ratio >= 0.85 ? '⚠️ OVERLOAD DANGER' : ratio >= 0.6 ? 'SURGE WARNING' : 'CORE STABLE'}
        </Text>
      </group>
    </group>
  );
};
