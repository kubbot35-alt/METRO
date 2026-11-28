import * as THREE from 'three';
import { DEPOT_HALL_BAY_LATERAL_X_M, DEPOT_TURNOUT_END_M, DEPOT_TURNOUT_START_M, evaluateDepotHallLateralX } from '../../domain/depotHallSystem';
import { M1_SURFACE_ELEVATION_M } from '../../domain/trackAlignment';

const RAIL_GAUGE_M = 1.435;

interface IParkedTrainColors {
  readonly body: number;
  readonly stripe: number;
  readonly lower: number;
  readonly roof: number;
}

function createHallSignTexture(title: string, subtitle: string, bgHex: string, accentHex: string, maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = accentHex; ctx.fillRect(0, 0, c.width, 16); ctx.fillRect(0, c.height - 16, c.width, 16);
  ctx.fillStyle = '#f8fafc'; ctx.font = '700 48px "Inter", system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(title, c.width / 2, 86);
  ctx.fillStyle = '#fde047'; ctx.font = '600 32px "JetBrains Mono", monospace';
  ctx.fillText(subtitle, c.width / 2, 146);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso);
  return tex;
}

function addHallShellAndTrusses(root: THREE.Group, surfY: number, maxAniso: number, disposables: Array<{ dispose(): void }>): void {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78, metalness: 0.25 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.35 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, metalness: 0.08 });
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.52, metalness: 0.65 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0xbae6fd, emissiveIntensity: 2.2 });
  const hazardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45, metalness: 0.2 });
  const signTex = createHallSignTexture('STP KABATY · HALA POSTOJOWO-NAPRAWCZA', 'TORY 1–3 · WYJAZD MAX 20 km/h', '#0f172a', '#e11d48', maxAniso);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.4 });
  const floorGeo = new THREE.BoxGeometry(20.5, 0.3, 120);
  const sideWallGeo = new THREE.BoxGeometry(0.45, 8.2, 112);
  const backWallGeo = new THREE.BoxGeometry(17.8, 8.2, 0.5);
  const roofGeo = new THREE.BoxGeometry(18.2, 0.45, 112);
  const lintelGeo = new THREE.BoxGeometry(17.8, 2.3, 0.65);
  const hazardGeo = new THREE.BoxGeometry(17.6, 0.28, 0.72);
  const signGeo = new THREE.PlaneGeometry(13.6, 2.0);
  disposables.push(wallMat, roofMat, floorMat, trussMat, lampMat, hazardMat, signTex, signMat, floorGeo, sideWallGeo, backWallGeo, roofGeo, lintelGeo, hazardGeo, signGeo);

  const hallCenterX = -9.8;
  const hallCenterZ = 122;
  const floor = new THREE.Mesh(floorGeo, floorMat); floor.position.set(hallCenterX + 0.6, surfY - 0.16, hallCenterZ - 4);
  const wallL = new THREE.Mesh(sideWallGeo, wallMat); wallL.position.set(-18.4, surfY + 4.0, hallCenterZ);
  const wallR = new THREE.Mesh(sideWallGeo, wallMat); wallR.position.set(-1.1, surfY + 4.0, hallCenterZ);
  const backW = new THREE.Mesh(backWallGeo, wallMat); backW.position.set(hallCenterX, surfY + 4.0, 178);
  const roof = new THREE.Mesh(roofGeo, roofMat); roof.position.set(hallCenterX, surfY + 8.15, hallCenterZ);
  const lintel = new THREE.Mesh(lintelGeo, roofMat); lintel.position.set(hallCenterX, surfY + 6.95, 66.0);
  const hazard = new THREE.Mesh(hazardGeo, hazardMat); hazard.position.set(hallCenterX, surfY + 5.75, 65.95);
  const sign = new THREE.Mesh(signGeo, signMat); sign.position.set(hallCenterX, surfY + 7.0, 65.62); sign.rotation.y = Math.PI;
  const signIn = new THREE.Mesh(signGeo, signMat); signIn.position.set(hallCenterX, surfY + 7.0, 66.38);
  root.add(floor, wallL, wallR, backW, roof, lintel, hazard, sign, signIn);

  addInstancedTrussesAndLights(root, hallCenterX, surfY, trussMat, lampMat, disposables);
}

function addInstancedTrussesAndLights(
  root: THREE.Group, hallCenterX: number, surfY: number,
  trussMat: THREE.MeshStandardMaterial, lampMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const trussGeo = new THREE.BoxGeometry(17.1, 0.36, 0.34);
  const lampGeo = new THREE.BoxGeometry(0.32, 0.12, 4.4);
  disposables.push(trussGeo, lampGeo);
  const trussCount = 12;
  const trusses = new THREE.InstancedMesh(trussGeo, trussMat, trussCount);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, trussCount * 3);
  const dummy = new THREE.Object3D();
  const bayXs = [DEPOT_HALL_BAY_LATERAL_X_M, -9.8, -14.4];
  let lampIdx = 0;
  for (let i = 0; i < trussCount; i += 1) {
    const z = 70 + i * 9.4;
    dummy.position.set(hallCenterX, surfY + 7.65, z);
    dummy.updateMatrix();
    trusses.setMatrixAt(i, dummy.matrix);
    for (let b = 0; b < bayXs.length; b += 1) {
      dummy.position.set(bayXs[b], surfY + 7.35, z);
      dummy.updateMatrix();
      lamps.setMatrixAt(lampIdx, dummy.matrix);
      lampIdx += 1;
    }
  }
  trusses.computeBoundingSphere();
  lamps.computeBoundingSphere();
  root.add(trusses, lamps);
}

