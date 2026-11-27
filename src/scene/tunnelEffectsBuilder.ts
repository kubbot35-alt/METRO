import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { GraphicsQualityId, ISimulationSnapshot } from '../domain/types';

export interface ITunnelEffectsRig {
  setQuality(quality: GraphicsQualityId): void;
  update(snapshot: ISimulationSnapshot, alignment: TrackAlignment, dtSec: number): void;
  dispose(): void;
}

const MAX_SPARK_PARTICLES = 48;
const _tmpOrigin = new THREE.Vector3();

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

function createSparkDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    grad.addColorStop(0.3, 'rgba(186,230,253,0.95)');
    grad.addColorStop(0.65, 'rgba(56,189,248,0.45)');
    grad.addColorStop(1.0, 'rgba(14,165,233,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createHeadlightBeamMesh(
  geo: THREE.CylinderGeometry,
  mat: THREE.MeshBasicMaterial,
  offsetX: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(offsetX, 1.38, -1.65);
  mesh.renderOrder = 3;
  return mesh;
}

export function buildTunnelEffectsRig(scene: THREE.Scene): ITunnelEffectsRig {
  const disposables: Array<{ dispose(): void }> = [];

  const beamGroup = new THREE.Group();
  beamGroup.name = 'VolumetricHeadlightCones';
  beamGroup.rotation.order = 'YXZ';
  scene.add(beamGroup);

  const beamTex = createBeamConeTexture();
  const beamGeo = new THREE.CylinderGeometry(0.16, 2.05, 1, 14, 1, true);
  // Rotate so top (narrow emitter end) starts at local z=0 and wide end extends toward -Z
  beamGeo.translate(0, -0.5, 0);
  beamGeo.rotateX(Math.PI / 2);

  const beamMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    color: 0xeef6ff,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  disposables.push(beamTex, beamGeo, beamMat, coreMat);

  const leftCone = createHeadlightBeamMesh(beamGeo, beamMat, -0.78);
  const rightCone = createHeadlightBeamMesh(beamGeo, beamMat, 0.78);
  const centerCoreCone = createHeadlightBeamMesh(beamGeo, coreMat, 0);
  beamGroup.add(leftCone, rightCone, centerCoreCone);

  // Third-rail electric arc flash light + spark particles
  const sparkLight = new THREE.PointLight(0x93d5ff, 0, 34, 1.45);
  scene.add(sparkLight);

  const arcCoreGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const arcCoreMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const arcCoreMesh = new THREE.Mesh(arcCoreGeo, arcCoreMat);
  arcCoreMesh.visible = false;
  scene.add(arcCoreMesh);
  disposables.push(arcCoreGeo, arcCoreMat);

  const sparkPositions = new Float32Array(MAX_SPARK_PARTICLES * 3);
  const sparkVelocities = new Float32Array(MAX_SPARK_PARTICLES * 3);
  const sparkColors = new Float32Array(MAX_SPARK_PARTICLES * 3);
  const sparkLife = new Float32Array(MAX_SPARK_PARTICLES);
  const sparkMaxLife = new Float32Array(MAX_SPARK_PARTICLES);

  for (let i = 0; i < MAX_SPARK_PARTICLES; i += 1) {
    sparkPositions[i * 3 + 1] = -999;
    sparkLife[i] = 0;
    sparkMaxLife[i] = 0.4;
  }

  const sparkGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(sparkPositions, 3);
  const colAttr = new THREE.BufferAttribute(sparkColors, 3);
  sparkGeo.setAttribute('position', posAttr);
  sparkGeo.setAttribute('color', colAttr);

  const sparkTex = createSparkDotTexture();
  const sparkMat = new THREE.PointsMaterial({
    size: 0.24,
    map: sparkTex,
    transparent: true,
    opacity: 0.95,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  sparkPoints.frustumCulled = false;
  sparkPoints.renderOrder = 4;
  scene.add(sparkPoints);
  disposables.push(sparkGeo, sparkTex, sparkMat);

  let quality: GraphicsQualityId = 'high';
  let lastSparkEventId = 0;
  let activeParticleBudget = MAX_SPARK_PARTICLES;
  let sparkCursor = 0;
  let burstFlashClock = 0;

  const spawnSparkBurst = (
    snapshot: ISimulationSnapshot,
    alignment: TrackAlignment,
  ): void => {
    const posM = snapshot.kinematics.positionM;
    const sideSign = snapshot.lightingEffects.sparkSide === 'left' ? -1 : 1;
    const bogieOffsetM = snapshot.cameraMode === 'interior' ? -10.5 : -2.6;
    const origin = alignment.toWorldPoint(posM + bogieOffsetM, sideSign * 1.42, 0.52, false);
    _tmpOrigin.set(origin.x, origin.y, origin.z);

    const frame = alignment.sample(posM);
    const backDirX = Math.sin(frame.yaw);
    const backDirZ = Math.cos(frame.yaw);
    const sideDirX = Math.cos(frame.yaw) * sideSign;
    const sideDirZ = -Math.sin(frame.yaw) * sideSign;
    const speedBack = Math.max(2.5, snapshot.kinematics.speedMs * 0.42);

    const burstCount = quality === 'low' ? 10 : quality === 'medium' ? 20 : 30;
    for (let i = 0; i < burstCount; i += 1) {
      const idx = sparkCursor % activeParticleBudget;
      sparkCursor += 1;
      const i3 = idx * 3;
      const spread = (Math.random() - 0.5) * 0.55;
      sparkPositions[i3] = _tmpOrigin.x + sideDirX * 0.1 + backDirX * spread;
      sparkPositions[i3 + 1] = _tmpOrigin.y + (Math.random() - 0.3) * 0.16;
      sparkPositions[i3 + 2] = _tmpOrigin.z + sideDirZ * 0.1 + backDirZ * spread;

      const outVel = 1.4 + Math.random() * 3.8;
      const backVel = speedBack * (0.45 + Math.random() * 0.75);
      const upVel = 0.8 + Math.random() * 3.1;
      sparkVelocities[i3] = sideDirX * outVel + backDirX * backVel + (Math.random() - 0.5) * 0.9;
      sparkVelocities[i3 + 1] = upVel;
      sparkVelocities[i3 + 2] = sideDirZ * outVel + backDirZ * backVel + (Math.random() - 0.5) * 0.9;

      const hotWhite = Math.random() < 0.45;
      sparkColors[i3] = hotWhite ? 1.0 : 0.62;
      sparkColors[i3 + 1] = hotWhite ? 0.97 : 0.88;
      sparkColors[i3 + 2] = 1.0;

      const life = 0.22 + Math.random() * 0.34;
      sparkLife[idx] = life;
      sparkMaxLife[idx] = life;
    }
    burstFlashClock = 0.14;
  };

  const updateHeadlightCones = (
    snapshot: ISimulationSnapshot,
    alignment: TrackAlignment,
  ): void => {
    const mode = snapshot.headlightMode;
    if (mode === 'off') {
      beamGroup.visible = false;
      return;
    }
    const posM = snapshot.kinematics.positionM;
    const frame = alignment.sample(posM);
    const outdoor = snapshot.trackProfile.outdoorBlend;
    const isRain = snapshot.weather.mode === 'rain';
    const isDarkOutdoor = snapshot.timeOfDay.id !== 'rush';
    const atmosphericFactor = Math.max(
      1 - outdoor,
      isRain ? 0.72 : isDarkOutdoor ? 0.68 : 0.16,
    );

    const isHigh = mode === 'high';
    const lengthM = isHigh ? 54 : 28;
    const widthScale = isHigh ? 1.32 : 0.88;
    const baseOpacity = (isHigh ? 0.22 : 0.13) * atmosphericFactor;
    const qualityOpacity = quality === 'low' ? 0.78 : quality === 'medium' ? 0.92 : 1.0;

    const beamColor =
      snapshot.trainModel.id === 'seria81'
        ? 0xffe5a3
        : snapshot.trainModel.id === 'varsovia'
          ? 0xe0f8ff
          : 0xeff6ff;
    beamMat.color.setHex(beamColor);
    beamMat.opacity = baseOpacity * qualityOpacity;
    coreMat.color.setHex(0xffffff);
    coreMat.opacity = baseOpacity * (isHigh ? 0.65 : 0.38) * qualityOpacity;

    const cabForwardShift = snapshot.cameraMode === 'cab' ? -1.4 : 0;
    beamGroup.visible = baseOpacity > 0.015;
    beamGroup.position.set(frame.x, frame.y, frame.z);
    beamGroup.rotation.set(frame.pitch - 0.032, frame.yaw, 0);

    leftCone.visible = quality !== 'low';
    rightCone.visible = quality !== 'low';
    centerCoreCone.visible = quality === 'low' || quality === 'high';

    leftCone.position.set(-0.78, 1.38, -1.65 + cabForwardShift);
    rightCone.position.set(0.78, 1.38, -1.65 + cabForwardShift);
    centerCoreCone.position.set(0, 1.34, -1.65 + cabForwardShift);

    leftCone.scale.set(widthScale, widthScale * 0.82, lengthM);
    rightCone.scale.set(widthScale, widthScale * 0.82, lengthM);
    centerCoreCone.scale.set(
      quality === 'low' ? widthScale * 1.4 : widthScale * 0.72,
      quality === 'low' ? widthScale * 0.95 : widthScale * 0.58,
      lengthM * (isHigh ? 1.08 : 0.96),
    );
  };

  const updateSparkParticles = (
    snapshot: ISimulationSnapshot,
    alignment: TrackAlignment,
    dtSec: number,
  ): void => {
    const dt = Math.max(0, Math.min(dtSec, 0.08));
    const fx = snapshot.lightingEffects;

    if (fx.sparkEventId !== lastSparkEventId) {
      lastSparkEventId = fx.sparkEventId;
      if (fx.sparkEventId > 0) {
        spawnSparkBurst(snapshot, alignment);
      }
    }

    burstFlashClock = Math.max(0, burstFlashClock - dt);
    const flicker = 0.72 + Math.sin(performance.now() * 0.09) * 0.28;
    const flashStrength = Math.max(fx.sparkIntensity, burstFlashClock > 0 ? 0.85 : 0);
    if (flashStrength > 0.04) {
      const sideSign = fx.sparkSide === 'left' ? -1 : 1;
      const anchorOffsetM = snapshot.cameraMode === 'cab' ? 2.4 : -2.6;
      const flashPt = alignment.toWorldPoint(
        snapshot.kinematics.positionM + anchorOffsetM,
        sideSign * 1.48,
        0.72,
        false,
      );
      sparkLight.position.set(flashPt.x, flashPt.y, flashPt.z);
      sparkLight.intensity = flashStrength * 64 * flicker;
      arcCoreMesh.position.set(flashPt.x, flashPt.y - 0.16, flashPt.z);
      arcCoreMesh.scale.setScalar(0.75 + flashStrength * 1.15);
      arcCoreMat.opacity = Math.min(0.95, flashStrength * flicker);
      arcCoreMesh.visible = snapshot.cameraMode !== 'cab';
    } else {
      sparkLight.intensity = 0;
      arcCoreMesh.visible = false;
    }

    let anyAlive = false;
    for (let i = 0; i < MAX_SPARK_PARTICLES; i += 1) {
      if (sparkLife[i] <= 0) {
        continue;
      }
      sparkLife[i] -= dt;
      const i3 = i * 3;
      if (sparkLife[i] <= 0) {
        sparkPositions[i3 + 1] = -999;
        continue;
      }
      anyAlive = true;
      sparkVelocities[i3 + 1] -= 9.4 * dt;
      sparkPositions[i3] += sparkVelocities[i3] * dt;
      sparkPositions[i3 + 1] = Math.max(0.06, sparkPositions[i3 + 1] + sparkVelocities[i3 + 1] * dt);
      sparkPositions[i3 + 2] += sparkVelocities[i3 + 2] * dt;

      const fade = Math.max(0, sparkLife[i] / Math.max(0.05, sparkMaxLife[i]));
      sparkColors[i3] *= 0.99;
      sparkColors[i3 + 1] = Math.min(1, 0.55 + fade * 0.45);
      sparkColors[i3 + 2] = Math.min(1, 0.72 + fade * 0.28);
    }

    sparkPoints.visible = anyAlive;
    if (anyAlive) {
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  };

  return {
    setQuality: (nextQuality) => {
      quality = nextQuality;
      activeParticleBudget =
        nextQuality === 'low' ? 16 : nextQuality === 'medium' ? 32 : MAX_SPARK_PARTICLES;
      sparkMat.size = nextQuality === 'low' ? 0.2 : 0.25;
    },
    update: (snapshot, alignment, dtSec) => {
      updateHeadlightCones(snapshot, alignment);
      updateSparkParticles(snapshot, alignment, dtSec);
    },
    dispose: () => {
      scene.remove(beamGroup, sparkLight, arcCoreMesh, sparkPoints);
      disposables.forEach((d) => d.dispose());
    },
  };
}
