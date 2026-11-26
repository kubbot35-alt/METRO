# 004 — Immersja w kabinie, reflektory, pasażerowie i polskie zapowiedzi stacji

## Zakres zmian
1. **Ulepszona kabina i fizyka kamery**:
   - Dodano model 3D ruchomej dźwigni nastawnika (`MasterControllerLeverPivot`) w `src/scene/cabBuilder.ts` oraz płynne tłumienie kąta w `src/scene/cabMotionController.ts` (przechył do przodu przy przyspieszaniu `W`, do tyłu przy hamowaniu `S` / `Spacja` / `B`).
   - Rozbudowano drgania i kołysanie kamery proporcjonalne do prędkości (dwuczęstotliwościowy bobbing i mikrodrgania) oraz wyczuwalny przechył do przodu przy ostrym hamowaniu.
   - Dodano obsługę włączania/wyłączania przednich reflektorów (`SpotLight`) klawiszem **`L`** oraz kontrolkę/przycisk `Światła [L]` w `CabDashboardHud.tsx` i lampkę w kabinie 3D.
2. **Trasa M1 Warszawa i pasażerowie na peronach**:
   - Zmieniono trasę w `src/domain/routeData.ts` na 12 rzeczywistych stacji warszawskiego metra linii M1 (co 600 m, łącznie 7200 m): Kabaty, Natolin, Imielin, Stokłosy, Ursynów, Służew, Wilanowska, Wierzbno, Racławicka, Pole Mokotowskie, Politechnika, Centrum.
   - Przeskalowano dynamicznie tunel (`src/scene/tunnelBuilder.ts`) i 24 semafory blokady liniowej (`src/domain/signalSystem.ts`) na pełne 7200 m.
   - Dodano `src/scene/passengerManager.ts` generujący 12–16 sylwetek low-poly oczekujących za żółtą linią na każdym peronie, animację wsiadania po otwarciu drzwi (`O`) oraz licznik przewiezionych pasażerów w `TopHudBar.tsx` i `StatusModal.tsx`.
3. **Polskie zapowiedzi stacji (Web Speech API + wyświetlacz LED)**:
   - Dodano domenowy `src/domain/announcementTracker.ts` emitujący komunikaty „Następna stacja: [Nazwa]” po ruszeniu oraz „Stacja: [Nazwa]” przy wjeździe na stację.
   - Dodano `src/audio/speechAnnouncer.ts` (`window.speechSynthesis`, `pl-PL`) z automatycznym wyciszeniem oraz pasek LED `src/components/MetroLedDisplay.tsx` w górnej części ekranu.
