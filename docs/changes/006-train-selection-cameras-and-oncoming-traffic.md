# 006 — Ekran startowy z wyborem składu, system kamer (V) i ruch z naprzeciwka

## Cel zmian
Rozbudowa symulatora Metro M1 o wybór pociągu przed kursem, trzy widoki kamery z pełnym modelem 3D składu oraz pociągi mijające gracza po równoległym sąsiednim torze wraz z efektem dźwiękowym podmuchu powietrza.

## Architektura (SOLID / Separation of Concerns)
- **Warstwa domeny (`src/domain/`)**:
  - `trainCatalog.ts`: definicje profili `SERIA_81_SPEC` (215 t, niższy i głośniejszy silnik, pulpit retro) oraz `SIEMENS_INSPIRO_SPEC` (162 t, dynamiczny rozruch, mocne hamulce, falownik IGBT, nowoczesny kokpit), a także etykiety i przełącznik trybów kamer (`cab` → `mirror` → `exterior`).
  - `trafficSystem.ts`: czysta klasa domenowa `OppositeTrackTrafficSystem` implementująca `ITrafficController`, generująca nadjeżdżający skład co 40–70 s i wyzwalająca zdarzenie `passingTrainWhoosh` w momencie mijanki.
  - `trainPhysics.ts` & `metroSimulation.ts`: dynamiczne przełączanie konfiguracji fizyki poprzez `setTrainModel`, obsługa `cycleCameraPressed` z komunikatem `cameraNotice` oraz wstrzyknięcie kontrolera ruchu `ITrafficController`.
- **Warstwa audio (`src/audio/`)**:
  - `soundLayers.ts` & `metroAudioEngine.ts`: dynamiczne dopasowanie fal i częstotliwości silnika/falownika do wybranego składu oraz synteza podmuchu powietrza mijającego pociągu (`playPassingTrainWhoosh`).
- **Warstwa 3D (`src/scene/`)**:
  - `tunnelBuilder.ts` & `stationBuilder.ts`: poszerzony układ dwutorowy z równoległym torem po lewej (`x = -4.6`), rzędem słupów dzielących (`x = -2.35`) oraz podniesionym stropem dla kamery zewnętrznej.
  - `trainMeshBuilder.ts`: kompozytowy 4-wagonowy model 3D pociągu (czoło + 3 wagony, podświetlane okna, przesuwne drzwi peronowe, reflektory i światła tylne), współdzielony przez skład gracza i skład jadący z naprzeciwka.
  - `cabBuilder.ts` & `metroSceneRenderer.ts`: stylizacja ramy kabiny pod wybrany tabor oraz płynne przełączanie między widokiem kabiny, lusterka peronowego i kamery zewnętrznej.
- **Warstwa UI (`src/components/`, `src/hooks/`)**:
  - `TitleOverlay.tsx`: menu startowe z wyborem między **Serią 81 (Klasyk)** a **Siemens Inspiro (Nowoczesny)**.
  - `SpeedometerGauge.tsx` & `CabDashboardHud.tsx`: wskazówkowy prędkościomierz analogowy i szaro-zielony pulpit retro dla Serii 81 oraz ciemny kokpit cyfrowy LED dla Inspiro.
  - `TopHudBar.tsx`: przycisk szybkiego przełączania kamery `[V]` oraz tymczasowy baner z nazwą aktywnego widoku.
