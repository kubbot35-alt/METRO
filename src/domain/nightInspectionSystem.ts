import { LINE_M1_STATIONS } from './routeData';
import { getStationPlatformSide } from './trackGeometry';
import type {
  DoorSide,
  INightCrewCheckpoint,
  INightInspectionState,
  IStationSpec,
  NightCrewStatus,
} from './types';

export type NightCrewViolationReason = 'speed' | 'horn' | 'both' | null;

export interface INightInspectionStepResult {
  readonly clearedCheckpoint: INightCrewCheckpoint | null;
  readonly violatedCheckpoint: INightCrewCheckpoint | null;
  readonly violationReason: NightCrewViolationReason;
  readonly pointsDelta: number;
  readonly radioConfirmText: string | null;
}

export interface INightInspectionController {
  setStations(stations: readonly IStationSpec[]): void;
  setActive(active: boolean): void;
  reset(): void;
  step(positionM: number, speedKmh: number, hornActive: boolean): INightInspectionStepResult;
  getState(): INightInspectionState;
}

export const NIGHT_CREW_MAX_SPEED_KMH = 20;
const NIGHT_CREW_SPEED_TOLERANCE_KMH = 0.5;
export const NIGHT_CREW_SAFE_BONUS_PTS = 120;
export const NIGHT_CREW_VIOLATION_PENALTY_PTS = -90;
const APPROACH_START_M = 135;
const HORN_WINDOW_AHEAD_M = 130;
const SPEED_CHECK_AHEAD_M = 24;
const PASS_COMPLETE_PAST_M = 10;

interface IMutableCrewCheckpoint {
  readonly id: number;
  readonly distanceM: number;
  readonly side: DoorSide;
  readonly locationKind: 'tunnel' | 'station';
  readonly locationLabel: string;
  status: NightCrewStatus;
  hornSounded: boolean;
  maxPassSpeedKmh: number;
}

const IDLE_RESULT: INightInspectionStepResult = {
  clearedCheckpoint: null,
  violatedCheckpoint: null,
  violationReason: null,
  pointsDelta: 0,
  radioConfirmText: null,
};

export class NightInspectionSystem implements INightInspectionController {
  private readonly rng: () => number;
  private stations: readonly IStationSpec[];
  private active = false;
  private checkpoints: IMutableCrewCheckpoint[] = [];
  private activeApproachIndex: number | null = null;
  private activeApproachDistanceM: number | null = null;
  private speedSafeNow = true;

  public constructor(
    stations: readonly IStationSpec[] = LINE_M1_STATIONS,
    rng: () => number = Math.random,
  ) {
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
    if (changed) {
      this.reset();
    }
  }

  public reset(): void {
    this.activeApproachIndex = null;
    this.activeApproachDistanceM = null;
    this.speedSafeNow = true;
    this.rebuildCheckpoints();
  }

  public step(
    positionM: number,
    speedKmh: number,
    hornActive: boolean,
  ): INightInspectionStepResult {
    if (!this.active || this.checkpoints.length === 0) {
      this.activeApproachIndex = null;
      this.activeApproachDistanceM = null;
      this.speedSafeNow = true;
      return IDLE_RESULT;
    }

    this.speedSafeNow = speedKmh <= NIGHT_CREW_MAX_SPEED_KMH + NIGHT_CREW_SPEED_TOLERANCE_KMH;
    this.activeApproachIndex = null;
    this.activeApproachDistanceM = null;

    for (let i = 0; i < this.checkpoints.length; i += 1) {
      const crew = this.checkpoints[i];
      if (crew.status === 'passed_ok' || crew.status === 'violated') {
        continue;
      }
      const distAhead = crew.distanceM - positionM;
      if (distAhead <= APPROACH_START_M && distAhead >= -PASS_COMPLETE_PAST_M) {
        crew.status = 'approaching';
        if (this.activeApproachIndex === null) {
          this.activeApproachIndex = i;
          this.activeApproachDistanceM = distAhead;
        }
        if (hornActive && distAhead <= HORN_WINDOW_AHEAD_M && distAhead >= -8) {
          crew.hornSounded = true;
        }
        if (distAhead <= SPEED_CHECK_AHEAD_M && distAhead >= -PASS_COMPLETE_PAST_M) {
          crew.maxPassSpeedKmh = Math.max(crew.maxPassSpeedKmh, speedKmh);
        }
      }
      if (positionM >= crew.distanceM + PASS_COMPLETE_PAST_M) {
        return this.finalizeCheckpoint(crew);
      }
    }

    return IDLE_RESULT;
  }

