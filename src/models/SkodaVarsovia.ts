import * as THREE from 'three';
import type { DoorSide } from '../domain/types';
import type { ILedDestinationDisplay } from '../scene/shared/ledMatrixPainter';
import {
  createSkodaGeometries,
  createSkodaLedDisplay,
  createSkodaMaterials,
} from './skodaVarsoviaAssets';
import { applySkodaCabLightState } from './skodaVarsoviaCabBuilder';
import { buildSkodaCar, buildSkodaGangway } from './skodaVarsoviaCarBuilder';
import {
  VARSOVIA_DIMENSIONS,
  type ISkodaCabLightRef,
  type ISkodaDoorAxisState,
  type ISkodaDoorInstanceGroup,
  type ISkodaVarsoviaGeometries,
  type ISkodaVarsoviaMaterials,
  type ISkodaVarsoviaOptions,
  type SkodaLightsMode,
} from './skodaVarsoviaTypes';

export type {
  ISkodaCabLightRef,
  ISkodaVarsoviaMaterials,
  ISkodaVarsoviaOptions,
  SkodaLightsMode,
} from './skodaVarsoviaTypes';

export class SkodaVarsovia extends THREE.Group {
  public readonly carCount: number;
  public readonly materials: ISkodaVarsoviaMaterials;
  public readonly geometries: ISkodaVarsoviaGeometries;
  public readonly cars: THREE.Group[] = [];
  public readonly doorInstances: ISkodaDoorInstanceGroup[] = [];
  public readonly interiorLights: THREE.PointLight[] = [];
  public readonly cabRefs: { front: ISkodaCabLightRef | null; rear: ISkodaCabLightRef | null } = {
    front: null,
    rear: null,
  };
  public lightsMode: SkodaLightsMode = 'forward';
  public interiorLightsOn = true;
  public ledLine: string;
  public ledDestination: string;

  private readonly doorsState: Record<DoorSide, ISkodaDoorAxisState> = {
    left: { target: 0, current: 0 },
    right: { target: 0, current: 0 },
  };
  private readonly ledDisplay: ILedDestinationDisplay;
  private readonly extraGeometries: THREE.BufferGeometry[] = [];
  private readonly doorDummy = new THREE.Object3D();
  private doorsDirty = true;

  public constructor(options: ISkodaVarsoviaOptions = {}) {
    super();
    this.name = 'SkodaVarsovia_Trainset';
    this.carCount = options.carCount ?? 6;
    this.ledLine = options.line ?? 'M1';
    this.ledDestination = options.destination ?? 'KABATY';
    this.ledDisplay = createSkodaLedDisplay(options.maxAnisotropy ?? 4);
    this.materials = createSkodaMaterials(this.ledDisplay.texture);
    this.geometries = createSkodaGeometries();
    this.buildTrainset(options.enableSpotLights ?? true);
    this.setLedDisplay(this.ledLine, this.ledDestination);
    this.setLightsMode(this.lightsMode);
    this.setInteriorLights(this.interiorLightsOn);
    this.updateDoorMatrices();
  }

  public setLedDisplay(line: string, destination: string): void {
    this.ledLine = (line || '').trim().toUpperCase();
    this.ledDestination = (destination || '').trim().toUpperCase();
    this.ledDisplay.setLine(this.ledLine, this.ledDestination);
  }

  public setDoors(side: DoorSide, isOpen: boolean): void {
    const nextTarget = isOpen ? 1 : 0;
    if (this.doorsState[side].target === nextTarget) return;
    this.doorsState[side].target = nextTarget;
    this.doorsDirty = true;
  }

  public setLightsMode(mode: SkodaLightsMode): void {
    this.lightsMode = mode;
    const frontState = mode === 'forward' ? 'white' : mode === 'reverse' || mode === 'parked' ? 'red' : 'off';
    const rearState = mode === 'reverse' ? 'white' : mode === 'forward' || mode === 'parked' ? 'red' : 'off';
    applySkodaCabLightState(this.cabRefs.front, frontState);
    applySkodaCabLightState(this.cabRefs.rear, rearState);
  }

  public setInteriorLights(isOn: boolean): void {
    this.interiorLightsOn = Boolean(isOn);
    this.materials.ceilingLed.emissiveIntensity = this.interiorLightsOn ? 1.85 : 0;
    this.materials.ceilingLed.color.setHex(this.interiorLightsOn ? 0xffffff : 0x6b7280);
    for (const light of this.interiorLights) {
      light.intensity = this.interiorLightsOn ? 2.4 : 0;
    }
  }

  public update(dt: number): void {
    if (!this.doorsDirty) return;
    const speed = 0.85;
    let stillMoving = false;
    for (const side of ['left', 'right'] as const) {
      const st = this.doorsState[side];
      const diff = st.target - st.current;
      if (Math.abs(diff) > 0.0005) {
        st.current += Math.sign(diff) * Math.min(Math.abs(diff), dt * speed);
        stillMoving = true;
      } else {
        st.current = st.target;
      }
    }
    this.updateDoorMatrices();
    this.doorsDirty = stillMoving;
  }

  public dispose(): void {
    this.ledDisplay.dispose();
    Object.values(this.materials).forEach((mat) => mat.dispose());
    Object.values(this.geometries).forEach((geo) => geo.dispose());
    this.extraGeometries.forEach((geo) => geo.dispose());
  }

  private buildTrainset(enableSpotLights: boolean): void {
    const { carPitch } = VARSOVIA_DIMENSIONS;
    const startZ = ((this.carCount - 1) * carPitch) / 2;
    for (let i = 0; i < this.carCount; i += 1) {
      this.mountCarAtIndex(i, startZ - i * carPitch, carPitch, enableSpotLights);
    }
  }

  private mountCarAtIndex(index: number, zPos: number, carPitch: number, enableSpotLights: boolean): void {
    const result = buildSkodaCar({
      index,
      isFrontCab: index === 0,
      isRearCab: index === this.carCount - 1,
      geometries: this.geometries,
      materials: this.materials,
      extraGeometries: this.extraGeometries,
      interiorLights: this.interiorLights,
      doorInstances: this.doorInstances,
      enableSpotLights,
    });
    result.car.position.z = zPos;
    this.add(result.car);
    this.cars.push(result.car);
    if (result.frontCabRef) this.cabRefs.front = result.frontCabRef;
    if (result.rearCabRef) this.cabRefs.rear = result.rearCabRef;
    if (index < this.carCount - 1) {
      const gangway = buildSkodaGangway(this.geometries, this.materials);
      gangway.position.z = zPos - carPitch / 2;
      this.add(gangway);
    }
  }

  private updateDoorMatrices(): void {
    const dummy = this.doorDummy;
    for (const carDoors of this.doorInstances) {
      carDoors.leaves.forEach((leaf, idx) => {
        const p = this.doorsState[leaf.side].current;
        const popT = Math.min(1, p / 0.25);
        const popOffset = popT * popT * (3 - 2 * popT) * 0.065;
        const slideT = Math.max(0, Math.min(1, (p - 0.2) / 0.8));
        const slideOffset = slideT * slideT * (3 - 2 * slideT) * 0.62;
        dummy.position.set(
          leaf.baseX + leaf.sideSign * popOffset,
          leaf.baseY,
          leaf.baseZ + leaf.leafDir * slideOffset,
        );
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        carDoors.frameMesh.setMatrixAt(idx, dummy.matrix);
        carDoors.glassMesh.setMatrixAt(idx, dummy.matrix);
      });
      carDoors.frameMesh.instanceMatrix.needsUpdate = true;
      carDoors.glassMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
