import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';

export const Environment3D: React.FC = () => {
  const lightGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (lightGroupRef.current) {
      lightGroupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <>
      {/* Background Starfield */}
      <Stars radius={60} depth={40} count={3000} factor={4} saturation={0.5} fade speed={1.5} />

      {/* Atmospheric Ambient Lighting */}
      <ambientLight intensity={0.65} color="#cbd5e1" />

      {/* Rotating Cosmic Rim Lights */}
      <group ref={lightGroupRef}>
        <pointLight position={[10, 8, 10]} intensity={2.0} color="#38bdf8" distance={30} />
        <pointLight position={[-10, 8, -10]} intensity={2.0} color="#ec4899" distance={30} />
      </group>

      {/* Directional Key Light for Tabletop */}
      <directionalLight
        position={[4, 12, 6]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </>
  );
};
