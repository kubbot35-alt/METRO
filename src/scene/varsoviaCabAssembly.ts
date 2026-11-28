import * as THREE from 'three';
import { createDeskCctvMonitorUnit, type IDeskCctvMonitorBinding } from './cabMirrorAttachments';
import type { IDisposableResource } from './shared/baseTrainConsist';
import { createAngledDisplayUnit, createLcdScreenMaterial } from './shared/cabDeskHelpers';

export interface IVarsoviaLamps {
  readonly doorMat: THREE.MeshStandardMaterial;
  readonly warnMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly ambientLedMat: THREE.MeshStandardMaterial;
}

export function addPanoramicWindshieldFrame(
  group: THREE.Group, frameMat: THREE.MeshStandardMaterial, bezelMat: THREE.MeshStandardMaterial,
  ambientLedMat: THREE.MeshStandardMaterial, disposables: IDisposableResource[],
): void {
  const pillarGeo = new THREE.BoxGeometry(0.088, 1.54, 0.14);
  const sideLedGeo = new THREE.BoxGeometry(0.014, 0.72, 0.014);
  ([-1, 1] as const).forEach((s) => {
    const pillar = new THREE.Mesh(pillarGeo, frameMat); pillar.position.set(s * 0.96, 0.06, -0.96); pillar.rotation.set(0.26, -s * 0.16, s * 0.13);
    const led = new THREE.Mesh(sideLedGeo, ambientLedMat); led.position.set(s * 0.91, 0.04, -0.91); led.rotation.set(0.26, -s * 0.16, s * 0.13);
    group.add(pillar, led);
  });
  disposables.push(pillarGeo, sideLedGeo);
  addVarsoviaWindshieldHeader(group, frameMat, bezelMat, ambientLedMat, disposables);
}

function addVarsoviaWindshieldHeader(
  group: THREE.Group, frameMat: THREE.MeshStandardMaterial, bezelMat: THREE.MeshStandardMaterial,
  ambientLedMat: THREE.MeshStandardMaterial, disposables: IDisposableResource[],
): void {
  const headerGeo = new THREE.BoxGeometry(2.26, 0.12, 0.28);
  const header = new THREE.Mesh(headerGeo, frameMat); header.position.set(0, 0.65, -0.91); header.rotation.x = 0.12;
  const visorGeo = new THREE.BoxGeometry(1.36, 0.022, 0.09);
  const visor = new THREE.Mesh(visorGeo, bezelMat); visor.position.set(0, 0.58, -0.87);
  const ledStripGeo = new THREE.BoxGeometry(1.76, 0.014, 0.014);
  const headerLed = new THREE.Mesh(ledStripGeo, ambientLedMat); headerLed.position.set(0, 0.59, -0.89);
  group.add(header, visor, headerLed);
  disposables.push(headerGeo, visorGeo, ledStripGeo);
}

export function addMinimalistThreeScreenDesk(
  group: THREE.Group,
  deskMat: THREE.MeshStandardMaterial,
  panelMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  lamps: IVarsoviaLamps,
  leftTex: THREE.CanvasTexture,
  centerTex: THREE.CanvasTexture,
  rightTex: THREE.CanvasTexture,
  disposables: IDisposableResource[],
): IDeskCctvMonitorBinding {
  addVarsoviaDeskShell(group, deskMat, panelMat, bezelMat, lamps.ambientLedMat, disposables);
  const rightCctvBinding = addVarsoviaTouchDisplays(group, bezelMat, leftTex, centerTex, rightTex, disposables);
  addVarsoviaRightTouchPod(group, lamps, disposables);
  return rightCctvBinding;
}

function addVarsoviaDeskShell(
  group: THREE.Group,
  deskMat: THREE.MeshStandardMaterial,
  panelMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  ambientLedMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): void {
  const mainDeckGeo = new THREE.BoxGeometry(2.18, 0.22, 0.58);
  const mainDeck = new THREE.Mesh(mainDeckGeo, deskMat);
  mainDeck.position.set(0, -0.5, -0.94);
  mainDeck.rotation.x = 0.12;
  const hoodGeo = new THREE.BoxGeometry(1.36, 0.25, 0.12);
  const hood = new THREE.Mesh(hoodGeo, panelMat);
  hood.position.set(0, -0.33, -1.03);
  hood.rotation.x = -0.3;
  const lipGeo = new THREE.BoxGeometry(1.4, 0.02, 0.15);
  const lip = new THREE.Mesh(lipGeo, bezelMat);
  lip.position.set(0, -0.195, -0.985);
  const deskLedGeo = new THREE.BoxGeometry(1.36, 0.012, 0.014);
  const deskLed = new THREE.Mesh(deskLedGeo, ambientLedMat);
  deskLed.position.set(0, -0.208, -0.915);
  group.add(mainDeck, hood, lip, deskLed);
  disposables.push(mainDeckGeo, hoodGeo, lipGeo, deskLedGeo);
}

