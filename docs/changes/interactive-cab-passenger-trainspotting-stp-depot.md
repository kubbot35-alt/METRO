# Interactive 3D Cab Desk, Passenger & Trainspotting Modes, and Expanded STP Kabaty Depot

## Summary of Changes

### 1. Animated & Interactive 3D Cab Desk (FPP)
- Added pure domain control catalog and lamp state evaluator in `src/domain/cabControlsCatalog.ts` covering all 8 interactive cab controls (`doors_left`, `doors_right`, `czuwak`, `emergency`, `lights`, `wipers`, `horn`, `intercom`) with PL/EN labels, key hints, and blinking logic linked to doors, SOP-2, Czuwak, headlights, wipers, horn, and PA intercom.
- Built shared 3D composite illuminated buttons and emergency mushroom switch (`src/scene/shared/cabInteractiveButtons.ts`) attached to all three trains (`Inspiro`, `Varsovia`, `Seria 81`) via `BaseCabInterior` and `MetroCabRig`.
- Added throttled FPP pointer Raycaster (`src/scene/renderer/cabDeskRaycaster.ts`) with hover tooltip (`src/components/hud/CabControlTooltip.tsx`) and direct mouse-click execution of real cab actions.

### 2. Passenger Mode (6-Car Saloon) & Trainspotting (Platform Observer)
- Added pure domain `src/domain/passengerViewModel.ts` for switching between Left Window, Right Window, Behind-Cab Glass view, and all 6 passenger cars (`Car 1–6`).
- Added pure domain `src/domain/trainspottingSystem.ts` and `src/domain/simulation/trainspottingStepHelper.ts` enabling live platform observation on any M1/M2 station or `STP Kabaty`, continuously cycling AI trains on both Track 1 and Track 2 with smooth arrivals, door opening, boarding dwells, and departures.
- Added pointer/touch drag free-look (`src/scene/renderer/freeLookController.ts`) integrated into `SceneCameraController`, plus dedicated UI (`PassengerAndSpottingPanel.tsx`, `PassengerHudOverlay.tsx`, `TrainspottingHudOverlay.tsx`) and a new 4th Start Menu mode card (`Pasażer / Spotting`).

### 3. Expanded STP Kabaty Depot (Stabling Hall & Automatic Train Wash)
- Added pure domain `src/domain/depotHallSystem.ts` modeling Bay 1 start (`-132 m`), S-curve turnout switch (`-34 m .. -6 m`), `20 km/h` depot exit speed limit (integrated with SOP-2), and Automatic Train Wash zone (`-56 m .. -36 m`, active water mist at `≤ 10 km/h`).
- Built `src/scene/depot/depotHallBuilder.ts` (3-track Stabling & Maintenance Hall with instanced roof trusses/lamps, exit portal gate, curved turnout rails, and parked Varsovia, Inspiro, and Seria 81 consists) and `src/scene/depot/depotWashBuilder.ts` (portal gantry, 4 rotating vertical brushes + roof brush, procedural water mist `THREE.Points`).
- Added `"Start z hali STP Kabaty"` toggle option in `LineAndVariantSection.tsx` and live zone status banner in `PlayingHudLayer.tsx`.
