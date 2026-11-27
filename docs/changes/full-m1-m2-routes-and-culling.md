# Rozbudowa linii M1 i M2 do pełnych tras oraz dynamiczny culling 3D

## Zakres zmian

1. **Pełna Linia M1 (21 stacji: STP Kabaty → Młociny)**:
   - Zaktualizowano definicję w `src/domain/routeData.ts` o komplet 21 rzeczywistych stacji warszawskiej linii M1 wraz z autentycznym układem peronów (wyspowe `[Q]` oraz boczne `[E]` na Centrum, Słodowcu, Starych Bielanach, Wawrzyszewie i Młocinach) oraz charakterystycznymi akcentami kolorystycznymi (m.in. zieleń i biel na Polu Mokotowskim, szarość i srebro na Centrum, błękit ze złotem na Placu Wilsona, cegła na Starych Bielanach).
2. **Pełna Linia M2 (18 stacji: Bródno → Bemowo)**:
   - Rozszerzono linię M2 do wszystkich 18 rzeczywistych stacji z peronami wyspowymi `[Q]` i indywidualną paletą kolorów ścian każdej stacji (wyświetlacz LED `M2 BEMOWO`, kierunek przeciwny `BRÓDNO`).
3. **Wybór stacji startowej i kierunku (`src/domain/routeVariant.ts`, `TitleOverlay.tsx`, `useMetroGame.ts`)**:
   - Dodano czysty kompilator wariantu trasy (`compileRouteVariant`) obsługujący odwrócenie kierunku (`Normalny` / `Powrotny` z automatyczną zamianą napisu na tablicy LED) oraz start z dowolnej stacji pośredniej.
   - Zintegrowano selektor „Stacja startowa” i przełącznik „Kierunek” w menu startowym (PL i EN).
4. **Przesuwny koralik trasy (`RouteLineStrip.tsx`, `computeSlidingRouteWindow`)**:
   - Zastąpiono statyczną listę stacji płynnym oknem przesuwnym pokazującym stację poprzednią, bieżącą i 4 kolejne z czytelnymi etykietami oraz paskiem postępu całej linii (`Stacja X / Y`).
5. **Optymalizacja renderowania 3D (Distance Culling ~1200 m)**:
   - Podzielono geometrię tunelu (tory, podkłady, szyny prądowe, żebra/lampy, tablice i odcinki powłoki) w `src/scene/tunnelBuilder.ts` na segmenty 600 m objęte dynamicznym ukrywaniem poza zasięgiem 1200 m.
   - Dodano dynamiczny culling stacji (`stationBuilder.ts`), tłumów pasażerów (`passengerManager.ts`) i semaforów (`semaphoreBuilder.ts`), aktualizowany co klatkę w `metroSceneRenderer.ts`.
