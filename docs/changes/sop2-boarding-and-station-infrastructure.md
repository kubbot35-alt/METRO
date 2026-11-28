# Rozbudowa: System SOP-2 (ATP), Dynamiczna Wymiana Pasażerów i Infrastruktura Stacyjna

## Cel zmiany
Rozbudowanie symulatora Warszawskiego Metra o trzy spójne moduły (z pełnym tłumaczeniem PL/EN oraz zachowaniem wszystkich dotychczasowych systemów gry i zasad SOLID/SRP):
1. **System bezpieczeństwa kabinowego SOP-2 (ATP)**.
2. **Żywe perony i dynamiczna wymiana pasażerów**.
3. **Infrastruktura tunelowa i stacyjna (Wskaźnik W4, tarcze ograniczeń prędkości w tunelu, działające zegary peronowe)**.

---

## 1. System bezpieczeństwa SOP-2 (ATP)
- **Warstwa domenowa** (czysty TypeScript, bez zależności UI/Three.js):
  - `src/domain/sop2TargetResolver.ts` — analiza wyprzedzająca (`360 m`) wyznaczająca docelową prędkość na następnym odcinku (ostrzejszy łuk, wjazd/zatrzymanie na stacji, roboty torowe `25 km/h`, semafor żółty `30 km/h` / czerwony `0 km/h`, zmiana strefy prędkości).
  - `src/domain/sop2System.ts` — interfejs `ISop2Controller` i implementacja `Sop2System`:
    - przekroczenie limitu o `> 3 km/h` przełącza status na `warning` (pomarańczowy) i generuje cykliczny sygnał dźwiękowy (`sop2WarningBeep`),
    - przekroczenie o `> 7 km/h` przez `> 2.5 s` bez hamowania uruchamia `interventionActive` — wymuszone hamowanie awaryjne do zejścia poniżej limitu, kara `-40 pkt` oraz wpis w tachografie,
    - domyślna aktywacja w trybie Służbowym / Wyzwaniach / Akademii oraz wyłączenie domyślne w Sandboxie, z możliwością przełączania na żywo przez ustawienie `sop2InterventionEnabled`.
- **Audio i Kabina 3D / HUD**:
  - `src/audio/oneShotAudioPlayer.ts` — obsługa zdarzeń `sop2WarningBeep` oraz `sop2InterventionTriggered`.
  - `src/scene/inspiroLcdPainter.ts`, `src/scene/varsoviaScreensPainter.ts`, `src/scene/seria81Sop2Module.ts`, `src/scene/seria81CabBuilder.ts` — wizualizacja aktualnego i docelowego limitu SOP-2 oraz stanów ostrzegania/interwencji w kabinach wszystkich 3 składów.
  - `src/components/Sop2Indicator.tsx`, `src/components/CabDashboardHud.tsx`, `src/components/hud/CompactTouchDashboard.tsx`, `src/components/hud/TopHudCenterAlerts.tsx` — kompaktowy wskaźnik SOP-2 na HUD (desktop i mobile) oraz baner interwencji.
  - `src/components/modals/SettingsGeneralAudioAndLang.tsx` — przełącznik „Interwencja SOP-2 (Wł./Wył.)” / „SOP-2 Intervention (On/Off)” z pełną persystencją w `SettingsStorageService`.

---

## 2. Żywe perony i dynamiczna wymiana pasażerów
- **Zróżnicowanie tłumu**: `src/domain/routeData.ts` przypisuje większą frekwencję kluczowym węzłom (Centrum, Świętokrzyska, Politechnika, Rondo Daszyńskiego, Dworzec Wileński) i mniejszą stacjom końcowym; skala zależna od pory dnia (`rush` / `evening`, `0` w `night_service`).
- **Dynamiczny czas wymiany i kara za wczesne zamknięcie drzwi**:
  - `computeDynamicBoardingDurationSec` (`src/domain/simulation/simulationHelpers.ts`) skaluje czas wymiany w przedziale `4.0–9.0 s` względem liczby pasażerów.
  - `src/domain/simulation/doorBoardingCoordinator.ts` — zamknięcie drzwi przed zakończeniem wymiany emituje ostrzeżenie (PL/EN w `i18nFeedbackData.ts`) i obniża Komfort Pasażerów (`-12%`).
- **Animacja 3D i HUD**:
  - `src/scene/passengers/passengerMeshFactory.ts` oraz `src/scene/passengers/passengerCrowdUpdater.ts` — pasażerowie oczekujący kierują się do najbliższych otwartych drzwi składu i znikają w środku, natomiast wysiadający pojawiają się przy otwartych drzwiach i odchodzą w głąb peronu.
  - `src/components/hud/DashboardStationSection.tsx` — ulepszony pasek postępu „Wymiana pasażerów” / „Passenger Exchange” z licznikiem wsiadających i pozostałym czasem.

---

## 3. Infrastruktura tunelowa i stacyjna
- **Wskaźnik W4**: `src/scene/textures/trackSignTextures.ts` i `src/scene/stationEscalatorBuilder.ts` — podświetlony biało-czarny wskaźnik W4 z krzyżem św. Andrzeja i oprawą oświetleniową na końcu każdego peronu w punkcie zatrzymania czoła (`0 m`).
- **Tarcze ograniczeń prędkości w tunelu**: `src/scene/tunnel/tunnelSignageBuilder.ts` — odblaskowe okrągłe tarcze z liczbą (`60`, `45`, `40`, itp.) montowane na wspornikach ściennych przed łukami i zmianami stref prędkości.
- **Zegary peronowe**: `src/scene/textures/platformClockDisplay.ts`, `src/scene/stationFurnitureBuilder.ts`, `src/scene/stationBuilder.ts`, `src/scene/renderer/sceneRigSync.ts` — czytelne dwustronne zegary cyfrowe LED obok tablic SIP, zsynchronizowane z czasem rozkładu jazdy (`snapshot.schedule.currentClockSec`) bez alokacji na klatkę.

---

## Weryfikacja
- Testy jednostkowe: `src/domain/sop2BoardingAndInfra.test.ts` oraz pełny zestaw `src/domain/*.test.ts`.
- Audyt SOLID/SRP (limit `<= 200` linii na plik, `<= 25` linii na funkcję, zero `any`, izolacja warstwy domenowej).
- Weryfikacja kompilacji (`compile_applet`, `lint_applet`) i podgląd w przeglądarce (`playwright-cli`).
