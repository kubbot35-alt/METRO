import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import type {
  GraphicsQualityId,
  INightCrewCheckpoint,
  ISimulationSnapshot,
} from '../domain/types';

export interface INightCrewRig {
  setQuality(quality: GraphicsQualityId): void;
  sync(snapshot: ISimulationSnapshot, alignment: TrackAlignment, dtSec: number): void;
  dispose(): void;
}

interface ICrewVisualUnit {
  readonly root: THREE.Group;
  readonly wandPivot: THREE.Group;
  readonly beaconMat: THREE.MeshStandardMaterial;
  readonly haloMat: THREE.MeshBasicMaterial;
  readonly haloMesh: THREE.Mesh;
}

function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f8fafc';
    for (let x = -64; x < 320; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 22, 0);
      ctx.lineTo(x - 10, 64);
      ctx.lineTo(x - 32, 64);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildNightCrewRig(scene: THREE.Scene): INightCrewRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'NightInspectionCrewsGroup';
  scene.add(root);

  const stripeTex = createHazardStripeTexture();
  const shared = createSharedCrewAssets(stripeTex, disposables);
  const beaconLight = new THREE.PointLight(0xf97316, 0, 42, 1.35);
  scene.add(beaconLight);

  const units: ICrewVisualUnit[] = [];
  let flashClock = 0;
  let quality: GraphicsQualityId = 'high';

  const ensurePoolSize = (needed: number): void => {
    while (units.length < needed) {
      const unit = createCrewVisualUnit(shared, disposables);
      unit.root.visible = false;
      root.add(unit.root);
      units.push(unit);
    }
  };

  return {
    setQuality: (nextQuality) => {
      quality = nextQuality;
    },
    sync: (snapshot, alignment, dtSec) => {
      const dt = Math.max(0, Math.min(dtSec, 0.1));
      flashClock += dt;

      if (!snapshot.nightInspection.active) {
        for (let i = 0; i < units.length; i += 1) {
          units[i].root.visible = false;
        }
        beaconLight.intensity = 0;
        return;
      }

      const crews = snapshot.nightInspection.checkpoints;
      ensurePoolSize(crews.length);

      let closestDist = Number.POSITIVE_INFINITY;
      let closestCrew: INightCrewCheckpoint | null = null;

      for (let i = 0; i < units.length; i += 1) {
        const unit = units[i];
        const crew = crews[i];
        if (!crew) {
          unit.root.visible = false;
          continue;
        }
        const deltaM = crew.distanceM - snapshot.kinematics.positionM;
        const visible = deltaM > -65 && deltaM < 260;
        unit.root.visible = visible;
        if (!visible) {
          continue;
        }

        const frame = alignment.sample(crew.distanceM);
        const sideSign = crew.side === 'left' ? -1 : 1;
        const nearStation = crew.locationKind === 'station';
        const lateralX = nearStation ? sideSign * 2.55 : sideSign * 2.02;
        const baseY = nearStation ? 1.08 : 0.0;
        const worldPt = alignment.toWorldPoint(crew.distanceM, lateralX, baseY, false);
        unit.root.position.set(worldPt.x, worldPt.y, worldPt.z);
        unit.root.rotation.set(0, frame.yaw, 0);

        const strobe = Math.sin(flashClock * 11 + crew.id * 1.7) > -0.15 ? 1 : 0.14;
        if (crew.status === 'passed_ok') {
          unit.beaconMat.color.setHex(0x34d399);
          unit.beaconMat.emissive.setHex(0x10b981);
          unit.beaconMat.emissiveIntensity = 1.6;
          unit.haloMat.color.setHex(0x34d399);
          unit.haloMat.opacity = 0.28;
          unit.wandPivot.rotation.z = -0.25;
        } else if (crew.status === 'violated') {
          unit.beaconMat.color.setHex(0xef4444);
          unit.beaconMat.emissive.setHex(0xef4444);
          unit.beaconMat.emissiveIntensity = 0.5 + strobe * 3.4;
          unit.haloMat.color.setHex(0xef4444);
          unit.haloMat.opacity = 0.25 + strobe * 0.45;
          unit.wandPivot.rotation.z = Math.sin(flashClock * 9) * 0.45;
        } else {
          unit.beaconMat.color.setHex(0xfb923c);
          unit.beaconMat.emissive.setHex(0xf97316);
          unit.beaconMat.emissiveIntensity = 0.45 + strobe * 3.8;
          unit.haloMat.color.setHex(0xf97316);
          unit.haloMat.opacity = 0.18 + strobe * 0.46;
          unit.wandPivot.rotation.z = Math.sin(flashClock * 6.5 + crew.id) * 0.52;
        }
        unit.haloMesh.scale.setScalar(0.85 + strobe * 0.42);

        const absDist = Math.abs(deltaM);
        if (absDist < closestDist && deltaM > -25 && deltaM < 190) {
          closestDist = absDist;
          closestCrew = crew;
        }
      }

      if (closestCrew && quality !== 'low') {
        const strobe = Math.sin(flashClock * 11 + closestCrew.id * 1.7) > -0.15 ? 1 : 0.18;
        const sideSign = closestCrew.side === 'left' ? -1 : 1;
        const lightPt = alignment.toWorldPoint(
          closestCrew.distanceM - 2.5,
          sideSign * 1.65,
          closestCrew.locationKind === 'station' ? 2.55 : 1.75,
          false,
        );
        beaconLight.position.set(lightPt.x, lightPt.y, lightPt.z);
        beaconLight.color.setHex(
          closestCrew.status === 'passed_ok'
            ? 0x10b981
            : closestCrew.status === 'violated'
              ? 0xef4444
              : 0xf97316,
        );
        beaconLight.intensity = closestCrew.status === 'passed_ok' ? 14 : 10 + strobe * 38;
      } else {
        beaconLight.intensity = 0;
      }
    },
    dispose: () => {
      scene.remove(root, beaconLight);
      disposables.forEach((d) => d.dispose());
    },
  };
}

