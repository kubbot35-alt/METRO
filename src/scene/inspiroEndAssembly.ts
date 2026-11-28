import * as THREE from 'three';
import type { IInspiroCarBuildContext } from './inspiroCarAssembly';
import { INSPIRO_CAR_WIDTH, type IInspiroGeometries, type IInspiroMaterials } from './inspiroExteriorParts';

export function addInspiroAerodynamicEnd(
  root: THREE.Group,
  endZ: number,
  dir: -1 | 1,
  isFront: boolean,
  ctx: IInspiroCarBuildContext,
): void {
  const endGroup = new THREE.Group();
  endGroup.position.set(0, 0, endZ);
  endGroup.rotation.y = dir === -1 ? 0 : Math.PI;
  addNoseAndWindshield(endGroup, ctx.mats, ctx.geos);
  addEndLampsAndCameras(endGroup, isFront, ctx);
  root.add(endGroup);
}

function addNoseAndWindshield(
  endGroup: THREE.Group,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
): void {
  const nose = new THREE.Mesh(geos.noseShell, mats.silverBody);
  const yellowApron = new THREE.Mesh(geos.noseYellowApron, mats.warsawYellow);
  const redSkirt = new THREE.Mesh(geos.noseRedSkirt, mats.warsawRed);
  const coupler = new THREE.Mesh(geos.coupler, mats.darkSteel);
  coupler.position.set(0, 0.62, -1.56);
  const frame = new THREE.Mesh(geos.windshieldFrame, mats.blackRibbon);
  frame.position.set(0, 2.48, -1.4);
  frame.rotation.x = 0.25;
  const glass = new THREE.Mesh(geos.windshield, mats.glassTint);
  glass.position.set(0, 2.38, -1.45);
  glass.rotation.x = 0.25;
  const ledSign = new THREE.Mesh(geos.ledDisplayPlane, mats.ledDisplayMat);
  ledSign.position.set(0, 3.03, -1.36);
  ledSign.rotation.x = 0.25;
  const wiper = new THREE.Mesh(geos.wiperArm, mats.darkSteel);
  wiper.position.set(0.28, 2.02, -1.55);
  wiper.rotation.set(0.25, 0, 1.18);
  endGroup.add(nose, yellowApron, redSkirt, coupler, frame, glass, ledSign, wiper);
}

function addEndLampsAndCameras(
  endGroup: THREE.Group,
  isFront: boolean,
  ctx: IInspiroCarBuildContext,
): void {
  const lampMat = isFront ? ctx.mats.headlightMat : ctx.mats.taillightMat;
  ([-1, 1] as const).forEach((side) => {
    const lamp = new THREE.Mesh(ctx.geos.angledLamp, lampMat);
    lamp.position.set(side * 0.92, 1.38, -1.73);
    lamp.rotation.set(0.12, -side * 0.24, -side * 0.24);
    const pod = new THREE.Mesh(ctx.camPodGeo, ctx.mats.blackRibbon);
    pod.position.set(side * (INSPIRO_CAR_WIDTH * 0.5 + 0.05), 2.68, -0.52);
    const lens = new THREE.Mesh(ctx.camLensGeo, ctx.mats.glassTint);
    lens.position.set(side * (INSPIRO_CAR_WIDTH * 0.5 + 0.06), 2.68, -0.4);
    endGroup.add(lamp, pod, lens);
  });
}
