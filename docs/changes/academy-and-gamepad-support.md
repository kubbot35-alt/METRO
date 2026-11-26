# Akademia Maszynisty & Pełna Obsługa Kontrolera (Gamepad API)

## Zakres zmian
1. **Tryb „Akademia Maszynisty” (`src/domain/academySystem.ts`, `src/components/AcademyGuidePanel.tsx`)**
   - Dodano przycisk **„Samouczek / Akademia”** w ekranie startowym (`TitleOverlay`), uruchamiający dedykowany, dwustacyjny kurs szkoleniowy (`Centrum Szkoleniowe` [Q] → `Stacja Egzaminacyjna` [E]) z limitem 60 km/h oraz wyreżyserowanymi semaforami (żółty na 220 m, czerwony na 430 m).
   - Wprowadzono 5-etapowy interaktywny przewodnik z niezasłaniającym widoku panelem instrukcji, bieżącym podświetlaniem odpowiednich przycisków/kontrolek na pulpicie (`Światła [L]`, `Klakson [H]`, `Nastawnik`, `Semafor`, `Czuwak [C]`, `Radio [R]`, `Drzwi L/P`) oraz dźwiękiem zaliczenia każdego etapu:
     1. Włączenie reflektorów (`L`) i użycie klaksonu (`H`).
     2. Płynny rozruch (`W`) i utrzymanie bezpiecznej prędkości poniżej 60 km/h.
     3. Reakcja na żółty i czerwony semafor (zatrzymanie i oczekiwanie na zielone światło).
     4. Potwierdzenie czuwaka (`C`) oraz odbiór komunikatu z radia dyspozytora (`R`).
     5. Precyzyjne wyhamowanie w strefie STOP, otwarcie właściwych drzwi (`Q`/`E`), wymiana pasażerów i zamknięcie drzwi.
   - Po ukończeniu Akademii przyznawana jest odznaka **„Licencja Maszynisty”** (`academy_license`) w Osiągnięciach oraz bonus **+250 XP** w Profilu Maszynisty.

2. **Pełna obsługa kontrolera / pada (`src/domain/gamepadMapping.ts`, `src/input/gamepadController.ts`)**
   - Automatyczne wykrywanie podłączenia pada (`gamepadconnected` / `gamepaddisconnected` + polling `navigator.getGamepads()`), krótki komunikat toast **„Podłączono kontroler”** (`GamepadToast`) oraz ikona aktywnego pada w rogu ekranu startowego.
   - Płynne analogowe sterowanie z martwą strefą `0.1`: prawy spust (`RT/R2`) — moc, lewy spust (`LT/L2`) — hamulec roboczy, lewy drążek (oś Y) — alternatywny nastawnik jazdy.
   - Mapowanie przycisków: `LB/L1` (drzwi lewe), `RB/R1` (drzwi prawe), `A/Cross` (czuwak), `X/Square` (radio), `B/Circle` (hamulec awaryjny), `Y/Triangle` (kamera), `D-Pad` (światła, wycieraczki, klakson), `Start/Options` (pauza).
   - Nowa zakładka **„Kontroler / Pad”** w Ustawieniach (`SettingsModal`) z podglądem mapowania Xbox/PlayStation, statusem połączenia i zapisywanym w `localStorage` przełącznikiem wibracji (`gamepadVibration`) obsługującym `vibrationActuator.playEffect('dual-rumble', ...)` przy ostrym hamowaniu, poślizgu i przejeździe przez rozjazdy.

## Architektura (SOLID)
- **SRP**: Logika 5-etapowego samouczka (`AcademyController`), mapowania i martwej strefy pada (`gamepadMapping.ts`) oraz sprzętowy polling/haptyka (`BrowserGamepadController`) zostały rozdzielone na osobne, niezależne moduły.
- **DIP**: `MetroSimulationEngine` zależy wyłącznie od interfejsów (`IAcademyController`, `ISignalController`, `IIncidentController`, `IRadioController`), a `useMetroGame` od interfejsu `IGamepadController`.
