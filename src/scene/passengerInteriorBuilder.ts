import * as THREE from 'three';
import { formatClockTime } from '../domain/scheduleSystem';
import type { DoorSide, ISimulationSnapshot } from '../domain/types';

export interface IPassengerInteriorRig {
  readonly group: THREE.Group;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

interface IInteriorDoorLeaf {
  readonly mesh: THREE.Object3D;
  readonly baseZ: number;
  readonly slideDir: -1 | 1;
}

interface IBoardingWalker {
  readonly group: THREE.Group;
  readonly doorZ: number;
  readonly startT: number;
  readonly endT: number;
  readonly phase: number;
}

const FLOOR_Y = 1.08;
const CEIL_Y = 3.28;
const HALF_W = 1.36;
const DOOR_SLIDE_M = 0.66;
const COAT_PALETTE = [0x1e3a5f, 0x334155, 0x7c2d12, 0x3f3f46, 0x1e40af, 0x4c1d95];

export function buildPassengerInteriorRig(
  scene: THREE.Scene,
  maxAnisotropy: number,
): IPassengerInteriorRig {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'PassengerInteriorCar1';
  group.rotation.order = 'YXZ';
  group.visible = false;
  scene.add(group);

  const mats = createInteriorMaterials(disposables);
  const led = createOverheadLedDisplay(group, maxAnisotropy, disposables);

  buildShellAndWindows(group, mats, disposables);
  const leftDoors = buildSlidingDoors(group, -HALF_W + 0.05, mats, disposables);
  const rightDoors = buildSlidingDoors(group, HALF_W - 0.05, mats, disposables);
  buildSeatsAndHandrails(group, mats, disposables);
  const interiorLights = buildSaloonLights(group);
  const seatedPassengers = buildSeatedPassengers(group, disposables);
  const walkers = buildDoorwayWalkers(group, disposables);

  let appliedTheme: 'modern' | 'retro' | null = null;
  let leftDoorOpen = 0;
  let rightDoorOpen = 0;
  let walkClock = 0;
  let lastLedKey = '';

  return {
    group,
    update: (snapshot, dtSec) => {
      walkClock += dtSec;
      const theme = snapshot.trainModel.visual.theme;
      if (appliedTheme !== theme) {
        appliedTheme = theme;
        applyThemePalette(mats, interiorLights, theme);
      }

      const targetL = snapshot.openDoorSide === 'left' ? 1 : 0;
      const targetR = snapshot.openDoorSide === 'right' ? 1 : 0;
      const step = Math.min(1, dtSec * 3.8);
      leftDoorOpen += (targetL - leftDoorOpen) * step;
      rightDoorOpen += (targetR - rightDoorOpen) * step;
      animateDoorSet(leftDoors, leftDoorOpen);
      animateDoorSet(rightDoors, rightDoorOpen);

      const isTechnical = snapshot.challenge?.skipStations === true;
      const visibleSeated = isTechnical
        ? 0
        : Math.min(seatedPassengers.length, Math.floor(snapshot.passengersCarried / 6));
      for (let i = 0; i < seatedPassengers.length; i += 1) {
        seatedPassengers[i].visible = i < visibleSeated;
      }

      syncDoorwayWalkers(walkers, snapshot, walkClock, isTechnical);

      const clockStr = formatClockTime(snapshot.schedule.currentClockSec).slice(0, 5);
      const stationName = snapshot.currentStation.station.name;
      const statusText = isTechnical
        ? 'PRZEJAZD TECHNICZNY'
        : snapshot.doorState === 'open'
          ? `STACJA: ${stationName.toUpperCase()}`
          : `NASTĘPNA: ${stationName.toUpperCase()}`;
      const ledKey = `${snapshot.line.id}|${statusText}|${clockStr}`;
      if (ledKey !== lastLedKey) {
        lastLedKey = ledKey;
        led.redraw(snapshot.line.id, snapshot.line.cssColor, statusText, clockStr);
      }
    },
    dispose: () => {
      scene.remove(group);
      led.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}

interface IInteriorMaterials {
  readonly floor: THREE.MeshStandardMaterial;
  readonly aisleStrip: THREE.MeshStandardMaterial;
  readonly yellowEdge: THREE.MeshStandardMaterial;
  readonly wall: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly seatCushion: THREE.MeshStandardMaterial;
  readonly seatFrame: THREE.MeshStandardMaterial;
  readonly handrail: THREE.MeshStandardMaterial;
  readonly strap: THREE.MeshStandardMaterial;
  readonly doorPanel: THREE.MeshStandardMaterial;
  readonly windowGlass: THREE.MeshPhysicalMaterial;
  readonly ceilingLamp: THREE.MeshStandardMaterial;
  readonly bulkheadDark: THREE.MeshStandardMaterial;
}

function createInteriorMaterials(disposables: Array<{ dispose(): void }>): IInteriorMaterials {
  const mats: IInteriorMaterials = {
    floor: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.86, metalness: 0.08 }),
    aisleStrip: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.05 }),
    yellowEdge: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55, metalness: 0.1 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.12 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5, metalness: 0.1 }),
    seatCushion: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.82, metalness: 0.04 }),
    seatFrame: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.55 }),
    handrail: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.55 }),
    strap: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, metalness: 0.1 }),
    doorPanel: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.38, metalness: 0.35 }),
    windowGlass: new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.14,
      roughness: 0.1,
      metalness: 0.1,
      depthWrite: false,
    }),
    ceilingLamp: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe0f2fe,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
    bulkheadDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.28 }),
  };
  disposables.push(...Object.values(mats));
  return mats;
}

