import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { ITrackworkZone } from '../domain/types';
import { createTrackworkSharedAssets, createTrackworkSlot, type ITrackworkSlot } from './trackworkAssets';

export interface ITrackworkRig {
  sync(zones: readonly ITrackworkZone[], alignment: TrackAlignment, dtSec: number): void;
  dispose(): void;
}

const MAX_SLOTS = 3;

class TrackworkRig implements ITrackworkRig {
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly root = new THREE.Group();
  private readonly slots: ITrackworkSlot[] = [];
  private flashClock = 0;

  public constructor(private readonly scene: THREE.Scene, maxAnisotropy: number) {
    this.root.name = 'TunnelTrackworkGroup';
    this.scene.add(this.root);
    const assets = createTrackworkSharedAssets(maxAnisotropy, this.disposables);
    for (let i = 0; i < MAX_SLOTS; i += 1) this.slots.push(createTrackworkSlot(this.root, assets, this.disposables));
  }

  public sync(zones: readonly ITrackworkZone[], alignment: TrackAlignment, dtSec: number): void {
    this.flashClock += dtSec;
    const blinkOn = Math.sin(this.flashClock * 13) > 0;
    for (let i = 0; i < this.slots.length; i += 1) this.syncSlot(this.slots[i], zones[i], alignment, blinkOn);
  }

  public dispose(): void { this.scene.remove(this.root); this.disposables.forEach((d) => d.dispose()); }

  private syncSlot(slot: ITrackworkSlot, zone: ITrackworkZone | undefined, alignment: TrackAlignment, blinkOn: boolean): void {
    if (!zone) { slot.startGroup.visible = false; slot.endGroup.visible = false; return; }
    slot.startGroup.visible = true;
    slot.endGroup.visible = true;
    placeGroupAlongTrack(slot.startGroup, zone.startM - 12, alignment);
    placeGroupAlongTrack(slot.endGroup, zone.endM, alignment);
    slot.beaconMat.emissiveIntensity = blinkOn ? 5.2 : 0.25;
    slot.haloMat.opacity = blinkOn ? 0.92 : 0.1;
  }
}

function placeGroupAlongTrack(group: THREE.Group, distM: number, alignment: TrackAlignment): void {
  const frame = alignment.sample(distM);
  const pt = alignment.toWorldPoint(distM, -2.05, 0, false);
  group.position.set(pt.x, pt.y, pt.z);
  group.rotation.set(0, frame.yaw, 0);
}

export function buildTrackworkRig(scene: THREE.Scene, maxAnisotropy: number): ITrackworkRig {
  return new TrackworkRig(scene, maxAnisotropy);
}
