import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import LobbyScene3D from './scenes3D/LobbyScene3D';
import InvestigationScene3D from './scenes3D/InvestigationScene3D';

export default function GameCanvas({ 
  sceneKey, 
  socket, 
  playerId, 
  players = [], 
  suspects = [], 
  clues = [],
  onOverlapStart,
  onOverlapEnd 
}) {
  
  // Cleanup WebGL context on unmount
  useEffect(() => {
    return () => {
      // Any generic cleanup if needed
    };
  }, []);

  return (
    <div className="w-full h-full relative z-0">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }} style={{ width: '100%', height: '100%', display: 'block' }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />

        <Suspense fallback={null}>
          {sceneKey === 'LobbyScene' && (
            <LobbyScene3D players={players} playerId={playerId} />
          )}
          {sceneKey === 'InvestigationScene' && (
            <InvestigationScene3D 
              players={players} 
              clues={clues} 
              socket={socket} 
              playerId={playerId}
              onOverlapStart={onOverlapStart}
              onOverlapEnd={onOverlapEnd}
            />
          )}
          {/* Default fallback if scene not explicitly mapped yet */}
          {sceneKey !== 'LobbyScene' && sceneKey !== 'InvestigationScene' && (
            <LobbyScene3D players={players} playerId={playerId} />
          )}
        </Suspense>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