interface ISharedCrewAssets {
  readonly legsGeo: THREE.BoxGeometry;
  readonly torsoGeo: THREE.BoxGeometry;
  readonly vestBandGeo: THREE.BoxGeometry;
  readonly headGeo: THREE.SphereGeometry;
  readonly helmetGeo: THREE.SphereGeometry;
  readonly wandGeo: THREE.CylinderGeometry;
  readonly tripodGeo: THREE.CylinderGeometry;
  readonly barrierGeo: THREE.BoxGeometry;
  readonly beaconGeo: THREE.CylinderGeometry;
  readonly haloGeo: THREE.SphereGeometry;
  readonly pantsMat: THREE.MeshStandardMaterial;
  readonly vestMat: THREE.MeshStandardMaterial;
  readonly reflectiveMat: THREE.MeshStandardMaterial;
  readonly skinMat: THREE.MeshStandardMaterial;
  readonly helmetMat: THREE.MeshStandardMaterial;
  readonly wandMat: THREE.MeshStandardMaterial;
  readonly metalMat: THREE.MeshStandardMaterial;
  readonly barrierMat: THREE.MeshStandardMaterial;
}

function createSharedCrewAssets(
  stripeTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): ISharedCrewAssets {
  const legsGeo = new THREE.BoxGeometry(0.32, 0.78, 0.24);
  const torsoGeo = new THREE.BoxGeometry(0.42, 0.66, 0.26);
  const vestBandGeo = new THREE.BoxGeometry(0.445, 0.08, 0.285);
  const headGeo = new THREE.SphereGeometry(0.145, 8, 8);
  const helmetGeo = new THREE.SphereGeometry(0.175, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const wandGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.52, 6);
  const tripodGeo = new THREE.CylinderGeometry(0.04, 0.14, 1.15, 6);
  const barrierGeo = new THREE.BoxGeometry(0.92, 0.24, 0.08);
  const beaconGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.24, 10);
  const haloGeo = new THREE.SphereGeometry(0.42, 10, 10);

  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.08 });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0xd9f99d,
    emissive: 0xa3e635,
    emissiveIntensity: 0.85,
    roughness: 0.45,
  });
  const reflectiveMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 1.9,
    roughness: 0.15,
    metalness: 0.4,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.8 });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const wandMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xf97316,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.7 });
  const barrierMat = new THREE.MeshStandardMaterial({
    map: stripeTex,
    emissiveMap: stripeTex,
    emissive: 0xffedd5,
    emissiveIntensity: 0.55,
    roughness: 0.45,
  });

  disposables.push(
    stripeTex,
    legsGeo,
    torsoGeo,
    vestBandGeo,
    headGeo,
    helmetGeo,
    wandGeo,
    tripodGeo,
    barrierGeo,
    beaconGeo,
    haloGeo,
    pantsMat,
    vestMat,
    reflectiveMat,
    skinMat,
    helmetMat,
    wandMat,
    metalMat,
    barrierMat,
  );

  return {
    legsGeo,
    torsoGeo,
    vestBandGeo,
    headGeo,
    helmetGeo,
    wandGeo,
    tripodGeo,
    barrierGeo,
    beaconGeo,
    haloGeo,
    pantsMat,
    vestMat,
    reflectiveMat,
    skinMat,
    helmetMat,
    wandMat,
    metalMat,
    barrierMat,
  };
}

