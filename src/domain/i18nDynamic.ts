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

export function localizeAnnouncement(
  lang: LanguageId,
  announcement: IAnnouncementState | null,
): ILocalizedAnnouncement | null {
  if (!announcement) {
    return null;
  }
  if (lang !== 'en') {
    return {
      displayText: announcement.text,
      spokenText: announcement.spokenText ?? announcement.text,
    };
  }
  const station =
    announcement.stationName ??
    announcement.text
      .replace(/^(Następna stacja|Stacja):\s*/i, '')
      .replace(/\s*·.*$/, '')
      .trim();

  if (announcement.kind === 'arrival') {
    const sideDisplay =
      announcement.platformSide === 'right'
        ? 'Platform on RIGHT [E]'
        : announcement.platformSide === 'left'
          ? 'Platform on LEFT [Q]'
          : '';
    const sideSpoken =
      announcement.platformSide === 'right'
        ? 'Platform on the right.'
        : announcement.platformSide === 'left'
          ? 'Platform on the left.'
          : '';
    return {
      displayText: sideDisplay ? `Station: ${station} · ${sideDisplay}` : `Station: ${station}`,
      spokenText: sideSpoken ? `Station: ${station}. ${sideSpoken}` : `Station: ${station}`,
    };
  }

  return {
    displayText: `Next station: ${station}`,
    spokenText: `Next station: ${station}`,
  };
}

export function localizeRadioDispatch(
  lang: LanguageId,
  radio: IRadioDispatchState,
): ILocalizedRadio {
  if (lang !== 'en') {
    return {
      displayText: radio.text,
      spokenText: radio.spokenText,
    };
  }
  if (radio.text.includes('Dyspozytor Akademii')) {
    return {
      displayText: 'Academy Dispatch: Radio check in progress. Confirm reception with [R].',
      spokenText: 'Attention from Academy Dispatch. Radio check in progress. Confirm with R.',
    };
  }
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
  if (radio.category === 'inspection') {
    const numMatch = radio.text.match(/#(\d+)/);
    const num = numMatch ? numMatch[1] : '';
    const locMatch = radio.text.match(/\(([^)]+)\)/);
    const locPl = locMatch ? locMatch[1] : '';
    const locEn = locPl
      .replace(/^Tunel przed /, 'Tunnel before ')
      .replace(/^Stacja /, 'Station ');
    return {
      displayText: `Dispatcher: Checkpoint #${num}${locEn ? ` (${locEn})` : ''} cleared — track crew safe, continue inspection.`,
      spokenText: `Dispatch confirmation. Checkpoint ${num} cleared. Track crew safe.`,
    };
  }
  return {
    displayText:
      'Dispatcher: Train ahead has a minor delay, proceed with caution to the next semaphore.',
    spokenText: 'Attention from Dispatch. Train ahead is slightly delayed, watch the next signal.',
  };
}

export function localizeAtoStatus(lang: LanguageId, status: AtoStatus): string {
  if (lang === 'en') {
    switch (status) {
      case 'cruising':
        return 'ATO CRUISING';
      case 'signal-hold':
        return 'ATO SIGNAL HOLD';
      case 'approaching':
        return 'ATO STATION BRAKE';
      case 'boarding':
        return 'ATO BOARDING';
      case 'departing':
        return 'ATO DEPARTING';
      default:
        return 'ATO OFF';
    }
  }
  switch (status) {
    case 'cruising':
      return 'ATO JAZDA';
    case 'signal-hold':
      return 'ATO SEMAFOR';
    case 'approaching':
      return 'ATO HAMOWANIE';
    case 'boarding':
      return 'ATO WYMIANA';
    case 'departing':
      return 'ATO ODJAZD';
    default:
      return 'ATO WYŁ.';
  }
}

export function localizeAcademySubTask(lang: LanguageId, labelPl: string): string {
  if (lang !== 'en') {
    return labelPl;
  }
  const map: Record<string, string> = {
    'Włącz reflektory [L]': 'Turn on headlights [L]',
    'Użyj klaksonu [H]': 'Sound the horn [H]',
    'Rusz i osiągnij 20 km/h (max 60 km/h)': 'Accelerate above 20 km/h (max 60 km/h)',
    'Zwolnij na żółtym, zatrzymaj przed czerwonym': 'Slow for yellow, stop before red signal',
    'Odczekaj na zielone światło': 'Wait for the green signal',
    'Potwierdź czuwak [C]': 'Acknowledge Czuwak [C]',
    'Potwierdź radio dyspozytora [R]': 'Confirm dispatch radio [R]',
    'Zatrzymaj się w strefie STOP na stacji': 'Stop inside the station STOP zone',
    'Otwórz drzwi po właściwej stronie [Q]': 'Open doors on the platform side [Q]',
    'Zakończ wymianę i zamknij drzwi [Q]': 'Finish boarding and close doors [Q]',
  };
  return map[labelPl] ?? labelPl;
}

