import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { TimeOfDayId, WeatherModeId } from '../domain/types';
import { createDepotMaterials } from './depot/depotMaterials';
import { addConcreteTunnelPortal, addDescentRetainingWalls, addTreesAndHorizonBlocks } from './depot/depotPortalAndFloraBuilder';
import { createDepotSkyController } from './depot/depotSkyController';
import { addDepotHangarAndGantry, addFloodlightMasts } from './depot/depotStructuresBuilder';
import { addOutdoorTerrainAndEmbankment, addStablingSidingsAndTrains } from './depot/depotYardBuilder';

export interface ISurfaceDepotRig {
  sync(outdoorBlend: number, timeOfDayId: TimeOfDayId, weatherMode: WeatherModeId, cameraPos: THREE.Vector3): void;
  dispose(): void;
}

export function buildSurfaceDepot(scene: THREE.Scene, alignment: TrackAlignment, maxAnisotropy: number): ISurfaceDepotRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'SurfaceDepotStpKabaty';
  scene.add(root);
  if (!alignment.hasSurfaceStart) {
    return { sync: () => {}, dispose: () => { scene.remove(root); } };
  }
  const sky = createDepotSkyController(root, disposables);
  const sharedMats = createDepotMaterials(maxAnisotropy, disposables);
  addOutdoorTerrainAndEmbankment(root, alignment, sharedMats, disposables);
  addStablingSidingsAndTrains(root, sharedMats, disposables);
  addDepotHangarAndGantry(root, sharedMats, disposables);
  addFloodlightMasts(root, sharedMats, disposables);
  addTreesAndHorizonBlocks(root, sharedMats, disposables);
  addDescentRetainingWalls(root, alignment, sharedMats, disposables);
  addConcreteTunnelPortal(root, alignment, sharedMats, disposables);

  return {
    sync: (outdoorBlend, timeOfDayId, weatherMode, cameraPos) => sky.sync(outdoorBlend, timeOfDayId, weatherMode, cameraPos, sharedMats),
    dispose: () => { scene.remove(root); disposables.forEach((d) => d.dispose()); },
  };
}