function addVarsoviaTouchDisplays(
  group: THREE.Group, bezelMat: THREE.MeshStandardMaterial, leftTex: THREE.CanvasTexture,
  centerTex: THREE.CanvasTexture, rightTex: THREE.CanvasTexture, disposables: IDisposableResource[],
): IDeskCctvMonitorBinding {
  const screenGeo = new THREE.PlaneGeometry(0.39, 0.22);
  const bezelGeo = new THREE.BoxGeometry(0.415, 0.242, 0.022);
  const leftMat = createLcdScreenMaterial(leftTex, 0.96, 0.72, 0.04);
  const centerMat = createLcdScreenMaterial(centerTex, 0.96, 0.72, 0.04);
  const leftUnit = createAngledDisplayUnit({ screenGeo, bezelGeo, screenMat: leftMat, bezelMat, x: -0.43, y: -0.335, z: -0.91, pitchRad: -0.28, yawRad: 0.11, screenOffsetZ: 0.014 });
  const centerUnit = createAngledDisplayUnit({ screenGeo, bezelGeo, screenMat: centerMat, bezelMat, x: 0, y: -0.335, z: -0.93, pitchRad: -0.28, yawRad: 0, screenOffsetZ: 0.014 });
  const rightCctvBinding = createDeskCctvMonitorUnit(
    { screenWidth: 0.39, screenHeight: 0.22, bezelGeo, bezelMat, overlayTex: rightTex, x: 0.43, y: -0.335, z: -0.91, pitchRad: -0.28, yawRad: -0.11 },
    disposables,
  );
  group.add(leftUnit, centerUnit, rightCctvBinding.unit);
  disposables.push(screenGeo, bezelGeo, leftMat, centerMat);
  return rightCctvBinding;
}

function addVarsoviaRightTouchPod(
  group: THREE.Group,
  lamps: IVarsoviaLamps,
  disposables: IDisposableResource[],
): void {
  const btnGeo = new THREE.BoxGeometry(0.042, 0.018, 0.042);
  const btnDoor = new THREE.Mesh(btnGeo, lamps.doorMat);
  btnDoor.position.set(0.7, -0.365, -0.84);
  const btnLight = new THREE.Mesh(btnGeo, lamps.headlightMat);
  btnLight.position.set(0.76, -0.365, -0.84);
  const stopCapGeo = new THREE.CylinderGeometry(0.026, 0.02, 0.024, 12);
  const stopCap = new THREE.Mesh(stopCapGeo, lamps.warnMat);
  stopCap.position.set(0.73, -0.352, -0.77);
  group.add(btnDoor, btnLight, stopCap);
  disposables.push(btnGeo, stopCapGeo);
}

export function addPrecisionMasterLever(
  group: THREE.Group,
  panelMat: THREE.MeshStandardMaterial,
  steelMat: THREE.MeshStandardMaterial,
  ambientLedMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): THREE.Group {
  const base = { x: -0.71, y: -0.39, z: -0.82 };
  const podGeo = new THREE.BoxGeometry(0.16, 0.09, 0.28);
  const pod = new THREE.Mesh(podGeo, panelMat);
  pod.position.set(base.x, base.y - 0.025, base.z);
  const slotGeo = new THREE.BoxGeometry(0.028, 0.02, 0.22);
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x04070c, roughness: 0.9 });
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.position.set(base.x, base.y + 0.015, base.z);
  const ledGuideGeo = new THREE.BoxGeometry(0.008, 0.006, 0.2);
  const ledGuide = new THREE.Mesh(ledGuideGeo, ambientLedMat);
  ledGuide.position.set(base.x + 0.036, base.y + 0.022, base.z);
  const pivot = createVarsoviaLeverPivot(base, steelMat, ambientLedMat, disposables);
  group.add(pod, slot, ledGuide, pivot);
  disposables.push(podGeo, slotGeo, slotMat, ledGuideGeo);
  return pivot;
}

function createVarsoviaLeverPivot(
  base: { x: number; y: number; z: number }, steelMat: THREE.MeshStandardMaterial,
  ambientLedMat: THREE.MeshStandardMaterial, disposables: IDisposableResource[],
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = 'VarsoviaMasterControllerLever';
  pivot.position.set(base.x, base.y, base.z);
  const shaftGeo = new THREE.CylinderGeometry(0.011, 0.015, 0.175, 10);
  const shaft = new THREE.Mesh(shaftGeo, steelMat);
  shaft.position.set(0, 0.088, 0);
  pivot.add(shaft);
  disposables.push(shaftGeo);
  addVarsoviaLeverGrip(pivot, ambientLedMat, disposables);
  return pivot;
}

function addVarsoviaLeverGrip(pivot: THREE.Group, ambientLedMat: THREE.MeshStandardMaterial, disposables: IDisposableResource[]): void {
  const gripGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.14, 14);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55, metalness: 0.35 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 0.176, 0);
  const ringGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.014, 12);
  ([-0.062, 0.062] as const).forEach((xOff) => {
    const ring = new THREE.Mesh(ringGeo, ambientLedMat);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(xOff, 0.176, 0);
    pivot.add(ring);
  });
  pivot.add(grip);
  disposables.push(gripGeo, gripMat, ringGeo);
}
