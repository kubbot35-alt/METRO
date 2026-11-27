# Tunnel Effects, Advanced Train Lighting & Night Service Inspection Mode

## Summary of Changes

### 1. Domain Layer (Pure TypeScript, SOLID & DIP)
- **`src/domain/lightingAndSparksSystem.ts` (`ILightingAndSparksController` / `LightingAndSparksSystem`)**:
  - Added 3-state front headlight cycle (`off` → `low` → `high` → `off`) and cab ceiling dome light toggle (`K`).
  - Added oncoming train high-beam glare detection (`14–195 m` ahead) prompting the driver to dim high beams and awarding a one-time `+25 pkt` courtesy bonus per oncoming encounter.
  - Added third-rail electric arc spark event generator triggered by strong acceleration, hard braking, and turnout crossings with cooldown and intensity decay.
- **`src/domain/nightInspectionSystem.ts` (`INightInspectionController` / `NightInspectionSystem`)**:
  - Added Night Service (`02:30`) track inspection checkpoint spawning in tunnels and near stations.
  - Evaluates safe crew passage (`<= 20 km/h` and warning horn `[H]` sounded on approach) for `+120 pkt` + dispatcher radio confirmation, or `-90 pkt` BHP violation otherwise.
- **`src/domain/timeOfDayCatalog.ts`**, **`src/domain/challengeCatalog.ts`**, **`src/domain/achievements.ts`**, **`src/domain/radioSystem.ts`**:
  - Added `night_service` (`02:30`, zero passengers) to Time of Day catalog and as the 4th Challenge scenario.
  - Added `night_inspector` (**Nocny Inspektor** / **Night Inspector**) achievement for flawless Night Service completion.
  - Extended `DispatcherRadioSystem` with `'inspection'` category confirmations.
- **`src/domain/i18nCatalog.ts`** & **`src/domain/i18nDynamic.ts`**:
  - Full PL & EN translations for all new modes, achievements, HUD banners, feedback messages, and inspection radio dispatches.

### 2. 3D Scene & Audio Layers
- **`src/scene/tunnelEffectsBuilder.ts`**: Volumetric semi-transparent headlight cones (scaling with low/high beams, tunnel/rain visibility, and graphics quality) + third-rail electric blue-white flash `PointLight` and pooled `THREE.Points` spark bursts.
- **`src/scene/nightCrewBuilder.ts`**: Composite 3D maintenance crews with high-vis reflective vests, waving orange signal wand, chevron hazard barricade, pulsing orange strobe beacons, and dynamic orange tunnel light.
- **`src/scene/stationHallBuilder.ts`** & **`src/scene/stationBuilder.ts`**: Night Service station blackout (main ceiling strips OFF, dimmed signage) with warm emergency ceiling lamps and animated flashing yellow platform beacons.
- **`src/scene/metroSceneRenderer.ts`**, **`src/scene/cabMotionController.ts`**, **`src/scene/passengerManager.ts`**, **`src/scene/surfaceDepotBuilder.ts`**: Integrated high-beam SpotLight range/angle, cab ceiling dome light, empty platforms in Night Service, deep-night STP Kabaty sky, and graphics-quality scaling.
- **`src/audio/metroAudioEngine.ts`**: Added Web Audio synthesis for electric third-rail spark crackles, high-beam courtesy chime, checkpoint cleared chime, and BHP violation buzz.

### 3. Input, Hooks & UI
- **`src/input/keyboardInputController.ts`** & **`src/hooks/useMetroGame.ts`**: Added `K` shortcut for cab ceiling light, instant HUD lighting toggles, and audio/HUD state syncing.
- **`src/components/TitleOverlay.tsx`**, **`CabDashboardHud.tsx`**, **`TopHudBar.tsx`**, **`MobileTouchControls.tsx`**, **`ControlsHelpModal.tsx`**, **`CourseSummaryModal.tsx`**, **`src/App.tsx`**: Added 3-state headlight indicator, `Kabina [K]` toggle, oncoming `"Przygaś długie!"` prompt, Night Service progress & track crew warning checklist banner, and full PL/EN menu & summary support.