const FEEDBACK_EXACT_EN: ReadonlyArray<readonly [string, string]> = [
  ['ATO dostępne tylko w Sandbox / trybie Pasażera', 'ATO is only available in Sandbox / Passenger mode'],
  ['Autopilot ATO WŁĄCZONY', 'ATO Autopilot ENABLED'],
  ['Autopilot ATO aktywny — automatyczne prowadzenie pociągu', 'ATO Autopilot active — automatic train operation'],
  ['Autopilot ATO WYŁĄCZONY — przejęto sterowanie ręczne', 'ATO Autopilot DISABLED — manual control active'],
  ['Autopilot ATO wyłączony — przejęto sterowanie ręczne', 'ATO Autopilot off — manual control resumed'],
  ['Radio potwierdzone — przyjęto komunikat dyspozytora', 'Radio confirmed — dispatch message acknowledged'],
  ['Radio potwierdzone', 'Radio confirmed'],
  ['Centrala: brak potwierdzenia komunikatu radiowego [R]', 'Dispatch: missed radio acknowledgement [R]'],
  ['Akademia ukończona! Przyznano Licencję Maszynisty', 'Academy complete! Driver License awarded'],
  ['Hamowanie awaryjne!', 'Emergency braking!'],
  ['Hamowanie awaryjne', 'Emergency braking'],
  ['Przekroczenie prędkości!', 'Overspeed violation!'],
  ['ATP: Przejechano czerwone światło! Hamulec bezpieczeństwa', 'ATP: Passed red signal! Safety brake applied'],
  ['Sandbox: minięto czerwony semafor (bez kary)', 'Sandbox: passed red signal (no penalty)'],
  ['Semafor zielony — droga wolna', 'Green signal — track clear'],
  ['Czuwak potwierdzony!', 'Czuwak acknowledged!'],
  ['Czuwak potwierdzony', 'Czuwak acknowledged'],
  ['CZUWAK: Brak reakcji [C]! Hamulec awaryjny', 'CZUWAK: No response [C]! Emergency brake'],
  ['Akademia: Czas czuwaka minął — spróbuj ponownie [C]', 'Academy: Czuwak timed out — try again [C]'],
  ['Ponowne zamykanie drzwi — oczekiwanie 3 s', 'Retrying door close — please wait 3 s'],
  ['Sandbox: wywołano mijankę na sąsiednim torze', 'Sandbox: spawned oncoming train on opposite track'],
  ['Kultura jazdy: przygaszono długie światła', 'Driving courtesy: dimmed high beams'],
  ['Przygaszono długie przed pociągiem z naprzeciwka', 'Dimmed high beams for oncoming train'],
  ['Światła długie (drogowe)', 'High-beam headlights ON'],
  ['Światła krótkie (mijania)', 'Low-beam headlights ON'],
  ['Reflektory wyłączone', 'Headlights OFF'],
  ['Lampka kabiny: WŁ.', 'Cab light: ON'],
  ['Lampka kabiny: WYŁ.', 'Cab light: OFF'],
  ['Zbyt ostre hamowanie!', 'Harsh braking!'],
  ['Hamowanie awaryjne — gwałtowne szarpnięcie!', 'Emergency brake — violent jolt!'],
  ['Gwałtowne szarpnięcie nastawnikiem!', 'Abrupt controller jerk!'],
  ['Zbyt szybki wjazd w zakręt!', 'Too fast entering curve!'],
  ['Interkom PA: szybsza wymiana pasażerów (-1,5 s) i ochrona drzwi', 'PA Intercom: faster boarding (-1.5 s) & door protection'],
  ['Interkom PA: komunikat drzwiowy — mniejsze ryzyko awarii drzwi', 'PA Intercom: door warning — reduced door fault risk'],
  ['Interkom PA: pasażerowie uspokojeni (+5% komfortu)', 'PA Intercom: passengers reassured (+5% comfort)'],
  ['Interkom PA: ostrzeżenie na deszczu (+4% komfortu)', 'PA Intercom: rain safety notice (+4% comfort)'],
  ['Interkom PA: nadano komunikat w wagonach', 'PA Intercom: announcement broadcast in cars'],
  ['Tor odstawczy: jedź powoli (max 20 km/h) przed kozioł oporowy', 'Turnaround siding: proceed slowly (max 20 km/h) to buffer stop'],
  ['Zderzenie z kozłem oporowym! Hamulec awaryjny', 'Buffer stop impact! Emergency brake engaged'],
  ['Zmieniono kabinę — wjedź na peron kursu powrotnego', 'Cab switched — pull into the return platform'],
];

