# Autopilot (ATO) i przełącznik języka (PL / EN)

## 1. Architektura i rozdzielenie odpowiedzialności (SOLID)
- **System Autopilota ATO (`src/domain/atoSystem.ts`)**: Wydzielony, bezstanowy kontroler `MetroAtoController` implementujący czysty interfejs `IAtoController`. Oblicza docelową pozycję nastawnika (moc/hamulec) z uwzględnieniem ograniczeń prędkości, łuków, robót torowych, nachylenia toru, hamowania przed żółtym/czerwonym semaforem oraz strefy zatrzymania na stacji, a także generuje polecenia automatycznej obsługi drzwi, czuwaka, radia, reflektorów i wycieraczek.
- **Ochrona uczciwości trybów rankingowych**: Funkcja `canEnableAtoForMode` dopuszcza włączenie ATO wyłącznie w trybach `sandbox` oraz `passenger`. Tryby `duty`, `challenge` i `academy` blokują aktywację ATO komunikatem `ATO dostępne tylko w Sandbox / trybie Pasażera`, a kursy w trybie `passenger` lub z aktywnym ATO nie przyznają osiągnięć, XP kariery ani nie nadpisują rekordów tabeli i Ghost Delta.
- **System wielojęzyczności PL / EN (`src/domain/i18nCatalog.ts`, `src/domain/i18nDynamic.ts`, `src/i18n/LanguageContext.tsx`)**:
  - Centralny kontekst `LanguageProvider` z hookiem `useI18n()` podłączony do `SettingsStorageService` (persystencja w `localStorage` pod polem `language: 'pl' | 'en'`).
  - Przełącznik `PL | EN` dostępny bezpośrednio w prawym górnym rogu menu startowego oraz w panelu Ustawień.
  - Przetłumaczony cały interfejs (menu startowe, HUD pulpitu, sterowanie dotykowe, radio, Akademia, Kreator Tras, Profil i rangi, Osiągnięcia, Tryb Fotograficzny, Tachograf, Ghost Delta, podsumowanie i pauza).
  - **Zapowiedzi głosowe (Web Speech API)**: `WebSpeechAnnouncer` dobiera głos angielski (`en-US`/`en-GB`) w trybie EN i czyta naturalne angielskie zapowiedzi z zachowaniem oryginalnych polskich nazw stacji (np. *"Next station: Świętokrzyska"*, *"Station: Centrum. Platform on the left."*).

## 2. Główne zmodyfikowane i dodane moduły
- `src/domain/atoSystem.ts` — logika kontrolera ATO i walidacja trybu.
- `src/domain/i18nCatalog.ts`, `src/domain/i18nDynamic.ts`, `src/i18n/LanguageContext.tsx` — katalog tłumaczeń i translator komunikatów runtime.
- `src/domain/metroSimulation.ts` — integracja ATO (klawisz `A`, tryb `passenger` startujący w Kamerze 4 – wnętrze wagonu).
- `src/audio/speechAnnouncer.ts`, `src/hooks/useMetroGame.ts` — obsługa języka zapowiedzi Web Speech API i sterowania ATO.
- Komponenty UI (`TitleOverlay`, `SettingsModal`, `CabDashboardHud`, `MobileTouchControls`, `TopHudBar`, `LeaderboardPanel`, `CourseSummaryModal`, `TachographChart`, `StatusModal`, `ControlsHelpModal`, `AcademyGuidePanel`, `PhotoModeOverlay`, `DriverProfileModal`, `AchievementsModal`, `CustomLineBuilderModal` i pozostałe widżety HUD).
- `src/domain/atoAndI18n.test.ts` — testy jednostkowe dla ATO, zabezpieczeń rankingowych i lokalizacji PL/EN.
