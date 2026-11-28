import * as THREE from 'three';
import { buildSkodaCabAssembly } from './skodaVarsoviaCabBuilder';
import {
  buildSkodaCarDoors,
  buildSkodaCarInterior,
  buildSkodaCarUnderframe,
} from './skodaVarsoviaCarInterior';
import { addSkodaCarWalls } from './skodaVarsoviaCarWalls';
import {
  VARSOVIA_DIMENSIONS,
  type ISkodaCabLightRef,
  type ISkodaDoorInstanceGroup,
  type ISkodaVarsoviaGeometries,
  type ISkodaVarsoviaMaterials,
} from './skodaVarsoviaTypes';

export interface ISkodaCarBuildParams {
  readonly index: number;
  readonly isFrontCab: boolean;
  readonly isRearCab: boolean;
  readonly geometries: ISkodaVarsoviaGeometries;
  readonly materials: ISkodaVarsoviaMaterials;
  readonly extraGeometries: THREE.BufferGeometry[];
  readonly interiorLights: THREE.PointLight[];
  readonly doorInstances: ISkodaDoorInstanceGroup[];
  readonly enableSpotLights: boolean;
}

export interface ISkodaCarBuildResult {
  readonly car: THREE.Group;
  readonly frontCabRef: ISkodaCabLightRef | null;
  readonly rearCabRef: ISkodaCabLightRef | null;
}

export function buildSkodaCar(params: ISkodaCarBuildParams): ISkodaCarBuildResult {
  const { index, isFrontCab, isRearCab, geometries: g, materials: m } = params;
  const car = new THREE.Group();
  car.name = `Car_${index + 1}_${isFrontCab ? 'FrontCab' : isRearCab ? 'RearCab' : 'Middle'}`;
  addCarShellStructure(car, index, g, m, params.interiorLights);
  addSkodaCarWalls(car, isFrontCab, isRearCab, g, m, params.extraGeometries);
  const { frontCabRef, rearCabRef } = attachCarEnds(car, isFrontCab, isRearCab, params);
  buildSkodaCarInterior(car, g, m);
  params.doorInstances.push(buildSkodaCarDoors(car, g, m));
  buildSkodaCarUnderframe(car, g, m, params.extraGeometries);
  return { car, frontCabRef, rearCabRef };
}

function addCarRoofAndCantrails(
  car: THREE.Group,
  g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials,
): void {
  const d = VARSOVIA_DIMENSIONS;
  for (const s of [-1, 1] as const) {
    const ledStrip = new THREE.Mesh(g.ceilingLedStrip, m.ceilingLed);
    ledStrip.position.set(s * 0.68, 3.37, 0);
    const cantrail = new THREE.Mesh(g.cantrailWhite, m.whiteBody);
    cantrail.position.set(s * (d.halfW - 0.14), 3.42, 0);
    cantrail.rotation.z = s * 0.56;
    cantrail.castShadow = true;
    const header = new THREE.Mesh(g.upperBlackHeader, m.blackBand);
    header.position.set(s * (d.halfW - 0.035), 3.18, 0);
    car.add(ledStrip, cantrail, header);
  }
  for (const hz of [-4.8, 4.8]) {
    const hvac = new THREE.Mesh(g.hvacUnit, m.roofSilver);
    hvac.position.set(0, d.roofY + 0.08, hz);
    hvac.castShadow = true;
    car.add(hvac);
  }
}

function addCarShellStructure(
  car: THREE.Group, index: number, g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials, interiorLights: THREE.PointLight[],
): void {
  const d = VARSOVIA_DIMENSIONS;
  const floor = new THREE.Mesh(g.floorSlab, m.interiorFloor);
  floor.position.y = d.floorY - 0.05;
  floor.receiveShadow = true;
  const underSkirt = new THREE.Mesh(g.underSkirt, m.underframe);
  underSkirt.position.y = d.floorY - 0.22;
  const ceiling = new THREE.Mesh(g.ceilingSlab, m.interiorWall);
  ceiling.position.y = 3.4;
  const roof = new THREE.Mesh(g.roofCenter, m.roofSilver);
  roof.position.y = d.roofY - 0.05;
  roof.castShadow = true;
  roof.receiveShadow = true;
  car.add(floor, underSkirt, ceiling, roof);
  addCarRoofAndCantrails(car, g, m);
  if (index % 2 === 0) {
    const intLight = new THREE.PointLight(0xfff4e0, 2.2, 24, 1.4);
    intLight.position.set(0, 3.15, 0);
    car.add(intLight);
    interiorLights.push(intLight);
  }
}

function attachCarEnds(
  car: THREE.Group,
  isFrontCab: boolean,
  isRearCab: boolean,
  params: ISkodaCarBuildParams,
): { frontCabRef: ISkodaCabLightRef | null; rearCabRef: ISkodaCabLightRef | null } {
  const halfLen = VARSOVIA_DIMENSIONS.carLength / 2;
  const frontCabRef = attachSingleEnd(car, halfLen, 1, isFrontCab, params);
  const rearCabRef = attachSingleEnd(car, -halfLen, -1, isRearCab, params);
  return { frontCabRef, rearCabRef };
}

function attachSingleEnd(
  car: THREE.Group,
  zEnd: number,
  dir: 1 | -1,
  isCab: boolean,
  params: ISkodaCarBuildParams,
): ISkodaCabLightRef | null {
  if (!isCab) {
    addEndPortalFrame(car, zEnd - dir * 0.06, params.geometries, params.materials);
    return null;
  }
  const built = buildSkodaCabAssembly(dir, params.materials, params.extraGeometries, params.enableSpotLights);
  built.cab.position.z = zEnd;
  car.add(built.cab);
  return built.ref;
}

function addEndPortalFrame(
  car: THREE.Group,
  zPos: number,
  g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials,
): void {
  for (const s of [-1, 1] as const) {
    const post = new THREE.Mesh(g.endFrameSide, m.blackBand);
    post.position.set(s * (VARSOVIA_DIMENSIONS.halfW - 0.23), 2.3, zPos);
    car.add(post);
  }
  const lintel = new THREE.Mesh(g.endFrameTop, m.roofSilver);
  lintel.position.set(0, 3.4, zPos);
  car.add(lintel);
}

export function buildSkodaGangway(
  g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials,
): THREE.Group {
  const group = new THREE.Group();
  for (const s of [-1, 1] as const) {
    const wall = new THREE.Mesh(g.gangwaySide, m.gangwayRubber);
    wall.position.set(s * 1.02, 2.28, 0);
    group.add(wall);
  }
  const top = new THREE.Mesh(g.gangwayTop, m.gangwayRubber);
  top.position.y = 3.44;
  const bottom = new THREE.Mesh(g.gangwayFloor, m.interiorFloor);
  bottom.position.y = VARSOVIA_DIMENSIONS.floorY - 0.04;
  group.add(top, bottom);
  return group;
}
