import { buildReturnLegLineSpec } from '../../domain/turnaroundSystem';
import type { IPhotoMoveInput, ISimulationSnapshot } from '../../domain/types';
import { mergeControlInput, stepSimulationWithSubsteps } from './controlMerger';
import {
  applyGamepadRumbleEffect,
  processAchievementsAndToastEffects,
  recordGameOverEffects,
  syncAudioAndSpeechEffects,
  type IFrameRunnerCallbacks,
} from './frameSideEffects';
import { HudSyncTracker } from './hudSyncTracker';
import type { IGameRuntimeRefs } from './types';

export type { IFrameRunnerCallbacks };

const HUD_SYNC_INTERVAL_MS = 100;

function readPhotoMoveInput(keys: Set<string>): IPhotoMoveInput {
  return {
    forward: keys.has('KeyW'),
    backward: keys.has('KeyS'),
    left: keys.has('KeyA'),
    right: keys.has('KeyD'),
    up: keys.has('KeyE'),
    down: keys.has('KeyQ'),
    boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}

export class SimulationFrameRunner {
  private readonly hudTracker: HudSyncTracker;
  private lastTimeMs = performance.now();
  private fpsFrameCount = 0;
  private fpsWindowStartMs = performance.now();

  public constructor(
    private readonly refs: IGameRuntimeRefs,
    private readonly cb: IFrameRunnerCallbacks,
  ) {
    this.hudTracker = new HudSyncTracker(refs.sim.current.getSnapshot());
  }

  public step(nowMs: number): void {
    const rawDt = Math.min(Math.max((nowMs - this.lastTimeMs) / 1000, 0), 0.35);
    this.lastTimeMs = nowMs;
    this.updateFps(nowMs);
    if (this.refs.photoModeActiveRef.current) {
      this.stepPhotoFrame(rawDt > 0 ? rawDt : 0.016);
      return;
    }
    this.stepGameplayFrame(nowMs, rawDt);
  }

  private updateFps(nowMs: number): void {
    this.fpsFrameCount += 1;
    if (nowMs - this.fpsWindowStartMs < 450) {
      return;
    }
    if (this.refs.settingsRef.current.showFps) {
      const measured = Math.round((this.fpsFrameCount * 1000) / Math.max(1, nowMs - this.fpsWindowStartMs));
      this.cb.setFps(measured);
    }
    this.fpsFrameCount = 0;
    this.fpsWindowStartMs = nowMs;
  }

  private stepPhotoFrame(dt: number): void {
    this.refs.audio.current?.silence();
    const move = readPhotoMoveInput(this.refs.photoKeysRef.current);
    const prev = this.refs.photoController.current.getState();
    const next = this.refs.photoController.current.stepMovement(move, dt);
    const snap = this.refs.sim.current.getSnapshot();
    this.refs.renderer.current?.setPhotoModePose?.(next, snap, this.refs.photoKeepInteriorRef.current);
    this.refs.renderer.current?.render();
    if (next.x !== prev.x || next.y !== prev.y || next.z !== prev.z) {
      this.cb.setPhotoState(next);
    }
  }

  private stepGameplayFrame(nowMs: number, rawDt: number): void {
    const padSample = this.refs.gamepad.current?.poll() ?? null;
    if (padSample?.pauseTogglePressed) {
      this.cb.handlePauseToggle();
    }
    const control = mergeControlInput(this.refs.input.current!.sampleControlInput(), padSample);
    const audioEvents = stepSimulationWithSubsteps(this.refs.sim.current, control, rawDt);
    const snap = this.resolveCabSwitchIfReady(this.refs.sim.current.getSnapshot());
    if (audioEvents.academyStepCompleted) {
      this.refs.audio.current?.playAchievementChime();
    }
    this.dispatchPostStepSideEffects(snap, audioEvents, rawDt, nowMs);
  }

  private dispatchPostStepSideEffects(
    snap: ISimulationSnapshot,
    audioEvents: ReturnType<typeof stepSimulationWithSubsteps>,
    rawDt: number,
    nowMs: number,
  ): void {
    applyGamepadRumbleEffect(this.refs, snap);
    recordGameOverEffects(this.refs, this.cb, snap);
    processAchievementsAndToastEffects(this.refs, this.cb, snap, rawDt > 0 ? rawDt : 0.016);
    syncAudioAndSpeechEffects(this.refs, snap, audioEvents);
    this.refs.renderer.current?.update(snap, rawDt);
    this.refs.renderer.current?.render();
    if (this.hudTracker.shouldSync(snap, nowMs, HUD_SYNC_INTERVAL_MS)) {
      document.body.dataset.state = snap.phase;
      this.cb.setSnapshot(snap);
    }
  }

  private resolveCabSwitchIfReady(snap: ISimulationSnapshot): ISimulationSnapshot {
    if (snap.turnaround.phase !== 'switching_cab') {
      this.refs.cabSwitchAppliedRef.current = false;
      return snap;
    }
    if (snap.turnaround.switchProgress < 0.48 || this.refs.cabSwitchAppliedRef.current) {
      return snap;
    }
    this.refs.cabSwitchAppliedRef.current = true;
    const { spec, nextDirection } = buildReturnLegLineSpec(this.refs.baseLineRef.current, this.refs.routeDirectionRef.current);
    this.refs.routeDirectionRef.current = nextDirection;
    this.refs.startStationIndexRef.current = 0;
    this.cb.setRouteDirection(nextDirection);
    this.cb.setStartStationIndex(0);
    this.refs.sim.current.completeCabSwitch?.(spec);
    return this.refs.sim.current.getSnapshot();
  }
}
