import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import type { IInspiroCabInterior } from './inspiroCabBuilder';
import { createVarsoviaCabScreens } from './varsoviaTextures';

interface IVarsoviaLamps {
  readonly doorMat: THREE.MeshStandardMaterial;
  readonly warnMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly ambientLedMat: THREE.MeshStandardMaterial;
}

export function buildVarsoviaCabInterior(maxAnisotropy: number): IInspiroCabInterior {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'SkodaVarsoviaCabInterior';

  const screens = createVarsoviaCabScreens(maxAnisotropy);
  const matteGraphite = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.62, metalness: 0.28 });
  const deskDeckMat = new THREE.MeshStandardMaterial({ color: 0x0d121a, roughness: 0.72, metalness: 0.24 });
  const brushedSteel = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.85 });
  const glossyBezel = new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.18, metalness: 0.6 });
  const lamps = createVarsoviaLamps();
  disposables.push(
    screens,
    matteGraphite,
    deskDeckMat,
    brushedSteel,
    glossyBezel,
    lamps.doorMat,
    lamps.warnMat,
    lamps.headlightMat,
    lamps.ambientLedMat,
  );

  addPanoramicWindshieldFrame(group, matteGraphite, glossyBezel, lamps.ambientLedMat, disposables);
  addMinimalistThreeScreenDesk(
    group,
    deskDeckMat,
    matteGraphite,
    glossyBezel,
    lamps,
    screens.leftScreenTexture,
    screens.centerScreenTexture,
    screens.rightScreenTexture,
    disposables,
  );
  const leverPivot = addPrecisionMasterLever(group, matteGraphite, brushedSteel, lamps.ambientLedMat, disposables);
  const wiperPivot = addVarsoviaCabWiper(group, disposables);
  addAmbientCabLighting(group);

  return {
    group,
    leverPivot,
    wiperPivot,
    update: (snapshot: ISimulationSnapshot, dtSec: number): void => {
      screens.update(snapshot, dtSec);
      lamps.doorMat.emissiveIntensity = snapshot.doorState === 'open' ? 3.0 : 0.45;
      const warnActive = snapshot.isOverspeeding || snapshot.kinematics.emergencyBrake || snapshot.atpActive;
      lamps.warnMat.emissiveIntensity = warnActive ? 3.8 : 0.18;
      lamps.headlightMat.emissiveIntensity = snapshot.headlightsOn ? 2.6 : 0.15;
      lamps.ambientLedMat.emissive.setHex(warnActive ? 0xef4444 : 0x22d3ee);
      wiperPivot.rotation.z = THREE.MathUtils.lerp(1.48, -1.08, snapshot.weather.wiperPhaseRad);
    },
    dispose: (): void => disposables.forEach((d) => d.dispose()),
  };
}

function createVarsoviaLamps(): IVarsoviaLamps {
  return {
    doorMat: makeGlowMat(0x059669, 0x10b981, 0.45),
    warnMat: makeGlowMat(0xb91c1c, 0xef4444, 0.18),
    headlightMat: makeGlowMat(0x0284c7, 0x38bdf8, 2.6),
    ambientLedMat: makeGlowMat(0x0891b2, 0x22d3ee, 2.4),
  };
}

function makeGlowMat(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.2 });
}

