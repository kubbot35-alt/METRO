import * as THREE from 'three';
import type { DoorSide, ITrainVisualProfile, MetroLineId } from '../../domain/types';

export interface IDisposableResource {
  dispose(): void;
}

export interface ISlidingDoorPair {
  readonly leftLeaf: THREE.Group;
  readonly rightLeaf: THREE.Group;
  readonly baseZ: number;
  readonly side: DoorSide;
}

export interface ITrainConsist {
  readonly group: THREE.Group;
  setVisualProfile(visual: ITrainVisualProfile): void;
  setDoorsOpen(openSide: DoorSide | null, dtSec: number): void;
  setHeadlights(on: boolean): void;
  setLine(lineId: MetroLineId, destinationLed: string): void;
  updateMotion(speedMs: number, dtSec: number): void;
  dispose(): void;
}

export interface IConsistDoorConfig {
  readonly dampRate: number;
  readonly slideTravelM: number;
  readonly leafBaseOffsetZ: number;
}

export abstract class BaseTrainConsist implements ITrainConsist {
  public readonly group = new THREE.Group();
  protected readonly disposables: IDisposableResource[] = [];
  protected readonly doorPairs: ISlidingDoorPair[] = [];
  protected readonly axles: THREE.Mesh[] = [];
  private leftDoorProgress = 0;
  private rightDoorProgress = 0;
  private readonly doorConfig: IConsistDoorConfig;
  private readonly wheelRadiusM: number;

  protected constructor(
    name: string,
    doorConfig: IConsistDoorConfig = { dampRate: 7, slideTravelM: 0.56, leafBaseOffsetZ: 0.32 },
    wheelRadiusM = 0.41,
  ) {
    this.group.name = name;
    this.doorConfig = doorConfig;
    this.wheelRadiusM = wheelRadiusM;
  }

  public abstract setVisualProfile(visual: ITrainVisualProfile): void;
  public abstract setHeadlights(on: boolean): void;
  public abstract setLine(lineId: MetroLineId, destinationLed: string): void;

  public setDoorsOpen(openSide: DoorSide | null, dtSec: number): void {
    const safeDt = Math.max(dtSec, 0.016);
    this.leftDoorProgress = THREE.MathUtils.damp(
      this.leftDoorProgress,
      openSide === 'left' ? 1 : 0,
      this.doorConfig.dampRate,
      safeDt,
    );
    this.rightDoorProgress = THREE.MathUtils.damp(
      this.rightDoorProgress,
      openSide === 'right' ? 1 : 0,
      this.doorConfig.dampRate,
      safeDt,
    );
    this.applySlidingDoors();
  }

  public updateMotion(speedMs: number, dtSec: number): void {
    const deltaAngle = (speedMs / this.wheelRadiusM) * Math.max(dtSec, 0);
    for (let i = 0; i < this.axles.length; i += 1) {
      this.axles[i].rotation.x -= deltaAngle;
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }

  protected registerDisposables(...items: IDisposableResource[]): void {
    this.disposables.push(...items);
  }

  private applySlidingDoors(): void {
    const { slideTravelM, leafBaseOffsetZ } = this.doorConfig;
    for (let i = 0; i < this.doorPairs.length; i += 1) {
      const pair = this.doorPairs[i];
      const progress = pair.side === 'left' ? this.leftDoorProgress : this.rightDoorProgress;
      const slide = progress * slideTravelM;
      pair.leftLeaf.position.z = pair.baseZ - leafBaseOffsetZ - slide;
      pair.rightLeaf.position.z = pair.baseZ + leafBaseOffsetZ + slide;
    }
  }
}
