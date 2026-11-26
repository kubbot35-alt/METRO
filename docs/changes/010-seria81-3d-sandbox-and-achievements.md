# 010 — Lifting 3D Serii 81 (81-717), Tryb Wolnej Jazdy (Sandbox) oraz System Osiągnięć

## Zakres zmian
1. **Szczegółowy model 3D Serii 81 (81-717 — styl warszawski)**:
   - Utworzono `src/scene/seria81ExteriorParts.ts`, `src/scene/seria81TrainBuilder.ts` oraz `src/scene/seria81Textures.ts`: kanciasta sylwetka ze ściętym dachem (`ExtrudeGeometry`), 4 karbowane przetłoczenia na dolnej części pudła, klasyczne malowanie warszawskie (szaro-granatowy dach i góra, żółty pas pod oknami, szeroki czerwony pas dolny, biało-żółte „V” na czole), 6 okrągłych reflektorów o ciepłej barwie (4 na dole + 2 nad szybą), dwie dzielone szyby przednie z uszczelkami i wycieraczkami oraz biała tablica kierunkowa (`M1 MŁOCINY` / `M2 BRÓDNO`).
   - Utworzono `src/scene/seria81CabBuilder.ts`: retro kabina FPP w odcieniach szarości i ciemnej zieleni, dzielona szyba z wycieraczkami, fizycznie obracające się wskazówki zegarów analogowych (prędkościomierz 0–100 km/h oraz manometr przewodu hamulcowego 0–8 bar), 2 rzędy metalowych przełączników hebelkowych, 4 okrągłe lampki kontrolne i ciężka, metalowa dźwignia nastawnika.
   - Zaktualizowano `src/scene/trainMeshBuilder.ts`, `src/scene/cabBuilder.ts` i `src/scene/metroSceneRenderer.ts` (cieplejsza barwa przedniego reflektora dla Serii 81).

2. **Tryb Wolnej Jazdy (Sandbox)**:
   - Dodano `GameModeId = 'duty' | 'sandbox'` w `src/domain/types.ts` oraz przełącznik w `TitleOverlay.tsx`.
   - Wyłączono w trybie Sandbox kary punktowe, wykroczenia, czuwak, roboty torowe, losowe awarie drzwi oraz zapis do tabeli rekordów.
   - Dodano `SandboxControlsBar.tsx` na HUD z przyciskami do ręcznego wywoływania mijanki (`triggerSandboxOncomingTrain`) i przełączania światła najbliższego semafora (`cycleSandboxNextSignal`).

3. **System Osiągnięć (`localStorage`)**:
   - Utworzono `src/domain/achievements.ts` z 9 odznakami (m.in. „Punktualny jak zegarek”, „Bezbłędna służba”, „Kierowca klasyka”, „Mistrz M2”, „Nocny marek”, „Stalowe nerwy”) oraz `src/domain/sandboxAndAchievements.test.ts`.
   - Utworzono `AchievementsModal.tsx` (przycisk „Osiągnięcia” na ekranie startowym, pasek postępu i lista odznak) oraz `AchievementToast.tsx` (4-sekundowe powiadomienie w prawym górnym rogu) z krótkim dźwiękiem sukcesu `playAchievementChime()` w `MetroAudioEngine`.
