import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArenaTable } from './ArenaTable';
import { HologramCore } from './HologramCore';
import { AlienCharacter3D } from './AlienCharacter3D';
import { Environment3D } from './Environment3D';
import { GameState } from '@cosmic/shared';

interface GameSceneProps {
  gameState: GameState;
  myPlayerId: string | null;
}

export const GameScene: React.FC<GameSceneProps> = ({ gameState, myPlayerId }) => {
  const activePlayerId = gameState.turn.activePlayerId;
  const players = gameState.players;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto">
      <Canvas
        camera={{ position: [0, 5.2, 5.8], fov: 48 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050816']} />

        {/* Space Environment & Lighting */}
        <Environment3D />

        {/* Central Arena Table */}
        <ArenaTable direction={gameState.turn.direction} />

        {/* Hologram Core with Dynamic Overload Glow */}
        <HologramCore
          coreTotal={gameState.coreTotal}
          overloadLimit={gameState.overloadLimit}
        />

        {/* Seated Alien Characters with Neural Overload Reaction */}
        {players.map((player, idx) => (
          <AlienCharacter3D
            key={player.id}
            player={player}
            isActiveTurn={player.id === activePlayerId}
            totalPlayers={players.length}
            index={idx}
          />
        ))}

        {/* Smooth Tabletop Camera Orbit */}
        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={Math.PI / 6}
          minDistance={4.5}
          maxDistance={9.5}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};
