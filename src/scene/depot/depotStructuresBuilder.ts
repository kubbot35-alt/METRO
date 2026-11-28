import * as THREE from 'three';
import { M1_SURFACE_ELEVATION_M } from '../../domain/trackAlignment';
import type { IDepotMaterials } from './depotMaterials';

function addSignalGantry(root: THREE.Group, ySurf: number, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const legGeo = new THREE.BoxGeometry(0.45, 7.8, 0.45);
  const trussGeo = new THREE.BoxGeometry(15.2, 0.72, 0.55);
  disposables.push(legGeo, trussGeo);
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(-2.2, ySurf, -122);
  const legL = new THREE.Mesh(legGeo, mats.steel); legL.position.set(-7.4, 3.9, 0);
  const legR = new THREE.Mesh(legGeo, mats.steel); legR.position.set(7.4, 3.9, 0);
  const truss = new THREE.Mesh(trussGeo, mats.steel); truss.position.set(0, 7.55, 0);
  gantryGroup.add(legL, legR, truss);
  root.add(gantryGroup);
}

export function addDepotHangarAndGantry(root: THREE.Group, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  const hangarGroup = new THREE.Group();
  hangarGroup.position.set(-29, ySurf, -88);
  const mainGeo = new THREE.BoxGeometry(16, 10.5, 118);
  const roofGeo = new THREE.BoxGeometry(16.8, 0.8, 120);
  const windowStripGeo = new THREE.BoxGeometry(0.18, 1.35, 106);
  const signBoardGeo = new THREE.PlaneGeometry(36, 4.2);
  const ventGeo = new THREE.BoxGeometry(5.2, 1.35, 16);
  disposables.push(mainGeo, roofGeo, windowStripGeo, signBoardGeo, ventGeo);
  const main = new THREE.Mesh(mainGeo, mats.hangarWall); main.position.set(0, 5.25, 0);
  const roof = new THREE.Mesh(roofGeo, mats.hangarRoof); roof.position.set(0, 10.8, 0);
  const winStrip = new THREE.Mesh(windowStripGeo, mats.hangarWindow); winStrip.position.set(8.08, 8.65, 0);
  const signBoard = new THREE.Mesh(signBoardGeo, mats.hangarSign); signBoard.rotation.y = Math.PI / 2; signBoard.position.set(8.12, 6.0, 26);
  hangarGroup.add(main, roof, winStrip, signBoard);
  [-38, -12, 14, 40].forEach((vz) => { const vent = new THREE.Mesh(ventGeo, mats.steel); vent.position.set(0, 11.7, vz); hangarGroup.add(vent); });
  root.add(hangarGroup);
  addSignalGantry(root, ySurf, mats, disposables);
}

export function addFloodlightMasts(root: THREE.Group, mats: IDepotMaterials, disposables: Array<{ dispose(): void }>): void {
  const ySurf = M1_SURFACE_ELEVATION_M;
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.22, 13.5, 8);
  const baseGeo = new THREE.BoxGeometry(0.75, 0.6, 0.75);
  const armGeo = new THREE.BoxGeometry(2.2, 0.18, 0.28);
  const lampGeo = new THREE.BoxGeometry(0.55, 0.26, 0.34);
  disposables.push(poleGeo, baseGeo, armGeo, lampGeo);
  const mastCoords: ReadonlyArray<[number, number]> = [[-17.2, -32], [10.2, -32], [-17.2, -96], [10.2, -96], [-17.2, -162], [10.2, -162], [-12.5, -228], [7.8, -228], [-11.8, -284], [7.2, -284]];
  mastCoords.forEach(([mx, mz]) => {
    const mast = new THREE.Group(); mast.position.set(mx, ySurf, mz);
    const base = new THREE.Mesh(baseGeo, mats.concrete); base.position.y = 0.3;
    const pole = new THREE.Mesh(poleGeo, mats.steel); pole.position.y = 6.9;
    const arm = new THREE.Mesh(armGeo, mats.steel); arm.position.set(mx < 0 ? 0.8 : -0.8, 13.5, 0);
    const lampA = new THREE.Mesh(lampGeo, mats.mastLamp); lampA.position.set(mx < 0 ? 1.4 : -1.4, 13.32, -0.18);
    const lampB = new THREE.Mesh(lampGeo, mats.mastLamp); lampB.position.set(mx < 0 ? 1.4 : -1.4, 13.32, 0.18);
    mast.add(base, pole, arm, lampA, lampB);
    root.add(mast);
  });
}
