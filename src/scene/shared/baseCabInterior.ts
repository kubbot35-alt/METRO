import * as THREE from 'three';
import { getStationPlatformSide } from '../../domain/trackGeometry';
import type { ISimulationSnapshot } from '../../domain/types';
import type { ICabMirrorHardware } from '../cabMirrorAttachments';
import type { IDisposableResource } from './baseTrainConsist';

export interface ICabLampMaterials {
  readonly doorMat: THREE.MeshStandardMaterial;
  readonly warnMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
}

export interface ICabInterior {
  readonly group: THREE.Group;
  readonly leverPivot: THREE.Group;
  readonly wiperPivot: THREE.Group;
  readonly mirrorHardware: ICabMirrorHardware;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

export interface IWiperSweepConfig {
  readonly parkRad: number;
  readonly sweepRad: number;
}

export abstract class BaseCabInterior implements ICabInterior {
  public readonly group = new THREE.Group();
  public abstract readonly leverPivot: THREE.Group;
  public abstract readonly wiperPivot: THREE.Group;
  public abstract readonly mirrorHardware: ICabMirrorHardware;
  protected readonly disposables: IDisposableResource[] = [];
  private readonly wiperSweep: IWiperSweepConfig;

  protected constructor(name: string, wiperSweep: IWiperSweepConfig) {
    this.group.name = name;
    this.wiperSweep = wiperSweep;
  }

  public update(snapshot: ISimulationSnapshot, dtSec: number): void {
    const platformSide = getStationPlatformSide(snapshot.currentStation.station);
    const nearStation = Math.abs(snapshot.currentStation.distanceToTargetM) < 95;
    this.mirrorHardware.setActivePlatformSide(platformSide, nearStation);
    this.wiperPivot.rotation.z = THREE.MathUtils.lerp(
      this.wiperSweep.parkRad,
      this.wiperSweep.sweepRad,
      snapshot.weather.wiperPhaseRad,
    );
    this.updateCabDetails(snapshot, dtSec);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }

  protected registerDisposables(...items: IDisposableResource[]): void {
    this.disposables.push(...items);
  }

  protected isWarningActive(snapshot: ISimulationSnapshot): boolean {
    return snapshot.isOverspeeding || snapshot.kinematics.emergencyBrake || snapshot.atpActive;
  }

  protected abstract updateCabDetails(snapshot: ISimulationSnapshot, dtSec: number): void;
}
