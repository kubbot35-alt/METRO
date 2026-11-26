# Škoda Varsovia oraz Tryb Fotograficzny (Photo Mode)

## Zakres zmian
1. **Trzeci grywalny skład: Škoda Varsovia (`src/domain/trainCatalog.ts`, `src/scene/varsovia*`, `src/audio/soundLayers.ts`)**
   - Dodano specyfikację `SKODA_VARSOVIA_SPEC` z najpłynniejszym rozruchem, cichym hamowaniem rekuperacyjnym oraz czystym sinusoidalnym dźwiękiem nowoczesnego falownika (`waveMain: 'sine'`, `regenerativeHum: true`, `brakeSquealScale: 0.16`).
   - Zbudowano szczegółowy model 3D składu (`varsoviaExteriorParts.ts`, `varsoviaTrainBuilder.ts`) w warszawskim malowaniu (biel/jasna szarość, szeroki czarny pas okien i panoramiczna czarna maska czołowa, czerwony pas dolny, żółte akcenty drzwi i zderzaka, przegubowe harmonijki między wszystkimi 4 wagonami) wraz z charakterystycznym „uśmiechniętym” pasem świateł LED.
   - Zbudowano minimalistyczny kokpit FPP (`varsoviaCabBuilder.ts`, `varsoviaTextures.ts`) z 3 szerokimi ekranami dotykowymi (prędkość/ATP, diagnostyka składu + rekuperacja kW, podgląd kamer bocznych CCTV), podświetleniem ambientowym LED i precyzyjnym zadajnikiem jazdy.
   - Rozbudowano wnętrze pasażerskie Kamery 4 (`passengerInteriorBuilder.ts`) o jasny wariant Škoda Varsovia (białe/srebrne panele, szaro-czerwone fotele, szczotkowane poręcze i podłużne ekrany LCD).
   - Ruch pociągów AI na przeciwległym torze losuje obecnie spośród wszystkich 3 składów (`seria81`, `inspiro`, `varsovia`).

2. **Tryb Fotograficzny — Photo Mode (`src/domain/photoMode.ts`, `src/scene/metroSceneRenderer.ts`, `src/hooks/useMetroGame.ts`, `src/components/PhotoModeOverlay.tsx`)**
   - Aktywowany klawiszem `F` podczas jazdy lub z menu Pauzy (`StatusModal`).
   - Zatrzymuje całą symulację w stop-klatce (pociąg gracza, pasażerowie, pociąg AI, deszcz) i ukrywa cały HUD gry.
   - Wolna kamera (Free Cam): obrót przeciągnięciem myszy, lot `W/A/S/D`, wysokość `Q/E`, przyspieszenie `Shift`, zoom kółkiem myszy.
   - Kompaktowy narożny panel z suwakami `FOV` (`30°–100°`) i `Tilt` (`-25°..+25°`), 4 filtrami (`Normalny`, `Kinowy`, `Retro VHS`, `Noir`), przyciskiem `Reset` oraz eksportem czystego zrzutu `Zrób zdjęcie (PNG)` (automatycznie ukrywającym panel przed zapisem klatki WebGL z aktywnym filtrem).
   - Ponowne naciśnięcie `F` lub `Esc` płynnie przywraca rozgrywkę, HUD i poprzednią kamerę.
