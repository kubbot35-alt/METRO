import * as THREE from 'three';
import { M1_SURFACE_ELEVATION_M, M1_TUNNEL_PORTAL_M, type TrackAlignment } from '../../domain/trackAlignment';
import type { IDepotMaterials } from './depotMaterials';

export function addTreesAndHorizonBlocks(root: THREE.Group, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  addDepotForest(root, ySurf, mats, disposables);
  const blockGeo = new THREE.BoxGeometry(22, 24, 14);
  const winBandGeo = new THREE.BoxGeometry(22.2, 1.1, 14.2);
  disposables.push(blockGeo, winBandGeo);
  ([[-58, -375, 1.15], [-22, -395, 0.95], [18, -388, 1.25], [56, -370, 1.0], [48, -210, 0.88], [54, -120, 0.92]] as ReadonlyArray<[number, number, number]>).forEach(([bx, bz, sc]) => {
    const bGroup = new THREE.Group(); bGroup.position.set(bx, ySurf, bz);
    const b = new THREE.Mesh(blockGeo, mats.cityBlock); b.scale.set(1, sc, 1); b.position.y = 12 * sc;
    bGroup.add(b);
    [5, 10, 15, 20].forEach((wy) => { const w = new THREE.Mesh(winBandGeo, mats.hangarWindow); w.position.y = wy * sc; bGroup.add(w); });
    root.add(bGroup);
  });
}

function populateForestInstances(
  trunks: THREE.InstancedMesh, crownsA: THREE.InstancedMesh, crownsB: THREE.InstancedMesh, ySurf: number, treeCount: number,
): void {
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < treeCount; i += 1) {
    const lateral = (i % 2 === 0 ? 1 : -1) * (i % 2 === 0 ? 20 + ((i * 19) % 36) : 26 + ((i * 23) % 36));
    const z = -15 - i * 8.2;
    const scale = 0.85 + ((i * 11) % 7) * 0.06;
    const baseY = z < -298 ? ySurf + 3.0 : ySurf;
    dummy.scale.setScalar(scale);
    dummy.rotation.set(0, (i * 0.7) % Math.PI, 0);
    dummy.position.set(lateral, baseY + 1.4 * scale, z); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(lateral, baseY + 4.4 * scale, z); dummy.updateMatrix(); crownsA.setMatrixAt(i, dummy.matrix);
    dummy.position.set(lateral, baseY + 6.9 * scale, z); dummy.updateMatrix(); crownsB.setMatrixAt(i, dummy.matrix);
    const shade = 0.85 + ((i * 13) % 5) * 0.08;
    color.setRGB(0.18 * shade, 0.36 * shade, 0.19 * shade);
    crownsA.setColorAt(i, color); crownsB.setColorAt(i, color);
  }
}

function addDepotForest(root: THREE.Group, ySurf: number, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 2.8, 7);
  const crownGeo = new THREE.ConeGeometry(2.1, 5.8, 7);
  const crownTopGeo = new THREE.ConeGeometry(1.5, 4.2, 7);
  disposables.push(trunkGeo, crownGeo, crownTopGeo);
  const treeCount = 46;
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, treeCount);
  const crownsA = new THREE.InstancedMesh(crownGeo, mats.foliage, treeCount);
  const crownsB = new THREE.InstancedMesh(crownTopGeo, mats.foliage, treeCount);
  populateForestInstances(trunks, crownsA, crownsB, ySurf, treeCount);
  [trunks, crownsA, crownsB].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.frustumCulled = false;
    root.add(inst);
  });
}

export function addDescentRetainingWalls(root: THREE.Group, alignment: TrackAlignment, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const segLen = 8;
  const wallGeo = new THREE.BoxGeometry(0.65, 5.4, segLen + 0.12);
  const capGeo = new THREE.BoxGeometry(0.95, 0.24, segLen + 0.16);
  disposables.push(wallGeo, capGeo);
  const wallTopY = M1_SURFACE_ELEVATION_M + 0.72;
  for (let distM = 216; distM < M1_TUNNEL_PORTAL_M; distM += segLen) {
    const s = alignment.sample(distM);
    [-7.8, 3.45].forEach((latX) => {
      const w = new THREE.Mesh(wallGeo, mats.concrete); w.position.set(s.x + latX, wallTopY - 2.7, s.z);
      const cap = new THREE.Mesh(capGeo, mats.darkConcrete); cap.position.set(s.x + latX, wallTopY + 0.12, s.z);
      root.add(w, cap);
    });
  }
}

