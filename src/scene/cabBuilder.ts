import * as THREE from 'three';

export interface ICabRig {
  readonly group: THREE.Group;
  readonly wiperPivot: THREE.Group;
  readonly leverPivot: THREE.Group;
  readonly doorLightMat: THREE.MeshStandardMaterial;
  readonly warningLightMat: THREE.MeshStandardMaterial;
  readonly headlightLampMat: THREE.MeshStandardMaterial;
  readonly czuwakLampMat: THREE.MeshStandardMaterial;
  setTheme(theme: 'retro' | 'modern'): void;
  dispose(): void;
}

export function buildMetroCabRig(): ICabRig {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'MetroCabRig';

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x161a21, roughness: 0.58, metalness: 0.45 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.72 });
  const cowlMat = new THREE.MeshStandardMaterial({ color: 0x111419, roughness: 0.82, metalness: 0.15 });
  const doorLightMat = createLampMaterial(0x059669, 0x10b981, 0.4);
  const warningLightMat = createLampMaterial(0x7f1d1d, 0xef4444, 0.08);
  const headlightLampMat = createLampMaterial(0xb45309, 0xfef3c7, 2.2);
  const czuwakLampMat = createLampMaterial(0x9a3412, 0xf97316, 0.08);
  disposables.push(
    frameMat, trimMat, cowlMat, doorLightMat, warningLightMat, headlightLampMat, czuwakLampMat,
  );

  addWindshieldFrame(group, frameMat, trimMat, disposables);
  addDashboardCowl(
    group,
    cowlMat,
    doorLightMat,
    warningLightMat,
    headlightLampMat,
    czuwakLampMat,
    disposables,
  );
  const wiperPivot = addWindshieldWiper(group, disposables);
  const leverPivot = addMasterControllerLever(group, frameMat, trimMat, disposables);

  return {
    group,
    wiperPivot,
    leverPivot,
    doorLightMat,
    warningLightMat,
    headlightLampMat,
    czuwakLampMat,
    setTheme: (theme: 'retro' | 'modern'): void => {
      if (theme === 'retro') {
        frameMat.color.setHex(0x283832);
        cowlMat.color.setHex(0x1b2622);
        trimMat.color.setHex(0x4a6359);
      } else {
        frameMat.color.setHex(0x161a21);
        cowlMat.color.setHex(0x111419);
        trimMat.color.setHex(0x334155);
      }
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

function createLampMaterial(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.25,
  });
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
  headlightLampMat: THREE.MeshStandardMaterial,
  czuwakLampMat: THREE.MeshStandardMaterial,
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
  const headLamp = new THREE.Mesh(lampGeo, headlightLampMat);
  headLamp.position.set(0.32, -0.5, -0.94);
  const czuwakLamp = new THREE.Mesh(lampGeo, czuwakLampMat);
  czuwakLamp.position.set(-0.32, -0.5, -0.94);

  group.add(cowl, doorLamp, warnLamp, headLamp, czuwakLamp);
  disposables.push(cowlGeo, lampGeo);
}

function addWindshieldWiper(
  group: THREE.Group,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.9, metalness: 0.1 });
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

function addMasterControllerLever(
  group: THREE.Group,
  frameMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const baseX = -0.52;
  const baseY = -0.45;
  const baseZ = -0.84;

  const housingGeo = new THREE.BoxGeometry(0.14, 0.09, 0.28);
  const housing = new THREE.Mesh(housingGeo, frameMat);
  housing.position.set(baseX, baseY - 0.03, baseZ);

  const slotGeo = new THREE.BoxGeometry(0.032, 0.02, 0.22);
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x07090e, roughness: 0.95 });
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.position.set(baseX, baseY + 0.012, baseZ);

  const railTickMat = createLampMaterial(0x10b981, 0x34d399, 0.9);
  const brakeTickMat = createLampMaterial(0xd97706, 0xf59e0b, 0.9);
  const tickGeo = new THREE.BoxGeometry(0.012, 0.008, 0.09);
  const fwdTick = new THREE.Mesh(tickGeo, railTickMat);
  fwdTick.position.set(baseX + 0.042, baseY + 0.018, baseZ - 0.055);
  const revTick = new THREE.Mesh(tickGeo, brakeTickMat);
  revTick.position.set(baseX + 0.042, baseY + 0.018, baseZ + 0.055);

  const pivot = new THREE.Group();
  pivot.name = 'MasterControllerLeverPivot';
  pivot.position.set(baseX, baseY, baseZ);

  const shaftGeo = new THREE.CylinderGeometry(0.011, 0.014, 0.21, 10);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.85 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.set(0, 0.105, 0);

  const gripGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.135, 12);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.72, metalness: 0.25 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 0.21, 0);

  const capGeo = new THREE.CylinderGeometry(0.0225, 0.0225, 0.014, 12);
  const capMat = createLampMaterial(0xd97706, 0xf59e0b, 1.1);
  const leftCap = new THREE.Mesh(capGeo, capMat);
  leftCap.rotation.z = Math.PI / 2;
  leftCap.position.set(-0.06, 0.21, 0);
  const rightCap = new THREE.Mesh(capGeo, capMat);
  rightCap.rotation.z = Math.PI / 2;
  rightCap.position.set(0.06, 0.21, 0);

  const collarGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.024, 10);
  const collar = new THREE.Mesh(collarGeo, trimMat);
  collar.position.set(0, 0.02, 0);

  pivot.add(collar, shaft, grip, leftCap, rightCap);
  group.add(housing, slot, fwdTick, revTick, pivot);
  disposables.push(
    housingGeo, slotGeo, slotMat, railTickMat, brakeTickMat, tickGeo,
    shaftGeo, shaftMat, gripGeo, gripMat, capGeo, capMat, collarGeo,
  );
  return pivot;
}
