# 2026-11-27 — Podmiana modelu 3D Škoda Varsovia na nową klasę `SkodaVarsovia`

## Cel zmiany
Zastąpienie dotychczasowego zewnętrznego modelu 4-wagonowego Škody Varsovia nowym, 6-wagonowym modelem proceduralnym `SkodaVarsovia` (długość składu ok. 119 m) z realistyczną animacją drzwi odskokowo-przesuwnych, dynamicznym wyświetlaczem LED kierunku jazdy, reflektorami czołowymi/końcowymi oraz pełną obsługą malowań z Zajezdni.

## Struktura modularna (SOLID / SRP / DIP)
- `src/models/skodaVarsoviaTypes.ts` — kontrakty TypeScript (`ISkodaVarsoviaOptions`, `ISkodaVarsoviaMaterials`, `ISkodaVarsoviaGeometries`, `ISkodaCabLightRef`, `ISkodaDoorInstanceGroup`, `SkodaDoorSide`, `SkodaLightsMode`) oraz stałe wymiarowe składu.
- `src/models/skodaVarsoviaAssets.ts` — generator matrycy LED (`CanvasTexture`), współdzielone materiały PBR oraz geometrie bazowe.
- `src/models/skodaVarsoviaCabBuilder.ts` — moduł budowy kabiny czołowej/tylnej (szyba, pulpit, wycieraczka, sprzęg, tablica LED, klastry świateł i wiązki).
- `src/models/skodaVarsoviaCarBuilder.ts` — moduł budowy wagonu (pudło, pasy barw warszawskich, wnętrze z siedzeniami i poręczami, instancjonowane drzwi, wózki) oraz przejść międzywagonowych.
- `src/models/SkodaVarsovia.ts` — główna klasa `SkodaVarsovia extends THREE.Group` udostępniająca metody `setDoors`, `update`, `setLedDisplay`, `setLightsMode`, `setInteriorLights` oraz `dispose`.
- `src/scene/varsoviaTrainBuilder.ts` — adapter implementujący `IInspiroConsistBuild`, obracający model o `Math.PI` (przód w kierunku `-Z` osi toru, poziom szyn wyrównany przez `y = 0.16`, przesunięcie `z = 59.0`) i mapujący skórki Zajezdni (`default`, `stealth_night`, `golden_legend`) na `varsovia.materials`.
- `src/scene/metroSceneRenderer.ts` & `src/scene/trainMeshBuilder.ts` — wyrównanie kamery zewnętrznej i dachowej do 6-wagonowego składu oraz wyłączenie zbędnych źródeł `SpotLight` dla pociągu z naprzeciwka.