function applyThemePalette(
  mats: IInteriorMaterials,
  lights: readonly THREE.PointLight[],
  theme: 'modern' | 'retro',
): void {
  if (theme === 'retro') {
    // Classic Warsaw Seria 81 interior: beige/greenish laminate, brown/burgundy vinyl seats, silver handrails
    mats.floor.color.setHex(0x3f4448);
    mats.aisleStrip.color.setHex(0x2c3035);
    mats.wall.color.setHex(0xc8cfc0);
    mats.ceiling.color.setHex(0xd8dcd0);
    mats.seatCushion.color.setHex(0x6b2c2a);
    mats.handrail.color.setHex(0xd8e0ea);
    mats.handrail.metalness = 0.85;
    mats.handrail.roughness = 0.22;
    mats.doorPanel.color.setHex(0xa8b3a8);
    mats.ceilingLamp.emissive.setHex(0xfde68a);
    mats.ceilingLamp.emissiveIntensity = 1.9;
    lights.forEach((l) => {
      l.color.setHex(0xfff1d0);
      l.intensity = 10.5;
    });
  } else {
    // Modern Siemens Inspiro interior: crisp light panels, blue seats, signature yellow handrails
    mats.floor.color.setHex(0x4b5563);
    mats.aisleStrip.color.setHex(0x334155);
    mats.wall.color.setHex(0xe5e9f0);
    mats.ceiling.color.setHex(0xf8fafc);
    mats.seatCushion.color.setHex(0x1d4ed8);
    mats.handrail.color.setHex(0xfacc15);
    mats.handrail.metalness = 0.42;
    mats.handrail.roughness = 0.3;
    mats.doorPanel.color.setHex(0xd1d5db);
    mats.ceilingLamp.emissive.setHex(0xe0f2fe);
    mats.ceilingLamp.emissiveIntensity = 2.3;
    lights.forEach((l) => {
      l.color.setHex(0xf0f9ff);
      l.intensity = 12.5;
    });
  }
}

