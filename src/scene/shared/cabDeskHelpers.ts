import * as THREE from 'three';
import type { IDisposableResource } from './baseTrainConsist';

export function createLcdScreenMaterial(
  tex: THREE.CanvasTexture,
  emissiveIntensity: number,
  roughness: number,
  metalness = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: 0xffffff,
    emissiveIntensity,
    roughness,
    metalness,
  });
}

export interface IAngledDisplaySpec {
  readonly screenGeo: THREE.PlaneGeometry;
  readonly bezelGeo: THREE.BoxGeometry;
  readonly screenMat: THREE.MeshStandardMaterial;
  readonly bezelMat: THREE.MeshStandardMaterial;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly pitchRad: number;
  readonly yawRad: number;
  readonly screenOffsetZ: number;
}

export function createAngledDisplayUnit(spec: IAngledDisplaySpec): THREE.Group {
  const unit = new THREE.Group();
  unit.position.set(spec.x, spec.y, spec.z);
  unit.rotation.set(spec.pitchRad, spec.yawRad, 0);
  const bezel = new THREE.Mesh(spec.bezelGeo, spec.bezelMat);
  const screen = new THREE.Mesh(spec.screenGeo, spec.screenMat);
  screen.position.set(0, 0, spec.screenOffsetZ);
  unit.add(bezel, screen);
  return unit;
}

export interface ISingleWiperSpec {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly parkRad: number;
  readonly armWidth: number;
  readonly armLength: number;
  readonly bladeWidth: number;
  readonly bladeLength: number;
  readonly armColor: number;
}

export function addSingleCabWiper(
  group: THREE.Group,
  spec: ISingleWiperSpec,
  disposables: IDisposableResource[],
): THREE.Group {
  const wiperMat = new THREE.MeshStandardMaterial({ color: spec.armColor, roughness: 0.75, metalness: 0.36 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.1 });
  const pivot = new THREE.Group();
  pivot.name = spec.name;
  pivot.position.set(spec.x, spec.y, spec.z);
  const armGeo = new THREE.BoxGeometry(spec.armWidth, spec.armLength, 0.015);
  const arm = new THREE.Mesh(armGeo, wiperMat);
  arm.position.set(0, spec.armLength * 0.5, 0);
  const bladeGeo = new THREE.BoxGeometry(spec.bladeWidth, spec.bladeLength, 0.017);
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, spec.armLength - 0.04, -0.008);
  pivot.add(arm, blade);
  pivot.rotation.z = spec.parkRad;
  group.add(pivot);
  disposables.push(wiperMat, bladeMat, armGeo, bladeGeo);
  return pivot;
}