function addHallTracksAndTurnout(root: THREE.Group, surfY: number, disposables: Array<{ dispose(): void }>): void {
  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.34, metalness: 0.84 });
  const pitMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95, metalness: 0.05 });
  const greenLampMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x22c55e, emissiveIntensity: 2.6 });
  const straightRailGeo = new THREE.BoxGeometry(0.08, 0.14, 142);
  const pitGeo = new THREE.BoxGeometry(1.18, 0.06, 102);
  const gateLampGeo = new THREE.SphereGeometry(0.18, 10, 10);
  disposables.push(railMat, pitMat, greenLampMat, straightRailGeo, pitGeo, gateLampGeo);

  const halfG = RAIL_GAUGE_M * 0.5;
  const bayXs = [DEPOT_HALL_BAY_LATERAL_X_M, -9.8, -14.4];
  bayXs.forEach((bx) => {
    const rL = new THREE.Mesh(straightRailGeo, railMat); rL.position.set(bx - halfG, surfY + 0.07, 105);
    const rR = new THREE.Mesh(straightRailGeo, railMat); rR.position.set(bx + halfG, surfY + 0.07, 105);
    const pit = new THREE.Mesh(pitGeo, pitMat); pit.position.set(bx, surfY + 0.01, 122);
    const lamp = new THREE.Mesh(gateLampGeo, greenLampMat); lamp.position.set(bx + 1.55, surfY + 5.2, 65.7);
    root.add(rL, rR, pit, lamp);
  });

  const segGeo = new THREE.BoxGeometry(0.08, 0.14, 2.2);
  disposables.push(segGeo);
  const steps = Math.ceil((DEPOT_TURNOUT_END_M - DEPOT_TURNOUT_START_M) / 2);
  const turnoutRails = new THREE.InstancedMesh(segGeo, railMat, steps * 2);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let i = 0; i < steps; i += 1) {
    const d0 = DEPOT_TURNOUT_START_M + i * 2;
    const d1 = d0 + 2;
    const x0 = evaluateDepotHallLateralX(d0, true);
    const x1 = evaluateDepotHallLateralX(d1, true);
    const midX = (x0 + x1) * 0.5;
    const midZ = -((d0 + d1) * 0.5);
    const yaw = Math.atan2(x1 - x0, -2);
    for (const side of [-1, 1]) {
      dummy.position.set(midX + side * halfG, surfY + 0.07, midZ);
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      turnoutRails.setMatrixAt(idx, dummy.matrix);
      idx += 1;
    }
  }
  turnoutRails.computeBoundingSphere();
  root.add(turnoutRails);
}

function addParkedTrainConsist(
  root: THREE.Group, x: number, startZ: number, surfY: number,
  colors: IParkedTrainColors, disposables: Array<{ dispose(): void }>,
): void {
  const bodyMat = new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.34, metalness: 0.45 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: colors.stripe, roughness: 0.35, metalness: 0.25 });
  const lowerMat = new THREE.MeshStandardMaterial({ color: colors.lower, roughness: 0.45, metalness: 0.32 });
  const roofMat = new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.55, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.82 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 1.5 });
  const carGeo = new THREE.BoxGeometry(2.74, 2.86, 17.8);
  const stripeGeo = new THREE.BoxGeometry(2.78, 0.34, 17.82);
  const lowerGeo = new THREE.BoxGeometry(2.76, 0.72, 17.82);
  const winGeo = new THREE.BoxGeometry(2.8, 0.96, 16.2);
  const hvacGeo = new THREE.BoxGeometry(1.72, 0.32, 3.4);
  const headGeo = new THREE.BoxGeometry(0.42, 0.2, 0.08);
  disposables.push(bodyMat, stripeMat, lowerMat, roofMat, glassMat, headMat, carGeo, stripeGeo, lowerGeo, winGeo, hvacGeo, headGeo);

  for (let c = 0; c < 3; c += 1) {
    const cz = startZ + c * 18.6;
    const body = new THREE.Mesh(carGeo, bodyMat); body.position.set(x, surfY + 1.92, cz);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat); stripe.position.set(x, surfY + 1.72, cz);
    const lower = new THREE.Mesh(lowerGeo, lowerMat); lower.position.set(x, surfY + 0.96, cz);
    const win = new THREE.Mesh(winGeo, glassMat); win.position.set(x, surfY + 2.42, cz);
    const hvac = new THREE.Mesh(hvacGeo, roofMat); hvac.position.set(x, surfY + 3.5, cz);
    root.add(body, stripe, lower, win, hvac);
    if (c === 0) {
      const hL = new THREE.Mesh(headGeo, headMat); hL.position.set(x - 0.85, surfY + 1.35, cz - 8.95);
      const hR = new THREE.Mesh(headGeo, headMat); hR.position.set(x + 0.85, surfY + 1.35, cz - 8.95);
      root.add(hL, hR);
    }
  }
}

export function addStablingHallAndParkedFleet(
  root: THREE.Group,
  maxAniso: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const surfY = M1_SURFACE_ELEVATION_M;
  addHallShellAndTrusses(root, surfY, maxAniso, disposables);
  addHallTracksAndTurnout(root, surfY, disposables);
  // Parked Škoda Varsovia (Bay 2), Siemens Inspiro (Bay 3), and Seria 81 (east yard siding)
  addParkedTrainConsist(root, -9.8, 86, surfY, { body: 0xf1f5f9, stripe: 0xe11d48, lower: 0xfacc15, roof: 0x334155 }, disposables);
  addParkedTrainConsist(root, -14.4, 92, surfY, { body: 0xdbeafe, stripe: 0xdc2626, lower: 0xeab308, roof: 0x475569 }, disposables);
  addParkedTrainConsist(root, 6.4, 72, surfY, { body: 0x1d4ed8, stripe: 0xfacc15, lower: 0xb91c1c, roof: 0x334155 }, disposables);
}
