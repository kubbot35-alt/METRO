import * as THREE from 'three';
import { getDoohSlideIndex, METRO_AD_CAMPAIGNS } from '../domain/metroAdsCatalog';
import { formatClockTime } from '../domain/scheduleSystem';
import type { ISimulationSnapshot, LanguageId, TrainVisualTheme } from '../domain/types';
import type { IAdTexturePool } from './adTexturePool';
import { buildInteriorAdFrames, createOverheadLedDisplay, type IOverheadLedDisplay } from './interior/interiorDisplaysAndAds';
import { applyInteriorThemePalette, createInteriorMaterials, INTERIOR_HALF_W } from './interior/interiorMaterials';
import { buildDoorwayWalkers, buildSeatedPassengers, syncDoorwayWalkers } from './interior/interiorPassengers';
import { animateInteriorDoors, buildSaloonLights, buildSeatsAndHandrails, buildShellAndWindows, buildSlidingDoors } from './interior/interiorShellBuilder';

export interface IPassengerInteriorRig {
  readonly group: THREE.Group;
  update(snapshot: ISimulationSnapshot, dtSec: number, lang?: LanguageId): void;
  dispose(): void;
}

class PassengerInteriorRig implements IPassengerInteriorRig {
  public readonly group = new THREE.Group();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly mats = createInteriorMaterials(this.disposables);
  private readonly led: IOverheadLedDisplay;
  private readonly leftDoors: ReturnType<typeof buildSlidingDoors>;
  private readonly rightDoors: ReturnType<typeof buildSlidingDoors>;
  private readonly interiorLights: readonly THREE.PointLight[];
  private readonly seatedPassengers: readonly THREE.Object3D[];
  private readonly walkers: ReturnType<typeof buildDoorwayWalkers>;
  private appliedTheme: TrainVisualTheme | null = null;
  private leftDoorOpen = 0;
  private rightDoorOpen = 0;
  private walkClock = 0;
  private lastLedKey = '';

  public constructor(private readonly scene: THREE.Scene, maxAnisotropy: number, adPool?: IAdTexturePool) {
    this.group.name = 'PassengerInteriorCar1';
    this.group.rotation.order = 'YXZ';
    this.group.visible = false;
    this.scene.add(this.group);
    this.led = createOverheadLedDisplay(this.group, maxAnisotropy, this.disposables);
    buildShellAndWindows(this.group, this.mats, this.disposables);
    if (adPool) buildInteriorAdFrames(this.group, adPool, this.disposables);
    this.leftDoors = buildSlidingDoors(this.group, -INTERIOR_HALF_W + 0.05, this.mats, this.disposables);
    this.rightDoors = buildSlidingDoors(this.group, INTERIOR_HALF_W - 0.05, this.mats, this.disposables);
    buildSeatsAndHandrails(this.group, this.mats, this.disposables);
    this.interiorLights = buildSaloonLights(this.group);
    this.seatedPassengers = buildSeatedPassengers(this.group, this.disposables);
    this.walkers = buildDoorwayWalkers(this.group, this.disposables);
  }

  public update(snapshot: ISimulationSnapshot, dtSec: number, lang: LanguageId = 'pl'): void {
    this.walkClock += dtSec;
    const theme = snapshot.trainModel.visual.theme;
    this.syncThemeAndDoors(snapshot, theme, dtSec);
    const isTechnical = snapshot.challenge?.skipStations === true;
    const visibleSeated = isTechnical ? 0 : Math.min(this.seatedPassengers.length, Math.floor(snapshot.passengersCarried / 6));
    this.seatedPassengers.forEach((p, idx) => { p.visible = idx < visibleSeated; });
    syncDoorwayWalkers(this.walkers, snapshot, this.walkClock, isTechnical);
    this.lastLedKey = syncOverheadDisplay(this.led, snapshot, lang, isTechnical, theme, this.lastLedKey);
  }

  public dispose(): void { this.scene.remove(this.group); this.led.dispose(); this.disposables.forEach((d) => d.dispose()); }

  private syncThemeAndDoors(snapshot: ISimulationSnapshot, theme: TrainVisualTheme, dtSec: number): void {
    if (this.appliedTheme !== theme) {
      this.appliedTheme = theme;
      applyInteriorThemePalette(this.mats, this.interiorLights, theme);
      this.led.setWidescreenMode(theme === 'varsovia');
    }
    const step = Math.min(1, dtSec * 3.8);
    this.leftDoorOpen += ((snapshot.openDoorSide === 'left' ? 1 : 0) - this.leftDoorOpen) * step;
    this.rightDoorOpen += ((snapshot.openDoorSide === 'right' ? 1 : 0) - this.rightDoorOpen) * step;
    animateInteriorDoors(this.leftDoors, this.leftDoorOpen);
    animateInteriorDoors(this.rightDoors, this.rightDoorOpen);
  }
}

export function buildPassengerInteriorRig(scene: THREE.Scene, maxAnisotropy: number, adPool?: IAdTexturePool): IPassengerInteriorRig {
  return new PassengerInteriorRig(scene, maxAnisotropy, adPool);
}

function formatLedStatus(snapshot: ISimulationSnapshot, lang: LanguageId, isTechnical: boolean): string {
  const isEn = lang === 'en';
  if (isTechnical) return isEn ? 'TECHNICAL RUN' : 'PRZEJAZD TECHNICZNY';
  const stationName = snapshot.currentStation.station.name.toUpperCase();
  return snapshot.doorState === 'open' ? `${isEn ? 'STATION' : 'STACJA'}: ${stationName}` : `${isEn ? 'NEXT' : 'NASTĘPNA'}: ${stationName}`;
}

function syncOverheadDisplay(
  led: IOverheadLedDisplay, snapshot: ISimulationSnapshot, lang: LanguageId, isTechnical: boolean, theme: TrainVisualTheme, lastLedKey: string,
): string {
  const clockStr = formatClockTime(snapshot.schedule.currentClockSec).slice(0, 5);
  const statusText = formatLedStatus(snapshot, lang, isTechnical);
  const adIdx = getDoohSlideIndex(snapshot.elapsedTimeSec, 1, METRO_AD_CAMPAIGNS.length);
  const ad = METRO_AD_CAMPAIGNS[adIdx];
  const adTicker = lang === 'en' ? `${ad.titleEn} • ${ad.taglineEn}` : `${ad.titlePl} • ${ad.taglinePl}`;
  const lineBadge = snapshot.line.badgeCode ?? snapshot.line.id;
  const ledKey = `${theme}|${lineBadge}|${snapshot.line.cssColor}|${statusText}|${clockStr}|${adIdx}|${lang}`;
  if (ledKey !== lastLedKey) led.redraw(lineBadge, snapshot.line.cssColor, statusText, clockStr, theme === 'varsovia', adTicker, ad.accentHex);
  return ledKey;
}
