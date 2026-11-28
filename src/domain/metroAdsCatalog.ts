import {
  DOOH_ROTATION_INTERVAL_SEC,
  DOOH_SLOT_COUNT,
  isDoohStation,
  type IAdCampaignSpec,
  type IStationAdAssignment,
} from './metroAdsTypes';
import type { IStationSpec } from './types';

export * from './metroAdsTypes';

export const METRO_AD_CAMPAIGNS: readonly IAdCampaignSpec[] = [
  {
    id: 'kocur_coffee', motif: 'coffee',
    badgePl: 'KAWIARNIA PRZY STACJI', badgeEn: 'STATION ESPRESSO BAR',
    titlePl: 'KOCUR COFFEE', titleEn: 'KOCUR COFFEE',
    taglinePl: 'Espresso na poranną zmianę', taglineEn: 'Espresso for the morning shift',
    footerPl: 'Pasaż podziemny • -20% z identyfikatorem Metra', footerEn: 'Underground concourse • -20% with Metro ID',
    bgStartHex: '#2c160c', bgEndHex: '#5c2d16', accentHex: '#f59e0b', textHex: '#fff7ed',
  },
  {
    id: 'metro_kom', motif: 'laptop',
    badgePl: 'TECHNOLOGIA & GAMING', badgeEn: 'TECH & PRO GEAR',
    titlePl: 'METRO-KOM', titleEn: 'METRO-KOM',
    taglinePl: 'Laptopy i sprzęt dla maszynistów', taglineEn: 'Laptops & gear for train drivers',
    footerPl: 'Salony przy A13 Centrum i C11 Świętokrzyska', footerEn: 'Stores at A13 Centrum & C11 Świętokrzyska',
    bgStartHex: '#07132c', bgEndHex: '#0f2854', accentHex: '#22d3ee', textHex: '#ecfeff',
  },
  {
    id: 'warszawa_2026', motif: 'concert',
    badgePl: 'FESTIWAL ŚWIATŁA I DŹWIĘKU', badgeEn: 'LIGHT & SOUND FESTIVAL',
    titlePl: 'WARSZAWA 2026', titleEn: 'WARSAW 2026',
    taglinePl: 'Koncert na Narodowym', taglineEn: 'National Stadium Concert',
    footerPl: 'Dojazd linią M2 • Stacja C14 Stadion Narodowy', footerEn: 'Take Line M2 • Station C14 Stadion Narodowy',
    bgStartHex: '#1f0b3a', bgEndHex: '#4c1d95', accentHex: '#facc15', textHex: '#fef9c3',
  },
  {
    id: 'karta_miejska', motif: 'transit',
    badgePl: 'WARSZAWSKI TRANSPORT PUBLICZNY', badgeEn: 'WARSAW PUBLIC TRANSIT',
    titlePl: 'KARTA MIEJSKA', titleEn: 'CITY CARD',
    taglinePl: 'Jedź szybko, bez korków!', taglineEn: 'Ride fast, skip the traffic!',
    footerPl: 'Metro M1 + M2 • Pociąg co 150 sekund w szczycie', footerEn: 'Metro M1 + M2 • Trains every 150s at peak hours',
    bgStartHex: '#7f1d1d', bgEndHex: '#b91c1c', accentHex: '#fde047', textHex: '#ffffff',
  },
  {
    id: 'pierogarnia_babci', motif: 'pierogi',
    badgePl: 'DOMOWA KUCHNIA WARSZAWSKA', badgeEn: 'TRADITIONAL POLISH DUMPLINGS',
    titlePl: 'PIEROGARNIA U BABCI', titleEn: "GRANDMA'S PIEROGI",
    taglinePl: 'Gorące prosto przy wyjściu', taglineEn: 'Hot right by the station exit',
    footerPl: 'Ręcznie lepione • Wyjście Północne z antresoli', footerEn: 'Handmade daily • North Mezzanine Exit',
    bgStartHex: '#431407', bgEndHex: '#9a3412', accentHex: '#fdba74', textHex: '#fff7ed',
  },
  {
    id: 'szkola_maszynistow', motif: 'academy',
    badgePl: 'REKRUTACJA DO METRA', badgeEn: 'METRO DRIVER ACADEMY',
    titlePl: 'SZKOŁA MASZYNISTÓW', titleEn: 'DRIVER ACADEMY',
    taglinePl: 'Zdobądź rangę Legendy Metra!', taglineEn: 'Earn the Metro Legend rank!',
    footerPl: 'STP Kabaty • Symulatory Inspiro, Varsovia i Seria 81', footerEn: 'STP Kabaty • Inspiro, Varsovia & Series 81 Simulators',
    bgStartHex: '#0b192c', bgEndHex: '#1e3a5f', accentHex: '#fbbf24', textHex: '#f8fafc',
  },
  {
    id: 'energia_rekuperacji', motif: 'eco',
    badgePl: 'ZIELONE METRO WARSZAWSKIE', badgeEn: 'GREEN WARSAW METRO',
    titlePl: 'ENERGIA REKUPERACJI', titleEn: 'REGEN ENERGY',
    taglinePl: 'Jedź Eco, oszczędzaj kWh', taglineEn: 'Drive Eco, save kWh on every stop',
    footerPl: 'Hamowanie elektrodynamiczne zwraca do 35% energii', footerEn: 'Regenerative braking recovers up to 35% of traction power',
    bgStartHex: '#052e16', bgEndHex: '#065f46', accentHex: '#34d399', textHex: '#ecfdf5',
  },
  {
    id: 'kino_tunel', motif: 'cinema',
    badgePl: 'KINO STUDYJNE POD ZIEMIĄ', badgeEn: 'UNDERGROUND ARTHOUSE CINEMA',
    titlePl: 'KINO TUNEL', titleEn: 'TUNEL CINEMA',
    taglinePl: 'Premiera już w piątek', taglineEn: 'Premiere this Friday night',
    footerPl: 'Seanse nocne 21:45 • Pasaż przy stacji Politechnika', footerEn: 'Night screenings 21:45 • Politechnika Concourse',
    bgStartHex: '#090d16', bgEndHex: '#1e1b4b', accentHex: '#f43f5e', textHex: '#ffe4e6',
  },
  {
    id: 'muzea_noca', motif: 'museum',
    badgePl: 'KULTURA W STOLICY', badgeEn: 'CAPITAL CULTURE NIGHT',
    titlePl: 'NOCNE MUZEA WARSZAWY', titleEn: 'WARSAW NIGHT MUSEUMS',
    taglinePl: 'Zobacz stolicę po zmroku', taglineEn: 'Explore the capital after dark',
    footerPl: 'Bezpłatny wstęp w sobotę • Kursuje metro nocne', footerEn: 'Free admission Saturday • Night Metro service active',
    bgStartHex: '#1e1035', bgEndHex: '#3b0764', accentHex: '#e879f9', textHex: '#fdf4ff',
  },
  {
    id: 'bezpieczny_peron', motif: 'safety',
    badgePl: 'KAMPANIA BEZPIECZEŃSTWA SOP', badgeEn: 'PLATFORM SAFETY CAMPAIGN',
    titlePl: 'BEZPIECZNY PERON', titleEn: 'SAFE PLATFORM',
    taglinePl: 'Żółta linia ratuje życie', taglineEn: 'The yellow line saves lives',
    footerPl: 'Zachowaj odstęp od krawędzi peronu do zatrzymania składu', footerEn: 'Stand behind the yellow tactile line until the train stops',
    bgStartHex: '#18181b', bgEndHex: '#27272a', accentHex: '#facc15', textHex: '#fef08a',
  },
];

export function getDoohSlideIndex(
  elapsedSec: number,
  slotOffset: number,
  totalAds: number = METRO_AD_CAMPAIGNS.length,
): number {
  const count = Math.max(1, totalAds);
  const step = Math.floor(Math.max(0, elapsedSec) / DOOH_ROTATION_INTERVAL_SEC);
  return (step + Math.max(0, slotOffset) * 3) % count;
}

export function getStationAdAssignment(
  station: IStationSpec,
  stationIndex: number,
  totalAds: number = METRO_AD_CAMPAIGNS.length,
): IStationAdAssignment {
  const count = Math.max(1, totalAds);
  const seed = Math.abs(stationIndex * 3 + Math.round(station.distanceM * 0.01));
  return {
    bannerIndices: [seed % count, (seed + 1) % count, (seed + 2) % count, (seed + 3) % count],
    citylightIndices: [(seed + 4) % count, (seed + 5) % count, (seed + 6) % count],
    doohSlotIndex: stationIndex % DOOH_SLOT_COUNT,
    hasDoohScreens: isDoohStation(station, stationIndex),
  };
}
