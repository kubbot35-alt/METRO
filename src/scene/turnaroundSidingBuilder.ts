import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import { TURNAROUND_BUFFER_OFFSET_M } from '../domain/turnaroundSystem';
import type { IStationSpec } from '../domain/types';
import { addSidingGuidanceSigns, createChevronBufferTexture } from './turnaroundSidingSigns';
import type { ISceneResources } from './types';

export interface ITurnaroundSidingRig extends ISceneResources {
  update(timeSec: number, active: boolean): void;
}

export function buildTurnaroundSidingRig(
  scene: THREE.Scene,
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
): ITurnaroundSidingRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'TurnaroundSidingGroup';
  scene.add(root);
  const sidingStartM = stations[stations.length - 1]?.distanceM ?? 3000;
  const { beaconMat, redLight } = addBufferStopAssembly(root, alignment, sidingStartM + TURNAROUND_BUFFER_OFFSET_M, maxAnisotropy, disposables);
  addSidingGuidanceSigns(root, alignment, sidingStartM, maxAnisotropy, disposables);
  return {
    update: (timeSec, active) => {
      const pulse = 0.72 + 0.28 * Math.sin(timeSec * (active ? 6.2 : 2.6));
      beaconMat.emissiveIntensity = (active ? 5.2 : 3.2) * pulse;
      redLight.intensity = (active ? 30 : 18) * pulse;
    },
    dispose: () => { scene.remove(root); disposables.forEach((item) => item.dispose()); },
  };
}

function addBufferStopAssembly(
  root: THREE.Group,
  alignment: TrackAlignment,
  bufferDistM: number,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): { readonly beaconMat: THREE.MeshStandardMaterial; readonly redLight: THREE.PointLight } {
  const frame = alignment.sample(bufferDistM);
  const group = new THREE.Group();
  group.position.set(frame.x, frame.y, frame.z);
  group.rotation.order = 'YXZ';
  group.rotation.set(frame.pitch, frame.yaw, 0);
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.08 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.72 });
  const chevronTex = createChevronBufferTexture(maxAnisotropy);
  const chevronMat = new THREE.MeshStandardMaterial({ map: chevronTex, emissiveMap: chevronTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.35 });
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xef4444, emissiveIntensity: 4.0, roughness: 0.15 });
  const redLight = populateBufferFrameMeshes(group, concreteMat, steelMat, chevronMat, beaconMat, disposables);
  root.add(group);
  disposables.push(concreteMat, steelMat, chevronTex, chevronMat, beaconMat);
  return { beaconMat, redLight };
}

function createBufferFrameGeos(disposables: Array<{ dispose(): void }>) {
  const plinthGeo = new THREE.BoxGeometry(2.8, 0.55, 1.9);
  const legGeo = new THREE.BoxGeometry(0.18, 1.38, 0.22);
  const strutGeo = new THREE.BoxGeometry(0.16, 1.65, 0.2);
  const beamGeo = new THREE.BoxGeometry(2.55, 0.52, 0.28);
  const padGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.24, 14);
  const beaconGeo = new THREE.BoxGeometry(0.28, 0.28, 0.18);
  const bulkheadGeo = new THREE.BoxGeometry(12.2, 5.4, 0.8);
  disposables.push(plinthGeo, legGeo, strutGeo, beamGeo, padGeo, beaconGeo, bulkheadGeo);
  return { plinthGeo, legGeo, strutGeo, beamGeo, padGeo, beaconGeo, bulkheadGeo };
}

function populateBufferFrameMeshes(
  group: THREE.Group, concreteMat: THREE.MeshStandardMaterial, steelMat: THREE.MeshStandardMaterial,
  chevronMat: THREE.MeshStandardMaterial, beaconMat: THREE.MeshStandardMaterial, disposables: Array<{ dispose(): void }>,
): THREE.PointLight {
  const geos = createBufferFrameGeos(disposables);
  const plinth = new THREE.Mesh(geos.plinthGeo, concreteMat); plinth.position.set(0, 0.275, -0.45);
  const beam = new THREE.Mesh(geos.beamGeo, chevronMat); beam.position.set(0, 1.15, 0.38);
  const bulkhead = new THREE.Mesh(geos.bulkheadGeo, concreteMat); bulkhead.position.set(-1.6, 2.7, -8.2);
  const redLight = new THREE.PointLight(0xef4444, 24, 38, 1.4); redLight.position.set(0, 2.0, 2.2);
  group.add(plinth, beam, bulkhead, redLight);
  attachBufferSideHardware(group, steelMat, beaconMat, geos.legGeo, geos.strutGeo, geos.padGeo, geos.beaconGeo);
  return redLight;
}

function attachBufferSideHardware(
  group: THREE.Group,
  steelMat: THREE.MeshStandardMaterial,
  beaconMat: THREE.MeshStandardMaterial,
  legGeo: THREE.BoxGeometry,
  strutGeo: THREE.BoxGeometry,
  padGeo: THREE.CylinderGeometry,
  beaconGeo: THREE.BoxGeometry,
): void {
  for (const side of [-1, 1]) {
    const pad = new THREE.Mesh(padGeo, steelMat);
    pad.rotation.x = Math.PI / 2;
    pad.position.set(side * 0.78, 1.15, 0.58);
    const leg = new THREE.Mesh(legGeo, steelMat);
    leg.position.set(side * 0.88, 0.9, 0.22);
    leg.rotation.x = -0.25;
    const strut = new THREE.Mesh(strutGeo, steelMat);
    strut.position.set(side * 0.88, 0.88, -0.58);
    strut.rotation.x = 0.62;
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(side * 0.92, 1.66, 0.34);
    group.add(pad, leg, strut, beacon);
  }
}