function addPanoramicWindshieldFrame(
  group: THREE.Group,
  frameMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  ambientLedMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const pillarGeo = new THREE.BoxGeometry(0.088, 1.54, 0.14);
  const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
  leftPillar.position.set(-0.96, 0.06, -0.96);
  leftPillar.rotation.set(0.26, 0.16, -0.13);

  const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
  rightPillar.position.set(0.96, 0.06, -0.96);
  rightPillar.rotation.set(0.26, -0.16, 0.13);

  const headerGeo = new THREE.BoxGeometry(2.26, 0.12, 0.28);
  const header = new THREE.Mesh(headerGeo, frameMat);
  header.position.set(0, 0.65, -0.91);
  header.rotation.x = 0.12;

  const visorGeo = new THREE.BoxGeometry(1.36, 0.022, 0.09);
  const visor = new THREE.Mesh(visorGeo, bezelMat);
  visor.position.set(0, 0.58, -0.87);

  // Sleek cyan ambient LED strips framing the panoramic header & A-pillars
  const ledStripGeo = new THREE.BoxGeometry(1.76, 0.014, 0.014);
  const headerLed = new THREE.Mesh(ledStripGeo, ambientLedMat);
  headerLed.position.set(0, 0.59, -0.89);

  const sideLedGeo = new THREE.BoxGeometry(0.014, 0.72, 0.014);
  const leftLed = new THREE.Mesh(sideLedGeo, ambientLedMat);
  leftLed.position.set(-0.91, 0.04, -0.91);
  leftLed.rotation.set(0.26, 0.16, -0.13);
  const rightLed = new THREE.Mesh(sideLedGeo, ambientLedMat);
  rightLed.position.set(0.91, 0.04, -0.91);
  rightLed.rotation.set(0.26, -0.16, 0.13);

  group.add(leftPillar, rightPillar, header, visor, headerLed, leftLed, rightLed);
  disposables.push(pillarGeo, headerGeo, visorGeo, ledStripGeo, sideLedGeo);
}

function addMinimalistThreeScreenDesk(
  group: THREE.Group,
  deskMat: THREE.MeshStandardMaterial,
  panelMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  lamps: IVarsoviaLamps,
  leftTex: THREE.CanvasTexture,
  centerTex: THREE.CanvasTexture,
  rightTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const mainDeckGeo = new THREE.BoxGeometry(2.18, 0.22, 0.58);
  const mainDeck = new THREE.Mesh(mainDeckGeo, deskMat);
  mainDeck.position.set(0, -0.5, -0.94);
  mainDeck.rotation.x = 0.12;

  // Sleek wide floating screen binnacle for 3 wide touchscreens
  const hoodGeo = new THREE.BoxGeometry(1.36, 0.25, 0.12);
  const hood = new THREE.Mesh(hoodGeo, panelMat);
  hood.position.set(0, -0.33, -1.03);
  hood.rotation.x = -0.3;

  const lipGeo = new THREE.BoxGeometry(1.4, 0.02, 0.15);
  const lip = new THREE.Mesh(lipGeo, bezelMat);
  lip.position.set(0, -0.195, -0.985);

  const deskLedGeo = new THREE.BoxGeometry(1.36, 0.012, 0.014);
  const deskLed = new THREE.Mesh(deskLedGeo, lamps.ambientLedMat);
  deskLed.position.set(0, -0.208, -0.915);

  // 3 wide touchscreen displays side-by-side: Speed | Diagnostics | Side CCTV
  const screenGeo = new THREE.PlaneGeometry(0.39, 0.22);
  const bezelGeo = new THREE.BoxGeometry(0.415, 0.242, 0.022);
  const leftMat = createScreenMat(leftTex);
  const centerMat = createScreenMat(centerTex);
  const rightMat = createScreenMat(rightTex);

  const leftUnit = makeTouchDisplay(screenGeo, bezelGeo, leftMat, bezelMat, -0.43, -0.335, -0.91, 0.11);
  const centerUnit = makeTouchDisplay(screenGeo, bezelGeo, centerMat, bezelMat, 0, -0.335, -0.93, 0);
  const rightUnit = makeTouchDisplay(screenGeo, bezelGeo, rightMat, bezelMat, 0.43, -0.335, -0.91, -0.11);

  // Minimalist right touch control pod & emergency mushroom button
  const btnGeo = new THREE.BoxGeometry(0.042, 0.018, 0.042);
  const btnDoor = new THREE.Mesh(btnGeo, lamps.doorMat);
  btnDoor.position.set(0.7, -0.365, -0.84);
  const btnLight = new THREE.Mesh(btnGeo, lamps.headlightMat);
  btnLight.position.set(0.76, -0.365, -0.84);

  const stopCapGeo = new THREE.CylinderGeometry(0.026, 0.02, 0.024, 12);
  const stopCap = new THREE.Mesh(stopCapGeo, lamps.warnMat);
  stopCap.position.set(0.73, -0.352, -0.77);

  group.add(mainDeck, hood, lip, deskLed, leftUnit, centerUnit, rightUnit, btnDoor, btnLight, stopCap);
  disposables.push(
    mainDeckGeo,
    hoodGeo,
    lipGeo,
    deskLedGeo,
    screenGeo,
    bezelGeo,
    leftMat,
    centerMat,
    rightMat,
    btnGeo,
    stopCapGeo,
  );
}

