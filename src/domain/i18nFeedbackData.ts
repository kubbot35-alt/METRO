export const ACADEMY_SUBTASK_EN: Record<string, string> = {
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

export const GAMEPAD_ACTION_EN: Record<string, string> = {
  'Przyspieszanie (Moc)': 'Throttle (Power)',
  'Hamulec roboczy': 'Service Brake',
  'Nastawnik (płynny)': 'Master Controller (Smooth)',
  'Drzwi Lewe / Prawe': 'Doors Left / Right',
  'Drzwi (Auto)': 'Doors (Auto)',
  Klakson: 'Horn',
  'Radio dyspozytora': 'Dispatch Radio',
  'Czuwak (SHP)': 'Czuwak Vigilance',
  'Hamulec awaryjny': 'Emergency Brake',
  'Zmiana kamery (4 widoki)': 'Cycle Camera (4 views)',
  'Reflektory / Wycieraczki': 'Headlights / Wipers',
  'Pauza / Menu': 'Pause / Menu',
};

export const FEEDBACK_EXACT_EN: ReadonlyArray<readonly [string, string]> = [
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
  ['INTERWENCJA SOP-2: Przekroczono limit — hamowanie awaryjne!', 'SOP-2 INTERVENTION: Speed limit exceeded — emergency braking!'],
  ['SOP-2: Prędkość poniżej limitu — hamowanie zwolnione', 'SOP-2: Speed below limit — intervention released'],
  ['Przedwczesne zamknięcie drzwi — wymiana pasażerów nieukończona! (-12% komfortu)', 'Premature door close — passenger exchange incomplete! (-12% comfort)'],
];

export const FEEDBACK_PREFIX_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['Bonus za płynną jazdę (komfort ', 'Smooth ride bonus (comfort '],
  ['Sandbox: podstawiono skład AI przy stacji ', 'Sandbox: spawned AI train at '],
  ['Przekroczenie limitu (', 'Speed limit exceeded ('],
  ['Roboty torowe – max ', 'Trackwork zone – max '],
  ['Wymiana pasażerów zakończona — zamknij drzwi ', 'Boarding complete — close doors '],
  ['Awaria drzwi – powtórz zamykanie ', 'Door fault – retry closing '],
  ['Przejechano stację ', 'Overshot station '],
  ['Przejazd techniczny przez stację ', 'Technical pass through '],
  ['Inspekcja nocna: minięto stację ', 'Night inspection: passed station '],
];

export const FEEDBACK_MULTI_RULES: ReadonlyArray<{
  readonly prefix: string;
  readonly replacements: ReadonlyArray<readonly [string, string]>;
}> = [
  {
    prefix: 'Blokada drzwi! Peron po ',
    replacements: [
      ['Blokada drzwi! Peron po ', 'Door interlock! Platform on '],
      ['LEWEJ', 'LEFT'],
      ['PRAWEJ', 'RIGHT'],
      [' — strona torów zablokowana', ' — track side locked'],
    ],
  },
  {
    prefix: 'Punkt kontrolny #',
    replacements: [
      ['Punkt kontrolny #', 'Checkpoint #'],
      [' zaliczony — ekipa torowa bezpieczna', ' cleared — track crew safe'],
      [' zaliczony — ekipa bezpiecznie ominięta', ' cleared — track crew safely passed'],
    ],
  },
  {
    prefix: 'BHP Ekipa #',
    replacements: [
      ['BHP Ekipa #', 'Safety Crew #'],
      ['Przekroczono 20 km/h i brak klaksonu [H]!', 'Exceeded 20 km/h and missed horn [H]!'],
      ['Przekroczono 20 km/h przy ekipie torowej!', 'Exceeded 20 km/h near track crew!'],
      ['Brak sygnału ostrzegawczego klaksonem [H]!', 'Missing warning horn signal [H]!'],
    ],
  },
];

export const STOP_SUMMARY_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['Idealne zatrzymanie', 'Perfect stop'],
  ['Dobre zatrzymanie', 'Good stop'],
  ['Poprawne zatrzymanie', 'Acceptable stop'],
  ['Punktualnie', 'On time'],
  ['Wcześnie', 'Early'],
  ['Opóźnienie', 'Delayed'],
  ['Wolna jazda', 'Sandbox'],
  ['Przejazd ATO', 'ATO Ride'],
];
