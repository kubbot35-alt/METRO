import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import { createInspiroCabScreens } from './inspiroTextures';

export interface IInspiroCabInterior {
  readonly group: THREE.Group;
  readonly leverPivot: THREE.Group;
  readonly wiperPivot: THREE.Group;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

interface IButtonLamps {
  readonly doorMat: THREE.MeshStandardMaterial;
  readonly warnMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly czuwakMat: THREE.MeshStandardMaterial;
}

export function buildInspiroCabInterior(maxAnisotropy: number): IInspiroCabInterior {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'SiemensInspiroCabInterior';

  const screens = createInspiroCabScreens(maxAnisotropy);
  const darkPanelMat = new THREE.MeshStandardMaterial({ color: 0x1d232d, roughness: 0.56, metalness: 0.36 });
  const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x121720, roughness: 0.74, metalness: 0.22 });
  const aluminumMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.26, metalness: 0.82 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.32, metalness: 0.52 });
  const lamps = createButtonLamps();
  disposables.push(
    screens, darkPanelMat, deskTopMat, aluminumMat, bezelMat,
    lamps.doorMat, lamps.warnMat, lamps.headlightMat, lamps.czuwakMat,
  );

  addSlopedWindshieldFrame(group, darkPanelMat, aluminumMat, bezelMat, screens.mirrorMonitorTexture, disposables);
  addSculptedInspiroDesk(group, deskTopMat, darkPanelMat, bezelMat, screens.leftLcdTexture, screens.rightLcdTexture, lamps, disposables);
  const leverPivot = addErgonomicMasterLever(group, darkPanelMat, aluminumMat, disposables);
  const wiperPivot = addCabWiper(group, disposables);
  addCoolScreenAmbientLight(group);

  return {
    group,
    leverPivot,
    wiperPivot,
    update: (snapshot: ISimulationSnapshot, dtSec: number): void => {
      screens.update(snapshot, dtSec);
      lamps.doorMat.emissiveIntensity = snapshot.doorState === 'open' ? 2.8 : 0.45;
      const warnActive = snapshot.isOverspeeding || snapshot.kinematics.emergencyBrake || snapshot.atpActive;
      lamps.warnMat.emissiveIntensity = warnActive ? 3.4 : 0.2;
      lamps.headlightMat.emissiveIntensity = snapshot.headlightsOn ? 2.6 : 0.12;
      lamps.czuwakMat.emissiveIntensity = snapshot.czuwak.active ? 4.2 : 0.16;
      // Smoothly sweep wiper from parked right (1.34 rad) across windshield to left (-1.08 rad)
      wiperPivot.rotation.z = THREE.MathUtils.lerp(1.34, -1.08, snapshot.weather.wiperPhaseRad);
    },
    dispose: (): void => disposables.forEach((d) => d.dispose()),
  };
}

function createButtonLamps(): IButtonLamps {
  return {
    doorMat: makeEmissiveMat(0x059669, 0x10b981, 0.45),
    warnMat: makeEmissiveMat(0xb91c1c, 0xef4444, 0.2),
    headlightMat: makeEmissiveMat(0x0284c7, 0x38bdf8, 2.6),
    czuwakMat: makeEmissiveMat(0xd97706, 0xf59e0b, 0.16),
  };
}

function makeEmissiveMat(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.22 });
}

function addSlopedWindshieldFrame(
  group: THREE.Group,
  panelMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  monitorTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const pillarGeo = new THREE.BoxGeometry(0.11, 1.48, 0.16);
  const leftPillar = new THREE.Mesh(pillarGeo, panelMat);
  leftPillar.position.set(-0.92, 0.05, -0.96);
  leftPillar.rotation.set(0.24, 0.18, -0.14);

  const rightPillar = new THREE.Mesh(pillarGeo, panelMat);
  rightPillar.position.set(0.92, 0.05, -0.96);
  rightPillar.rotation.set(0.24, -0.18, 0.14);

  const headerGeo = new THREE.BoxGeometry(2.2, 0.14, 0.3);
  const header = new THREE.Mesh(headerGeo, panelMat);
  header.position.set(0, 0.62, -0.92);
  header.rotation.x = 0.12;

  const visorGeo = new THREE.BoxGeometry(1.18, 0.028, 0.1);
  const visor = new THREE.Mesh(visorGeo, bezelMat);
  visor.position.set(0, 0.54, -0.87);

  const grabGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.34, 8);
  const leftGrab = new THREE.Mesh(grabGeo, trimMat);
  leftGrab.position.set(-0.84, 0.06, -0.9);
  leftGrab.rotation.set(0.24, 0, -0.14);
  const rightGrab = new THREE.Mesh(grabGeo, trimMat);
  rightGrab.position.set(0.84, 0.06, -0.9);
  rightGrab.rotation.set(0.24, 0, 0.14);

  group.add(leftPillar, rightPillar, header, visor, leftGrab, rightGrab);
  addUpperPlatformMonitors(group, bezelMat, monitorTex, disposables);
  disposables.push(pillarGeo, headerGeo, visorGeo, grabGeo);
}

