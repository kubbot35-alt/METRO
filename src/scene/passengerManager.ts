import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { ISimulationSnapshot, IStationSpec } from '../domain/types';
import { syncStationCrowds } from './passengers/passengerCrowdUpdater';
import { createPassengerAssets, createStationCrowd } from './passengers/passengerMeshFactory';

export interface IPassengerRig {
  sync(snapshot: ISimulationSnapshot, dtSec: number, densityMultiplier?: number): void;
  dispose(): void;
}

export function buildStationPassengers(scene: THREE.Scene, alignment: TrackAlignment, stations: readonly IStationSpec[]): IPassengerRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'StationPassengersGroup';
  scene.add(root);
  const shared = createPassengerAssets(disposables);
  const crowds = stations.map((station, idx) => createStationCrowd(root, alignment, station, idx, shared));
  let walkClock = 0;

  return {
    sync: (snapshot, dtSec, densityMultiplier = 1) => {
      walkClock += dtSec;
      syncStationCrowds(crowds, snapshot, walkClock, dtSec, densityMultiplier);
    },
    dispose: () => {
      scene.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}
