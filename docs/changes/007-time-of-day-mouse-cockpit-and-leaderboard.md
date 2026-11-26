# 007 — Pora dnia / natężenie ruchu, interaktywny pulpit myszką i lokalna tablica rekordów

## Cel zmian
Dodanie wyboru pory dnia przed kursem, pełnej obsługi pulpitu myszką i dotykiem (w tym przeciąganego nastawnika mocy/hamulca i ściągawki ze skrótami pod przyciskiem „?”) oraz lokalnej tablicy 5 najlepszych wyników zapisywanej w `localStorage`.

## Architektura (SOLID / Separation of Concerns)
- **Warstwa domeny (`src/domain/`)**:
  - `timeOfDayCatalog.ts`: profile `RUSH_HOUR_SPEC` (08:00 — 7 s wymiany pasażerów, gęsty tłum na peronach, częstsze mijanki 22–40 s, podwyższona szansa na czerwony semafor) oraz `LATE_EVENING_SPEC` (23:30 — 5 s wymiany, pojedynczy pasażerowie, spokojny ruch 70–115 s, niskie prawdopodobieństwo czerwonego światła, przyciemnione ciepłe oświetlenie stacji).
  - `leaderboard.ts`: czysta usługa `LeaderboardService` ze wstrzykiwanym interfejsem `ILeaderboardStorage` (implementacja `LocalStorageLeaderboardStore`), utrzymująca Top 5 wyników oraz wykrywająca pobicie rekordu (`isNewRecord`).
  - `signalSystem.ts`, `trafficSystem.ts`, `scheduleSystem.ts`, `trainPhysics.ts`, `metroSimulation.ts`: konfiguracja parametrów pory dnia i obsługa ciągłej osi nastawnika `manualLeverAxis` bez naruszania logiki sterowania klawiaturą.
- **Warstwa 3D (`src/scene/`)**:
  - `passengerManager.ts`: dynamiczne skalowanie liczby pasażerów widocznych na peronach w zależności od pory dnia.
  - `metroSceneRenderer.ts`: adaptacja intensywności i barwy świateł stacyjnych, oświetlenia otoczenia i gęstości mgły pomiędzy szczytem porannym a późnym wieczorem.
- **Warstwa UI (`src/components/`, `src/hooks/`)**:
  - `MasterControllerSlider.tsx`: pionowy, przeciągany myszką/dotykiem suwak nastawnika mocy i hamowania.
  - `ControlsHelpModal.tsx`: okienko ze skrótami klawiszowymi uruchamiane przyciskiem `?` w rogu ekranu (automatyczna pauza i wznowienie).
  - `LeaderboardPanel.tsx`, `TitleOverlay.tsx`, `CabDashboardHud.tsx`, `TopHudBar.tsx`, `CourseSummaryModal.tsx`: wybór pory dnia i tabela „Najlepsze wyniki” na ekranie startowym, wszystkie 6 akcji klikalnych na pulpicie (`O/L/H/C/B/V`) oraz baner „NOWY REKORD!” w podsumowaniu kursu.