function buildShellAndWindows(
  root: THREE.Group,
  mats: IInteriorMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const len = 17.6;
  const centerZ = 10.8;

  const floorGeo = new THREE.BoxGeometry(HALF_W * 2, 0.08, len);
  const aisleGeo = new THREE.BoxGeometry(1.18, 0.085, len - 0.4);
  const ceilGeo = new THREE.BoxGeometry(HALF_W * 2, 0.1, len);
  const lampStripGeo = new THREE.BoxGeometry(0.16, 0.05, len - 1.2);
  const bulkGeo = new THREE.BoxGeometry(HALF_W * 2, CEIL_Y - FLOOR_Y, 0.16);
  const doorFrameGeo = new THREE.BoxGeometry(0.95, 1.95, 0.19);
  const cabWinGeo = new THREE.BoxGeometry(0.68, 0.92, 0.21);
  disposables.push(floorGeo, aisleGeo, ceilGeo, lampStripGeo, bulkGeo, doorFrameGeo, cabWinGeo);

  const floor = new THREE.Mesh(floorGeo, mats.floor);
  floor.position.set(0, FLOOR_Y - 0.04, centerZ);
  const aisle = new THREE.Mesh(aisleGeo, mats.aisleStrip);
  aisle.position.set(0, FLOOR_Y - 0.036, centerZ);
  const ceil = new THREE.Mesh(ceilGeo, mats.ceiling);
  ceil.position.set(0, CEIL_Y + 0.05, centerZ);

  const lampL = new THREE.Mesh(lampStripGeo, mats.ceilingLamp);
  lampL.position.set(-0.56, CEIL_Y - 0.02, centerZ);
  const lampR = new THREE.Mesh(lampStripGeo, mats.ceilingLamp);
  lampR.position.set(0.56, CEIL_Y - 0.02, centerZ);

  // Front bulkhead separating driver cab (z = 2.0) & rear gangway (z = 19.6)
  const frontWall = new THREE.Mesh(bulkGeo, mats.wall);
  frontWall.position.set(0, (FLOOR_Y + CEIL_Y) * 0.5, 2.0);
  const cabDoor = new THREE.Mesh(doorFrameGeo, mats.bulkheadDark);
  cabDoor.position.set(0, FLOOR_Y + 0.98, 2.01);
  const cabWin = new THREE.Mesh(cabWinGeo, mats.windowGlass);
  cabWin.position.set(0, FLOOR_Y + 1.48, 2.02);

  const rearWall = new THREE.Mesh(bulkGeo, mats.bulkheadDark);
  rearWall.position.set(0, (FLOOR_Y + CEIL_Y) * 0.5, 19.6);

  root.add(floor, aisle, ceil, lampL, lampR, frontWall, cabDoor, cabWin, rearWall);

  // Side walls constructed from window bays + door bays so openings are 100% transparent to the live 3D world
  const windowBays: ReadonlyArray<[number, number]> = [
    [2.05, 5.75],
    [7.45, 11.45],
    [13.15, 19.55],
  ];
  const doorCenters = [6.6, 12.3];
  const headerGeo = new THREE.BoxGeometry(0.09, 0.28, len);
  const mullionGeo = new THREE.BoxGeometry(0.11, CEIL_Y - FLOOR_Y, 0.16);
  const thresholdGeo = new THREE.BoxGeometry(0.18, 0.015, 1.72);
  disposables.push(headerGeo, mullionGeo, thresholdGeo);

  [-1, 1].forEach((sideSign) => {
    const wallX = sideSign * HALF_W;
    const header = new THREE.Mesh(headerGeo, mats.wall);
    header.position.set(wallX, CEIL_Y - 0.12, centerZ);
    root.add(header);

    windowBays.forEach(([zStart, zEnd]) => {
      const bayLen = zEnd - zStart;
      const midZ = (zStart + zEnd) * 0.5;
      const waistGeo = new THREE.BoxGeometry(0.09, 0.9, bayLen);
      const glassGeo = new THREE.PlaneGeometry(bayLen - 0.14, 1.06);
      disposables.push(waistGeo, glassGeo);

      const waist = new THREE.Mesh(waistGeo, mats.wall);
      waist.position.set(wallX, FLOOR_Y + 0.45, midZ);
      const glass = new THREE.Mesh(glassGeo, mats.windowGlass);
      glass.position.set(wallX - sideSign * 0.02, FLOOR_Y + 1.43, midZ);
      glass.rotation.y = sideSign > 0 ? -Math.PI / 2 : Math.PI / 2;

      const pillarA = new THREE.Mesh(mullionGeo, mats.wall);
      pillarA.position.set(wallX, (FLOOR_Y + CEIL_Y) * 0.5, zStart);
      const pillarB = new THREE.Mesh(mullionGeo, mats.wall);
      pillarB.position.set(wallX, (FLOOR_Y + CEIL_Y) * 0.5, zEnd);
      root.add(waist, glass, pillarA, pillarB);
    });

    doorCenters.forEach((dz) => {
      const threshold = new THREE.Mesh(thresholdGeo, mats.yellowEdge);
      threshold.position.set(wallX - sideSign * 0.12, FLOOR_Y + 0.008, dz);
      root.add(threshold);
    });
  });
}

