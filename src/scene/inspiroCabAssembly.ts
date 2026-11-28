import * as THREE from 'three';
import {
  addModernCabCctvMonitors,
  createDeskCctvMonitorUnit,
  type ICabMirrorHardware,
  type IDeskCctvMonitorBinding,
} from './cabMirrorAttachments';
import type { IDisposableResource } from './shared/baseTrainConsist';
import { createAngledDisplayUnit, createLcdScreenMaterial } from './shared/cabDeskHelpers';
export { addInspiroMasterLever } from './inspiroLeverAssembly';

export interface IInspiroButtonLamps {
  readonly doorMat: THREE.MeshStandardMaterial;
  readonly warnMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly czuwakMat: THREE.MeshStandardMaterial;
}

export function addInspiroWindshieldFrame(
  group: THREE.Group,
  panelMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
  deskCctvBinding: IDeskCctvMonitorBinding,
): ICabMirrorHardware {
  const pillarGeo = new THREE.BoxGeometry(0.11, 1.48, 0.16);
  const headerGeo = new THREE.BoxGeometry(2.2, 0.14, 0.3);
  const visorGeo = new THREE.BoxGeometry(1.18, 0.028, 0.1);
  const grabGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.34, 8);
  addWindshieldMeshes(group, panelMat, trimMat, bezelMat, pillarGeo, headerGeo, visorGeo, grabGeo);
  disposables.push(pillarGeo, headerGeo, visorGeo, grabGeo);
  return addModernCabCctvMonitors(
    group,
    bezelMat,
    { offsetX: 0.72, posY: 0.36, posZ: -0.94, pitchRad: 0.14, yawRad: 0.3, width: 0.22, height: 0.14 },
    disposables,
    deskCctvBinding,
  );
}

function addWindshieldMeshes(
  group: THREE.Group, panelMat: THREE.MeshStandardMaterial, trimMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial, pillarGeo: THREE.BoxGeometry, headerGeo: THREE.BoxGeometry,
  visorGeo: THREE.BoxGeometry, grabGeo: THREE.CylinderGeometry,
): void {
  ([-1, 1] as const).forEach((s) => {
    const pillar = new THREE.Mesh(pillarGeo, panelMat);
    pillar.position.set(s * 0.92, 0.05, -0.96);
    pillar.rotation.set(0.24, -s * 0.18, s * 0.14);
    const grab = new THREE.Mesh(grabGeo, trimMat);
    grab.position.set(s * 0.84, 0.06, -0.9);
    grab.rotation.set(0.24, 0, s * 0.14);
    group.add(pillar, grab);
  });
  const header = new THREE.Mesh(headerGeo, panelMat);
  header.position.set(0, 0.62, -0.92);
  header.rotation.x = 0.12;
  const visor = new THREE.Mesh(visorGeo, bezelMat);
  visor.position.set(0, 0.54, -0.87);
  group.add(header, visor);
}

export function addInspiroDesk(
  group: THREE.Group,
  deskMat: THREE.MeshStandardMaterial,
  panelMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  leftLcdTex: THREE.CanvasTexture,
  rightLcdTex: THREE.CanvasTexture,
  cctvOverlayTex: THREE.CanvasTexture,
  lamps: IInspiroButtonLamps,
  disposables: IDisposableResource[],
): IDeskCctvMonitorBinding {
  addInspiroDeskShell(group, deskMat, panelMat, bezelMat, disposables);
  const deskCctvBinding = addInspiroLcdUnits(
    group,
    bezelMat,
    leftLcdTex,
    rightLcdTex,
    cctvOverlayTex,
    disposables,
  );
  addDeskFunctionButtons(group, bezelMat, lamps, disposables);
  return deskCctvBinding;
}

