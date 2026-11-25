import * as THREE from 'three';

export interface ICabRig {
  readonly group: THREE.Group;
  readonly wiperPivot: THREE.Group;
  readonly doorLightMat: THREE.MeshStandardMaterial;
  readonly warningLightMat: THREE.MeshStandardMaterial;
  dispose(): void;
}

export function buildMetroCabRig(): ICabRig {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'MetroCabRig';

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x161a21, roughness: 0.58, metalness: 0.45 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.72 });
  const cowlMat = new THREE.MeshStandardMaterial({ color: 0x111419, roughness: 0.82, metalness: 0.15 });
  const doorLightMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    emissive: 0x10b981,
    emissiveIntensity: 0.4,
    roughness: 0.25,
  });
  const warningLightMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    emissive: 0xef4444,
    emissiveIntensity: 0.08,
    roughness: 0.25,
  });
  disposables.push(frameMat, trimMat, cowlMat, doorLightMat, warningLightMat);

  addWindshieldFrame(group, frameMat, trimMat, disposables);
  addDashboardCowl(group, cowlMat, doorLightMat, warningLightMat, disposables);
  const wiperPivot = addWindshieldWiper(group, trimMat, disposables);

  return {
    group,
    wiperPivot,
    doorLightMat,
    warningLightMat,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

function addWindshieldFrame(
  group: THREE.Group,
  frameMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const pillarGeo = new THREE.BoxGeometry(0.14, 1.55, 0.18);
  const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
  leftPillar.position.set(-1.32, 0.04, -1.05);
  leftPillar.rotation.z = -0.09;

  const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
  rightPillar.position.set(1.32, 0.04, -1.05);
  rightPillar.rotation.z = 0.09;

  const headerGeo = new THREE.BoxGeometry(2.9, 0.22, 0.28);
  const header = new THREE.Mesh(headerGeo, frameMat);
  header.position.set(0, 0.78, -1.02);

  const visorGeo = new THREE.BoxGeometry(2.35, 0.05, 0.14);
  const visor = new THREE.Mesh(visorGeo, trimMat);
  visor.position.set(0, 0.66, -0.94);

  const handleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.45, 8);
  const handle = new THREE.Mesh(handleGeo, trimMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.85, 0.64, -0.9);

  group.add(leftPillar, rightPillar, header, visor, handle);
  disposables.push(pillarGeo, headerGeo, visorGeo, handleGeo);
}

function addDashboardCowl(
  group: THREE.Group,
  cowlMat: THREE.MeshStandardMaterial,
  doorLightMat: THREE.MeshStandardMaterial,
  warningLightMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const cowlGeo = new THREE.BoxGeometry(2.8, 0.28, 0.56);
  const cowl = new THREE.Mesh(cowlGeo, cowlMat);
  cowl.position.set(0, -0.66, -1.02);
  cowl.rotation.x = 0.14;

  const lampGeo = new THREE.BoxGeometry(0.12, 0.03, 0.04);
  const doorLamp = new THREE.Mesh(lampGeo, doorLightMat);
  doorLamp.position.set(0.55, -0.5, -0.94);
  const warnLamp = new THREE.Mesh(lampGeo, warningLightMat);
  warnLamp.position.set(-0.55, -0.5, -0.94);

  group.add(cowl, doorLamp, warnLamp);
  disposables.push(cowlGeo, lampGeo);
}

function addWindshieldWiper(
  group: THREE.Group,
  _trimMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const wiperMat = new THREE.MeshStandardMaterial({
    color: 0x0b0e14,
    roughness: 0.9,
    metalness: 0.1,
  });
  const pivot = new THREE.Group();
  pivot.position.set(0.92, -0.57, -1.07);
  const armGeo = new THREE.BoxGeometry(0.012, 0.42, 0.012);
  const arm = new THREE.Mesh(armGeo, wiperMat);
  arm.position.set(0, 0.2, 0);
  const bladeGeo = new THREE.BoxGeometry(0.01, 0.34, 0.01);
  const blade = new THREE.Mesh(bladeGeo, wiperMat);
  blade.position.set(-0.012, 0.28, -0.008);
  pivot.add(arm, blade);
  pivot.rotation.z = 1.42;
  group.add(pivot);
  disposables.push(wiperMat, armGeo, bladeGeo);
  return pivot;
}
