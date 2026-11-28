import type { IStationSpec } from './types';

export type AdCampaignId =
  | 'kocur_coffee'
  | 'metro_kom'
  | 'warszawa_2026'
  | 'karta_miejska'
  | 'pierogarnia_babci'
  | 'szkola_maszynistow'
  | 'energia_rekuperacji'
  | 'kino_tunel'
  | 'muzea_noca'
  | 'bezpieczny_peron';

export type AdGraphicMotif =
  | 'coffee'
  | 'laptop'
  | 'concert'
  | 'transit'
  | 'pierogi'
  | 'academy'
  | 'eco'
  | 'cinema'
  | 'museum'
  | 'safety';

export interface IAdCampaignSpec {
  readonly id: AdCampaignId;
  readonly motif: AdGraphicMotif;
  readonly badgePl: string;
  readonly badgeEn: string;
  readonly titlePl: string;
  readonly titleEn: string;
  readonly taglinePl: string;
  readonly taglineEn: string;
  readonly footerPl: string;
  readonly footerEn: string;
  readonly bgStartHex: string;
  readonly bgEndHex: string;
  readonly accentHex: string;
  readonly textHex: string;
}

export interface IStationAdAssignment {
  readonly bannerIndices: readonly number[];
  readonly citylightIndices: readonly number[];
  readonly doohSlotIndex: number;
  readonly hasDoohScreens: boolean;
}

export const DOOH_ROTATION_INTERVAL_SEC = 8.0;
export const DOOH_SLOT_COUNT = 3;

const DOOH_STATION_KEYWORDS: readonly string[] = [
  'centrum', 'świętokrzyska', 'swietokrzyska', 'daszyńskiego', 'daszynskiego',
  'wileński', 'wilenski', 'młociny', 'mlociny', 'politechnika', 'arsenał',
  'arsenal', 'gdański', 'gdanski', 'wilanowska', 'kabaty', 'rondo onz',
  'narodowy', 'kopernik', 'bródno', 'brodno', 'bemowo',
];

export function isDoohStation(station: IStationSpec, stationIndex: number): boolean {
  const lower = station.name.toLowerCase();
  return DOOH_STATION_KEYWORDS.some((kw) => lower.includes(kw)) || stationIndex % 2 === 0;
}
