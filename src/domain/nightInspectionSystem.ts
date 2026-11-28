import { LINE_M1_STATIONS } from './routeData';
import type { INightCrewCheckpoint, INightInspectionState, IStationSpec } from './types';
import {
  NIGHT_CREW_MAX_SPEED_KMH,
  NIGHT_CREW_SAFE_BONUS_PTS,
  NIGHT_CREW_VIOLATION_PENALTY_PTS,
  buildNightCrewCheckpoints,
  type IMutableCrewCheckpoint,
  type INightInspectionController,
  type INightInspectionStepResult,
  type NightCrewViolationReason,
} from './nightInspectionCatalog';

export {
  NIGHT_CREW_MAX_SPEED_KMH,
  NIGHT_CREW_SAFE_BONUS_PTS,
  NIGHT_CREW_VIOLATION_PENALTY_PTS,
  type INightInspectionController,
  type INightInspectionStepResult,
  type NightCrewViolationReason,
};

const NIGHT_CREW_SPEED_TOLERANCE_KMH = 0.5;
const APPROACH_START_M = 135;
const HORN_WINDOW_AHEAD_M = 130;
const SPEED_CHECK_AHEAD_M = 24;
const PASS_COMPLETE_PAST_M = 10;

const IDLE_RESULT: INightInspectionStepResult = {
  clearedCheckpoint: null, violatedCheckpoint: null, violationReason: null, pointsDelta: 0, radioConfirmText: null,
};

export class NightInspectionSystem implements INightInspectionController {
  private readonly rng: () => number;
  private stations: readonly IStationSpec[];
  private active = false;
  private checkpoints: IMutableCrewCheckpoint[] = [];
  private activeApproachIndex: number | null = null;
  private activeApproachDistanceM: number | null = null;
  private speedSafeNow = true;

  public constructor(stations: readonly IStationSpec[] = LINE_M1_STATIONS, rng: () => number = Math.random) {
    this.stations = stations;
    this.rng = rng;
    this.rebuildCheckpoints();
  }

  public setStations(stations: readonly IStationSpec[]): void {
    this.stations = stations;
    this.rebuildCheckpoints();
  }

  public setActive(active: boolean): void {
    const changed = this.active !== active;
    this.active = active;
    if (changed) this.reset();
  }

  public reset(): void {
    this.activeApproachIndex = null;
    this.activeApproachDistanceM = null;
    this.speedSafeNow = true;
    this.rebuildCheckpoints();
  }

  public step(positionM: number, speedKmh: number, hornActive: boolean): INightInspectionStepResult {
    this.activeApproachIndex = null;
    this.activeApproachDistanceM = null;
    if (!this.active || this.checkpoints.length === 0) {
      this.speedSafeNow = true;
      return IDLE_RESULT;
    }
    this.speedSafeNow = speedKmh <= NIGHT_CREW_MAX_SPEED_KMH + NIGHT_CREW_SPEED_TOLERANCE_KMH;
    return this.evaluateCheckpoints(positionM, speedKmh, hornActive);
  }

  public getState(): INightInspectionState {
    const snapshots: INightCrewCheckpoint[] = this.checkpoints.map((c) => ({ ...c }));
    return {
      active: this.active,
      checkpoints: snapshots,
      activeApproachCrew: this.activeApproachIndex !== null ? snapshots[this.activeApproachIndex] ?? null : null,
      activeApproachDistanceM: this.activeApproachDistanceM,
      speedSafeNow: this.speedSafeNow,
      totalCount: snapshots.length,
      passedCount: snapshots.filter((c) => c.status === 'passed_ok').length,
      violatedCount: snapshots.filter((c) => c.status === 'violated').length,
    };
  }

  private evaluateCheckpoints(positionM: number, speedKmh: number, hornActive: boolean): INightInspectionStepResult {
    for (let i = 0; i < this.checkpoints.length; i += 1) {
      const crew = this.checkpoints[i];
      if (crew.status === 'passed_ok' || crew.status === 'violated') continue;
      this.trackApproach(crew, i, positionM, speedKmh, hornActive);
      if (positionM >= crew.distanceM + PASS_COMPLETE_PAST_M) return this.finalizeCheckpoint(crew);
    }
    return IDLE_RESULT;
  }

  private trackApproach(
    crew: IMutableCrewCheckpoint,
    idx: number,
    positionM: number,
    speedKmh: number,
    hornActive: boolean,
  ): void {
    const distAhead = crew.distanceM - positionM;
    if (distAhead > APPROACH_START_M || distAhead < -PASS_COMPLETE_PAST_M) return;
    crew.status = 'approaching';
    if (this.activeApproachIndex === null) {
      this.activeApproachIndex = idx;
      this.activeApproachDistanceM = distAhead;
    }
    if (hornActive && distAhead <= HORN_WINDOW_AHEAD_M && distAhead >= -8) crew.hornSounded = true;
    if (distAhead <= SPEED_CHECK_AHEAD_M && distAhead >= -PASS_COMPLETE_PAST_M) {
      crew.maxPassSpeedKmh = Math.max(crew.maxPassSpeedKmh, speedKmh);
    }
  }

  private finalizeCheckpoint(crew: IMutableCrewCheckpoint): INightInspectionStepResult {
    const speedOk = crew.maxPassSpeedKmh <= NIGHT_CREW_MAX_SPEED_KMH + NIGHT_CREW_SPEED_TOLERANCE_KMH;
    if (speedOk && crew.hornSounded) {
      crew.status = 'passed_ok';
      return {
        clearedCheckpoint: { ...crew }, violatedCheckpoint: null, violationReason: null,
        pointsDelta: NIGHT_CREW_SAFE_BONUS_PTS,
        radioConfirmText: `Dyspozytor: Punkt kontrolny #${crew.id} (${crew.locationLabel}) zaliczony — ekipa torowa bezpieczna.`,
      };
    }
    crew.status = 'violated';
    const violationReason: NightCrewViolationReason = !speedOk && !crew.hornSounded ? 'both' : !speedOk ? 'speed' : 'horn';
    return {
      clearedCheckpoint: null, violatedCheckpoint: { ...crew }, violationReason,
      pointsDelta: NIGHT_CREW_VIOLATION_PENALTY_PTS, radioConfirmText: null,
    };
  }

  private rebuildCheckpoints(): void {
    this.checkpoints = buildNightCrewCheckpoints(this.stations, this.rng);
  }
}
