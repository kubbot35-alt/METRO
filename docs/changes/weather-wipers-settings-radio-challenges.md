# Zmiany: Kamera pasażera, Radio Dyspozytora, Tryb Wyzwań, Pogoda/Wycieraczki i Ustawienia

## Zakres zmian
1. **Kamera 4 – Wnętrze wagonu (`V`)**:
   - Rozszerzono cykl kamer o widok `interior` (`cab → mirror → exterior → interior → cab`).
   - Zbudowano wnętrze 1. wagonu dopasowane do wybranego składu (Inspiro: niebieskie siedzenia, żółte poręcze; Seria 81: bordowe siedzenia, srebrne poręcze) wraz z tablicą LED następnej stacji oraz otwierającymi się drzwiami.
2. **Radio Dyspozytora (`R`)**:
   - Dodano moduł domenowy `DispatcherRadioSystem`, moduł kokpitowy `RadioDispatchModule` i baner komunikatów z 6-sekundowym oknem potwierdzenia (`+40 pkt`, trzask VHF i ton potwierdzenia w Web Audio API).
3. **Tryb Wyzwań (`Wyzwania`)**:
   - Dodano 3 scenariusze: `Awaria falownika` (60% mocy, limit opóźnienia `< 20 s`), `Przejazd techniczny` (pusty skład, brak postojów, limit `40 km/h` na stacjach), `Czarna seria` (szczyt, częste czerwone semafory i awarie drzwi, Czuwak co ~30 s) oraz dedykowane odznaki osiągnięć.
4. **Pogoda (Deszcz), Wycieraczki 3D (`X`) i Śliskie Szyny**:
   - Dodano wybór pogody (`Bez opadów` / `Deszcz`) na ekranie startowym.
   - Dodano system `MetroWeatherSystem`, opady 3D na odcinku naziemnym STP Kabaty (`rainSystemBuilder.ts`), krople na przedniej szybie czyszczone przez animowane wycieraczki 3D (`windshieldRainOverlay.ts`, `inspiroCabBuilder.ts`, `seria81CabBuilder.ts`), dźwięk deszczu i pracy wycieraczek oraz wydłużoną o ~20% drogę hamowania z kontrolką poślizgu (`POŚLIZG!`) na odcinku naziemnym i pierwszych 150 m tunelu.
5. **Panel Ustawień (`localStorage`) i Licznik FPS**:
   - Dodano `SettingsStorageService`, modal `SettingsModal` (dostępny z menu startowego i pauzy `Esc/P`), niezależne suwaki głośności (ogólna / pociąg / lektor i radio), poziomy jakości grafiki (`Niska` / `Średnia` / `Wysoka`), FOV kabiny (`60°–95°`) oraz opcjonalny licznik FPS (`FpsCounterBadge`).
