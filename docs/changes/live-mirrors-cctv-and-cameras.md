# Lusterka boczne na żywo, system CCTV oraz nowe kamery (Wózek i Stacyjna)

## Zakres zmian
1. **Lusterka i monitory CCTV na żywo (`WebGLRenderTarget` 256×160):**
   - Utworzono moduł domenowy `src/domain/mirrorCctvSystem.ts` określający politykę odświeżania klatek zależną od jakości grafiki (`Wysoka` = co 2. klatkę ~30 FPS, `Średnia` = co 4. klatkę ~15 FPS, `Niska` / wyłączone = tryb statyczny) oraz logikę kanałów CCTV i auto-przełączania kamery stacyjnej.
   - Zaimplementowano `src/scene/liveMirrorSystem.ts` z lekkimi render targetami `256×160` (lewy, prawy oraz opcjonalny wewnętrzny CCTV) i odbiciem lustrzanym UVs w poziomie. Podczas renderowania kamer bocznych tymczasowo widoczny jest zewnętrzny skład pociągu, dzięki czemu na stacjach widać otwierające się drzwi, peron i pasażerów.
   - Dopasowanie sprzętowe do składu (`src/scene/cabMirrorAttachments.ts` oraz modele zewnętrzne):
     - **Seria 81:** fizyczne lusterka zewnętrzne 3D na wysięgnikach widoczne w kabinie FPP oraz na modelu zewnętrznym.
     - **Siemens Inspiro i Škoda Varsovia:** brak lusterek na wysięgnikach — aerodynamiczne obudowy kamer bocznych na zewnątrz nosa oraz dwa monitory CCTV w kabinie (`CAM L` / `CAM P`) z zielonym podświetleniem ramki dla aktywnej strony peronu.

2. **Powiększony podgląd CCTV (`M` lub kliknięcie w monitor/lusterko 3D) i nowe kamery (`V`):**
   - Dodano komponent `src/components/CctvPreviewOverlay.tsx` wyświetlający powiększony obraz na żywo w prawym górnym rogu ekranu (z filtrem scanline CCTV, znacznikiem `REC ●`, aktualnym zegarem symulatora i przełącznikiem `Auto / CAM L / CAM P / Wnętrze`).
   - Dodano raycasting na ekranach 3D w kabinie — kliknięcie lewego lub prawego monitora/lusterka otwiera powiększony podgląd wybranej strony.
   - Rozszerzono cykl kamer pod klawiszem `V` do 6 widoków: dodano **Kamerę 5 (Kamera wózka / torowa)** przy przednim wózku i iskrach z trzeciej szyny oraz **Kamerę 6 (Kamera stacyjna / peronowa)** pod sufitem stacji (automatycznie przełączającą się na kamerę dachową w tunelu).

3. **Optymalizacja i Ustawienia:**
   - Dodano ustawienie `liveMirrorsEnabled` zapisywane w `localStorage` oraz przełącznik **„Lusterka i kamery na żywo (CCTV)”** w `SettingsModal.tsx` wraz ze wskaźnikiem częstotliwości odświeżania.