function buildSlidingDoors(
  root: THREE.Group,
  wallX: number,
  mats: IInteriorMaterials,
  disposables: Array<{ dispose(): void }>,
): readonly IInteriorDoorLeaf[] {
  const leaves: IInteriorDoorLeaf[] = [];
  const lowerGeo = new THREE.BoxGeometry(0.06, 0.98, 0.83);
  const frameTopGeo = new THREE.BoxGeometry(0.06, 0.16, 0.83);
  const stileGeo = new THREE.BoxGeometry(0.06, 0.92, 0.1);
  const glassGeo = new THREE.BoxGeometry(0.025, 0.88, 0.62);
  disposables.push(lowerGeo, frameTopGeo, stileGeo, glassGeo);

  const doorCenters = [6.6, 12.3];
  doorCenters.forEach((dz) => {
    ([-1, 1] as const).forEach((dir) => {
      const leaf = new THREE.Group();
      const baseZ = dz + dir * 0.42;
      leaf.position.set(wallX, FLOOR_Y, baseZ);

      const lower = new THREE.Mesh(lowerGeo, mats.doorPanel);
      lower.position.y = 0.49;
      const top = new THREE.Mesh(frameTopGeo, mats.doorPanel);
      top.position.y = 1.9;
      const stileL = new THREE.Mesh(stileGeo, mats.doorPanel);
      stileL.position.set(0, 1.42, -0.36);
      const stileR = new THREE.Mesh(stileGeo, mats.doorPanel);
      stileR.position.set(0, 1.42, 0.36);
      const glass = new THREE.Mesh(glassGeo, mats.windowGlass);
      glass.position.set(0, 1.42, 0);

      leaf.add(lower, top, stileL, stileR, glass);
      root.add(leaf);
      leaves.push({ mesh: leaf, baseZ, slideDir: dir });
    });
  });
  return leaves;
}

function animateDoorSet(leaves: readonly IInteriorDoorLeaf[], openAmount: number): void {
  for (let i = 0; i < leaves.length; i += 1) {
    const leaf = leaves[i];
    leaf.mesh.position.z = leaf.baseZ + leaf.slideDir * openAmount * DOOR_SLIDE_M;
  }
}