function addUpperPlatformMonitors(
  group: THREE.Group,
  bezelMat: THREE.MeshStandardMaterial,
  monitorTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const bodyGeo = new THREE.BoxGeometry(0.22, 0.13, 0.036);
  const screenGeo = new THREE.PlaneGeometry(0.196, 0.108);
  const screenMat = new THREE.MeshStandardMaterial({
    map: monitorTex,
    emissiveMap: monitorTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.78,
    roughness: 0.24,
  });

  ([-1, 1] as const).forEach((side) => {
    const monGroup = new THREE.Group();
    monGroup.position.set(side * 0.73, 0.36, -0.94);
    monGroup.rotation.set(0.14, -side * 0.3, 0);
    const housing = new THREE.Mesh(bodyGeo, bezelMat);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0, 0.02);
    monGroup.add(housing, screen);
    group.add(monGroup);
  });

  disposables.push(bodyGeo, screenGeo, screenMat);
}

function addSculptedInspiroDesk(
  group: THREE.Group,
  deskMat: THREE.MeshStandardMaterial,
  panelMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  leftLcdTex: THREE.CanvasTexture,
  rightLcdTex: THREE.CanvasTexture,
  lamps: IButtonLamps,
  disposables: Array<{ dispose(): void }>,
): void {
  const mainDeckGeo = new THREE.BoxGeometry(2.1, 0.24, 0.56);
  const mainDeck = new THREE.Mesh(mainDeckGeo, deskMat);
  mainDeck.position.set(0, -0.5, -0.94);
  mainDeck.rotation.x = 0.14;

  const instrumentHoodGeo = new THREE.BoxGeometry(1.06, 0.24, 0.14);
  const instrumentHood = new THREE.Mesh(instrumentHoodGeo, panelMat);
  instrumentHood.position.set(0, -0.34, -1.03);
  instrumentHood.rotation.x = -0.32;

  const hoodLipGeo = new THREE.BoxGeometry(1.08, 0.024, 0.16);
  const hoodLip = new THREE.Mesh(hoodLipGeo, bezelMat);
  hoodLip.position.set(0, -0.205, -0.99);
  hoodLip.rotation.x = 0.04;

  const screenGeo = new THREE.PlaneGeometry(0.37, 0.21);
  const lcdBezelGeo = new THREE.BoxGeometry(0.4, 0.24, 0.026);
  const leftMat = createLcdMaterial(leftLcdTex);
  const rightMat = createLcdMaterial(rightLcdTex);

  const leftLcd = createAngledLcdUnit(screenGeo, lcdBezelGeo, leftMat, bezelMat, -0.225, -0.34, -0.92, 0.07);
  const rightLcd = createAngledLcdUnit(screenGeo, lcdBezelGeo, rightMat, bezelMat, 0.225, -0.34, -0.92, -0.07);

  group.add(mainDeck, instrumentHood, hoodLip, leftLcd, rightLcd);
  addDeskFunctionButtons(group, bezelMat, lamps, disposables);
  disposables.push(mainDeckGeo, instrumentHoodGeo, hoodLipGeo, screenGeo, lcdBezelGeo, leftMat, rightMat);
}

function createLcdMaterial(tex: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: 0xffffff,
    emissiveIntensity: 0.92,
    roughness: 0.88,
    metalness: 0.0,
  });
}

function createAngledLcdUnit(
  screenGeo: THREE.PlaneGeometry,
  lcdBezelGeo: THREE.BoxGeometry,
  screenMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  x: number,
  y: number,
  z: number,
  yaw: number,
): THREE.Group {
  const unit = new THREE.Group();
  unit.position.set(x, y, z);
  unit.rotation.set(-0.3, yaw, 0);
  const bezel = new THREE.Mesh(lcdBezelGeo, bezelMat);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0, 0.016);
  unit.add(bezel, screen);
  return unit;
}

