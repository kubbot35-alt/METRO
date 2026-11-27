# System Komfortu Pasażerów, Zawracania na Torze Odstawczym i Interkomu PA

## Zakres zmian
1. **Komfort Pasażerów i Wskaźnik G-Force (`src/domain/comfortSystem.ts`, `src/components/ComfortGaugeWidget.tsx`)**:
   - Wprowadzono moduł `PassengerComfortSystem` obliczający w czasie rzeczywistym przeciążenia wzdłużne i poprzeczne (`longitudinalG`, `lateralG`, `totalG`) oraz wskaźnik komfortu `0–100%`.
   - Wykrywanie zdarzeń dyskomfortu z lokalizacją PL/EN: hamowanie awaryjne, zbyt ostre hamowanie (w tym w ostatniej chwili przed stacją), gwałtowne szarpanie nastawnikiem oraz zbyt szybki wjazd w zakręt.
   - Regeneracja komfortu przy płynnej jeździe i bonus punktowy na podsumowaniu kursu (`+150 / +100 / +50 pkt` poza trybami swobodnymi), prezentowany wraz ze średnim komfortem `%` w `CourseSummaryModal`.

2. **Tor Odstawczy i Ciągły Kurs Powrotny (`src/domain/turnaroundSystem.ts`, `src/scene/turnaroundSidingBuilder.ts`, `src/components/TurnaroundOverlay.tsx`)**:
   - Na ekranie podsumowania po obsłużeniu stacji końcowej dodano przycisk **„Jedź na tor odstawczy (Kurs powrotny)”**.
   - Za stacją końcową zbudowano 250-metrowy odcinek toru odstawczego z ograniczeniem `20 km/h`, oznakowaniem strefy zawracania i 3D kozłem oporowym ze świecącymi czerwonymi światłami STOP oraz ścianą zamykającą tunel.
   - Po zatrzymaniu w strefie przed kozłem oporowym aktywuje się przycisk / klawisz **`T` („Zmień kabinę [T]”)**, który uruchamia płynne zaciemnienie przejścia, odwraca kierunek linii (LED i koralik stacji), przelicza nowy rozkład od aktualnego zegara i kontynuuje kurs z zachowaniem punktów, pasażerów i statystyk.

3. **Interkom PA / Ręczne Komunikaty Maszynisty (`src/domain/paIntercomSystem.ts`, `src/components/PaIntercomPanel.tsx`, `src/audio/metroAudioEngine.ts`, `src/audio/speechAnnouncer.ts`)**:
   - Dodano skrót klawiszowy **`I`** oraz przycisk **`PA [I]`** na pulpicie otwierający kompaktowy panel z 3 gotowymi komunikatami (PL/EN) nadawanymi głosem przez Web Speech API z charakterystycznym gongiem i echem głośnika pokładowego Web Audio API:
     - *„Proszę odsunąć się od drzwi, pociąg odjeżdża.”* — w godzinach szczytu przyspiesza wymianę pasażerów o `1,5 s` i zmniejsza ryzyko awarii drzwi o `65%`.
     - *„Przepraszamy za chwilowy postój w tunelu.”* — na postoju przed czerwonym semaforem podnosi komfort o `+5%`.
     - *„Proszę zachować ostrożność, trudne warunki na torach.”* — w trybie Deszcz przyznaje `+4%` komfortu.

## Architektura i Weryfikacja
- Pełna separacja logiki domenowej od widoku (SOLID / SRP / DIP z wstrzykiwaniem zależności przez konstruktor w `MetroSimulationEngine`).
- Testy jednostkowe dodane w `src/domain/comfortPaTurnaround.test.ts`.
