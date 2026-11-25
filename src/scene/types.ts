import type { ISimulationSnapshot } from '../domain/types';

export interface ISceneResources {
  dispose(): void;
}

export interface IMetroSceneRenderer {
  mount(container: HTMLElement): void;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  render(): void;
  isSoftwareRenderer(): boolean;
  scheduleNextFrame(callback: () => void): number;
  cancelScheduledFrame(handle: number): void;
  dispose(): void;
}
