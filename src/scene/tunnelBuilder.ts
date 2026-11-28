import * as THREE from 'three';
import { DEFAULT_SCENE_CULL_RANGE_M, isSpanWithinCullingRange } from '../domain/routeVariant';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { ISpeedLimitZone, IStationSpec } from '../domain/types';
import { createBallastTexture, createTunnelConcreteTexture } from './proceduralTextures';
import { addChunkedTunnelRibsAndLamps, addCurvedTunnelShells } from './tunnel/tunnelShellAndRibsBuilder';
import { addCurveWarningSigns, addMeterMarkerPlaques, addSpeedLimitSigns } from './tunnel/tunnelSignageBuilder';
import { addChunkedInstancedSleepers, addChunkedTrackBedAndRails } from './tunnel/tunnelTrackBedBuilder';
import type { ISceneResources } from './types';

export interface IMetroTunnelRig extends ISceneResources {
  updateCulling(playerPosM: number, cullRangeM?: number): number;
}

interface ICullableSpan { readonly startM: number; readonly endM: number; readonly object: THREE.Object3D; visible: boolean; }

class MetroTunnelRig implements IMetroTunnelRig {
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly cullables: ICullableSpan[] = [];
  private readonly root = new THREE.Group();

  public constructor(
    private readonly scene: THREE.Scene,
    alignment: TrackAlignment,
    stations: readonly IStationSpec[],
    speedZones: readonly ISpeedLimitZone[],
    maxAnisotropy: number,
  ) {
    this.root.name = 'MetroTunnelGroup';
    this.scene.add(this.root);
    this.populateTunnelChunks(alignment, stations, speedZones, maxAnisotropy);
  }

  public updateCulling(playerPosM: number, cullRangeM = DEFAULT_SCENE_CULL_RANGE_M): number {
    return updateTunnelCulling(this.cullables, playerPosM, cullRangeM);
  }

  public dispose(): void { this.scene.remove(this.root); this.disposables.forEach((item) => item.dispose()); }

  private populateTunnelChunks(
    alignment: TrackAlignment, stations: readonly IStationSpec[], speedZones: readonly ISpeedLimitZone[], maxAnisotropy: number,
  ): void {
    const register = (startM: number, endM: number, object: THREE.Object3D): void => {
      this.cullables.push({ startM, endM, object, visible: true });
    };
    const routeLengthM = (stations[stations.length - 1]?.distanceM ?? 3000) + 270;
    const concreteTex = createTunnelConcreteTexture(maxAnisotropy);
    const ballastTex = createBallastTexture(maxAnisotropy, 1);
    this.disposables.push(concreteTex, ballastTex);
    addChunkedTrackBedAndRails(this.root, alignment, routeLengthM, stations, ballastTex, this.disposables, register);
    addChunkedInstancedSleepers(this.root, alignment, routeLengthM, stations, this.disposables, register);
    addCurvedTunnelShells(this.root, alignment, routeLengthM, stations, concreteTex, this.disposables, register);
    addChunkedTunnelRibsAndLamps(this.root, alignment, routeLengthM, stations, this.disposables, register);
    addSpeedLimitSigns(this.root, alignment, speedZones, maxAnisotropy, this.disposables, register);
    addCurveWarningSigns(this.root, alignment, maxAnisotropy, this.disposables, register);
    addMeterMarkerPlaques(this.root, alignment, routeLengthM, stations, maxAnisotropy, this.disposables, register);
  }
}

export function buildMetroTunnel(
  scene: THREE.Scene, alignment: TrackAlignment, stations: readonly IStationSpec[], speedZones: readonly ISpeedLimitZone[], maxAnisotropy: number,
): IMetroTunnelRig {
  return new MetroTunnelRig(scene, alignment, stations, speedZones, maxAnisotropy);
}

function updateTunnelCulling(cullables: readonly ICullableSpan[], playerPosM: number, cullRangeM: number): number {
  let visibleCount = 0;
  for (let i = 0; i < cullables.length; i += 1) {
    const span = cullables[i];
    const nextVis = isSpanWithinCullingRange(span.startM, span.endM, playerPosM, cullRangeM, 750);
    if (span.visible !== nextVis) { span.visible = nextVis; span.object.visible = nextVis; }
    if (nextVis) visibleCount += 1;
  }
  return visibleCount;
}
