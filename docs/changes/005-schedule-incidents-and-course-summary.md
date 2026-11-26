# 005 — Rozkład jazdy, losowe zdarzenia/awarie i ekran podsumowania kursu

## Zakres zmian
1. **Rozkład jazdy i punktualność (`src/domain/scheduleSystem.ts`, `src/components/ScheduleIndicator.tsx`)**:
   - Dodano cyfrowy zegar pokładowy (`08:00:00`), planowany czas przyjazdu na następną stację oraz bieżącą odchyłkę rozkładową w sekundach (zielony `<= +10s`, żółty `+11s..+30s`, czerwony `> +30s`).
   - Przy otwieraniu drzwi na stacji przyznawany jest bonus `+150 pkt` za punktualność (`-10s..+10s`) oraz kary `-40 pkt` / `-100 pkt` za opóźnienie.
2. **Losowe zdarzenia i awarie (`src/domain/incidentSystem.ts`, `src/scene/trackworkBuilder.ts`, `src/components/CzuwakIndicator.tsx`)**:
   - **Awaria drzwi na stacji**: losowe zablokowanie przy próbie zamknięcia (`Awaria drzwi – powtórz zamykanie [O]`), wymagające ponownego naciśnięcia `O` i odczekania 3 s resetu mechanizmu.
   - **Roboty torowe**: losowe odcinki 200 m z ograniczeniem `25 km/h`, żółtą tablicą 3D (`25 ROBOTY`) i migającym pomarańczowym światłem ostrzegawczym w tunelu.
   - **Czuwak (SHP-CA)**: co 40–60 s jazdy zapala się pomarańczowa kontrolka 3D/HUD (`Czuwak [C]`) i rozlega sygnał dźwiękowy; brak potwierdzenia klawiszem `C` w ciągu 4 s uruchamia hamulec awaryjny (`-100 pkt`).
3. **Ekran podsumowania kursu (`src/components/CourseSummaryModal.tsx`, `src/domain/scoringRules.ts`)**:
   - Po obsłużeniu ostatniej stacji (Centrum) wyświetlany jest ekran podsumowania z wynikiem końcowym, liczbą przewiezionych pasażerów, średnią punktualnością, zestawieniem wykroczeń (prędkość, czerwone światło, czuwak), oceną maszynisty (`S` / `A` / `B` / `C` / `D`) i przyciskiem „Jedź ponownie”.
