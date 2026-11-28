import type * as THREE from 'three';
import type { DoorSide } from '../domain/types';

export type SkodaLightsMode = 'forward' | 'reverse' | 'parked' | 'off';

export interface ISkodaVarsoviaOptions {
  readonly carCount?: number;
  readonly line?: string;
  readonly destination?: string;
  readonly maxAnisotropy?: number;
  readonly enableSpotLights?: boolean;
}

export interface ISkodaDimensions {
  readonly carLength: number;
  readonly gangwayGap: number;
  readonly carPitch: number;
  readonly carWidth: number;
  readonly halfW: number;
  readonly floorY: number;
  readonly roofY: number;
  readonly doorCentersZ: readonly number[];
  readonly doorHalfOpening: number;
}

export const VARSOVIA_DIMENSIONS: ISkodaDimensions = {
  carLength: 19.2,
  gangwayGap: 0.4,
  carPitch: 19.6,
  carWidth: 2.72,
  halfW: 1.36,
  floorY: 1.1,
  roofY: 3.62,
  doorCentersZ: [-7.2, -2.4, 2.4, 7.2],
  doorHalfOpening: 0.66,
};

export interface ISkodaVarsoviaMaterials {
  readonly whiteBody: THREE.MeshStandardMaterial;
  readonly roofSilver: THREE.MeshStandardMaterial;
  readonly blackBand: THREE.MeshStandardMaterial;
  readonly warsawYellow: THREE.MeshStandardMaterial;
  readonly warsawRed: THREE.MeshStandardMaterial;
  readonly windowGlass: THREE.MeshStandardMaterial;
  readonly windshieldGlass: THREE.MeshStandardMaterial;
  readonly underframe: THREE.MeshStandardMaterial;
  readonly steelWheel: THREE.MeshStandardMaterial;
  readonly gangwayRubber: THREE.MeshStandardMaterial;
  readonly interiorFloor: THREE.MeshStandardMaterial;
  readonly interiorWall: THREE.MeshStandardMaterial;
  readonly seatRed: THREE.MeshStandardMaterial;
  readonly handrailYellow: THREE.MeshStandardMaterial;
  readonly ceilingLed: THREE.MeshStandardMaterial;
  readonly ledBoard: THREE.MeshStandardMaterial;
  readonly frontHeadlight: THREE.MeshStandardMaterial;
  readonly frontMarker: THREE.MeshStandardMaterial;
  readonly rearHeadlight: THREE.MeshStandardMaterial;
  readonly rearMarker: THREE.MeshStandardMaterial;
  readonly lightBeam: THREE.MeshBasicMaterial;
}

export interface ISkodaVarsoviaGeometries {
  readonly doorFrame: THREE.ExtrudeGeometry;
  readonly doorGlass: THREE.BoxGeometry;
  readonly wheel: THREE.CylinderGeometry;
  readonly axle: THREE.CylinderGeometry;
  readonly verticalPole: THREE.CylinderGeometry;
  readonly horizRail: THREE.CylinderGeometry;
  readonly seatBase: THREE.BoxGeometry;
  readonly seatBack: THREE.BoxGeometry;
  readonly pierWhiteSkirt: THREE.BoxGeometry;
  readonly pierRed: THREE.BoxGeometry;
  readonly pierYellow: THREE.BoxGeometry;
  readonly pierBlackSill: THREE.BoxGeometry;
  readonly pierPillar: THREE.BoxGeometry;
  readonly pierGlass: THREE.BoxGeometry;
  readonly endWhiteSkirt: THREE.BoxGeometry;
  readonly endRed: THREE.BoxGeometry;
  readonly endYellow: THREE.BoxGeometry;
  readonly endBlackSill: THREE.BoxGeometry;
  readonly endBlackUpper: THREE.BoxGeometry;
  readonly floorSlab: THREE.BoxGeometry;
  readonly underSkirt: THREE.BoxGeometry;
  readonly upperBlackHeader: THREE.BoxGeometry;
  readonly cantrailWhite: THREE.BoxGeometry;
  readonly roofCenter: THREE.BoxGeometry;
  readonly hvacUnit: THREE.BoxGeometry;
  readonly ceilingSlab: THREE.BoxGeometry;
  readonly ceilingLedStrip: THREE.BoxGeometry;
  readonly endFrameSide: THREE.BoxGeometry;
  readonly endFrameTop: THREE.BoxGeometry;
  readonly gangwaySide: THREE.BoxGeometry;
  readonly gangwayTop: THREE.BoxGeometry;
  readonly gangwayFloor: THREE.BoxGeometry;
}

export interface ISkodaCabLightRef {
  readonly headMat: THREE.MeshStandardMaterial;
  readonly markerMat: THREE.MeshStandardMaterial;
  readonly spotLight: THREE.SpotLight;
  readonly beamGroup: THREE.Group;
}

export interface ISkodaDoorLeafSpec {
  readonly side: DoorSide;
  readonly sideSign: 1 | -1;
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly leafDir: 1 | -1;
}

export interface ISkodaDoorInstanceGroup {
  readonly frameMesh: THREE.InstancedMesh;
  readonly glassMesh: THREE.InstancedMesh;
  readonly leaves: readonly ISkodaDoorLeafSpec[];
}

export interface ISkodaDoorAxisState {
  target: number;
  current: number;
}