function addInspiroDeskShell(
  group: THREE.Group,
  deskMat: THREE.MeshStandardMaterial,
  panelMat: THREE.MeshStandardMaterial,
  bezelMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): void {
  const mainDeckGeo = new THREE.BoxGeometry(2.14, 0.24, 0.56);
  const mainDeck = new THREE.Mesh(mainDeckGeo, deskMat);
  mainDeck.position.set(0, -0.5, -0.94);
  mainDeck.rotation.x = 0.14;
  const instrumentHoodGeo = new THREE.BoxGeometry(1.32, 0.24, 0.14);
  const instrumentHood = new THREE.Mesh(instrumentHoodGeo, panelMat);
  instrumentHood.position.set(0, -0.34, -1.03);
  instrumentHood.rotation.x = -0.32;
  const hoodLipGeo = new THREE.BoxGeometry(1.36, 0.024, 0.16);
  const hoodLip = new THREE.Mesh(hoodLipGeo, bezelMat);
  hoodLip.position.set(0, -0.205, -0.99);
  hoodLip.rotation.x = 0.04;
  group.add(mainDeck, instrumentHood, hoodLip);
  disposables.push(mainDeckGeo, instrumentHoodGeo, hoodLipGeo);
}

function addInspiroLcdUnits(
  group: THREE.Group, bezelMat: THREE.MeshStandardMaterial, leftLcdTex: THREE.CanvasTexture,
  rightLcdTex: THREE.CanvasTexture, cctvOverlayTex: THREE.CanvasTexture, disposables: IDisposableResource[],
): IDeskCctvMonitorBinding {
  const screenGeo = new THREE.PlaneGeometry(0.37, 0.21);
  const bezelGeo = new THREE.BoxGeometry(0.398, 0.236, 0.024);
  const [leftMat, centerMat] = [createLcdScreenMaterial(leftLcdTex, 0.92, 0.88), createLcdScreenMaterial(rightLcdTex, 0.92, 0.88)];
  const leftLcd = createAngledDisplayUnit({ screenGeo, bezelGeo, screenMat: leftMat, bezelMat, x: -0.415, y: -0.34, z: -0.91, pitchRad: -0.3, yawRad: 0.09, screenOffsetZ: 0.016 });
  const centerLcd = createAngledDisplayUnit({ screenGeo, bezelGeo, screenMat: centerMat, bezelMat, x: 0, y: -0.34, z: -0.928, pitchRad: -0.3, yawRad: 0, screenOffsetZ: 0.016 });
  const deskCctvBinding = createDeskCctvMonitorUnit({ screenWidth: 0.37, screenHeight: 0.21, bezelGeo, bezelMat, overlayTex: cctvOverlayTex, x: 0.415, y: -0.34, z: -0.91, pitchRad: -0.3, yawRad: -0.09 }, disposables);
  group.add(leftLcd, centerLcd, deskCctvBinding.unit);
  disposables.push(screenGeo, bezelGeo, leftMat, centerMat);
  return deskCctvBinding;
}

function addDeskFunctionButtons(
  group: THREE.Group, bezelMat: THREE.MeshStandardMaterial, lamps: IInspiroButtonLamps, disposables: IDisposableResource[],
): void {
  const podGeo = new THREE.BoxGeometry(0.24, 0.06, 0.22);
  const rightPod = new THREE.Mesh(podGeo, bezelMat);
  rightPod.position.set(0.74, -0.365, -0.86); rightPod.rotation.set(0.28, -0.22, 0);
  const btnGeo = new THREE.BoxGeometry(0.038, 0.022, 0.038);
  const btnDoor = new THREE.Mesh(btnGeo, lamps.doorMat); btnDoor.position.set(0.68, -0.33, -0.87);
  const btnHead = new THREE.Mesh(btnGeo, lamps.headlightMat); btnHead.position.set(0.74, -0.33, -0.86);
  const btnCzuwak = new THREE.Mesh(btnGeo, lamps.czuwakMat); btnCzuwak.position.set(0.8, -0.33, -0.85);
  const estopCollarGeo = new THREE.CylinderGeometry(0.032, 0.036, 0.018, 12);
  const estopCollarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const estopCollar = new THREE.Mesh(estopCollarGeo, estopCollarMat); estopCollar.position.set(0.74, -0.34, -0.79);
  const estopCapGeo = new THREE.CylinderGeometry(0.026, 0.02, 0.026, 12);
  const estopCap = new THREE.Mesh(estopCapGeo, lamps.warnMat); estopCap.position.set(0.74, -0.317, -0.79);
  group.add(rightPod, btnDoor, btnHead, btnCzuwak, estopCollar, estopCap);
  disposables.push(podGeo, btnGeo, estopCollarGeo, estopCollarMat, estopCapGeo);
}
