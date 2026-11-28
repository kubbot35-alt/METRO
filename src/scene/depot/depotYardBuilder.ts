import * as THREE from 'three';
import { M1_SURFACE_ELEVATION_M, M1_TUNNEL_PORTAL_M, type TrackAlignment } from '../../domain/trackAlignment';
import type { IDepotMaterials } from './depotMaterials';

export function addOutdoorTerrainAndEmbankment(
  root: THREE.Group, alignment: TrackAlignment, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  const grassLeftGeo = new THREE.PlaneGeometry(180, 560);
  const grassRightGeo = new THREE.PlaneGeometry(180, 560);
  const yardGravelGeo = new THREE.PlaneGeometry(42, 330);
  const portalHillGeo = new THREE.BoxGeometry(220, 4.2, 130);
  const fenceGeo = new THREE.BoxGeometry(0.32, 2.5, 420);
  disposables.push(grassLeftGeo, grassRightGeo, yardGravelGeo, portalHillGeo, fenceGeo);
  const grassLeft = new THREE.Mesh(grassLeftGeo, mats.grass); grassLeft.rotation.x = -Math.PI / 2; grassLeft.position.set(-100, ySurf - 0.16, -155);
  const grassRight = new THREE.Mesh(grassRightGeo, mats.grass); grassRight.rotation.x = -Math.PI / 2; grassRight.position.set(95.5, ySurf - 0.16, -155);
  const yardGravel = new THREE.Mesh(yardGravelGeo, mats.gravel); yardGravel.rotation.x = -Math.PI / 2; yardGravel.position.set(-3.5, ySurf - 0.08, -60);
  const portalFrame = alignment.sample(M1_TUNNEL_PORTAL_M);
  const portalHill = new THREE.Mesh(portalHillGeo, mats.grass); portalHill.position.set(portalFrame.x - 2, portalFrame.y + 7.7, portalFrame.z - 68);
  const fenceRight = new THREE.Mesh(fenceGeo, mats.concrete); fenceRight.position.set(16.5, ySurf + 1.25, -90);
  const fenceLeft = new THREE.Mesh(fenceGeo, mats.concrete); fenceLeft.position.set(-22.5, ySurf + 1.25, -90);
  root.add(grassLeft, grassRight, yardGravel, portalHill, fenceRight, fenceLeft);
}

export function addStablingSidingsAndTrains(root: THREE.Group, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  const sidingXs = [-9.6, -14.2, 6.4];
  const railGeo = new THREE.BoxGeometry(0.08, 0.14, 250);
  const sleeperGeo = new THREE.BoxGeometry(2.1, 0.08, 0.24);
  const bufferBarGeo = new THREE.BoxGeometry(2.1, 0.42, 0.22);
  const bufferLegGeo = new THREE.BoxGeometry(0.18, 1.05, 1.35);
  const stripeGeo = new THREE.BoxGeometry(0.65, 0.44, 0.24);
  disposables.push(railGeo, sleeperGeo, bufferBarGeo, bufferLegGeo, stripeGeo);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, mats.darkConcrete, sidingXs.length * 110);
  const dummy = new THREE.Object3D();
  let idx = 0;
  sidingXs.forEach((sx) => {
    idx = buildSingleSiding(root, sx, ySurf, railGeo, bufferBarGeo, bufferLegGeo, stripeGeo, mats, sleepers, dummy, idx);
  });
  sleepers.instanceMatrix.needsUpdate = true;
  sleepers.frustumCulled = false;
  root.add(sleepers);
  addParkedDepotTrain(root, -9.6, ySurf, -118, 3, mats, disposables);
  addParkedDepotTrain(root, 6.4, ySurf, -148, 3, mats, disposables);
}

