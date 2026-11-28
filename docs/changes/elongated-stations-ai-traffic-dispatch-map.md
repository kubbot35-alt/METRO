# Rozbudowa: Stacje 138 m, Ruch Pociągów AI na Obu Torach i Mapa Linii na Żywo

## 1. Wydłużone stacje metra (138 m) pod pełne 6-wagonowe składy
- **Domena (`routeData.ts`, `trackGeometry.ts`)**: zwiększono `PLATFORM_LENGTH_M` ze `110 m` do `138 m` (wspólne dla linii M1, M2 i Kreatora Tras w `customLineCompiler.ts`) oraz zaktualizowano geometrię wycięcia hali stacyjnej (`STATION_HALL_START_OFFSET_M = 132`, `STATION_HALL_END_OFFSET_M = 16`).
- **Strefa zatrzymania W4 (`stationBuilder.ts`, `stationHallBuilder.ts`)**: wskaźnik zatrzymania W4 znajduje się `10,5 m` przed przednią krawędzią peronu (`z = -10.5..+127.5`), dzięki czemu pełny 6-wagonowy skład Škody Varsovii (~118 m) mieści się całkowicie w granicach peronu z zapasem z przodu i z tyłu.
- **Detale peronowe z `THREE.InstancedMesh` (`stationInstancedFurniture.ts`, `stationFurnitureBuilder.ts`, `stationEscalatorBuilder.ts`, `exitSignTexture.ts`, `stationAdsBuilder.ts`)**:
  - Zastosowano `InstancedMesh` + `computeBoundingSphere()` dla słupów peronowych, ławek, koszy na śmieci, poprzecznych kasetonów sufitowych, filarów dzielących i stopni schodów ruchomych.
  - Rozmieszczono 4 pary tablic SIP z żywymi zegarami cyfrowymi, 6 par banerów ściennych, 5 citylightów, 3 ekrany DOOH oraz 5 par tablic z nazwą stacji wzdłuż całych 138 metrów.
  - Dodano schody ruchome i zejścia na antresolę na obu końcach peronu z podświetlanymi tabliczkami `WYJŚCIE / EXIT`.
- **Pasażerowie (`passengerMeshFactory.ts`)**: rozszerzono pozycje drzwi (`TRAIN_DOOR_Z_OFFSETS`) i rozkład tłumów wzdłuż wszystkich 6 wagonów.

## 2. Ruch pociągów AI na obu torach i dynamiczne odstępy blokowe
- **Sąsiedni tor (`trafficSystem.ts`, `trafficContracts.ts`)**: zaktualizowano punkt zatrzymania na peronie 138 m (`STATION_STOP_OFFSET_M = 116`), a pociągi jadące w trybie `cruise` dynamicznie wykrywają kolejne stacje, hamują przy przeciwległej krawędzi peronu, otwierają drzwi na 4,5–6,5 s i ruszają dalej.
- **Pociąg poprzedzający na naszym torze (`leadingTrainSystem.ts`, `leadingTrainContracts.ts`)**: w Trybie Służbowym podczas Godzin szczytu (`duty` + `rush`) po torze gracza jedzie opóźniony skład AI (losowo Inspiro / Varsovia / Seria 81) obsługujący stacje.
- **Dynamiczna sygnalizacja blokowa + SOP-2 + Radio (`signalSystem.ts`, `simulationStepPipeline.ts`, `i18nDynamic.ts`)**: zajęty blok za poprzedzającym składem AI dynamicznie zmienia semafory na czerwony i żółty (automatycznie zwalniane po odjeździe składu AI), co natychmiast obniża limit SOP-2. Zbliżenie na < 2 odstępy wywołuje komunikat dyspozytora PL/EN (`Zwolnij, przed tobą opóźniony skład`).
- **Wizualizacja 3D (`rendererContext.ts`, `sceneWorldBuilder.ts`, `sceneScreenshotAndCctv.ts`, `sceneRigSync.ts`)**: dodano niezależny rig `leadingTrainRig` z synchronizacją modelu, malowania kierunku LED, świateł i otwierania drzwi.

## 3. Mapa Linii na żywo (Live Dispatch Map — klawisz `Tab` lub ikona na HUD)
- **Model domenowy (`dispatchMapModel.ts`)**: czysta transformacja migawki symulacji na znormalizowane pozycje stacji (obsłużona / aktywna / kolejna), kolorowe punkty semaforów oraz markery gracza i pociągów AI na obu torach.
- **Interfejs (`LiveDispatchMapOverlay.tsx`, `DispatchMapTrackDiagram.tsx`, `TopHudActionButtons.tsx`, `ControlsHelpModal.tsx`)**: półprzezroczysta (bez `backdrop-blur`), responsywna nakładka ze schematem dwutorowym, kierunkami `▶`/`◀`, podglądem odstępu do poprzedzającego składu oraz pełnym wsparciem PL/EN i klawisza `Tab`.
