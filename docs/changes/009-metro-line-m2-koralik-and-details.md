# 009 — Wybór linii metra (M1 / M2), live „koralik” trasy oraz detale stacji i tunelu

## Zakres zmian
1. **Domena (`src/domain/`)**:
   - Dodano typy `MetroLineId` (`'M1' | 'M2'`) i `IMetroLineSpec` w `src/domain/types.ts` oraz opcjonalny `wallBaseHex` w `IStationSpec`.
   - Rozbudowano `src/domain/routeData.ts` o trasę **Linia M2** (7 stacji: Rondo Daszyńskiego, Rondo ONZ, Świętokrzyska, Nowy Świat-Uniwersytet, Centrum Nauki Kopernik, Stadion Narodowy, Dworzec Wileński) z autentyczną kolorystyką ścian zatorowych i wyświetlaczem LED `M2 BRÓDNO`.
   - Dodano dynamiczne przełączanie trasy w `MetroSimulationEngine.setMetroLine`, `TunnelSignalSystem.setDistances`, `MetroScheduleController.setStations` oraz `MetroIncidentSystem.setStations`.
   - Dodano testy jednostkowe w `src/domain/lineAndRoute.test.ts`.

2. **Scena 3D (`src/scene/`)**:
   - Dodano `src/scene/stationFurnitureBuilder.ts` (ławki z oparciem, kosze na śmieci, podwieszane dwustronne zegary odjazdów PID, wypukła żółta linia bezpieczeństwa).
   - Zaktualizowano `src/scene/stationBuilder.ts` i `src/scene/proceduralTextures.ts` o unikalne kolory ścian zatorowych M2 oraz podświetlane tablice z nazwami stacji po obu stronach hali.
   - Zaktualizowano `src/scene/tunnelBuilder.ts` o 3-poziomowe wiązki kablowe wzdłuż obu ścian tunelu oraz tabliczki kilometrażu co 100 m (`100m`, `200m`, ...).
   - Zaktualizowano `src/scene/inspiroTextures.ts`, `inspiroTrainBuilder.ts`, `trainMeshBuilder.ts` i `metroSceneRenderer.ts` o dynamiczną przebudowę świata po zmianie linii oraz zmianę wyświetlacza LED na czole pociągu (`M1 MŁOCINY` / `M2 BRÓDNO`) i nagłówka prawego LCD kabiny.

3. **Interfejs (`src/components/`, `src/hooks/`)**:
   - Utworzono `src/components/RouteLineStrip.tsx` (schemat „koralik” na żywo z kolorową linią M1/M2, punktami stacji, płynnie poruszającą się ikoną pociągu, kolorami najbliższego semafora oraz żółtymi strefami robót torowych).
   - Rozbudowano `TitleOverlay.tsx`, `TopHudBar.tsx`, `MetroLedDisplay.tsx`, `useMetroGame.ts` oraz `App.tsx` o wybór linii M1/M2.
