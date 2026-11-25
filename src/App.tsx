import { useRef } from 'react';
import { CabDashboardHud } from './components/CabDashboardHud';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { TopHudBar } from './components/TopHudBar';
import { useMetroGame } from './hooks/useMetroGame';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const game = useMetroGame(mountRef);
  const { snapshot } = game;

  return (
    <main
      className="relative w-full h-full overflow-hidden bg-[#06080d]"
      data-testid="metro-simulator-root"
      data-phase={snapshot.phase}
      data-speed={Math.round(snapshot.kinematics.speedKmh)}
      data-position={Math.round(snapshot.kinematics.positionM)}
      data-score={Math.round(snapshot.score)}
      data-doors={snapshot.doorState}
      data-station={snapshot.currentStation.station.code}
      data-signal={snapshot.nextSignal?.signal.aspect ?? 'none'}
      data-atp={snapshot.atpActive ? '1' : '0'}
    >
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="absolute inset-0 w-full h-full"
      />

      {snapshot.phase === 'title' && <TitleOverlay onStart={game.startGame} />}

      {snapshot.phase !== 'title' && (
        <>
          <TopHudBar
            snapshot={snapshot}
            muted={game.muted}
            onToggleMute={game.toggleMute}
            onPause={game.pauseGame}
            onRestart={game.restartGame}
          />
          <CabDashboardHud
            snapshot={snapshot}
            onToggleDoors={game.toggleDoors}
            onEmergencyBrake={game.triggerEmergencyBrake}
            onHornChange={game.setHornActive}
          />
        </>
      )}

      {(snapshot.phase === 'paused' || snapshot.phase === 'gameover') && (
        <StatusModal
          snapshot={snapshot}
          onResume={game.resumeGame}
          onRestart={game.restartGame}
          onTitle={game.returnToTitle}
        />
      )}
    </main>
  );
}
