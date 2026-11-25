import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { MetroAudioEngine } from '../audio/metroAudioEngine';
import type { IAudioEngine } from '../audio/types';
import { MetroSimulationEngine } from '../domain/metroSimulation';
import { MetroScoringRules } from '../domain/scoringRules';
import { MetroTrainPhysics } from '../domain/trainPhysics';
import type { IMetroSimulation, ISimulationSnapshot } from '../domain/types';
import { KeyboardInputController } from '../input/keyboardInputController';
import type { IInputController } from '../input/types';
import { MetroSceneRenderer } from '../scene/metroSceneRenderer';
import type { IMetroSceneRenderer } from '../scene/types';

export interface IMetroGameController {
  readonly snapshot: ISimulationSnapshot;
  readonly muted: boolean;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  returnToTitle: () => void;
  toggleMute: () => void;
  toggleDoors: () => void;
  triggerEmergencyBrake: () => void;
  setHornActive: (active: boolean) => void;
}

const HUD_SYNC_INTERVAL_MS = 100;

function hasAutostartParam(): boolean {
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export function useMetroGame(mountRef: RefObject<HTMLDivElement | null>): IMetroGameController {
  const simRef = useRef<IMetroSimulation | null>(null);
  const rendererRef = useRef<IMetroSceneRenderer | null>(null);
  const audioRef = useRef<IAudioEngine | null>(null);
  const inputRef = useRef<IInputController | null>(null);

  if (!simRef.current) {
    simRef.current = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    if (hasAutostartParam()) {
      simRef.current.start();
    }
  }

  const [snapshot, setSnapshot] = useState<ISimulationSnapshot>(() => simRef.current!.getSnapshot());
  const [muted, setMuted] = useState<boolean>(false);

  const syncNow = useCallback((): void => {
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const next = sim.getSnapshot();
    document.body.dataset.state = next.phase;
    setSnapshot(next);
  }, []);

  const startGame = useCallback((): void => {
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    simRef.current?.start();
    syncNow();
  }, [syncNow]);

  const pauseGame = useCallback((): void => {
    simRef.current?.pause();
    audioRef.current?.silence();
    inputRef.current?.clearHeld();
    syncNow();
  }, [syncNow]);

  const resumeGame = useCallback((): void => {
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    simRef.current?.resume();
    syncNow();
  }, [syncNow]);

  const restartGame = useCallback((): void => {
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    simRef.current?.reset();
    syncNow();
  }, [syncNow]);

  const returnToTitle = useCallback((): void => {
    simRef.current?.reset();
    audioRef.current?.silence();
    inputRef.current?.clearHeld();
    simRef.current = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    syncNow();
  }, [syncNow]);

  const toggleMute = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const nextMuted = !audio.isMuted();
    audio.setMuted(nextMuted);
    setMuted(nextMuted);
  }, []);

  const toggleDoors = useCallback((): void => {
    inputRef.current?.triggerDoorToggle();
  }, []);

  const triggerEmergencyBrake = useCallback((): void => {
    inputRef.current?.triggerEmergencyBrake();
  }, []);

  const setHornActive = useCallback((active: boolean): void => {
    inputRef.current?.setVirtualHorn(active);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) {
      return undefined;
    }
    const sceneRenderer = new MetroSceneRenderer();
    const audio = new MetroAudioEngine();
    const input = new KeyboardInputController();
    rendererRef.current = sceneRenderer;
    audioRef.current = audio;
    inputRef.current = input;

    sceneRenderer.mount(container);
    input.attach({
      onStartRequested: () => startGame(),
      onPauseToggle: () => {
        const phase = simRef.current?.getSnapshot().phase;
        if (phase === 'playing') {
          pauseGame();
        } else if (phase === 'paused') {
          resumeGame();
        }
      },
      onMuteToggle: () => toggleMute(),
      onRestartRequested: () => {
        if (simRef.current?.getSnapshot().phase !== 'title') {
          restartGame();
        }
      },
      onFirstInteraction: () => audio.unlock(),
    });

    document.body.dataset.state = simRef.current!.getSnapshot().phase;
    let active = true;
    let frameHandle = 0;
    let lastTime = performance.now();
    let lastHudSync = 0;
    let lastPhase = simRef.current!.getSnapshot().phase;
    let lastScore = 0;
    let lastDoor = simRef.current!.getSnapshot().doorState;

    const tick = (): void => {
      if (!active) {
        return;
      }
      const now = performance.now();
      const rawDt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.35);
      lastTime = now;

      const sim = simRef.current!;
      const control = input.sampleControlInput();
      let remaining = rawDt > 0 ? rawDt : 0.016;
      let latestAudio = sim.step(control, Math.min(remaining, 0.05));
      remaining -= 0.05;
      const heldOnlyControl = { ...control, emergencyBrakePressed: false, toggleDoorsPressed: false };
      while (remaining > 0.001) {
        const subDt = Math.min(remaining, 0.05);
        const nextAudio = sim.step(heldOnlyControl, subDt);
        latestAudio = {
          hornActive: latestAudio.hornActive || nextAudio.hornActive,
          doorToggledTo: latestAudio.doorToggledTo ?? nextAudio.doorToggledTo,
          boardingCompleteChime: latestAudio.boardingCompleteChime || nextAudio.boardingCompleteChime,
          overspeedWarning: latestAudio.overspeedWarning || nextAudio.overspeedWarning,
          emergencyBrakeTriggered: latestAudio.emergencyBrakeTriggered || nextAudio.emergencyBrakeTriggered,
          railJointPulse: latestAudio.railJointPulse || nextAudio.railJointPulse,
          brakeStopHiss: latestAudio.brakeStopHiss || nextAudio.brakeStopHiss,
          atpTriggered: latestAudio.atpTriggered || nextAudio.atpTriggered,
          signalClearedChime: latestAudio.signalClearedChime || nextAudio.signalClearedChime,
        };
        remaining -= subDt;
      }
      const snap = sim.getSnapshot();

      audio.update(snap, latestAudio);
      sceneRenderer.update(snap, rawDt);
      sceneRenderer.render();

      const discreteChanged =
        snap.phase !== lastPhase || snap.score !== lastScore || snap.doorState !== lastDoor;
      if (discreteChanged || now - lastHudSync >= HUD_SYNC_INTERVAL_MS) {
        lastHudSync = now;
        lastPhase = snap.phase;
        lastScore = snap.score;
        lastDoor = snap.doorState;
        document.body.dataset.state = snap.phase;
        setSnapshot(snap);
      }

      frameHandle = sceneRenderer.scheduleNextFrame(tick);
    };

    frameHandle = sceneRenderer.scheduleNextFrame(tick);

    return () => {
      active = false;
      sceneRenderer.cancelScheduledFrame(frameHandle);
      input.detach();
      audio.dispose();
      sceneRenderer.dispose();
    };
  }, [mountRef, pauseGame, restartGame, resumeGame, startGame, toggleMute]);

  return {
    snapshot,
    muted,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    returnToTitle,
    toggleMute,
    toggleDoors,
    triggerEmergencyBrake,
    setHornActive,
  };
}
