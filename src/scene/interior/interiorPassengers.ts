import * as THREE from 'three';
import type { DoorSide, ISimulationSnapshot } from '../../domain/types';
import { INTERIOR_FLOOR_Y } from './interiorMaterials';

export interface IBoardingWalker {
  readonly group: THREE.Group;
  readonly doorZ: number;
  readonly startT: number;
  readonly endT: number;
  readonly phase: number;
}

const COAT_PALETTE = [0x1e3a5f, 0x334155, 0x7c2d12, 0x3f3f46, 0x1e40af, 0x4c1d95];

export function buildSeatedPassengers(root: THREE.Group, disposables: Array<{ dispose(): void }>): readonly THREE.Group[] {
  const legsGeo = new THREE.BoxGeometry(0.28, 0.44, 0.32);
  const torsoGeo = new THREE.CylinderGeometry(0.16, 0.21, 0.62, 7);
  const headGeo = new THREE.SphereGeometry(0.135, 8, 8);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.78 });
  const coatMats = COAT_PALETTE.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 }));
  disposables.push(legsGeo, torsoGeo, headGeo, legsMat, headMat, ...coatMats);
  const seatSlots: ReadonlyArray<[number, number]> = [
    [-1.02, 3.2], [1.02, 4.1], [-1.02, 4.9], [-1.02, 8.4], [1.02, 9.2],
    [-1.02, 10.2], [1.02, 10.6], [-1.02, 14.3], [1.02, 15.2], [-1.02, 16.6],
  ];
  return seatSlots.map(([sx, sz], idx) => {
    const pax = new THREE.Group();
    const legs = new THREE.Mesh(legsGeo, legsMat); legs.position.set(sx < 0 ? 0.14 : -0.14, 0.24, 0);
    const torso = new THREE.Mesh(torsoGeo, coatMats[idx % coatMats.length]); torso.position.set(0, 0.74, 0);
    const head = new THREE.Mesh(headGeo, headMat); head.position.set(0, 1.18, 0);
    pax.add(legs, torso, head);
    pax.position.set(sx, INTERIOR_FLOOR_Y, sz);
    pax.visible = false;
    root.add(pax);
    return pax;
  });
}

export function buildDoorwayWalkers(root: THREE.Group, disposables: Array<{ dispose(): void }>): readonly IBoardingWalker[] {
  const legsGeo = new THREE.BoxGeometry(0.26, 0.72, 0.22);
  const torsoGeo = new THREE.CylinderGeometry(0.17, 0.22, 0.72, 7);
  const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.78 });
  const coatMats = [0x1e40af, 0x7c2d12, 0x334155, 0x4c1d95].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 }));
  disposables.push(legsGeo, torsoGeo, headGeo, legsMat, headMat, ...coatMats);
  const specs = [{ doorZ: 6.4, startT: 0.05, endT: 0.48 }, { doorZ: 6.85, startT: 0.35, endT: 0.82 }, { doorZ: 12.1, startT: 0.15, endT: 0.62 }, { doorZ: 12.55, startT: 0.5, endT: 0.95 }];
  return specs.map((spec, idx) => {
    const g = new THREE.Group();
    const legs = new THREE.Mesh(legsGeo, legsMat); legs.position.y = 0.36;
    const torso = new THREE.Mesh(torsoGeo, coatMats[idx % coatMats.length]); torso.position.y = 1.04;
    const head = new THREE.Mesh(headGeo, headMat); head.position.y = 1.54;
    g.add(legs, torso, head);
    g.visible = false;
    root.add(g);
    return { group: g, doorZ: spec.doorZ, startT: spec.startT, endT: spec.endT, phase: idx * 1.7 };
  });
}

export function syncDoorwayWalkers(walkers: readonly IBoardingWalker[], snapshot: ISimulationSnapshot, walkClock: number, isTechnical: boolean): void {
  const openSide: DoorSide | null = snapshot.openDoorSide;
  const active = !isTechnical && snapshot.doorState === 'open' && openSide !== null && !snapshot.boardingCompletedForCurrent;
  if (!active || !openSide) { walkers.forEach((w) => { w.group.visible = false; }); return; }
  const sideSign = openSide === 'left' ? -1 : 1;
  const progress = snapshot.boardingProgress;
  for (let i = 0; i < walkers.length; i += 1) {
    const w = walkers[i];
    if (progress < w.startT || progress > w.endT) { w.group.visible = false; continue; }
    const t = (progress - w.startT) / Math.max(0.01, w.endT - w.startT);
    const curX = THREE.MathUtils.lerp(sideSign * 1.95, sideSign * 0.22, t);
    const bob = Math.abs(Math.sin(walkClock * 11 + w.phase)) * 0.05;
    w.group.visible = true;
    w.group.position.set(curX, INTERIOR_FLOOR_Y + bob, w.doorZ);
    w.group.rotation.y = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}