function buildWorkerMesh(assets: ISharedCrewAssets, withWand: boolean): {
  readonly group: THREE.Group;
  readonly wandPivot: THREE.Group;
} {
  const group = new THREE.Group();
  const legs = new THREE.Mesh(assets.legsGeo, assets.pantsMat);
  legs.position.y = 0.39;
  const torso = new THREE.Mesh(assets.torsoGeo, assets.vestMat);
  torso.position.y = 1.1;
  const bandA = new THREE.Mesh(assets.vestBandGeo, assets.reflectiveMat);
  bandA.position.y = 0.96;
  const bandB = new THREE.Mesh(assets.vestBandGeo, assets.reflectiveMat);
  bandB.position.y = 1.2;
  const head = new THREE.Mesh(assets.headGeo, assets.skinMat);
  head.position.y = 1.58;
  const helmet = new THREE.Mesh(assets.helmetGeo, assets.helmetMat);
  helmet.position.y = 1.62;
  group.add(legs, torso, bandA, bandB, head, helmet);

  const wandPivot = new THREE.Group();
  wandPivot.position.set(0.24, 1.32, 0.08);
  if (withWand) {
    const wand = new THREE.Mesh(assets.wandGeo, assets.wandMat);
    wand.position.y = 0.26;
    wandPivot.add(wand);
  }
  group.add(wandPivot);
  return { group, wandPivot };
}

function createCrewVisualUnit(
  assets: ISharedCrewAssets,
  disposables: Array<{ dispose(): void }>,
): ICrewVisualUnit {
  const root = new THREE.Group();

  // Lead safety worker holding glowing orange signal wand
  const workerA = buildWorkerMesh(assets, true);
  workerA.group.position.set(0, 0, 1.2);
  const workerB = buildWorkerMesh(assets, false);
  workerB.group.position.set(0.22, 0, -1.6);
  workerB.group.rotation.y = 0.45;
  root.add(workerA.group, workerB.group);

  // Advance hazard barrier + flashing orange warning beacon (5m ahead toward approaching train)
  const tripod = new THREE.Mesh(assets.tripodGeo, assets.metalMat);
  tripod.position.set(-0.18, 0.575, 4.6);
  const barrier = new THREE.Mesh(assets.barrierGeo, assets.barrierMat);
  barrier.position.set(-0.18, 0.72, 4.72);
  root.add(tripod, barrier);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xf97316,
    emissiveIntensity: 3.4,
    roughness: 0.2,
  });
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  disposables.push(beaconMat, haloMat);

  const beaconDome = new THREE.Mesh(assets.beaconGeo, beaconMat);
  beaconDome.position.set(-0.18, 1.26, 4.6);
  const haloMesh = new THREE.Mesh(assets.haloGeo, haloMat);
  haloMesh.position.set(-0.18, 1.28, 4.6);

  const rearBeacon = new THREE.Mesh(assets.beaconGeo, beaconMat);
  rearBeacon.position.set(0.1, 0.14, -3.2);
  root.add(beaconDome, haloMesh, rearBeacon);

  return {
    root,
    wandPivot: workerA.wandPivot,
    beaconMat,
    haloMat,
    haloMesh,
  };
}
