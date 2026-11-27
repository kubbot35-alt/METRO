# Tryb mobilny (dotyk), Tachograf (wykres jazdy) i Ghost Delta (vs Rekord)

## Zakres zmian

1. **Tryb mobilny i sterowanie dotykowe**:
   - Dodano moduł domenowy `src/domain/mobileTouch.ts` odpowiedzialny za detekcję urządzeń dotykowych (`detectTouchDevice`), przełącznik `Auto / Wł. / Wył.` (`resolveTouchControlsActive`), logikę podpowiedzi orientacji poziomej (`shouldShowPortraitHint`), mapowanie pionowego suwaka kciukowego z punktem zerowym „0 / LUZ” (`computeThumbSliderAxis`) oraz delikatną wibrację haptyczną `navigator.vibrate(15)`.
   - Dodano komponenty `src/components/MobileTouchControls.tsx` (lewy pionowy nastawnik jazdy/hamowania utrzymujący wybraną pozycję po puszczeniu palca + przycisk `0 / LUZ` oraz prawy ergonomiczny panel przycisków: DRZWI L, DRZWI P, CZUWAK, RADIO, ŚWIATŁA, KLAKSON, KAMERA, HAM. AWAR.) i `src/components/PortraitHintBanner.tsx`.
   - Dodano kompaktowy tryb pulpitu (`compactTouchMode`) w `CabDashboardHud.tsx` oraz blokadę gestów przewijania `touch-action: none` podczas aktywnej jazdy w `src/index.css`.
   - W `SettingsModal.tsx` i `SettingsStorageService` dodano opcję **Sterowanie dotykowe (Auto / Wł. / Wył.)** zapisywaną w `localStorage`.

2. **Tachograf (wykres prędkości na ekranie podsumowania)**:
   - Dodano `src/domain/tachographSystem.ts` (`ITachographRecorder`, `TachographRecorder`) rejestrujący co 1 sekundę prędkość składu i aktywny limit prędkości, postoje na stacjach oraz punkty wykroczeń (przekroczenie prędkości, czerwony semafor, czuwak).
   - Dodano komponent SVG `src/components/TachographChart.tsx` osadzony w `CourseSummaryModal.tsx` (przerywana czerwona linia limitu, ciągła niebieska linia prędkości, pionowe znaczniki stacji i czerwone punkty wykroczeń).

3. **Porównanie z własnym rekordem na żywo (Ghost Delta)**:
   - Dodano `src/domain/ghostDelta.ts` (`IGhostRecordService`, `GhostRecordStorageService`, `computeGhostDelta`) zapisujący czasy i punktację na kolejnych stacjach dla najlepszego kursu na każdej linii (`M1`, `M2` oraz linie własne) w `localStorage` (`warsaw_metro_ghost_records_v1`).
   - Dodano wskaźnik `src/components/GhostDeltaBadge.tsx` w `TopHudBar.tsx` prezentujący na żywo różnicę punktową i czasową względem rekordu (np. `+120 pkt | -2s` lub `-40 pkt | +5s`).

## Testy
- Rozszerzono testy jednostkowe o `src/domain/mobileTachographGhost.test.ts`.