function createScreenMat(tex: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: 0xffffff,
    emissiveIntensity: 0.96,
    roughness: 0.72,
    metalness: 0.04,
  });
}

function makeTouchDisplay(
  screenGeo: THREE.PlaneGeometry,
  bezelGeo: THREE.BoxGeometry,
  screenMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  x: number,
  y: number,
  z: number,
  yaw: number,
): THREE.Group {
  const unit = new THREE.Group();
  unit.position.set(x, y, z);
  unit.rotation.set(-0.28, yaw, 0);
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0, 0.014);
  unit.add(bezel, screen);
  return unit;
}

function addPrecisionMasterLever(
  group: THREE.Group,
  panelMat: THREE.MeshStandardMaterial,
  steelMat: THREE.MeshStandardMaterial,
  ambientLedMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const baseX = -0.71;
  const baseY = -0.39;
  const baseZ = -0.82;

  const podGeo = new THREE.BoxGeometry(0.16, 0.09, 0.28);
  const pod = new THREE.Mesh(podGeo, panelMat);
  pod.position.set(baseX, baseY - 0.025, baseZ);

  const slotGeo = new THREE.BoxGeometry(0.028, 0.02, 0.22);
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x04070c, roughness: 0.9 });
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.position.set(baseX, baseY + 0.015, baseZ);

  const ledGuideGeo = new THREE.BoxGeometry(0.008, 0.006, 0.2);
  const ledGuide = new THREE.Mesh(ledGuideGeo, ambientLedMat);
  ledGuide.position.set(baseX + 0.036, baseY + 0.022, baseZ);

  const pivot = new THREE.Group();
  pivot.name = 'VarsoviaMasterControllerLever';
  pivot.position.set(baseX, baseY, baseZ);

  const shaftGeo = new THREE.CylinderGeometry(0.011, 0.015, 0.175, 10);
  const shaft = new THREE.Mesh(shaftGeo, steelMat);
  shaft.position.set(0, 0.088, 0);

  const gripGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.14, 14);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55, metalness: 0.35 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 0.176, 0);

  const ringGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.014, 12);
  const ringL = new THREE.Mesh(ringGeo, ambientLedMat);
  ringL.rotation.z = Math.PI / 2;
  ringL.position.set(-0.062, 0.176, 0);
  const ringR = new THREE.Mesh(ringGeo, ambientLedMat);
  ringR.rotation.z = Math.PI / 2;
  ringR.position.set(0.062, 0.176, 0);

  pivot.add(shaft, grip, ringL, ringR);
  group.add(pod, slot, ledGuide, pivot);
  disposables.push(podGeo, slotGeo, slotMat, ledGuideGeo, shaftGeo, gripGeo, gripMat, ringGeo);
  return pivot;
}

function addVarsoviaCabWiper(group: THREE.Group, disposables: Array<{ dispose(): void }>): THREE.Group {
  const armMat = new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.72, metalness: 0.38 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, metalness: 0.12 });
  const pivot = new THREE.Group();
  pivot.name = 'VarsoviaWindshieldWiperPivot';
  pivot.position.set(0.34, -0.25, -1.0);
  const armGeo = new THREE.BoxGeometry(0.015, 0.56, 0.014);
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.position.set(0, 0.28, 0);
  const bladeGeo = new THREE.BoxGeometry(0.02, 0.44, 0.016);
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, 0.51, -0.008);
  pivot.add(arm, blade);
  pivot.rotation.z = 1.48;
  group.add(pivot);
  disposables.push(armMat, bladeMat, armGeo, bladeGeo);
  return pivot;
}

function addAmbientCabLighting(group: THREE.Group): void {
  const cyanGlow = new THREE.PointLight(0x22d3ee, 0.85, 1.65, 2.0);
  cyanGlow.position.set(0, -0.18, -0.62);
  group.add(cyanGlow);
}
