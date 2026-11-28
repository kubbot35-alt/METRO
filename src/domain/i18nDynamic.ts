import {
  ACADEMY_SUBTASK_EN,
  FEEDBACK_EXACT_EN,
  FEEDBACK_MULTI_RULES,
  FEEDBACK_PREFIX_REPLACEMENTS,
  GAMEPAD_ACTION_EN,
  STOP_SUMMARY_REPLACEMENTS,
} from './i18nFeedbackData';
import type {
  AtoStatus,
  IAnnouncementState,
  IRadioDispatchState,
  LanguageId,
} from './types';

export interface ILocalizedAnnouncement {
  readonly displayText: string;
  readonly spokenText: string;
}

export interface ILocalizedRadio {
  readonly displayText: string;
  readonly spokenText: string;
}

const ATO_EN: Record<AtoStatus, string> = {
  cruising: 'ATO CRUISING',
  'signal-hold': 'ATO SIGNAL HOLD',
  approaching: 'ATO STATION BRAKE',
  boarding: 'ATO BOARDING',
  departing: 'ATO DEPARTING',
  off: 'ATO OFF',
};

const ATO_PL: Record<AtoStatus, string> = {
  cruising: 'ATO JAZDA',
  'signal-hold': 'ATO SEMAFOR',
  approaching: 'ATO HAMOWANIE',
  boarding: 'ATO WYMIANA',
  departing: 'ATO ODJAZD',
  off: 'ATO WYŁ.',
};

function applyPairs(input: string, pairs: ReadonlyArray<readonly [string, string]>): string {
  let out = input;
  for (const [from, to] of pairs) {
    out = out.replace(from, to);
  }
  return out;
}

function buildArrivalAnnouncementEn(
  station: string,
  side: IAnnouncementState['platformSide'],
): ILocalizedAnnouncement {
  const sideDisplay = side === 'right' ? 'Platform on RIGHT [E]' : side === 'left' ? 'Platform on LEFT [Q]' : '';
  const sideSpoken = side === 'right' ? 'Platform on the right.' : side === 'left' ? 'Platform on the left.' : '';
  return {
    displayText: sideDisplay ? `Station: ${station} · ${sideDisplay}` : `Station: ${station}`,
    spokenText: sideSpoken ? `Station: ${station}. ${sideSpoken}` : `Station: ${station}`,
  };
}

export function localizeAnnouncement(
  lang: LanguageId,
  announcement: IAnnouncementState | null,
): ILocalizedAnnouncement | null {
  if (!announcement) {
    return null;
  }
  if (lang !== 'en') {
    return { displayText: announcement.text, spokenText: announcement.spokenText ?? announcement.text };
  }
  const station =
    announcement.stationName ??
    announcement.text.replace(/^(Następna stacja|Stacja):\s*/i, '').replace(/\s*·.*$/, '').trim();
  if (announcement.kind === 'arrival') {
    return buildArrivalAnnouncementEn(station, announcement.platformSide);
  }
  return { displayText: `Next station: ${station}`, spokenText: `Next station: ${station}` };
}

function localizeInspectionRadio(radio: IRadioDispatchState): ILocalizedRadio {
  const num = radio.text.match(/#(\d+)/)?.[1] ?? '';
  const locPl = radio.text.match(/\(([^)]+)\)/)?.[1] ?? '';
  const locEn = locPl.replace(/^Tunel przed /, 'Tunnel before ').replace(/^Stacja /, 'Station ');
  return {
    displayText: `Dispatcher: Checkpoint #${num}${locEn ? ` (${locEn})` : ''} cleared — track crew safe, continue inspection.`,
    spokenText: `Dispatch confirmation. Checkpoint ${num} cleared. Track crew safe.`,
  };
}

function localizeCategoryRadioEn(radio: IRadioDispatchState): ILocalizedRadio {
  if (radio.category === 'platform') {
    const st = radio.stationName || 'ahead';
    return {
      displayText: `Dispatcher: Heavy passenger load at ${st}, watch boarding time closely.`,
      spokenText: `Attention from Dispatch. Heavy passenger load at ${st}, watch boarding time.`,
    };
  }
  if (radio.category === 'slippery') {
    return {
      displayText: 'Dispatcher: Slippery rails reported on the next downgrade, brake earlier.',
      spokenText: 'Attention from Dispatch. Slippery rails reported ahead, brake earlier.',
    };
  }
  if (radio.category === 'inspection') return localizeInspectionRadio(radio);
  return {
    displayText: 'Dispatcher: Train ahead has a minor delay, proceed with caution to the next semaphore.',
    spokenText: 'Attention from Dispatch. Train ahead is slightly delayed, watch the next signal.',
  };
}

export function localizeRadioDispatch(lang: LanguageId, radio: IRadioDispatchState): ILocalizedRadio {
  if (lang !== 'en') return { displayText: radio.text, spokenText: radio.spokenText };
  if (radio.text.includes('Dyspozytor Akademii')) {
    return {
      displayText: 'Academy Dispatch: Radio check in progress. Confirm reception with [R].',
      spokenText: 'Attention from Academy Dispatch. Radio check in progress. Confirm with R.',
    };
  }
  return localizeCategoryRadioEn(radio);
}

export function localizeAtoStatus(lang: LanguageId, status: AtoStatus): string {
  return (lang === 'en' ? ATO_EN : ATO_PL)[status] ?? (lang === 'en' ? 'ATO OFF' : 'ATO WYŁ.');
}

export function localizeAcademySubTask(lang: LanguageId, labelPl: string): string {
  return lang === 'en' ? (ACADEMY_SUBTASK_EN[labelPl] ?? labelPl) : labelPl;
}

function localizeDynamicPrefix(textPl: string): string | null {
  if (textPl.startsWith('Akademia: Krok ')) {
    const match = textPl.match(/(\d)\/5/);
    return match ? `Academy: Step ${match[1]}/5 completed!` : textPl;
  }
  if (textPl.startsWith('Sandbox: najbliższy semafor → ')) {
    const aspect = textPl.includes('ZIELONY') ? 'GREEN' : textPl.includes('ŻÓŁTY') ? 'YELLOW' : 'RED';
    return `Sandbox: next semaphore → ${aspect}`;
  }
  for (const [prefixPl, prefixEn] of FEEDBACK_PREFIX_REPLACEMENTS) {
    if (textPl.startsWith(prefixPl)) {
      return textPl.replace(prefixPl, prefixEn);
    }
  }
  for (const rule of FEEDBACK_MULTI_RULES) {
    if (textPl.startsWith(rule.prefix)) {
      return applyPairs(textPl, rule.replacements);
    }
  }
  return null;
}

export function localizeFeedbackText(lang: LanguageId, textPl: string): string {
  if (lang !== 'en') {
    return textPl;
  }
  for (const [pl, en] of FEEDBACK_EXACT_EN) {
    if (textPl === pl) {
      return en;
    }
  }
  const dynamic = localizeDynamicPrefix(textPl);
  if (dynamic !== null) {
    return dynamic;
  }
  if (
    textPl.includes('Idealne zatrzymanie') ||
    textPl.includes('Dobre zatrzymanie') ||
    textPl.includes('Poprawne zatrzymanie')
  ) {
    return applyPairs(textPl, STOP_SUMMARY_REPLACEMENTS);
  }
  return textPl;
}

export function localizeGamepadAction(lang: LanguageId, actionPl: string): string {
  return lang === 'en' ? (GAMEPAD_ACTION_EN[actionPl] ?? actionPl) : actionPl;
}
