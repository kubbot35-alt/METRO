import { AchievementService } from '../../domain/achievements';
import { CustomLineStorageService } from '../../domain/customLines';
import { DriverProfileService, getRankForXp } from '../../domain/driverProfile';
import { GhostRecordStorageService } from '../../domain/ghostDelta';
import { LeaderboardService } from '../../domain/leaderboard';
import { MetroSimulationEngine } from '../../domain/metroSimulation';
import { SettingsStorageService } from '../../domain/settingsService';
import { isLiveryUnlockedByRank, TrainLiveryStorageService } from '../../domain/trainLiveryCatalog';
import { MetroTrainPhysics } from '../../domain/trainPhysics';
import { MetroScoringRules } from '../../domain/scoringRules';
import type { IMetroSimulation } from '../../domain/types';
import type { IGameServiceBag } from './types';

function hasAutostartParam(): boolean {
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export function createGameServiceBag(): IGameServiceBag {
  return {
    leaderboard: new LeaderboardService(),
    achievements: new AchievementService(),
    settings: new SettingsStorageService(),
    customLines: new CustomLineStorageService(),
    driverProfile: new DriverProfileService(),
    ghostRecords: new GhostRecordStorageService(),
    liveries: new TrainLiveryStorageService(),
  };
}

export function createInitialSimulation(services: IGameServiceBag): IMetroSimulation {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setTimeOfDay('rush');
  const savedLiveries = services.liveries.load();
  const initialRankId = getRankForXp(services.driverProfile.load().xp).id;
  const initialLivery = savedLiveries[sim.getSnapshot().trainModel.id] ?? 'default';
  if (isLiveryUnlockedByRank(initialLivery, initialRankId)) {
    sim.setTrainLivery(initialLivery);
  }
  if (hasAutostartParam()) {
    sim.start();
  }
  return sim;
}
