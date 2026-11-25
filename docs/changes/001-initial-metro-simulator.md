# 001 — Inicjalna architektura symulatora metra 3D (Metro M1)

## Cel zmiany
Stworzenie interaktywnego symulatora prowadzenia metra 3D w przeglądarce (Three.js + React + TypeScript) w widoku z pierwszej osoby (FPP) z pełnym rozdzieleniem warstw (Clean Architecture / SOLID / DIP).

## Podział warstw i modułów

### 1. Warstwa Domeny (`src/domain/`) — Czysty TypeScript (zero React / Three.js / DOM)
- `types.ts`: Kontrakty interfejsów (`ITrainPhysicsModel`, `IScoringEvaluator`, `IMetroSimulation`, `ISimulationSnapshot`, `IControlInput`).
- `routeData.ts`: Definicja trasy Linii M1 (5 stacji co 600 m: Centrum, Politechnika, Ratusz Arsenał, Dworzec Gdański, Młociny) oraz strefy ograniczeń prędkości.
- `trainPhysics.ts`: Model fizyki składu (`MetroTrainPhysics`, 185 ton masy, krzywa trakcji, opory toczenia i opór aerodynamiczny w tunelu, hamulec roboczy i awaryjny, blokada jazdy przy otwartych drzwiach).
- `scoringRules.ts`: Ewaluator precyzji zatrzymania (`+300 / +200 / +100 pkt`) i kar (przekroczenie prędkości, przejechanie stacji, hamowanie awaryjne).
- `feedbackTracker.ts`: Zarządzanie stanem komunikatów zdarzeń.
- `metroSimulation.ts`: Orkiestrator symulacji (otwieranie drzwi wyłącznie w strefie przy 0 km/h, 5-sekundowa wymiana pasażerów, wykrywanie przejechania stacji i przekroczeń limitu).

### 2. Warstwa Audio (`src/audio/`)
- `types.ts` i `metroAudioEngine.ts`: Proceduralna synteza Web Audio API (dwutonowy klakson `H`, dźwięk falownika trakcyjnego, pneumatyka drzwi, gong zakończenia wymiany pasażerów, stukot szyn i sygnały ostrzegawcze).

### 3. Warstwa Wejścia (`src/input/`)
- `types.ts` i `keyboardInputController.ts`: Obsługa klawiszy `W/S`, `Spacja`, `B`, `O`, `H`, `P/Esc`, `M`, `R` z detekcją zboczy oraz czyszczeniem stanu po utracie fokusu.

### 4. Warstwa Wizualna 3D (`src/scene/`)
- `proceduralTextures.ts`: Proceduralne tekstury CanvasTexture (beton tunelu, podsypka, płytki peronu, tablice stacyjne, tablica `STOP`, znaki ograniczenia prędkości).
- `tunnelBuilder.ts`: Instancjonowany tunel metra z torami, podkładami, trzecią szyną, słupami i lampami ściennymi.
- `stationBuilder.ts`: Oświetlone stacje co 600 m z peronem, tablicami, ławkami, sylwetkami pasażerów i zieloną strefą zatrzymania.
- `cabBuilder.ts`: Trójwymiarowa rama kabiny FPP (słupki A, osłona przeciwsłoneczna, wycieraczka, deska i kontrolki).
- `metroSceneRenderer.ts`: Renderer Three.js z `RoomEnvironment`, reflektorami, dynamicznym doświetleniem stacji oraz ochroną `isSoftwareGl` (`afterDraw`).

### 5. Warstwa UI (`src/hooks/` i `src/components/`)
- `useMetroGame.ts`: Most łączący silnik domeny, renderer 3D, audio i wejście z odświeżaniem HUD ograniczonym do <= 10 Hz.
- `TitleOverlay.tsx`, `TopHudBar.tsx`, `CabDashboardHud.tsx`, `SpeedometerGauge.tsx`, `StatusModal.tsx`.
