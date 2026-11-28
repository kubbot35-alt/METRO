# Audyt Architektury i Refaktoryzacja SOLID / SRP

## 1. Zakres i cele zmian

Przeprowadzono kompleksowy audyt oraz refaktoryzację całej bazy produkcyjnej aplikacji w celu eliminacji klas-monolitów (God Classes), duplikacji kodu, wycieków typów oraz konfliktów nazw.

Rygorystycznie wdrożono następujące reguły architektoniczne:
- **SRP & Clean Architecture**: pełna izolacja czystej logiki domenowej (`src/domain/`) od React, DOM i Three.js.
- **Limit długości modułu**: maksymalnie **200 linii** w każdym pliku produkcyjnym (`src/**/*.ts`, `src/**/*.tsx`).
- **Limit długości funkcji/metody**: maksymalnie **25 linii** dla każdej funkcji, metody i komponentu.
- **Strict Typing**: **0 użyć `any`** w całym projekcie.
- **DIP / Interface-Driven Development & Inheritance**: wprowadzenie wspólnych interfejsów, klas abstrakcyjnych oraz wstrzykiwania zależności.

---

## 2. Główne wdrożenia architektoniczne

### 2.1 Podział kontraktów domenowych (`src/domain/types/`)
Monolityczny plik `src/domain/types.ts` (926 linii) został rozbity na spójne moduły dziedzinowe re-eksportowane z `src/domain/types.ts` (zachowana pełna wsteczna kompatybilność importów):
- `coreTypes.ts`
- `trainAndPhysicsTypes.ts`
- `routeAndTrackTypes.ts`
- `gameplaySystemsTypes.ts`
- `telemetryAndCareerTypes.ts`
- `simulationContracts.ts`
- `simulationApi.ts`

### 2.2 Generyczna warstwa persystencji (`IStorageRepository<T>`)
Wprowadzono `src/domain/persistence/jsonStorageRepository.ts` (`IStorageRepository<T>` + `LocalJsonStorageRepository<T>`), eliminując 7 powielonych implementacji obsługi `localStorage`, bezpiecznego `JSON.parse`, limitów pamięci oraz sanityzacji danych w serwisach ustawień, profilu maszynisty, osiągnięć, własnych linii, ducha przejazdu, malowań i tabeli rekordów.

### 2.3 Unifikacja taboru i kabin (`ITrainConsist`, `ICabInterior`)
Zastąpiono zdublowane kontrakty (`IInspiroConsistBuild`, `ISeria81ConsistBuild`, `IInspiroCabInterior`, `ISeria81CabInterior`), zlikwidowano nadmiarowy typ `SkodaDoorSide` (zastąpiony domenowym `DoorSide`) oraz usunięto martwe pola placeholderów (`createUnusedLampPlaceholder`):
- `src/scene/shared/baseTrainConsist.ts` — interfejs `ITrainConsist` i klasa abstrakcyjna `BaseTrainConsist` (wspólne wygładzanie drzwi, obrót osi kół, nakładanie malowań i zwalnianie zasobów GPU).
- `src/scene/shared/baseCabInterior.ts` — interfejs `ICabInterior` i klasa abstrakcyjna `BaseCabInterior` (wspólna aktualizacja lamp ostrzegawczych, wycieraczki, monitorów CCTV i cyklu życia tekstur).
- `src/scene/shared/canvasTextureFactory.ts` oraz `src/scene/shared/ledMatrixPainter.ts` — wspólna fabryka tekstur `CanvasTexture` (`SRGBColorSpace`, anizotropia) oraz jednolity renderer tablic kierunkowych LED.

### 2.4 Dekompozycja `MetroSimulationEngine`
Rozbito monolit (1675 linii) na fasadę domenową oraz wyspecjalizowane, wstrzykiwane koordynatory w `src/domain/simulation/`:
- `doorBoardingCoordinator.ts`
- `controlStepCoordinator.ts`
- `modeRulesCoordinator.ts`
- `snapshotAssembler.ts`

### 2.5 Dekompozycja `useMetroGame` i warstwy aplikacji
Rozbito monolit (1868 linii) na cienką fasadę hooka oraz zestaw niezależnych modułów w `src/hooks/game/`:
- `simulationFrameRunner.ts`, `hudSyncTracker.ts`, `controlMerger.ts`, `frameSideEffects.ts`
- `serviceBag.ts`, `useGameRuntimeState.ts`, `useEngineMountEffect.ts`
- `useCctvAndPaController.ts`, `usePhotoModeController.ts`, `useOverlayModalsController.ts`, `useViewportAndTouch.ts`
- `gameplayActionsFactory.ts`, `sessionActionsFactory.ts`, `cctvAndPaActions.ts`, `photoModeActions.ts`, `overlayModalActions.ts`

### 2.6 Dekompozycja `MetroSceneRenderer`, Audio i UI
- Podzielono `MetroSceneRenderer` oraz buildery tunelu, stacji, zajezdni, pasażerów, reklam, deszczu i warstw audio na moduły <= 200 linii / funkcje <= 25 linii.
- Wprowadzono współdzieloną powłokę modali `src/components/shared/ModalDialogShell.tsx`.
- Zdekomponowano `TitleOverlay`, `CabDashboardHud`, `SettingsModal`, `CustomLineBuilderModal`, `TopHudBar`, `MobileTouchControls` oraz pozostałe komponenty HUD i modali bez regresji wizualnych i z zachowaniem wszystkich atrybutów `data-testid` i ARIA.

---

## 3. Weryfikacja po refaktoryzacji

- **Pliki produkcyjne (`src/`, bez `*.test.ts`)**: 291 plików — **0 plików > 200 linii**.
- **Funkcje / metody / komponenty produkcyjne**: **0 funkcji > 25 linii**.
- **Typ `any`**: **0 wystąpień**.
- **Konflikty i martwe symbole (`IInspiroConsistBuild`, `ISeria81ConsistBuild`, `SkodaDoorSide`, `createUnusedLampPlaceholder`)**: **0 wystąpień**.
- **Izolacja warstwy domeny**: **0 importów React/Three/DOM w `src/domain/`**.
- **Testy jednostkowe domeny (`npx tsx --test src/domain/*.test.ts`)**: **116 / 116 zaliczonych (0 błędów)**.
- **Kompilacja TypeScript i build produkcyjny (`tsc --noEmit` + `vite build`)**: **0 błędów**.
