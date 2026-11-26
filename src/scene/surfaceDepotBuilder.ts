import * as THREE from 'three';
import {
  M1_SURFACE_ELEVATION_M,
  M1_TUNNEL_PORTAL_M,
  type TrackAlignment,
} from '../domain/trackAlignment';
import type { TimeOfDayId } from '../domain/types';
import {
  createDepotBuildingTexture,
  createDepotPortalSignTexture,
  createDepotSignboardTexture,
} from './proceduralTextures';

export interface ISurfaceDepotRig {
  sync(outdoorBlend: number, timeOfDayId: TimeOfDayId, cameraPos: THREE.Vector3): void;
  dispose(): void;
}

const SKY_VERTEX_SHADER = `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform vec3 uTopColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunStrength;
  varying vec3 vWorldDir;
  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
    col = mix(col, uTopColor, smoothstep(0.24, 0.85, h));
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float broadGlow = pow(sunDot, 10.0) * 0.09 * uSunStrength;
    float halo = pow(sunDot, 56.0) * 0.28 * uSunStrength;
    float disc = smoothstep(0.99935, 0.99972, sunDot) * 1.45 * uSunStrength;
    col += uSunColor * (broadGlow + halo + disc);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function buildSurfaceDepot(
  scene: THREE.Scene,
  alignment: TrackAlignment,
  maxAnisotropy: number,
): ISurfaceDepotRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'SurfaceDepotStpKabaty';
  scene.add(root);

  if (!alignment.hasSurfaceStart) {
    return {
      sync: () => {},
      dispose: () => {
        scene.remove(root);
      },
    };
  }

  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x2867b8) },
    uMidColor: { value: new THREE.Color(0x6fb1ea) },
    uHorizonColor: { value: new THREE.Color(0xcde2f7) },
    uSunDir: { value: new THREE.Vector3(0.32, 0.36, -0.88).normalize() },
    uSunColor: { value: new THREE.Color(0xfff1cc) },
    uSunStrength: { value: 1.0 },
  };

  const skyGroup = new THREE.Group();
  const skyGeo = new THREE.SphereGeometry(270, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.frustumCulled = false;
  skyGroup.add(skyMesh);

  const stars = buildStarfield(disposables);
  skyGroup.add(stars);
  root.add(skyGroup);
  disposables.push(skyGeo, skyMat);

  const sharedMats = createDepotMaterials(maxAnisotropy, disposables);
  addOutdoorTerrainAndEmbankment(root, alignment, sharedMats, disposables);
  addStablingSidingsAndTrains(root, sharedMats, disposables);
  addDepotHangarAndGantry(root, sharedMats, disposables);
  addFloodlightMasts(root, sharedMats, disposables);
  addTreesAndHorizonBlocks(root, sharedMats, disposables);
  addDescentRetainingWalls(root, alignment, sharedMats, disposables);
  addConcreteTunnelPortal(root, alignment, sharedMats, disposables);

  let lastTod: TimeOfDayId | null = null;

  return {
    sync: (outdoorBlend, timeOfDayId, cameraPos) => {
      const visibleSky = outdoorBlend > 0.02;
      skyGroup.visible = visibleSky;
      if (visibleSky) {
        skyGroup.position.copy(cameraPos);
      }
      if (lastTod !== timeOfDayId) {
        lastTod = timeOfDayId;
        if (timeOfDayId === 'evening') {
          skyUniforms.uTopColor.value.setHex(0x020612);
          skyUniforms.uMidColor.value.setHex(0x071228);
          skyUniforms.uHorizonColor.value.setHex(0x112040);
          skyUniforms.uSunDir.value.set(-0.26, 0.34, -0.9).normalize();
          skyUniforms.uSunColor.value.setHex(0xe2ecff);
          skyUniforms.uSunStrength.value = 0.85;
          stars.visible = true;
          sharedMats.mastLamp.emissiveIntensity = 5.2;
          sharedMats.hangarWindow.emissiveIntensity = 2.6;
          sharedMats.hangarSign.emissiveIntensity = 0.95;
        } else {
          skyUniforms.uTopColor.value.setHex(0x2563b5);
          skyUniforms.uMidColor.value.setHex(0x6db0ea);
          skyUniforms.uHorizonColor.value.setHex(0xd4e6f8);
          skyUniforms.uSunDir.value.set(0.32, 0.34, -0.88).normalize();
          skyUniforms.uSunColor.value.setHex(0xfff1cc);
          skyUniforms.uSunStrength.value = 1.05;
          stars.visible = false;
          sharedMats.mastLamp.emissiveIntensity = 0.9;
          sharedMats.hangarWindow.emissiveIntensity = 0.4;
          sharedMats.hangarSign.emissiveIntensity = 0.35;
        }
      }
    },
    dispose: () => {
      scene.remove(root);
      disposables.forEach((d) => d.dispose());
    },
  };
}

interface IDepotMaterials {
  readonly gravel: THREE.MeshStandardMaterial;
  readonly grass: THREE.MeshStandardMaterial;
  readonly concrete: THREE.MeshStandardMaterial;
  readonly darkConcrete: THREE.MeshStandardMaterial;
  readonly portalArch: THREE.MeshStandardMaterial;
  readonly portalSign: THREE.MeshStandardMaterial;
  readonly hangarWall: THREE.MeshStandardMaterial;
  readonly hangarSign: THREE.MeshStandardMaterial;
  readonly hangarRoof: THREE.MeshStandardMaterial;
  readonly hangarWindow: THREE.MeshStandardMaterial;
  readonly steel: THREE.MeshStandardMaterial;
  readonly mastLamp: THREE.MeshStandardMaterial;
  readonly redBuffer: THREE.MeshStandardMaterial;
  readonly whiteStripe: THREE.MeshStandardMaterial;
  readonly trainBody: THREE.MeshStandardMaterial;
  readonly trainGlass: THREE.MeshStandardMaterial;
  readonly trainRed: THREE.MeshStandardMaterial;
  readonly trainYellow: THREE.MeshStandardMaterial;
  readonly trunk: THREE.MeshStandardMaterial;
  readonly foliage: THREE.MeshStandardMaterial;
  readonly cityBlock: THREE.MeshStandardMaterial;
}

function createDepotMaterials(
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): IDepotMaterials {
  const portalSignTex = createDepotPortalSignTexture(maxAnisotropy);
  const hangarTex = createDepotBuildingTexture(maxAnisotropy);
  const hangarSignTex = createDepotSignboardTexture(maxAnisotropy);

  const mats: IDepotMaterials = {
    gravel: new THREE.MeshStandardMaterial({ color: 0x52565c, roughness: 0.94, metalness: 0.04 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x3b6036, roughness: 0.95, metalness: 0.02 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x8b929b, roughness: 0.88, metalness: 0.06 }),
    darkConcrete: new THREE.MeshStandardMaterial({ color: 0x383f4a, roughness: 0.9, metalness: 0.08 }),
    portalArch: new THREE.MeshStandardMaterial({ color: 0x737b86, roughness: 0.82, metalness: 0.1 }),
    portalSign: new THREE.MeshStandardMaterial({
      map: portalSignTex,
      emissiveMap: portalSignTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    }),
    hangarWall: new THREE.MeshStandardMaterial({ map: hangarTex, roughness: 0.65, metalness: 0.25 }),
    hangarSign: new THREE.MeshStandardMaterial({
      map: hangarSignTex,
      emissiveMap: hangarSignTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    }),
    hangarRoof: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.58, metalness: 0.42 }),
    hangarWindow: new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.42, metalness: 0.72 }),
    mastLamp: new THREE.MeshStandardMaterial({
      color: 0xfff7ed,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
    redBuffer: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5, metalness: 0.18 }),
    whiteStripe: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55, metalness: 0.1 }),
    trainBody: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.34, metalness: 0.48 }),
    trainGlass: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.16, metalness: 0.4 }),
    trainRed: new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.36, metalness: 0.22 }),
    trainYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.36, metalness: 0.18 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.92, metalness: 0.02 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x2f5a32, roughness: 0.88, metalness: 0.02 }),
    cityBlock: new THREE.MeshStandardMaterial({ color: 0x5c6b7e, roughness: 0.85, metalness: 0.08 }),
  };

  disposables.push(portalSignTex, hangarTex, hangarSignTex, ...Object.values(mats));
  return mats;
}

function buildStarfield(disposables: Array<{ dispose(): void }>): THREE.Points {
  const starCount = 560;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const u = ((i * 73 + 19) % 997) / 997;
    const v = ((i * 151 + 43) % 991) / 991;
    const theta = u * Math.PI * 2;
    const phi = Math.acos(0.06 + v * 0.92); // upper sky hemisphere
    const r = 245;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 2.3,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  disposables.push(geo, mat);
  return pts;
}

function addOutdoorTerrainAndEmbankment(
  root: THREE.Group,
  alignment: TrackAlignment,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  // Wide grass ground plane flanking the entire depot and horizon (leaves open cutting slot for ramp 220..300m)
  const grassLeftGeo = new THREE.PlaneGeometry(180, 560);
  const grassRightGeo = new THREE.PlaneGeometry(180, 560);
  const yardGravelGeo = new THREE.PlaneGeometry(42, 330);
  const portalHillGeo = new THREE.BoxGeometry(220, 4.2, 130);
  const hillSlopeGeo = new THREE.BoxGeometry(30, 1.5, 22);
  const fenceGeo = new THREE.BoxGeometry(0.32, 2.5, 420);
  disposables.push(grassLeftGeo, grassRightGeo, yardGravelGeo, portalHillGeo, hillSlopeGeo, fenceGeo);

  const grassLeft = new THREE.Mesh(grassLeftGeo, mats.grass);
  grassLeft.rotation.x = -Math.PI / 2;
  grassLeft.position.set(-100, ySurf - 0.16, -155);

  const grassRight = new THREE.Mesh(grassRightGeo, mats.grass);
  grassRight.rotation.x = -Math.PI / 2;
  grassRight.position.set(95.5, ySurf - 0.16, -155);

  const yardGravel = new THREE.Mesh(yardGravelGeo, mats.gravel);
  yardGravel.rotation.x = -Math.PI / 2;
  yardGravel.position.set(-3.5, ySurf - 0.08, -60);

  // Earth hill covering the roof of the underground tunnel starting right behind the concrete portal at s=300 m
  const portalFrame = alignment.sample(M1_TUNNEL_PORTAL_M);
  const portalHill = new THREE.Mesh(portalHillGeo, mats.grass);
  portalHill.position.set(portalFrame.x - 2, portalFrame.y + 7.7, portalFrame.z - 68);

  // Perimeter precast concrete fence bounding the STP Kabaty depot yard
  const fenceRight = new THREE.Mesh(fenceGeo, mats.concrete);
  fenceRight.position.set(16.5, ySurf + 1.25, -90);
  const fenceLeft = new THREE.Mesh(fenceGeo, mats.concrete);
  fenceLeft.position.set(-22.5, ySurf + 1.25, -90);

  root.add(grassLeft, grassRight, yardGravel, portalHill, fenceRight, fenceLeft);
}

function addStablingSidingsAndTrains(
  root: THREE.Group,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  const sidingXs = [-9.6, -14.2, 6.4];
  const sidingLen = 250;
  const railGeo = new THREE.BoxGeometry(0.08, 0.14, sidingLen);
  const sleeperGeo = new THREE.BoxGeometry(2.1, 0.08, 0.24);
  const bufferBarGeo = new THREE.BoxGeometry(2.1, 0.42, 0.22);
  const bufferLegGeo = new THREE.BoxGeometry(0.18, 1.05, 1.35);
  disposables.push(railGeo, sleeperGeo, bufferBarGeo, bufferLegGeo);

  const sleeperCountPerTrack = 110;
  const sleepers = new THREE.InstancedMesh(
    sleeperGeo,
    mats.darkConcrete,
    sidingXs.length * sleeperCountPerTrack,
  );
  const dummy = new THREE.Object3D();
  let idx = 0;

  sidingXs.forEach((sx) => {
    const railL = new THREE.Mesh(railGeo, mats.steel);
    railL.position.set(sx - 0.72, ySurf + 0.14, -75);
    const railR = new THREE.Mesh(railGeo, mats.steel);
    railR.position.set(sx + 0.72, ySurf + 0.14, -75);
    root.add(railL, railR);

    for (let i = 0; i < sleeperCountPerTrack; i += 1) {
      dummy.position.set(sx, ySurf + 0.04, 48 - i * 2.25);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      sleepers.setMatrixAt(idx, dummy.matrix);
      idx += 1;
    }

    // Red/white railway buffer stop at the north end of each siding (s = 200 m)
    const bufGroup = new THREE.Group();
    bufGroup.position.set(sx, ySurf, -200);
    const bar = new THREE.Mesh(bufferBarGeo, mats.redBuffer);
    bar.position.set(0, 0.95, 0);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.44, 0.24), mats.whiteStripe);
    stripe.position.set(0, 0.95, 0);
    const legL = new THREE.Mesh(bufferLegGeo, mats.steel);
    legL.position.set(-0.75, 0.52, -0.35);
    const legR = new THREE.Mesh(bufferLegGeo, mats.steel);
    legR.position.set(0.75, 0.52, -0.35);
    bufGroup.add(bar, stripe, legL, legR);
    root.add(bufGroup);
    disposables.push(stripe.geometry);
  });
  sleepers.instanceMatrix.needsUpdate = true;
  sleepers.frustumCulled = false;
  root.add(sleepers);

  // Two parked stabling metro trains on adjacent STP Kabaty sidings
  addParkedDepotTrain(root, -9.6, ySurf, -118, 3, mats, disposables);
  addParkedDepotTrain(root, 6.4, ySurf, -148, 3, mats, disposables);
}

function addParkedDepotTrain(
  root: THREE.Group,
  x: number,
  ySurf: number,
  frontZ: number,
  carCount: number,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const carLen = 17.2;
  const gap = 0.9;
  const bodyGeo = new THREE.BoxGeometry(2.74, 2.9, carLen);
  const windowGeo = new THREE.BoxGeometry(2.78, 1.05, carLen - 0.8);
  const redBandGeo = new THREE.BoxGeometry(2.78, 0.52, carLen - 0.2);
  const yellowNoseGeo = new THREE.BoxGeometry(2.76, 0.65, 0.25);
  const roofHvacGeo = new THREE.BoxGeometry(1.75, 0.28, 3.4);
  const bogieGeo = new THREE.BoxGeometry(2.1, 0.6, 2.4);
  disposables.push(bodyGeo, windowGeo, redBandGeo, yellowNoseGeo, roofHvacGeo, bogieGeo);

  const trainGroup = new THREE.Group();
  trainGroup.position.set(x, ySurf, frontZ);

  for (let i = 0; i < carCount; i += 1) {
    const cz = i * (carLen + gap) + carLen * 0.5;
    const body = new THREE.Mesh(bodyGeo, mats.trainBody);
    body.position.set(0, 2.1, cz);
    const win = new THREE.Mesh(windowGeo, mats.trainGlass);
    win.position.set(0, 2.45, cz);
    const red = new THREE.Mesh(redBandGeo, mats.trainRed);
    red.position.set(0, 1.05, cz);
    const hvacA = new THREE.Mesh(roofHvacGeo, mats.steel);
    hvacA.position.set(0, 3.68, cz - 4.0);
    const hvacB = new THREE.Mesh(roofHvacGeo, mats.steel);
    hvacB.position.set(0, 3.68, cz + 4.0);
    const bogieA = new THREE.Mesh(bogieGeo, mats.darkConcrete);
    bogieA.position.set(0, 0.45, cz - 5.2);
    const bogieB = new THREE.Mesh(bogieGeo, mats.darkConcrete);
    bogieB.position.set(0, 0.45, cz + 5.2);
    trainGroup.add(body, win, red, hvacA, hvacB, bogieA, bogieB);
  }
  const frontYellow = new THREE.Mesh(yellowNoseGeo, mats.trainYellow);
  frontYellow.position.set(0, 1.48, -0.05);
  const rearYellow = new THREE.Mesh(yellowNoseGeo, mats.trainYellow);
  rearYellow.position.set(0, 1.48, carCount * (carLen + gap) - gap + 0.05);
  trainGroup.add(frontYellow, rearYellow);

  root.add(trainGroup);
}

function addDepotHangarAndGantry(
  root: THREE.Group,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const ySurf = M1_SURFACE_ELEVATION_M;

  // STP Kabaty Depot Hall on the left flank (distinctive Warsaw blue-steel depot landmark)
  const hangarGroup = new THREE.Group();
  hangarGroup.position.set(-29, ySurf, -88);
  const mainGeo = new THREE.BoxGeometry(16, 10.5, 118);
  const roofGeo = new THREE.BoxGeometry(16.8, 0.8, 120);
  const windowStripGeo = new THREE.BoxGeometry(0.18, 1.35, 106);
  const signBoardGeo = new THREE.PlaneGeometry(36, 4.2);
  const ventGeo = new THREE.BoxGeometry(5.2, 1.35, 16);
  disposables.push(mainGeo, roofGeo, windowStripGeo, signBoardGeo, ventGeo);

  const main = new THREE.Mesh(mainGeo, mats.hangarWall);
  main.position.set(0, 5.25, 0);
  const roof = new THREE.Mesh(roofGeo, mats.hangarRoof);
  roof.position.set(0, 10.8, 0);
  const winStrip = new THREE.Mesh(windowStripGeo, mats.hangarWindow);
  winStrip.position.set(8.08, 8.65, 0);
  const signBoard = new THREE.Mesh(signBoardGeo, mats.hangarSign);
  signBoard.rotation.y = Math.PI / 2;
  signBoard.position.set(8.12, 6.0, 26);
  hangarGroup.add(main, roof, winStrip, signBoard);
  [-38, -12, 14, 40].forEach((vz) => {
    const vent = new THREE.Mesh(ventGeo, mats.steel);
    vent.position.set(0, 11.7, vz);
    hangarGroup.add(vent);
  });
  root.add(hangarGroup);

  // Overhead steel track gantry spanning the depot throat at s = 122 m
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(-2.2, ySurf, -122);
  const legGeo = new THREE.BoxGeometry(0.45, 7.8, 0.45);
  const trussGeo = new THREE.BoxGeometry(15.2, 0.72, 0.55);
  disposables.push(legGeo, trussGeo);
  const legL = new THREE.Mesh(legGeo, mats.steel);
  legL.position.set(-7.4, 3.9, 0);
  const legR = new THREE.Mesh(legGeo, mats.steel);
  legR.position.set(7.4, 3.9, 0);
  const truss = new THREE.Mesh(trussGeo, mats.steel);
  truss.position.set(0, 7.55, 0);
  gantryGroup.add(legL, legR, truss);
  root.add(gantryGroup);
}

function addFloodlightMasts(
  root: THREE.Group,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.22, 13.5, 8);
  const baseGeo = new THREE.BoxGeometry(0.75, 0.6, 0.75);
  const armGeo = new THREE.BoxGeometry(2.2, 0.18, 0.28);
  const lampGeo = new THREE.BoxGeometry(0.55, 0.26, 0.34);
  disposables.push(poleGeo, baseGeo, armGeo, lampGeo);

  const mastCoords: ReadonlyArray<[number, number]> = [
    [-17.2, -32],
    [10.2, -32],
    [-17.2, -96],
    [10.2, -96],
    [-17.2, -162],
    [10.2, -162],
    [-12.5, -228],
    [7.8, -228],
    [-11.8, -284],
    [7.2, -284],
  ];

  mastCoords.forEach(([mx, mz]) => {
    const mast = new THREE.Group();
    mast.position.set(mx, ySurf, mz);
    const base = new THREE.Mesh(baseGeo, mats.concrete);
    base.position.y = 0.3;
    const pole = new THREE.Mesh(poleGeo, mats.steel);
    pole.position.y = 6.9;
    const arm = new THREE.Mesh(armGeo, mats.steel);
    arm.position.set(mx < 0 ? 0.8 : -0.8, 13.5, 0);
    const lampA = new THREE.Mesh(lampGeo, mats.mastLamp);
    lampA.position.set(mx < 0 ? 1.4 : -1.4, 13.32, -0.18);
    const lampB = new THREE.Mesh(lampGeo, mats.mastLamp);
    lampB.position.set(mx < 0 ? 1.4 : -1.4, 13.32, 0.18);
    mast.add(base, pole, arm, lampA, lampB);
    root.add(mast);
  });
}

function addTreesAndHorizonBlocks(
  root: THREE.Group,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 2.8, 7);
  const crownGeo = new THREE.ConeGeometry(2.1, 5.8, 7);
  const crownTopGeo = new THREE.ConeGeometry(1.5, 4.2, 7);
  disposables.push(trunkGeo, crownGeo, crownTopGeo);

  const treeCount = 46;
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, treeCount);
  const crownsA = new THREE.InstancedMesh(crownGeo, mats.foliage, treeCount);
  const crownsB = new THREE.InstancedMesh(crownTopGeo, mats.foliage, treeCount);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < treeCount; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const lateral = side > 0 ? 20 + ((i * 19) % 36) : -(26 + ((i * 23) % 36));
    const z = -15 - i * 8.2;
    const scale = 0.85 + ((i * 11) % 7) * 0.06;
    const baseY = z < -298 ? ySurf + 3.0 : ySurf;

    dummy.position.set(lateral, baseY + 1.4 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.rotation.set(0, (i * 0.7) % Math.PI, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lateral, baseY + 4.4 * scale, z);
    dummy.updateMatrix();
    crownsA.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lateral, baseY + 6.9 * scale, z);
    dummy.updateMatrix();
    crownsB.setMatrixAt(i, dummy.matrix);

    const shade = 0.85 + ((i * 13) % 5) * 0.08;
    color.setRGB(0.18 * shade, 0.36 * shade, 0.19 * shade);
    crownsA.setColorAt(i, color);
    crownsB.setColorAt(i, color);
  }
  [trunks, crownsA, crownsB].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) {
      inst.instanceColor.needsUpdate = true;
    }
    inst.frustumCulled = false;
    root.add(inst);
  });

  // Distant Kabaty apartment skyline blocks with lit window bands behind the tunnel embankment
  const blockGeo = new THREE.BoxGeometry(22, 24, 14);
  const winBandGeo = new THREE.BoxGeometry(22.2, 1.1, 14.2);
  disposables.push(blockGeo, winBandGeo);
  const blockSpecs: ReadonlyArray<[number, number, number]> = [
    [-58, -375, 1.15],
    [-22, -395, 0.95],
    [18, -388, 1.25],
    [56, -370, 1.0],
    [48, -210, 0.88],
    [54, -120, 0.92],
  ];
  blockSpecs.forEach(([bx, bz, sc]) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, ySurf, bz);
    const b = new THREE.Mesh(blockGeo, mats.cityBlock);
    b.scale.set(1, sc, 1);
    b.position.y = 12 * sc;
    bGroup.add(b);
    [5, 10, 15, 20].forEach((wy) => {
      const w = new THREE.Mesh(winBandGeo, mats.hangarWindow);
      w.position.y = wy * sc;
      bGroup.add(w);
    });
    root.add(bGroup);
  });
}

function addDescentRetainingWalls(
  root: THREE.Group,
  alignment: TrackAlignment,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  // Concrete trench retaining walls along the ramp descending into the tunnel portal (s = 212..300 m)
  const segLen = 8;
  const wallGeo = new THREE.BoxGeometry(0.65, 5.4, segLen + 0.12);
  const capGeo = new THREE.BoxGeometry(0.95, 0.24, segLen + 0.16);
  disposables.push(wallGeo, capGeo);

  const ySurf = M1_SURFACE_ELEVATION_M;
  for (let distM = 216; distM < M1_TUNNEL_PORTAL_M; distM += segLen) {
    const s = alignment.sample(distM);
    const wallTopY = ySurf + 0.72;
    const wallCenterY = wallTopY - 2.7;

    [-7.8, 3.45].forEach((latX) => {
      const w = new THREE.Mesh(wallGeo, mats.concrete);
      w.position.set(s.x + latX, wallCenterY, s.z);
      const cap = new THREE.Mesh(capGeo, mats.darkConcrete);
      cap.position.set(s.x + latX, wallTopY + 0.12, s.z);
      root.add(w, cap);
    });
  }
}

function addConcreteTunnelPortal(
  root: THREE.Group,
  alignment: TrackAlignment,
  mats: IDepotMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const frame = alignment.sample(M1_TUNNEL_PORTAL_M);
  const portal = new THREE.Group();
  portal.position.set(frame.x, frame.y, frame.z);
  portal.rotation.set(0, frame.yaw, 0);

  // Heavy reinforced concrete headwall with central pier dividing the two tracks
  const leftPierGeo = new THREE.BoxGeometry(2.8, 7.8, 2.2);
  const rightPierGeo = new THREE.BoxGeometry(2.8, 7.8, 2.2);
  const centerPierGeo = new THREE.BoxGeometry(0.75, 5.6, 2.1);
  const lintelGeo = new THREE.BoxGeometry(17.8, 2.8, 2.6);
  const corniceGeo = new THREE.BoxGeometry(18.6, 0.45, 3.0);
  const wingGeo = new THREE.BoxGeometry(0.9, 6.2, 10.5);
  const chevronGeo = new THREE.BoxGeometry(0.32, 2.4, 0.14);
  const signGeo = new THREE.BoxGeometry(6.8, 1.35, 0.18);
  const lightGeo = new THREE.BoxGeometry(1.1, 0.24, 0.42);
  disposables.push(
    leftPierGeo,
    rightPierGeo,
    centerPierGeo,
    lintelGeo,
    corniceGeo,
    wingGeo,
    chevronGeo,
    signGeo,
    lightGeo,
  );

  const leftPier = new THREE.Mesh(leftPierGeo, mats.concrete);
  leftPier.position.set(-9.1, 3.8, 0);
  const rightPier = new THREE.Mesh(rightPierGeo, mats.concrete);
  rightPier.position.set(4.7, 3.8, 0);
  const centerPier = new THREE.Mesh(centerPierGeo, mats.portalArch);
  centerPier.position.set(-2.2, 2.75, 0);
  const lintel = new THREE.Mesh(lintelGeo, mats.portalArch);
  lintel.position.set(-2.2, 6.55, 0);
  const cornice = new THREE.Mesh(corniceGeo, mats.darkConcrete);
  cornice.position.set(-2.2, 8.02, 0.15);

  const wingL = new THREE.Mesh(wingGeo, mats.concrete);
  wingL.position.set(-9.8, 3.2, 5.6);
  wingL.rotation.y = -0.22;
  const wingR = new THREE.Mesh(wingGeo, mats.concrete);
  wingR.position.set(5.4, 3.2, 5.6);
  wingR.rotation.y = 0.22;

  // High-visibility safety markers flanking the player track mouth
  const markerL = new THREE.Mesh(chevronGeo, mats.redBuffer);
  markerL.position.set(-2.2, 2.2, 1.12);
  const markerR = new THREE.Mesh(chevronGeo, mats.redBuffer);
  markerR.position.set(3.38, 2.2, 1.12);
  const markerStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.65, 0.16), mats.whiteStripe);
  markerStripeL.position.set(-2.2, 2.2, 1.14);
  const markerStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.65, 0.16), mats.whiteStripe);
  markerStripeR.position.set(3.38, 2.2, 1.14);
  disposables.push(markerStripeL.geometry, markerStripeR.geometry);

  // Illuminated concrete plaque above the tunnel portal
  const sign = new THREE.Mesh(signGeo, mats.portalSign);
  sign.position.set(-2.2, 6.55, 1.38);

  // Portal entrance floodlights above each track opening
  const lampPlayer = new THREE.Mesh(lightGeo, mats.mastLamp);
  lampPlayer.position.set(0, 5.26, 1.25);
  const lampOpp = new THREE.Mesh(lightGeo, mats.mastLamp);
  lampOpp.position.set(-4.4, 5.26, 1.25);

  portal.add(
    leftPier,
    rightPier,
    centerPier,
    lintel,
    cornice,
    wingL,
    wingR,
    markerL,
    markerR,
    markerStripeL,
    markerStripeR,
    sign,
    lampPlayer,
    lampOpp,
  );
  root.add(portal);
}