function buildSeatsAndHandrails(
  root: THREE.Group,
  mats: IInteriorMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const benchSpans: ReadonlyArray<[number, number]> = [
    [2.35, 5.45],
    [7.75, 11.15],
    [13.45, 18.8],
  ];
  const vPoleGeo = new THREE.CylinderGeometry(0.022, 0.022, CEIL_Y - FLOOR_Y, 8);
  const hRailGeo = new THREE.CylinderGeometry(0.02, 0.02, 16.4, 8);
  const bracketGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.44, 6);
  const strapLoopGeo = new THREE.TorusGeometry(0.055, 0.011, 6, 12);
  const strapStemGeo = new THREE.BoxGeometry(0.018, 0.16, 0.018);
  disposables.push(vPoleGeo, hRailGeo, bracketGeo, strapLoopGeo, strapStemGeo);

  [-1, 1].forEach((sideSign) => {
    // Longitudinal bench seats along window bays
    benchSpans.forEach(([zA, zB]) => {
      const len = zB - zA;
      const midZ = (zA + zB) * 0.5;
      const baseGeo = new THREE.BoxGeometry(0.46, 0.42, len);
      const cushionGeo = new THREE.BoxGeometry(0.48, 0.08, len - 0.04);
      const backGeo = new THREE.BoxGeometry(0.08, 0.44, len - 0.04);
      disposables.push(baseGeo, cushionGeo, backGeo);

      const base = new THREE.Mesh(baseGeo, mats.seatFrame);
      base.position.set(sideSign * 1.07, FLOOR_Y + 0.21, midZ);
      const cushion = new THREE.Mesh(cushionGeo, mats.seatCushion);
      cushion.position.set(sideSign * 1.06, FLOOR_Y + 0.45, midZ);
      const back = new THREE.Mesh(backGeo, mats.seatCushion);
      back.position.set(sideSign * 1.26, FLOOR_Y + 0.68, midZ);
      root.add(base, cushion, back);
    });

    // Overhead horizontal grab rail + ceiling hangers + grip straps
    const hRail = new THREE.Mesh(hRailGeo, mats.handrail);
    hRail.rotation.x = Math.PI / 2;
    hRail.position.set(sideSign * 0.66, FLOOR_Y + 1.84, 10.6);
    root.add(hRail);

    for (let z = 3.2; z <= 18.0; z += 3.0) {
      const hanger = new THREE.Mesh(bracketGeo, mats.handrail);
      hanger.position.set(sideSign * 0.66, FLOOR_Y + 2.04, z);
      root.add(hanger);
    }

    for (let z = 3.8; z <= 17.5; z += 1.45) {
      const stem = new THREE.Mesh(strapStemGeo, mats.strap);
      stem.position.set(sideSign * 0.66, FLOOR_Y + 1.74, z);
      const loop = new THREE.Mesh(strapLoopGeo, mats.strap);
      loop.position.set(sideSign * 0.66, FLOOR_Y + 1.63, z);
      loop.rotation.y = Math.PI / 2;
      root.add(stem, loop);
    }

    // Vertical stanchion poles framing each doorway & seat bay
    [5.6, 7.6, 11.3, 13.3, 16.2].forEach((pz) => {
      const pole = new THREE.Mesh(vPoleGeo, mats.handrail);
      pole.position.set(sideSign * 0.78, (FLOOR_Y + CEIL_Y) * 0.5, pz);
      root.add(pole);
    });
  });
}

function buildSaloonLights(root: THREE.Group): readonly THREE.PointLight[] {
  const lightA = new THREE.PointLight(0xf0f9ff, 12.5, 16, 1.3);
  lightA.position.set(0, CEIL_Y - 0.25, 6.2);
  const lightB = new THREE.PointLight(0xf0f9ff, 12.5, 16, 1.3);
  lightB.position.set(0, CEIL_Y - 0.25, 13.8);
  root.add(lightA, lightB);
  return [lightA, lightB];
}

function createOverheadLedDisplay(
  root: THREE.Group,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): {
  redraw: (lineId: string, lineColor: string, statusText: string, clockStr: string) => void;
  dispose: () => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  const casingGeo = new THREE.BoxGeometry(1.54, 0.3, 0.1);
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
  const screenGeo = new THREE.PlaneGeometry(1.46, 0.24);
  const screenMat = new THREE.MeshBasicMaterial({ map: tex });
  disposables.push(casingGeo, casingMat, screenGeo, screenMat);

  const casing = new THREE.Mesh(casingGeo, casingMat);
  casing.position.set(0, CEIL_Y - 0.26, 2.28);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, CEIL_Y - 0.26, 2.34);
  root.add(casing, screen);

  // Second mid-car overhead display visible further down the aisle
  const casingMid = new THREE.Mesh(casingGeo, casingMat);
  casingMid.position.set(0, CEIL_Y - 0.26, 9.2);
  const screenMid = new THREE.Mesh(screenGeo, screenMat);
  screenMid.position.set(0, CEIL_Y - 0.26, 9.26);
  root.add(casingMid, screenMid);

  return {
    redraw: (lineId, lineColor, statusText, clockStr) => {
      ctx.fillStyle = '#070b12';
      ctx.fillRect(0, 0, 512, 96);
      ctx.fillStyle = lineColor;
      ctx.fillRect(10, 14, 72, 68);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lineId, 46, 50);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(statusText.slice(0, 24), 98, 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillText(`METRO WARSZAWSKIE · ${clockStr}`, 98, 72);
      tex.needsUpdate = true;
    },
    dispose: () => tex.dispose(),
  };
}

