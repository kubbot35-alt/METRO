# Kreator Własnej Trasy (Custom Line Builder) oraz Profil Maszynisty i System Rang

## Zakres zmian

### 1. Warstwa domenowa (`src/domain/`)
- **`types.ts`**:
  - Rozszerzono `MetroLineId` do `string`, dodano typy `TrackAlignmentIntensity`, `ICustomStationDraft`, `ICustomLineDraft`, `DriverRankId`, `IDriverRankSpec`, `IDriverProfileStats` oraz `ICourseXpReward`.
  - Rozszerzono `IMetroLineSpec` o `badgeCode`, `isCustom` i `alignmentIntensity`, `IScheduleSnapshot` o `punctualArrivalsCount` oraz `IMetroSimulation` o `setMetroLineSpec()`.
- **`customLines.ts`**:
  - Zdefiniowano interfejsy `ICustomLineStorage` i `ICustomLineService` oraz klasę `CustomLineStorageService` (persystencja w `localStorage` pod kluczem `warsaw_metro_custom_lines_v1`).
  - Dodano walidację i kompilację własnych linii (`sanitizeCustomLineDraft`, `compileCustomLineSpec`) dla 3–12 stacji o rozstawie 400–1200 m, wyborze układu peronu (`Wyspowy [Q]` / `Boczny [E]`), kolorów ścian, startu naziemnego oraz intensywności zakrętów/wzniesień (`flat` / `moderate` / `curvy`).
  - Dodano eksport i import w formacie JSON (`exportCustomLineJson`, `importCustomLineJson`).
- **`driverProfile.ts`**:
  - Zdefiniowano interfejsy `IDriverProfileStorage` i `IDriverProfileService` oraz klasę `DriverProfileService` (`warsaw_metro_driver_profile_v1`).
  - Dodano 6-stopniową drabinę rang (`Praktykant` → `Młodszy Maszynista` → `Maszynista` → `Starszy Maszynista` → `Instruktor Ruchu` → `Legenda Metra`), kalkulator XP za ukończony kurs z mnożnikiem trybu (`calculateCourseXp`) oraz agregację statystyk kariery (km, pasażerowie, kursy, czas jazdy, najlepsza ocena, % punktualności).
- **`trackAlignment.ts`, `routeData.ts`, `scheduleSystem.ts`, `metroSimulation.ts`**:
  - Umożliwiono dynamiczne generowanie profili łuków/nachyleń i rozkładu jazdy proporcjonalnie do rozstawu stacji oraz opcji startu naziemnego dowolnej własnej linii.

### 2. Scena 3D i UI (`src/scene/`, `src/components/`, `src/hooks/`)
- **`proceduralTextures.ts`, `stationBuilder.ts`, `inspiroTextures.ts`, `seria81Textures.ts`, `passengerInteriorBuilder.ts`, `metroSceneRenderer.ts`**:
  - Obsługa dynamicznych kodów linii (`badgeCode`), kolorów przewodnich oraz pełnej przebudowy geometrii tunelu/stacji po zmianie lub edycji własnej trasy (`appliedLineSignature`).
- **`CustomLineBuilderModal.tsx`**:
  - Dwukolumnowy edytor własnej linii metra (metadane, 8 kolorów linii, przełącznik startu naziemnego, intensywność zakrętów, eksport/import JSON, lista 3–12 stacji z wyborem koloru ścian, typu peronu i odległości).
- **`DriverProfileModal.tsx`**:
  - Panel kariery z emblematem aktualnej rangi, paskiem postępu XP, 6 kartami statystyk, pełną drabiną 6 rang i bezpiecznym dwustopniowym resetem postępu.
- **`TitleOverlay.tsx`, `CourseSummaryModal.tsx`, `RouteLineStrip.tsx`, `MetroLedDisplay.tsx`, `TopHudBar.tsx`, `useMetroGame.ts`, `App.tsx`**:
  - Integracja przycisku **„Profil”**, widżetu rangi w menu startowym, przycisku **„+ Stwórz własną linię”**, edycji/usuwania zapisanych linii oraz banera **AWANS!** z podsumowaniem zdobytego XP na ekranie końca kursu.

### 3. Testy jednostkowe
- **`src/domain/customLinesAndProfile.test.ts`**: testy zapisu/odczytu linii, kompilacji stacji i peronów, eksportu/importu JSON, geometrii toru (`flat` vs `curvy`), kalkulacji XP, progresji 6 rang oraz akumulacji statystyk kariery.
