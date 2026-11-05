import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Player } from '@cosmic/shared';
import { Text } from '@react-three/drei';

interface AlienCharacter3DProps {
  player: Player;
  isActiveTurn: boolean;
  totalPlayers: number;
  index: number;
}

export const AlienCharacter3D: React.FC<AlienCharacter3DProps> = ({
  player,
  isActiveTurn,
  totalPlayers,
  index
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const bombRef = useRef<THREE.Group>(null);

  // Position alien in a circle around the table (radius ~3.6)
  const angle = (index / totalPlayers) * Math.PI * 2 - Math.PI / 2;
  const radius = 3.6;
  const posX = Math.cos(angle) * radius;
  const posZ = Math.sin(angle) * radius;
  // Face the center of the table
  const rotY = Math.atan2(-posX, -posZ);

  // Alien Color Palette based on avatar
  const getAlienColor = () => {
    switch (player.avatarId) {
      case 'alien_zorblax': return '#22c55e'; // Green
      case 'alien_vex': return '#a855f7';     // Purple
      case 'alien_blobbo': return '#f97316';  // Orange
      case 'alien_nebula': return '#38bdf8';  // Cosmic Cyan/Blue
      default: return '#22c55e';
    }
  };

  const alienColor = getAlienColor();

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // 1. Elimination effect: Ejected into space orbit
    if (player.isEliminated) {
      groupRef.current.position.y = 8; // launched into outer space!
      return;
    }

    // 2. Overload Level Deformations & Animations
    if (player.overloadLevel === 2) {
      // Level 2: Violent cartoon vibration & jitter
      const jitterX = (Math.random() - 0.5) * 0.12;
      const jitterY = (Math.random() - 0.5) * 0.12;
      const jitterZ = (Math.random() - 0.5) * 0.12;
      groupRef.current.position.set(posX + jitterX, jitterY, posZ + jitterZ);
    } else {
      // Normal / Level 1 Idle Breathing Sway
      const bob = Math.sin(time * 2.5 + index) * 0.05;
      groupRef.current.position.set(posX, bob, posZ);
    }

    // 3. Head & Body Scaling (Neural Overload Swelling)
    if (headRef.current) {
      if (player.overloadLevel === 1) {
        // Swollen head
        headRef.current.scale.lerp(new THREE.Vector3(1.65, 1.65, 1.65), 0.1);
      } else if (player.overloadLevel === 2) {
        // Dangerously bulging & pulsing head
        const dangerPulse = 1.85 + Math.sin(time * 12) * 0.15;
        headRef.current.scale.set(dangerPulse, dangerPulse, dangerPulse);
      } else {
        // Normal scale
        headRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }

    // 4. Plasma Shield Rotation
    if (shieldRef.current && player.hasShield) {
      shieldRef.current.rotation.y += delta * 1.5;
    }

    // 5. Time Bomb Ticking
    if (bombRef.current && player.timeBombTurnsRemaining !== null) {
      bombRef.current.rotation.y += delta * 3;
      const bScale = 1 + Math.sin(time * 8) * 0.2;
      bombRef.current.scale.set(bScale, bScale, bScale);
    }
  });

  if (player.isEliminated) {
    return null;
  }

  return (
    <group ref={groupRef} position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
      {/* Active Turn Neon Ring on Floor */}
      {isActiveTurn && (
        <mesh position={[0, -0.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating Spotlight for Active Turn */}
      {isActiveTurn && (
        <pointLight color="#38bdf8" intensity={2.5} distance={3} position={[0, 2.5, 0]} />
      )}

      {/* Seat / Futuristic Chair Stool */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Alien Body */}
      <mesh ref={bodyRef} position={[0, 0.15, 0]}>
        <capsuleGeometry args={[0.3, 0.45, 12, 16]} />
        <meshStandardMaterial color={alienColor} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Alien Head (deforms dynamically with Neural Overload) */}
      <mesh ref={headRef} position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.38, 20, 20]} />
        <meshStandardMaterial
          color={player.overloadLevel === 2 ? '#ef4444' : alienColor}
          emissive={player.overloadLevel === 2 ? '#b91c1c' : '#000000'}
          emissiveIntensity={player.overloadLevel === 2 ? 0.6 : 0}
          roughness={0.3}
        />

        {/* Eyes (Cyclops for Zorblax, Twin for others) */}
        {player.avatarId === 'alien_zorblax' ? (
          <group position={[0, 0.05, 0.32]}>
            <mesh>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, 0.12]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshBasicMaterial color={player.overloadLevel > 0 ? '#ef4444' : '#0284c7'} />
            </mesh>
          </group>
        ) : (
          <group position={[0, 0.08, 0.3]}>
            <mesh position={[-0.14, 0, 0]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.14, 0, 0.08]}>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshBasicMaterial color="#0284c7" />
            </mesh>
            <mesh position={[0.14, 0, 0]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.14, 0, 0.08]}>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshBasicMaterial color="#0284c7" />
            </mesh>
          </group>
        )}

        {/* Antenna for Vex & Nebula */}
        {(player.avatarId === 'alien_vex' || player.avatarId === 'alien_nebula') && (
          <group position={[0, 0.35, 0]}>
            <mesh position={[-0.15, 0.18, 0]} rotation={[0, 0, 0.3]}>
              <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
              <meshStandardMaterial color={alienColor} />
            </mesh>
            <mesh position={[-0.24, 0.35, 0]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#ec4899" />
            </mesh>
            <mesh position={[0.15, 0.18, 0]} rotation={[0, 0, -0.3]}>
              <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
              <meshStandardMaterial color={alienColor} />
            </mesh>
            <mesh position={[0.24, 0.35, 0]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#ec4899" />
            </mesh>
          </group>
        )}
      </mesh>

      {/* Plasma Shield Forcefield Bubble */}
      {player.hasShield && (
        <mesh ref={shieldRef} position={[0, 0.45, 0]}>
          <icosahedronGeometry args={[0.9, 2]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={0.8}
            wireframe
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Dark Matter Time Bomb Indicator */}
      {player.timeBombTurnsRemaining !== null && (
        <group ref={bombRef} position={[0, 1.6, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color="#e11d48" emissive="#991b1b" emissiveIntensity={0.8} />
          </mesh>
          <Text fontSize={0.16} color="#ffffff" position={[0, 0, 0.22]}>
            {`${player.timeBombTurnsRemaining}`}
          </Text>
        </group>
      )}

      {/* Floating 3D Player Tag & Overload Level Icons */}
      <group position={[0, 1.45, 0]}>
        <Text
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#0f172a"
        >
          {player.username}
        </Text>
        <Text
          position={[0, -0.22, 0]}
          fontSize={0.14}
          color={player.overloadLevel === 2 ? '#ef4444' : player.overloadLevel === 1 ? '#f59e0b' : '#38bdf8'}
          anchorX="center"
          anchorY="middle"
        >
          {`⚡ ${player.overloadLevel}/3 Overload | 🃏 ${player.cardsInHandCount}`}
        </Text>
      </group>
    </group>
  );
};