function buildSeatedPassengers(
  root: THREE.Group,
  disposables: Array<{ dispose(): void }>,
): readonly THREE.Group[] {
  const legsGeo = new THREE.BoxGeometry(0.28, 0.44, 0.32);
  const torsoGeo = new THREE.CylinderGeometry(0.16, 0.21, 0.62, 7);
  const headGeo = new THREE.SphereGeometry(0.135, 8, 8);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.78 });
  const coatMats = COAT_PALETTE.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 }),
  );
  disposables.push(legsGeo, torsoGeo, headGeo, legsMat, headMat, ...coatMats);

  const seatSlots: ReadonlyArray<[number, number]> = [
    [-1.02, 3.2],
    [1.02, 4.1],
    [-1.02, 4.9],
    [-1.02, 8.4],
    [1.02, 9.2],
    [-1.02, 10.2],
    [1.02, 10.6],
    [-1.02, 14.3],
    [1.02, 15.2],
    [-1.02, 16.6],
  ];

  return seatSlots.map(([sx, sz], idx) => {
    const pax = new THREE.Group();
    const legs = new THREE.Mesh(legsGeo, legsMat);
    legs.position.set(sx < 0 ? 0.14 : -0.14, 0.24, 0);
    const torso = new THREE.Mesh(torsoGeo, coatMats[idx % coatMats.length]);
    torso.position.set(0, 0.74, 0);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.18, 0);
    pax.add(legs, torso, head);
    pax.position.set(sx, FLOOR_Y, sz);
    pax.visible = false;
    root.add(pax);
    return pax;
  });
}

function buildDoorwayWalkers(
  root: THREE.Group,
  disposables: Array<{ dispose(): void }>,
): readonly IBoardingWalker[] {
  const legsGeo = new THREE.BoxGeometry(0.26, 0.72, 0.22);
  const torsoGeo = new THREE.CylinderGeometry(0.17, 0.22, 0.72, 7);
  const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.78 });
  const coatMats = [0x1e40af, 0x7c2d12, 0x334155, 0x4c1d95].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 }),
  );
  disposables.push(legsGeo, torsoGeo, headGeo, legsMat, headMat, ...coatMats);

  const specs: ReadonlyArray<{ doorZ: number; startT: number; endT: number }> = [
    { doorZ: 6.4, startT: 0.05, endT: 0.48 },
    { doorZ: 6.85, startT: 0.35, endT: 0.82 },
    { doorZ: 12.1, startT: 0.15, endT: 0.62 },
    { doorZ: 12.55, startT: 0.5, endT: 0.95 },
  ];

  return specs.map((spec, idx) => {
    const g = new THREE.Group();
    const legs = new THREE.Mesh(legsGeo, legsMat);
    legs.position.y = 0.36;
    const torso = new THREE.Mesh(torsoGeo, coatMats[idx % coatMats.length]);
    torso.position.y = 1.04;
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.54;
    g.add(legs, torso, head);
    g.visible = false;
    root.add(g);
    return {
      group: g,
      doorZ: spec.doorZ,
      startT: spec.startT,
      endT: spec.endT,
      phase: idx * 1.7,
    };
  });
}

function syncDoorwayWalkers(
  walkers: readonly IBoardingWalker[],
  snapshot: ISimulationSnapshot,
  walkClock: number,
  isTechnical: boolean,
): void {
  const openSide: DoorSide | null = snapshot.openDoorSide;
  const active =
    !isTechnical &&
    snapshot.doorState === 'open' &&
    openSide !== null &&
    !snapshot.boardingCompletedForCurrent;

  if (!active || !openSide) {
    walkers.forEach((w) => {
      w.group.visible = false;
    });
    return;
  }

  const sideSign = openSide === 'left' ? -1 : 1;
  const startX = sideSign * 1.95;
  const endX = sideSign * 0.22;
  const progress = snapshot.boardingProgress;

  for (let i = 0; i < walkers.length; i += 1) {
    const w = walkers[i];
    if (progress < w.startT || progress > w.endT) {
      w.group.visible = false;
      continue;
    }
    const t = (progress - w.startT) / Math.max(0.01, w.endT - w.startT);
    const curX = THREE.MathUtils.lerp(startX, endX, t);
    const bob = Math.abs(Math.sin(walkClock * 11 + w.phase)) * 0.05;
    w.group.visible = true;
    w.group.position.set(curX, FLOOR_Y + bob, w.doorZ);
    w.group.rotation.y = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}
