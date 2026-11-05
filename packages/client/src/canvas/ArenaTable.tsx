import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TurnDirection } from '@cosmic/shared';

interface ArenaTableProps {
  direction: TurnDirection;
}

export const ArenaTable: React.FC<ArenaTableProps> = ({ direction }) => {
  const directionRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (directionRingRef.current) {
      const dirSign = direction === 'CLOCKWISE' ? -1 : 1;
      directionRingRef.current.rotation.z += delta * 0.8 * dirSign;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Main Holographic Tabletop Disc */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[2.8, 3.0, 0.4, 32]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer Table Neon Rim */}
      <mesh position={[0, 0.21, 0]}>
        <ringGeometry args={[2.7, 2.85, 32]} />
        <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating Direction Ring */}
      <mesh ref={directionRingRef} position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.45, 16]} />
        <meshBasicMaterial
          color={direction === 'CLOCKWISE' ? '#38bdf8' : '#ec4899'}
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Central Table Recess for Hologram Core */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.2, 24]} />
        <meshStandardMaterial color="#020617" roughness={0.5} metalness={0.9} />
      </mesh>

      {/* Cyber Base Pedestal */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[1.4, 2.2, 0.8, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Floor Cyber Grid */}
      <mesh position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#030712" roughness={0.8} metalness={0.5} />
      </mesh>

      <gridHelper args={[16, 16, '#06b6d4', '#1e293b']} position={[0, -0.99, 0]} />
    </group>
  );
};