function addDeskFunctionButtons(
  group: THREE.Group,
  bezelMat: THREE.MeshStandardMaterial,
  lamps: IButtonLamps,
  disposables: Array<{ dispose(): void }>,
): void {
  const podGeo = new THREE.BoxGeometry(0.28, 0.06, 0.22);
  const rightPod = new THREE.Mesh(podGeo, bezelMat);
  rightPod.position.set(0.61, -0.36, -0.88);
  rightPod.rotation.set(0.28, -0.22, 0);

  const btnGeo = new THREE.BoxGeometry(0.044, 0.022, 0.044);
  const btnDoor = new THREE.Mesh(btnGeo, lamps.doorMat);
  btnDoor.position.set(0.54, -0.325, -0.89);
  const btnHead = new THREE.Mesh(btnGeo, lamps.headlightMat);
  btnHead.position.set(0.61, -0.325, -0.88);
  const btnCzuwak = new THREE.Mesh(btnGeo, lamps.czuwakMat);
  btnCzuwak.position.set(0.68, -0.325, -0.87);

  const estopCollarGeo = new THREE.CylinderGeometry(0.034, 0.038, 0.018, 12);
  const estopCollarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const estopCollar = new THREE.Mesh(estopCollarGeo, estopCollarMat);
  estopCollar.position.set(0.61, -0.335, -0.81);

  const estopCapGeo = new THREE.CylinderGeometry(0.028, 0.021, 0.026, 12);
  const estopCap = new THREE.Mesh(estopCapGeo, lamps.warnMat);
  estopCap.position.set(0.61, -0.312, -0.81);

  group.add(rightPod, btnDoor, btnHead, btnCzuwak, estopCollar, estopCap);
  disposables.push(podGeo, btnGeo, estopCollarGeo, estopCollarMat, estopCapGeo);
}

function addErgonomicMasterLever(
  group: THREE.Group,
  panelMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const baseX = -0.62;
  const baseY = -0.39;
  const baseZ = -0.84;

  const consoleGeo = new THREE.BoxGeometry(0.18, 0.1, 0.3);
  const consoleBox = new THREE.Mesh(consoleGeo, panelMat);
  consoleBox.position.set(baseX, baseY - 0.03, baseZ);

  const slotGeo = new THREE.BoxGeometry(0.034, 0.022, 0.24);
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 0.9 });
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.position.set(baseX, baseY + 0.015, baseZ);

  const powerTickMat = makeEmissiveMat(0x10b981, 0x34d399, 1.4);
  const brakeTickMat = makeEmissiveMat(0xd97706, 0xf59e0b, 1.4);
  const tickGeo = new THREE.BoxGeometry(0.012, 0.008, 0.09);
  const fwdTick = new THREE.Mesh(tickGeo, powerTickMat);
  fwdTick.position.set(baseX + 0.048, baseY + 0.022, baseZ - 0.055);
  const revTick = new THREE.Mesh(tickGeo, brakeTickMat);
  revTick.position.set(baseX + 0.048, baseY + 0.022, baseZ + 0.055);

  const pivot = new THREE.Group();
  pivot.name = 'InspiroMasterControllerLever';
  pivot.position.set(baseX, baseY, baseZ);

  const shaftGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.18, 10);
  const shaft = new THREE.Mesh(shaftGeo, trimMat);
  shaft.position.set(0, 0.09, 0);

  const gripGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.135, 14);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.28 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 0.18, 0);

  const capGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.016, 12);
  const capMat = makeEmissiveMat(0x0284c7, 0x38bdf8, 1.1);
  const leftCap = new THREE.Mesh(capGeo, capMat);
  leftCap.rotation.z = Math.PI / 2;
  leftCap.position.set(-0.062, 0.18, 0);
  const rightCap = new THREE.Mesh(capGeo, capMat);
  rightCap.rotation.z = Math.PI / 2;
  rightCap.position.set(0.062, 0.18, 0);

  pivot.add(shaft, grip, leftCap, rightCap);
  group.add(consoleBox, slot, fwdTick, revTick, pivot);
  disposables.push(
    consoleGeo, slotGeo, slotMat, powerTickMat, brakeTickMat, tickGeo,
    shaftGeo, gripGeo, gripMat, capGeo, capMat,
  );
  return pivot;
}

function addCabWiper(group: THREE.Group, disposables: Array<{ dispose(): void }>): THREE.Group {
  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x0c1017, roughness: 0.78, metalness: 0.35 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.1 });
  const pivot = new THREE.Group();
  pivot.name = 'InspiroWindshieldWiperPivot';
  pivot.position.set(0.28, -0.22, -1.0);
  const armGeo = new THREE.BoxGeometry(0.018, 0.56, 0.016);
  const arm = new THREE.Mesh(armGeo, wiperMat);
  arm.position.set(0, 0.28, 0);
  const bladeGeo = new THREE.BoxGeometry(0.024, 0.44, 0.018);
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, 0.52, -0.008);
  pivot.add(arm, blade);
  pivot.rotation.z = 1.34;
  group.add(pivot);
  disposables.push(wiperMat, bladeMat, armGeo, bladeGeo);
  return pivot;
}

function addCoolScreenAmbientLight(group: THREE.Group): void {
  const screenGlow = new THREE.PointLight(0x38bdf8, 0.65, 1.45, 2.0);
  screenGlow.position.set(0, -0.2, -0.66);
  group.add(screenGlow);
}