function buildSingleSiding(
  root: THREE.Group, sx: number, ySurf: number, railGeo: THREE.BoxGeometry, bufferBarGeo: THREE.BoxGeometry,
  bufferLegGeo: THREE.BoxGeometry, stripeGeo: THREE.BoxGeometry, mats: IDepotMaterials,
  sleepers: THREE.InstancedMesh, dummy: THREE.Object3D, startIdx: number,
): number {
  const railL = new THREE.Mesh(railGeo, mats.steel); railL.position.set(sx - 0.72, ySurf + 0.14, -75);
  const railR = new THREE.Mesh(railGeo, mats.steel); railR.position.set(sx + 0.72, ySurf + 0.14, -75);
  root.add(railL, railR);
  let idx = startIdx;
  for (let i = 0; i < 110; i += 1) {
    dummy.position.set(sx, ySurf + 0.04, 48 - i * 2.25);
    dummy.updateMatrix();
    sleepers.setMatrixAt(idx, dummy.matrix);
    idx += 1;
  }
  const bufGroup = new THREE.Group(); bufGroup.position.set(sx, ySurf, -200);
  const bar = new THREE.Mesh(bufferBarGeo, mats.redBuffer); bar.position.set(0, 0.95, 0);
  const stripe = new THREE.Mesh(stripeGeo, mats.whiteStripe); stripe.position.set(0, 0.95, 0);
  const legL = new THREE.Mesh(bufferLegGeo, mats.steel); legL.position.set(-0.75, 0.52, -0.35);
  const legR = new THREE.Mesh(bufferLegGeo, mats.steel); legR.position.set(0.75, 0.52, -0.35);
  bufGroup.add(bar, stripe, legL, legR);
  root.add(bufGroup);
  return idx;
}

function createParkedCarMeshes(
  cz: number,
  geos: { body: THREE.BoxGeometry; win: THREE.BoxGeometry; red: THREE.BoxGeometry; hvac: THREE.BoxGeometry; bogie: THREE.BoxGeometry },
  mats: IDepotMaterials,
): THREE.Mesh[] {
  const body = new THREE.Mesh(geos.body, mats.trainBody); body.position.set(0, 2.1, cz);
  const win = new THREE.Mesh(geos.win, mats.trainGlass); win.position.set(0, 2.45, cz);
  const red = new THREE.Mesh(geos.red, mats.trainRed); red.position.set(0, 1.05, cz);
  const hvacA = new THREE.Mesh(geos.hvac, mats.steel); hvacA.position.set(0, 3.68, cz - 4.0);
  const hvacB = new THREE.Mesh(geos.hvac, mats.steel); hvacB.position.set(0, 3.68, cz + 4.0);
  const bogieA = new THREE.Mesh(geos.bogie, mats.darkConcrete); bogieA.position.set(0, 0.45, cz - 5.2);
  const bogieB = new THREE.Mesh(geos.bogie, mats.darkConcrete); bogieB.position.set(0, 0.45, cz + 5.2);
  return [body, win, red, hvacA, hvacB, bogieA, bogieB];
}

function addParkedDepotTrain(
  root: THREE.Group, x: number, ySurf: number, frontZ: number, carCount: number, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const [carLen, gap] = [17.2, 0.9];
  const geos = {
    body: new THREE.BoxGeometry(2.74, 2.9, carLen),
    win: new THREE.BoxGeometry(2.78, 1.05, carLen - 0.8),
    red: new THREE.BoxGeometry(2.78, 0.52, carLen - 0.2),
    hvac: new THREE.BoxGeometry(1.75, 0.28, 3.4),
    bogie: new THREE.BoxGeometry(2.1, 0.6, 2.4),
  };
  const yellowNoseGeo = new THREE.BoxGeometry(2.76, 0.65, 0.25);
  disposables.push(...Object.values(geos), yellowNoseGeo);
  const trainGroup = new THREE.Group();
  trainGroup.position.set(x, ySurf, frontZ);
  for (let i = 0; i < carCount; i += 1) {
    trainGroup.add(...createParkedCarMeshes(i * (carLen + gap) + carLen * 0.5, geos, mats));
  }
  const frontYellow = new THREE.Mesh(yellowNoseGeo, mats.trainYellow); frontYellow.position.set(0, 1.48, -0.05);
  const rearYellow = new THREE.Mesh(yellowNoseGeo, mats.trainYellow); rearYellow.position.set(0, 1.48, carCount * (carLen + gap) - gap + 0.05);
  trainGroup.add(frontYellow, rearYellow);
  root.add(trainGroup);
}