export function addConcreteTunnelPortal(root: THREE.Group, alignment: TrackAlignment, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const frame = alignment.sample(M1_TUNNEL_PORTAL_M);
  const portal = new THREE.Group();
  portal.position.set(frame.x, frame.y, frame.z);
  portal.rotation.set(0, frame.yaw, 0);
  attachPortalWallsAndWings(portal, mats, disposables);
  attachPortalMarkersAndSign(portal, mats, disposables);
  root.add(portal);
}

function attachPortalWallsAndWings(portal: THREE.Group, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const pierGeo = new THREE.BoxGeometry(2.8, 7.8, 2.2);
  const centerPierGeo = new THREE.BoxGeometry(0.75, 5.6, 2.1);
  const lintelGeo = new THREE.BoxGeometry(17.8, 2.8, 2.6);
  const corniceGeo = new THREE.BoxGeometry(18.6, 0.45, 3.0);
  const wingGeo = new THREE.BoxGeometry(0.9, 6.2, 10.5);
  disposables.push(pierGeo, centerPierGeo, lintelGeo, corniceGeo, wingGeo);
  const leftPier = new THREE.Mesh(pierGeo, mats.concrete); leftPier.position.set(-9.1, 3.8, 0);
  const rightPier = new THREE.Mesh(pierGeo, mats.concrete); rightPier.position.set(4.7, 3.8, 0);
  const centerPier = new THREE.Mesh(centerPierGeo, mats.portalArch); centerPier.position.set(-2.2, 2.75, 0);
  const lintel = new THREE.Mesh(lintelGeo, mats.portalArch); lintel.position.set(-2.2, 6.55, 0);
  const cornice = new THREE.Mesh(corniceGeo, mats.darkConcrete); cornice.position.set(-2.2, 8.02, 0.15);
  const wingL = new THREE.Mesh(wingGeo, mats.concrete); wingL.position.set(-9.8, 3.2, 5.6); wingL.rotation.y = -0.22;
  const wingR = new THREE.Mesh(wingGeo, mats.concrete); wingR.position.set(5.4, 3.2, 5.6); wingR.rotation.y = 0.22;
  portal.add(leftPier, rightPier, centerPier, lintel, cornice, wingL, wingR);
}

function attachPortalMarkersAndSign(portal: THREE.Group, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const chevronGeo = new THREE.BoxGeometry(0.32, 2.4, 0.14);
  const stripeGeo = new THREE.BoxGeometry(0.34, 0.65, 0.16);
  const signGeo = new THREE.BoxGeometry(6.8, 1.35, 0.18);
  const lightGeo = new THREE.BoxGeometry(1.1, 0.24, 0.42);
  disposables.push(chevronGeo, stripeGeo, signGeo, lightGeo);
  const markerL = new THREE.Mesh(chevronGeo, mats.redBuffer); markerL.position.set(-2.2, 2.2, 1.12);
  const markerR = new THREE.Mesh(chevronGeo, mats.redBuffer); markerR.position.set(3.38, 2.2, 1.12);
  const markerStripeL = new THREE.Mesh(stripeGeo, mats.whiteStripe); markerStripeL.position.set(-2.2, 2.2, 1.14);
  const markerStripeR = new THREE.Mesh(stripeGeo, mats.whiteStripe); markerStripeR.position.set(3.38, 2.2, 1.14);
  const sign = new THREE.Mesh(signGeo, mats.portalSign); sign.position.set(-2.2, 6.55, 1.38);
  const lampPlayer = new THREE.Mesh(lightGeo, mats.mastLamp); lampPlayer.position.set(0, 5.26, 1.25);
  const lampOpp = new THREE.Mesh(lightGeo, mats.mastLamp); lampOpp.position.set(-4.4, 5.26, 1.25);
  portal.add(markerL, markerR, markerStripeL, markerStripeR, sign, lampPlayer, lampOpp);
}
