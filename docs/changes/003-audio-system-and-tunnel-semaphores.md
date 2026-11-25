# 003 — System dźwięków Web Audio API oraz semafory i system ATP w tunelu

## Cel zmiany
Rozbudowa symulatora metra o wielowarstwowy, proceduralny system dźwiękowy (Web Audio API bez zewnętrznych zasobów) oraz system blokady liniowej (semafory 3-komorowe po prawej stronie tunelu wraz z automatycznym hamulcem bezpieczeństwa ATP).

## Nowe i zaktualizowane moduły

### 1. System dźwięków (`src/audio/`)
- `soundLayers.ts`: Ciągłe warstwy syntezowane w Web Audio API:
  - Falownik trakcyjny (dwuharmoniczny oscylator z filtrem dolnoprzepustowym modulowanym prędkością i nastawnikiem mocy).
  - Szum toczenia po torach (proceduralny przefiltrowany szum różowy narastający z prędkością).
  - Pisk hamulców (wąskopasmowy filtr pasmowoprzepustowy aktywny podczas hamowania poniżej 20 km/h).
- `metroAudioEngine.ts`: Sygnał zamykania drzwi (`pip-pip-pip` + syk pneumatyki), syk powietrza przy pełnym zatrzymaniu (`brakeStopHiss`), alarm ATP oraz gong zwolnienia semafora.
- `src/input/keyboardInputController.ts`: Automatyczne odblokowanie `AudioContext` przy pierwszym kliknięciu (`pointerdown`) lub naciśnięciu klawisza (`keydown`).

### 2. Semafory i system ATP (`src/domain/signalSystem.ts`, `src/scene/semaphoreBuilder.ts`, `src/components/SignalIndicator.tsx`)
- `signalSystem.ts`: Implementacja `ISignalController` (`TunnelSignalSystem`) rozmieszczająca 10 semaforów co 250–305 m oraz przed każdym wjazdem na stację.
  - Losowe światło czerwone (20% szans), automatyczne światło żółte na poprzedzającym semaforze (ograniczenie prędkości do 30 km/h).
  - Zatrzymanie przed czerwonym semaforem uruchamia 5–8 s odliczanie, po którym semafor zmienia się na zielony.
  - Przejechanie na czerwonym świetle uruchamia system ATP (natychmiastowy hamulec bezpieczeństwa, ostrzeżenie i kara -200 pkt).
- `semaphoreBuilder.ts`: Trójwymiarowe sygnalizatory po prawej stronie tunelu z daszkami i trzema emisyjnymi soczewkami (`fog: false`) widocznymi z daleka oraz dynamicznym światłem punktowym w `MetroSceneRenderer`.
- `SignalIndicator.tsx`: Kompaktowy powtarzacz semafora na pulpicie maszynisty pokazujący aktualny kolor, status/odliczanie oraz odległość w metrach.
