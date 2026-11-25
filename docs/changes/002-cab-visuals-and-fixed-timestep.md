# 002 — Poprawki wizualne kabiny, oświetlenia ekranu startowego i stałego kroku czasowego

## Zidentyfikowane problemy
1. Ekran startowy renderował się przed ustawieniem pozycji reflektora przedniego, przez co tunel był początkowo czarny.
2. Ograniczenie kroku `dtSec <= 0.05` bez podkroków spowalniało czas symulacji przy niskim FPS (WebGL programowy).
3. Wycieraczka szyby przedniej łapała odblask reflektora na środku kadru.
4. Wskazówka prędkościomierza nachodziła na cyfrowy wskaźnik `km/h` przy niskich prędkościach.

## Wdrożone poprawki
- `src/scene/metroSceneRenderer.ts`: Ustawienie reflektora przed kabiną (`z - 1.45`) i inicjalizacja świateł stacyjnych od razu w `setupLights()`.
- `src/hooks/useMetroGame.ts`: Dodanie pętli podkroków fizyki (`subDt <= 0.05s`, maks. `0.35s` na klatkę) z agregacją zdarzeń audio.
- `src/scene/cabBuilder.ts`: Zmiana materiału wycieraczki na ciemną matową gumę oraz jej odsunięcie do prawego dolnego rogu szyby.
- `src/components/SpeedometerGauge.tsx`: Przebudowa tarczy na łuk postępu ze wskaźnikiem obwodowym i czytelnym odczytem cyfrowym w centrum.
- `src/scene/tunnelBuilder.ts`: Dodanie instancjonowanych poprzecznych belek sufitowych i korytek kablowych wzdłuż tunelu.