export function localizeFeedbackText(lang: LanguageId, textPl: string): string {
  if (lang !== 'en') {
    return textPl;
  }
  for (const [pl, en] of FEEDBACK_EXACT_EN) {
    if (textPl === pl) {
      return en;
    }
  }
  if (textPl.startsWith('Bonus za płynną jazdę (komfort ')) {
    return textPl.replace('Bonus za płynną jazdę (komfort ', 'Smooth ride bonus (comfort ');
  }
  if (textPl.startsWith('Akademia: Krok ')) {
    const match = textPl.match(/(\d)\/5/);
    return match ? `Academy: Step ${match[1]}/5 completed!` : textPl;
  }
  if (textPl.startsWith('Sandbox: najbliższy semafor → ')) {
    const aspect = textPl.includes('ZIELONY')
      ? 'GREEN'
      : textPl.includes('ŻÓŁTY')
        ? 'YELLOW'
        : 'RED';
    return `Sandbox: next semaphore → ${aspect}`;
  }
  if (textPl.startsWith('Sandbox: podstawiono skład AI przy stacji ')) {
    const station = textPl.replace('Sandbox: podstawiono skład AI przy stacji ', '');
    return `Sandbox: spawned AI train at ${station}`;
  }
  if (textPl.startsWith('Przekroczenie limitu (')) {
    return textPl.replace('Przekroczenie limitu (', 'Speed limit exceeded (');
  }
  if (textPl.startsWith('Roboty torowe – max ')) {
    return textPl.replace('Roboty torowe – max ', 'Trackwork zone – max ');
  }
  if (textPl.startsWith('Wymiana pasażerów zakończona — zamknij drzwi ')) {
    return textPl.replace('Wymiana pasażerów zakończona — zamknij drzwi ', 'Boarding complete — close doors ');
  }
  if (textPl.startsWith('Awaria drzwi – powtórz zamykanie ')) {
    return textPl.replace('Awaria drzwi – powtórz zamykanie ', 'Door fault – retry closing ');
  }
  if (textPl.startsWith('Blokada drzwi! Peron po ')) {
    return textPl
      .replace('Blokada drzwi! Peron po ', 'Door interlock! Platform on ')
      .replace('LEWEJ', 'LEFT')
      .replace('PRAWEJ', 'RIGHT')
      .replace(' — strona torów zablokowana', ' — track side locked');
  }
  if (textPl.startsWith('Przejechano stację ')) {
    return textPl.replace('Przejechano stację ', 'Overshot station ');
  }
  if (textPl.startsWith('Przejazd techniczny przez stację ')) {
    return textPl.replace('Przejazd techniczny przez stację ', 'Technical pass through ');
  }
  if (textPl.startsWith('Inspekcja nocna: minięto stację ')) {
    return textPl.replace('Inspekcja nocna: minięto stację ', 'Night inspection: passed station ');
  }
  if (textPl.startsWith('Punkt kontrolny #')) {
    return textPl
      .replace('Punkt kontrolny #', 'Checkpoint #')
      .replace(' zaliczony — ekipa torowa bezpieczna', ' cleared — track crew safe')
      .replace(' zaliczony — ekipa bezpiecznie ominięta', ' cleared — track crew safely passed');
  }
  if (textPl.startsWith('BHP Ekipa #')) {
    return textPl
      .replace('BHP Ekipa #', 'Safety Crew #')
      .replace('Przekroczono 20 km/h i brak klaksonu [H]!', 'Exceeded 20 km/h and missed horn [H]!')
      .replace('Przekroczono 20 km/h przy ekipie torowej!', 'Exceeded 20 km/h near track crew!')
      .replace('Brak sygnału ostrzegawczego klaksonem [H]!', 'Missing warning horn signal [H]!');
  }
  if (textPl.includes('Idealne zatrzymanie') || textPl.includes('Dobre zatrzymanie') || textPl.includes('Poprawne zatrzymanie')) {
    return textPl
      .replace('Idealne zatrzymanie', 'Perfect stop')
      .replace('Dobre zatrzymanie', 'Good stop')
      .replace('Poprawne zatrzymanie', 'Acceptable stop')
      .replace('Punktualnie', 'On time')
      .replace('Wcześnie', 'Early')
      .replace('Opóźnienie', 'Delayed')
      .replace('Wolna jazda', 'Sandbox')
      .replace('Przejazd ATO', 'ATO Ride');
  }
  return textPl;
}

export function localizeGamepadAction(lang: LanguageId, actionPl: string): string {
  if (lang !== 'en') {
    return actionPl;
  }
  const map: Record<string, string> = {
    'Przyspieszanie (Moc)': 'Throttle (Power)',
    'Hamulec roboczy': 'Service Brake',
    'Nastawnik (płynny)': 'Master Controller (Smooth)',
    'Drzwi Lewe / Prawe': 'Doors Left / Right',
    'Drzwi (Auto)': 'Doors (Auto)',
    'Klakson': 'Horn',
    'Radio dyspozytora': 'Dispatch Radio',
    'Czuwak (SHP)': 'Czuwak Vigilance',
    'Hamulec awaryjny': 'Emergency Brake',
    'Zmiana kamery (4 widoki)': 'Cycle Camera (4 views)',
    'Reflektory / Wycieraczki': 'Headlights / Wipers',
    'Pauza / Menu': 'Pause / Menu',
  };
  return map[actionPl] ?? actionPl;
}