  public getState(): INightInspectionState {
    const snapshots: INightCrewCheckpoint[] = this.checkpoints.map((c) => ({ ...c }));
    const passedCount = snapshots.filter((c) => c.status === 'passed_ok').length;
    const violatedCount = snapshots.filter((c) => c.status === 'violated').length;
    const activeApproachCrew =
      this.activeApproachIndex !== null ? snapshots[this.activeApproachIndex] ?? null : null;

    return {
      active: this.active,
      checkpoints: snapshots,
      activeApproachCrew,
      activeApproachDistanceM: this.activeApproachDistanceM,
      speedSafeNow: this.speedSafeNow,
      totalCount: snapshots.length,
      passedCount,
      violatedCount,
    };
  }

  private finalizeCheckpoint(crew: IMutableCrewCheckpoint): INightInspectionStepResult {
    const speedOk = crew.maxPassSpeedKmh <= NIGHT_CREW_MAX_SPEED_KMH + NIGHT_CREW_SPEED_TOLERANCE_KMH;
    const hornOk = crew.hornSounded;

    if (speedOk && hornOk) {
      crew.status = 'passed_ok';
      return {
        clearedCheckpoint: { ...crew },
        violatedCheckpoint: null,
        violationReason: null,
        pointsDelta: NIGHT_CREW_SAFE_BONUS_PTS,
        radioConfirmText: `Dyspozytor: Punkt kontrolny #${crew.id} (${crew.locationLabel}) zaliczony — ekipa torowa bezpieczna.`,
      };
    }

    crew.status = 'violated';
    const violationReason: NightCrewViolationReason =
      !speedOk && !hornOk ? 'both' : !speedOk ? 'speed' : 'horn';
    return {
      clearedCheckpoint: null,
      violatedCheckpoint: { ...crew },
      violationReason,
      pointsDelta: NIGHT_CREW_VIOLATION_PENALTY_PTS,
      radioConfirmText: null,
    };
  }

  private rebuildCheckpoints(): void {
    const result: IMutableCrewCheckpoint[] = [];
    let nextId = 1;
    let lastDistM = 0;

    for (let i = 0; i < this.stations.length; i += 1) {
      const station = this.stations[i];
      const prevStationDist = i === 0 ? 0 : this.stations[i - 1].distanceM;
      const segmentLen = station.distanceM - prevStationDist;

      // Tunnel track crew in the middle of the inter-station segment
      if (segmentLen >= 340) {
        const ratio = 0.42 + this.rng() * 0.18;
        const tunnelDistM = Math.round(prevStationDist + segmentLen * ratio);
        if (tunnelDistM >= 190 && tunnelDistM - lastDistM >= 200) {
          result.push({
            id: nextId,
            distanceM: tunnelDistM,
            side: this.rng() < 0.5 ? 'left' : 'right',
            locationKind: 'tunnel',
            locationLabel: `Tunel przed ${station.name}`,
            status: 'upcoming',
            hornSounded: false,
            maxPassSpeedKmh: 0,
          });
          nextId += 1;
          lastDistM = tunnelDistM;
        }
      }

      // Station platform inspection crew on alternating/randomized stations
      const placeAtStation = i % 2 === 0 || this.rng() < 0.45;
      const stationCrewDistM = Math.round(station.distanceM - 28);
      if (
        placeAtStation &&
        stationCrewDistM >= 160 &&
        stationCrewDistM - lastDistM >= 190 &&
        i < this.stations.length - 1
      ) {
        result.push({
          id: nextId,
          distanceM: stationCrewDistM,
          side: getStationPlatformSide(station),
          locationKind: 'station',
          locationLabel: `Stacja ${station.name}`,
          status: 'upcoming',
          hornSounded: false,
          maxPassSpeedKmh: 0,
        });
        nextId += 1;
        lastDistM = stationCrewDistM;
      }
    }

    this.checkpoints = result;
  }
}
