import * as THREE from 'three';
import type { TrackAlignment } from '../../domain/trackAlignment';
import type { GraphicsQualityId, ISimulationSnapshot } from '../../domain/types';

export interface IHeadlightConeEffect {
  update(snapshot: ISimulationSnapshot, alignment: TrackAlignment, quality: GraphicsQualityId): void;
  dispose(scene: THREE.Scene): void;
}

export function createHeadlightConeEffect(scene: THREE.Scene): IHeadlightConeEffect {
  const beamGroup = new THREE.Group();
  beamGroup.name = 'VolumetricHeadlightCones';
  beamGroup.rotation.order = 'YXZ';
  scene.add(beamGroup);
  const beamTex = createBeamConeTexture();
  const beamGeo = new THREE.CylinderGeometry(0.16, 2.05, 1, 14, 1, true);
  beamGeo.translate(0, -0.5, 0);
  beamGeo.rotateX(Math.PI / 2);
  const beamMat = createConeMaterial(beamTex, 0xeef6ff, 0.14);
  const coreMat = createConeMaterial(beamTex, 0xffffff, 0.1);
  const leftCone = createHeadlightBeamMesh(beamGeo, beamMat, -0.78);
  const rightCone = createHeadlightBeamMesh(beamGeo, beamMat, 0.78);
  const centerCoreCone = createHeadlightBeamMesh(beamGeo, coreMat, 0);
  beamGroup.add(leftCone, rightCone, centerCoreCone);

  return {
    update: (snapshot, alignment, quality) => updateCones(beamGroup, beamMat, coreMat, leftCone, rightCone, centerCoreCone, snapshot, alignment, quality),
    dispose: (targetScene) => { targetScene.remove(beamGroup); beamTex.dispose(); beamGeo.dispose(); beamMat.dispose(); coreMat.dispose(); },
  };
}

function createConeMaterial(beamTex: THREE.CanvasTexture, color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map: beamTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
}

function createHeadlightBeamMesh(geo: THREE.CylinderGeometry, mat: THREE.MeshBasicMaterial, offsetX: number): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(offsetX, 1.38, -1.65);
  mesh.renderOrder = 3;
  return mesh;
}

function updateCones(
  beamGroup: THREE.Group, beamMat: THREE.MeshBasicMaterial, coreMat: THREE.MeshBasicMaterial,
  leftCone: THREE.Mesh, rightCone: THREE.Mesh, centerCoreCone: THREE.Mesh,
  snapshot: ISimulationSnapshot, alignment: TrackAlignment, quality: GraphicsQualityId,
): void {
  const mode = snapshot.headlightMode;
  if (mode === 'off') { beamGroup.visible = false; return; }
  const frame = alignment.sample(snapshot.kinematics.positionM);
  const outdoor = snapshot.trackProfile.outdoorBlend;
  const atm = Math.max(1 - outdoor, snapshot.weather.mode === 'rain' ? 0.72 : snapshot.timeOfDay.id !== 'rush' ? 0.68 : 0.16);
  const isHigh = mode === 'high';
  const lengthM = isHigh ? 54 : 28;
  const widthScale = isHigh ? 1.32 : 0.88;
  const baseOpacity = (isHigh ? 0.22 : 0.13) * atm;
  const qOpacity = quality === 'low' ? 0.78 : quality === 'medium' ? 0.92 : 1.0;
  beamMat.color.setHex(snapshot.trainModel.id === 'seria81' ? 0xffe5a3 : snapshot.trainModel.id === 'varsovia' ? 0xe0f8ff : 0xeff6ff);
  beamMat.opacity = baseOpacity * qOpacity;
  coreMat.opacity = baseOpacity * (isHigh ? 0.65 : 0.38) * qOpacity;
  positionBeamGroup(beamGroup, leftCone, rightCone, centerCoreCone, frame, baseOpacity, widthScale, lengthM, isHigh, snapshot.cameraMode === 'cab', quality);
}

function positionBeamGroup(
  beamGroup: THREE.Group, leftCone: THREE.Mesh, rightCone: THREE.Mesh, centerCoreCone: THREE.Mesh,
  frame: ReturnType<TrackAlignment['sample']>, baseOpacity: number, widthScale: number,
  lengthM: number, isHigh: boolean, isCab: boolean, quality: GraphicsQualityId,
): void {
  const shift = isCab ? -1.4 : 0;
  beamGroup.visible = baseOpacity > 0.015;
  beamGroup.position.set(frame.x, frame.y, frame.z);
  beamGroup.rotation.set(frame.pitch - 0.032, frame.yaw, 0);
  leftCone.visible = quality !== 'low';
  rightCone.visible = quality !== 'low';
  centerCoreCone.visible = quality === 'low' || quality === 'high';
  leftCone.position.set(-0.78, 1.38, -1.65 + shift);
  rightCone.position.set(0.78, 1.38, -1.65 + shift);
  centerCoreCone.position.set(0, 1.34, -1.65 + shift);
  leftCone.scale.set(widthScale, widthScale * 0.82, lengthM);
  rightCone.scale.set(widthScale, widthScale * 0.82, lengthM);
  centerCoreCone.scale.set(quality === 'low' ? widthScale * 1.4 : widthScale * 0.72, quality === 'low' ? widthScale * 0.95 : widthScale * 0.58, lengthM * (isHigh ? 1.08 : 0.96));
}

function createBeamConeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
    grad.addColorStop(0.08, 'rgba(255,255,255,0.82)');
    grad.addColorStop(0.32, 'rgba(235,246,255,0.44)');
    grad.addColorStop(0.72, 'rgba(210,235,255,0.12)');
    grad.addColorStop(1.0, 'rgba(200,225,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
