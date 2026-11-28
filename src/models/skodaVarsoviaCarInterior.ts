import * as THREE from 'three';
import {
  VARSOVIA_DIMENSIONS,
  type ISkodaDoorInstanceGroup,
  type ISkodaDoorLeafSpec,
  type ISkodaVarsoviaGeometries,
  type ISkodaVarsoviaMaterials,
} from './skodaVarsoviaTypes';

const PIER_CENTERS_Z = [-4.8, 0, 4.8] as const;

export function buildSkodaCarInterior(
  car: THREE.Group, g: ISkodaVarsoviaGeometries, m: ISkodaVarsoviaMaterials,
): void {
  const { halfW, floorY, doorCentersZ } = VARSOVIA_DIMENSIONS;
  const dummy = new THREE.Object3D();
  const seatBaseIM = new THREE.InstancedMesh(g.seatBase, m.seatRed, 6);
  const seatBackIM = new THREE.InstancedMesh(g.seatBack, m.seatRed, 6);
  let idx = 0;
  for (const s of [-1, 1] as const) {
    for (const pz of PIER_CENTERS_Z) {
      dummy.position.set(s * (halfW - 0.34), floorY + 0.44, pz);
      dummy.updateMatrix();
      seatBaseIM.setMatrixAt(idx, dummy.matrix);
      dummy.position.set(s * (halfW - 0.14), floorY + 0.76, pz);
      dummy.updateMatrix();
      seatBackIM.setMatrixAt(idx++, dummy.matrix);
    }
  }
  seatBaseIM.computeBoundingSphere();
  seatBackIM.computeBoundingSphere();
  car.add(seatBaseIM, seatBackIM);
  addInteriorHandrails(car, g, m, doorCentersZ, dummy);
}

function addInteriorHandrails(
  car: THREE.Group, g: ISkodaVarsoviaGeometries, m: ISkodaVarsoviaMaterials,
  doorCentersZ: readonly number[], dummy: THREE.Object3D,
): void {
  const { halfW, floorY } = VARSOVIA_DIMENSIONS;
  const poles: Array<[number, number, number]> = doorCentersZ.map((dz) => [0, floorY + 1.14, dz]);
  for (const s of [-1, 1] as const) {
    for (const pz of PIER_CENTERS_Z) {
      poles.push([s * (halfW - 0.56), floorY + 1.14, pz - 1.56], [s * (halfW - 0.56), floorY + 1.14, pz + 1.56]);
    }
    const topRail = new THREE.Mesh(g.horizRail, m.handrailYellow);
    topRail.position.set(s * 0.56, 3.04, 0);
    car.add(topRail);
  }
  const polesIM = new THREE.InstancedMesh(g.verticalPole, m.handrailYellow, poles.length);
  poles.forEach(([x, y, z], i) => {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    polesIM.setMatrixAt(i, dummy.matrix);
  });
  polesIM.computeBoundingSphere();
  car.add(polesIM);
}

function collectDoorLeafSpecs(doorCentersZ: readonly number[], halfW: number): ISkodaDoorLeafSpec[] {
  const leaves: ISkodaDoorLeafSpec[] = [];
  for (const side of ['left', 'right'] as const) {
    const sideSign: 1 | -1 = side === 'left' ? 1 : -1;
    for (const centerZ of doorCentersZ) {
      for (const leafDir of [-1, 1] as const) {
        leaves.push({ side, sideSign, baseX: sideSign * (halfW - 0.03), baseY: 2.13, baseZ: centerZ + leafDir * 0.33, leafDir });
      }
    }
  }
  return leaves;
}

export function buildSkodaCarDoors(
  car: THREE.Group, g: ISkodaVarsoviaGeometries, m: ISkodaVarsoviaMaterials,
): ISkodaDoorInstanceGroup {
  const { doorCentersZ, halfW } = VARSOVIA_DIMENSIONS;
  const leafCount = doorCentersZ.length * 4;
  const frameMesh = new THREE.InstancedMesh(g.doorFrame, m.blackBand, leafCount);
  const glassMesh = new THREE.InstancedMesh(g.doorGlass, m.windowGlass, leafCount);
  frameMesh.castShadow = true;
  frameMesh.frustumCulled = false;
  glassMesh.frustumCulled = false;
  const leaves = collectDoorLeafSpecs(doorCentersZ, halfW);
  car.add(frameMesh, glassMesh);
  return { frameMesh, glassMesh, leaves };
}

function addBogieAxlesAndWheels(
  bz: number, dummy: THREE.Object3D, axleIM: THREE.InstancedMesh,
  wheelIM: THREE.InstancedMesh, counters: { aIdx: number; wIdx: number },
): void {
  for (const dz of [-0.95, 0.95]) {
    dummy.position.set(0, 0.42, bz + dz);
    dummy.updateMatrix();
    axleIM.setMatrixAt(counters.aIdx++, dummy.matrix);
    for (const s of [-1, 1] as const) {
      dummy.position.set(s * 0.72, 0.42, bz + dz);
      dummy.updateMatrix();
      wheelIM.setMatrixAt(counters.wIdx++, dummy.matrix);
    }
  }
}

export function buildSkodaCarUnderframe(
  car: THREE.Group, g: ISkodaVarsoviaGeometries, m: ISkodaVarsoviaMaterials, extraGeos: THREE.BufferGeometry[],
): void {
  const dummy = new THREE.Object3D();
  const bogieFrameGeo = new THREE.BoxGeometry(1.96, 0.34, 2.55);
  const eqBoxGeo = new THREE.BoxGeometry(2.1, 0.46, 2.8);
  extraGeos.push(bogieFrameGeo, eqBoxGeo);
  const wheelIM = new THREE.InstancedMesh(g.wheel, m.steelWheel, 8);
  const axleIM = new THREE.InstancedMesh(g.axle, m.underframe, 4);
  const counters = { aIdx: 0, wIdx: 0 };
  for (const bz of [-6.2, 6.2]) {
    const frame = new THREE.Mesh(bogieFrameGeo, m.underframe);
    frame.position.set(0, 0.56, bz);
    car.add(frame);
    addBogieAxlesAndWheels(bz, dummy, axleIM, wheelIM, counters);
  }
  wheelIM.computeBoundingSphere();
  axleIM.computeBoundingSphere();
  car.add(wheelIM, axleIM);
  for (const eqZ of [-2.0, 2.0]) {
    const box = new THREE.Mesh(eqBoxGeo, m.underframe);
    box.position.set(0, 0.68, eqZ);
    car.add(box);
  }
}
