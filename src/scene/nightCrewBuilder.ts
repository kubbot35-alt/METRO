import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { GraphicsQualityId, INightCrewCheckpoint, ISimulationSnapshot } from '../domain/types';
import { createCrewVisualUnit, createHazardStripeTexture, createSharedCrewAssets, type ICrewVisualUnit } from './nightCrewAssets';

export interface INightCrewRig {
  setQuality(quality: GraphicsQualityId): void;
  sync(snapshot: ISimulationSnapshot, alignment: TrackAlignment, dtSec: number): void;
  dispose(): void;
}

class NightCrewRig implements INightCrewRig {
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly root = new THREE.Group();
  private readonly shared: ReturnType<typeof createSharedCrewAssets>;
  private readonly beaconLight = new THREE.PointLight(0xf97316, 0, 42, 1.35);
  private readonly units: ICrewVisualUnit[] = [];
  private flashClock = 0;
  private quality: GraphicsQualityId = 'high';

  public constructor(private readonly scene: THREE.Scene) {
    this.root.name = 'NightInspectionCrewsGroup';
    this.scene.add(this.root, this.beaconLight);
    this.shared = createSharedCrewAssets(createHazardStripeTexture(), this.disposables);
  }

  public setQuality(quality: GraphicsQualityId): void { this.quality = quality; }

  public sync(snapshot: ISimulationSnapshot, alignment: TrackAlignment, dtSec: number): void {
    this.flashClock += Math.max(0, Math.min(dtSec, 0.1));
    if (!snapshot.nightInspection.active) {
      this.units.forEach((u) => { u.root.visible = false; });
      this.beaconLight.intensity = 0;
      return;
    }
    while (this.units.length < snapshot.nightInspection.checkpoints.length) {
      const unit = createCrewVisualUnit(this.shared, this.disposables);
      unit.root.visible = false;
      this.root.add(unit.root);
      this.units.push(unit);
    }
    const closestCrew = syncCrewUnits(this.units, snapshot, alignment, this.flashClock);
    updateClosestCrewLight(this.beaconLight, closestCrew, alignment, this.flashClock, this.quality);
  }

  public dispose(): void { this.scene.remove(this.root, this.beaconLight); this.disposables.forEach((d) => d.dispose()); }
}

export function buildNightCrewRig(scene: THREE.Scene): INightCrewRig {
  return new NightCrewRig(scene);
}

function syncCrewUnits(
  units: readonly ICrewVisualUnit[],
  snapshot: ISimulationSnapshot,
  alignment: TrackAlignment,
  flashClock: number,
): INightCrewCheckpoint | null {
  let closestDist = Number.POSITIVE_INFINITY;
  let closestCrew: INightCrewCheckpoint | null = null;
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    const crew = snapshot.nightInspection.checkpoints[i];
    if (!crew) { unit.root.visible = false; continue; }
    const deltaM = crew.distanceM - snapshot.kinematics.positionM;
    const visible = deltaM > -65 && deltaM < 260;
    unit.root.visible = visible;
    if (!visible) continue;
    positionCrewUnit(unit, crew, alignment, flashClock);
    if (Math.abs(deltaM) < closestDist && deltaM > -25 && deltaM < 190) {
      closestDist = Math.abs(deltaM);
      closestCrew = crew;
    }
  }
  return closestCrew;
}

function positionCrewUnit(unit: ICrewVisualUnit, crew: INightCrewCheckpoint, alignment: TrackAlignment, flashClock: number): void {
  const frame = alignment.sample(crew.distanceM);
  const sideSign = crew.side === 'left' ? -1 : 1;
  const nearStation = crew.locationKind === 'station';
  const pt = alignment.toWorldPoint(crew.distanceM, nearStation ? sideSign * 2.55 : sideSign * 2.02, nearStation ? 1.08 : 0, false);
  unit.root.position.set(pt.x, pt.y, pt.z);
  unit.root.rotation.set(0, frame.yaw, 0);
  const strobe = Math.sin(flashClock * 11 + crew.id * 1.7) > -0.15 ? 1 : 0.14;
  unit.haloMesh.scale.setScalar(0.85 + strobe * 0.42);
  applyCrewStatusStyle(unit, crew, strobe, flashClock);
}

function applyCrewStatusStyle(unit: ICrewVisualUnit, crew: INightCrewCheckpoint, strobe: number, flashClock: number): void {
  if (crew.status === 'passed_ok') {
    unit.beaconMat.color.setHex(0x34d399);
    unit.beaconMat.emissive.setHex(0x10b981);
    unit.beaconMat.emissiveIntensity = 1.6;
    unit.haloMat.color.setHex(0x34d399);
    unit.haloMat.opacity = 0.28;
    unit.wandPivot.rotation.z = -0.25;
    return;
  }
  const color = crew.status === 'violated' ? 0xef4444 : 0xf97316;
  unit.beaconMat.color.setHex(crew.status === 'violated' ? 0xef4444 : 0xfb923c);
  unit.beaconMat.emissive.setHex(color);
  unit.beaconMat.emissiveIntensity = 0.45 + strobe * 3.6;
  unit.haloMat.color.setHex(color);
  unit.haloMat.opacity = 0.2 + strobe * 0.45;
  unit.wandPivot.rotation.z = crew.status === 'violated' ? Math.sin(flashClock * 9) * 0.45 : Math.sin(flashClock * 6.5 + crew.id) * 0.52;
}

function updateClosestCrewLight(
  beaconLight: THREE.PointLight,
  closestCrew: INightCrewCheckpoint | null,
  alignment: TrackAlignment,
  flashClock: number,
  quality: GraphicsQualityId,
): void {
  if (!closestCrew || quality === 'low') { beaconLight.intensity = 0; return; }
  const strobe = Math.sin(flashClock * 11 + closestCrew.id * 1.7) > -0.15 ? 1 : 0.18;
  const sideSign = closestCrew.side === 'left' ? -1 : 1;
  const lightPt = alignment.toWorldPoint(closestCrew.distanceM - 2.5, sideSign * 1.65, closestCrew.locationKind === 'station' ? 2.55 : 1.75, false);
  beaconLight.position.set(lightPt.x, lightPt.y, lightPt.z);
  beaconLight.color.setHex(closestCrew.status === 'passed_ok' ? 0x10b981 : closestCrew.status === 'violated' ? 0xef4444 : 0xf97316);
  beaconLight.intensity = closestCrew.status === 'passed_ok' ? 14 : 10 + strobe * 38;
}
