import * as THREE from 'three';
import type { PlatformLayout } from '../domain/types';
import type { IStationFurnitureMaterials } from './stationEscalatorBuilder';
import {
  ISLAND_HALL_LEFT_WALL_X,
  ISLAND_HALL_RIGHT_WALL_X,
  ISLAND_PLATFORM_CENTER_X,
  SIDE_HALL_LEFT_WALL_X,
  SIDE_HALL_RIGHT_WALL_X,
  SIDE_LEFT_PLATFORM_CENTER_X,
  SIDE_RIGHT_PLATFORM_CENTER_X,
} from './stationHallBuilder';

interface IInstanceTransform {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const DUMMY_OBJ = new THREE.Object3D();

function createInstancedProp(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  transforms: readonly IInstanceTransform[],
  disposables: Array<{ dispose(): void }>,
): THREE.InstancedMesh {
  disposables.push(geo);
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  for (let i = 0; i < transforms.length; i += 1) {
    const t = transforms[i];
    DUMMY_OBJ.position.set(t.x, t.y, t.z);
    DUMMY_OBJ.rotation.set(0, 0, 0);
    DUMMY_OBJ.scale.set(1, 1, 1);
    DUMMY_OBJ.updateMatrix();
    mesh.setMatrixAt(i, DUMMY_OBJ.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export function addInstancedIslandColumns(
  group: THREE.Group,
  centerZ: number,
  offsets: readonly number[],
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const colTransforms = offsets.map((off) => ({ x: ISLAND_PLATFORM_CENTER_X, y: 3.33, z: centerZ + off }));
  const baseTransforms = offsets.map((off) => ({ x: ISLAND_PLATFORM_CENTER_X, y: 1.19, z: centerZ + off }));
  group.add(
    createInstancedProp(new THREE.CylinderGeometry(0.28, 0.32, 4.5, 12), mats.column, colTransforms, disposables),
    createInstancedProp(new THREE.CylinderGeometry(0.38, 0.42, 0.22, 12), mats.benchMetal, baseTransforms, disposables),
  );
}

export function addInstancedSideColumns(
  group: THREE.Group,
  centerZ: number,
  offsets: readonly number[],
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const transforms: IInstanceTransform[] = [];
  const baseTransforms: IInstanceTransform[] = [];
  offsets.forEach((off) => {
    const z = centerZ + off;
    transforms.push(
      { x: SIDE_RIGHT_PLATFORM_CENTER_X + 0.4, y: 3.33, z },
      { x: SIDE_LEFT_PLATFORM_CENTER_X - 0.4, y: 3.33, z },
    );
    baseTransforms.push(
      { x: SIDE_RIGHT_PLATFORM_CENTER_X + 0.4, y: 1.19, z },
      { x: SIDE_LEFT_PLATFORM_CENTER_X - 0.4, y: 1.19, z },
    );
  });
  group.add(
    createInstancedProp(new THREE.CylinderGeometry(0.24, 0.28, 4.5, 10), mats.column, transforms, disposables),
    createInstancedProp(new THREE.CylinderGeometry(0.34, 0.38, 0.2, 10), mats.benchMetal, baseTransforms, disposables),
  );
}

export interface IBenchRowSpec {
  readonly xPos: number;
  readonly facingDirX: -1 | 1;
  readonly offsets: readonly number[];
}

export function addInstancedBenches(
  group: THREE.Group,
  rows: readonly IBenchRowSpec[],
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const seats: IInstanceTransform[] = [];
  const backs: IInstanceTransform[] = [];
  const legs: IInstanceTransform[] = [];
  rows.forEach((row) => {
    row.offsets.forEach((off) => {
      const z = centerZ + off;
      seats.push({ x: row.xPos, y: 1.52, z });
      backs.push({ x: row.xPos - row.facingDirX * 0.29, y: 1.78, z });
      legs.push({ x: row.xPos, y: 1.3, z: z - 0.96 }, { x: row.xPos, y: 1.3, z: z + 0.96 });
    });
  });
  group.add(
    createInstancedProp(new THREE.BoxGeometry(0.62, 0.07, 2.5), mats.benchWood, seats, disposables),
    createInstancedProp(new THREE.BoxGeometry(0.07, 0.36, 2.5), mats.benchWood, backs, disposables),
    createInstancedProp(new THREE.BoxGeometry(0.56, 0.44, 0.12), mats.benchMetal, legs, disposables),
  );
}

export interface IBinRowSpec {
  readonly xPos: number;
  readonly offsets: readonly number[];
}

export function addInstancedTrashBins(
  group: THREE.Group,
  rows: readonly IBinRowSpec[],
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const bodies: IInstanceTransform[] = [];
  const rims: IInstanceTransform[] = [];
  rows.forEach((row) => {
    row.offsets.forEach((off) => {
      const z = centerZ + off;
      bodies.push({ x: row.xPos, y: 1.47, z });
      rims.push({ x: row.xPos, y: 1.88, z });
    });
  });
  group.add(
    createInstancedProp(new THREE.CylinderGeometry(0.2, 0.18, 0.78, 12), mats.binBody, bodies, disposables),
    createInstancedProp(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 12), mats.binRim, rims, disposables),
  );
}

export function addInstancedCeilingBaffles(
  group: THREE.Group,
  layout: PlatformLayout,
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const leftX = layout === 'island' ? ISLAND_HALL_LEFT_WALL_X : SIDE_HALL_LEFT_WALL_X;
  const rightX = layout === 'island' ? ISLAND_HALL_RIGHT_WALL_X : SIDE_HALL_RIGHT_WALL_X;
  const spanWidth = rightX - leftX - 0.8;
  const midX = (leftX + rightX) * 0.5;
  const transforms: IInstanceTransform[] = [];
  for (let off = -64; off <= 64; off += 8) {
    transforms.push({ x: midX, y: 5.28, z: centerZ + off });
  }
  group.add(
    createInstancedProp(new THREE.BoxGeometry(spanWidth, 0.16, 0.24), mats.benchMetal, transforms, disposables),
  );
}
