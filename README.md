# 🚇 Metro M1 / M2 — Symulator Maszynisty 3D (Warsaw Metro Simulator)

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-WebGL2-000000?logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)

---

## 📖 Wprowadzenie (Introduction)

**Metro M1 / M2 — Symulator Maszynisty 3D** to zaawansowany, działający w przeglądarce symulator warszawskiego metra zbudowany w oparciu o **Three.js (WebGL2)**, **React**, **TypeScript** oraz **Web Audio / Web Speech API**. Projekt kładzie nacisk na realistyczną fizykę jazdy, pełne odwzorowanie obu warszawskich linii metra (**M1 Kabaty ↔ Młociny** oraz **M2 Bemowo ↔ Bródno**), proceduralny dźwięk trakcyjny oraz architekturę **Clean Architecture / SOLID** z całkowitym oddzieleniem warstwy domenowej od silnika renderującego 3D i interfejsu użytkownika.

Gracz wciela się w maszynistę prowadzącego jeden z trzech kultowych składów warszawskiego metra w zmiennych warunkach pogodowych i porach dnia, dbając o punktualność względem rozkładu, bezpieczeństwo ruchu (semafory, ATP, czuwak, łączność radiowa) oraz komfort pasażerów.

---

## 🎬 Prezentacja wizualna (Visual Showcase)

> Poniżej znajdują się przygotowane miejsca (placeholdery) na zrzuty ekranu, animacje GIF oraz wideo prezentujące rozgrywkę w repozytorium GitHub. Podmień ścieżki w nawiasach `(docs/media/...)` na własne nagrania lub zrzuty z Trybu Fotograficznego (`[F]`).

### 🎥 Film demonstracyjny (Gameplay Trailer / Wideo)

```markdown
<!-- Wstaw link do pliku MP4 przeciągniętego w edytorze GitHub lub miniaturę YouTube -->
https://github.com/TWOJ-LOGIN/metro-m1/assets/gameplay-trailer.mp4
```

| 📹 **[PLACEHOLDER WIDEO — Pełny przejazd ze stacji STP Kabaty do tunelu M1 i manewr zawracania]** |
| :--- |
| *Tutaj umieść 30–60 sekundowy film MP4 lub GIF prezentujący wyjazd ze słonecznego odcinka naziemnego STP Kabaty do portalu tunelu, pracę wycieraczek w deszczu, błyski z trzeciej szyny, obsługę interkomu PA oraz procedurę zawracania na torze odstawczym.* |

---

### 🖼️ Galeria zrzutów ekranu i animacji GIF (Screenshots & GIFs)

#### 1. Widok z kabiny maszynisty (FPP), lusterka na żywo i kamery CCTV
![PLACEHOLDER: Widok kabiny FPP, monitory CCTV i lusterka boczne](docs/media/placeholder-cabin-view.png)
> **Opis obrazu / GIF-a (`docs/media/placeholder-cabin-view.png`):**
> Widok z fotela maszynisty (Kamera 1) w składzie **Siemens Inspiro** lub **Škoda Varsovia**. Widoczne trzy podświetlone ekrany diagnostyczne na pulpicie, działające w czasie rzeczywistym monitory kamer bocznych **CCTV (`WebGLRenderTarget`)** pokazujące peron i wymianę pasażerów, ruchomy zadajnik jazdy oraz wolumetryczne stożki świateł reflektorów w tunelu.

#### 2. Pulpit sterowniczy (HUD), wskaźnik Komfortu Pasażerów (G-Force) i Interkom PA
![PLACEHOLDER: Interfejs HUD, pasek Komfortu G-Force oraz otwarty panel Interkomu PA](docs/media/placeholder-hud-comfort-pa.png)
> **Opis obrazu / GIF-a (`docs/media/placeholder-hud-comfort-pa.png`):**
> Zbliżenie na dolny i górny interfejs **HUD**: prędkościomierz z nachyleniem toru (`‰ / %`), wskaźnik semafora i blokady ATP, zegar rozkładu jazdy z deltą punktualności, koralik trasy M1/M2, pasek **Komfortu Pasażerów (0–100%)** z żywym odczytem przeciążenia **G-Force (`0.00 G`)** oraz rozwinięty panel **Interkomu PA (`[I]`)** z trzema komunikatami głosowymi.

#### 3. Interakcja ze stacją, wymiana pasażerów i perony wyspowe / boczne
![PLACEHOLDER: Wjazd na stację Centrum lub Świętokrzyska i wymiana pasażerów](docs/media/placeholder-station-interaction.gif)
> **Opis obrazu / GIF-a (`docs/media/placeholder-station-interaction.gif`):**
> Animacja GIF prezentująca precyzyjne wyhamowanie w zielonej strefie zatrzymania (`STOP ZONE`), otwarcie drzwi po właściwej stronie peronu (`[Q]` peron wyspowy / `[E]` peron boczny), animowanych pasażerów wsiadających do wagonów, podgląd wnętrza jednoprzestrzennego (Kamera 4) oraz mijanie pociągu jadącego po sąsiednim torze.

#### 4. Tor odstawczy (250 m), czerwony kozioł oporowy i ciągły kurs powrotny
![PLACEHOLDER: Manewr zawracania na torze odstawczym przed kozłem oporowym](docs/media/placeholder-turnaround-siding.gif)
> **Opis obrazu / GIF-a (`docs/media/placeholder-turnaround-siding.gif`):**
> Animacja GIF pokazująca wjazd na 250-metrowy **tor odstawczy** za stacją końcową z ograniczeniem prędkości do **20 km/h**, zatrzymanie przed oświetlonym na czerwono **kozłem oporowym 3D** oraz przejście do drugiej kabiny (`[T]`) z automatycznym odwróceniem kierunku linii na wyświetlaczach LED.

---

## ✨ Kluczowe funkcje (Key Features)

### 🆕 Nowe systemy operacyjne i pasażerskie
- **Komfort Pasażerów i Wskaźnik Przeciążeń (Passenger Comfort & G-Force System):**
  - Elegancki wskaźnik **Komfort (0–100%)** oraz miernik przeciążeń wzdłużnych i poprzecznych (**G-Force**) na pulpicie HUD.
  - Gwałtowne szarpanie nastawnikiem, ostre hamowanie w ostatniej chwili przed stacją, użycie hamulca awaryjnego lub zbyt szybki wjazd w łuk obniżają komfort i wywołują komunikaty ostrzegawcze (np. *„Zbyt ostre hamowanie!”*).
  - Płynne ruszanie i łagodne wyhamowywanie regenerują komfort pasażerów i przyznają bonus punktowy na podsumowaniu kursu (**do +150 pkt**).
- **Procedura Zawracania na Torze Odstawczym (Terminus Turnaround & Continuous Return Trip):**
  - Po obsłużeniu ostatniej stacji gracz może zakończyć zmianę lub wybrać **„Jedź na tor odstawczy (Kurs powrotny)”**.
  - Za stacją końcową znajduje się **250-metrowy tor odstawczy** z limitem **20 km/h**, oznakowaniem strefy zatrzymania oraz trójwymiarowym, oświetlonym na czerwono **kozłem oporowym**.
  - Po zatrzymaniu w strefie zawracania przycisk **„Zmień kabinę [T]”** przenosi maszynistę z płynnym zaciemnieniem do przeciwległej kabiny, odwraca kierunek linii na wyświetlaczach LED i koraliku trasy oraz przelicza nowy rozkład jazdy z zachowaniem ciągłości wyniku, pasażerów i XP.
- **Panel Ręcznych Komunikatów Maszynisty (Driver PA / Intercom Panel `[I]`):**
  - Kompaktowy panel z 3 komunikatami odczytywanymi syntezą mowy (**Web Speech API**) z realistycznym gongiem i pogłosem głośnika wagonowego (**Web Audio API**):
    1. *„Proszę odsunąć się od drzwi, pociąg odjeżdża.”* — skraca czas wymiany pasażerów w godzinach szczytu o **1,5 s** i zmniejsza ryzyko awarii drzwi o **65%**.
    2. *„Przepraszamy za chwilowy postój w tunelu.”* — uspokaja pasażerów podczas postoju przed czerwonym semaforem (**+5% komfortu**).
    3. *„Proszę zachować ostrożność, trudne warunki na torach.”* — daje bonus **+4% komfortu** podczas jazdy w trybie **Deszcz**.

### 🚆 Tabor, Trasy i Fizyka
- **3 szczegółowe składy 3D o unikalnej fizyce i dźwięku:**
  - **Seria 81 (Klasyk)** — ciężki skład z oporowym rozruchem, klasycznym malowaniem, zewnętrznymi lusterkami bocznymi 3D na wysięgnikach i ciepłymi reflektorami.
  - **Siemens Inspiro** — nowoczesny skład jednoprzestrzenny z falownikami IGBT, szybkim przyspieszeniem i ekranami CCTV w kabinie.
  - **Škoda Varsovia** — najnowszy pociąg warszawskiego metra z charakterystycznym pasem LED, 3 szerokimi ekranami dotykowymi, podświetleniem ambientowym i odzyskiem energii (hamowaniem elektrodynamicznym).
- **Pełne, autentyczne linie warszawskiego metra (w obu kierunkach + wybór stacji początkowej):**
  - **Linia M1 (STP Kabaty ↔ Młociny)** — odcinek naziemny STP Kabaty z wjazdem przez portal do tunelu oraz wszystkie **21 stacji** (perony wyspowe oraz boczne na stacji Centrum).
  - **Linia M2 (Bemowo ↔ Bródno)** — pełna trasa **18 stacji** z podświetlanymi kolorowymi filarami i szybszymi, nowoczesnymi rozjazdami.
  - **Kreator Własnych Linii (Custom Line Builder)** — możliwość projektowania własnych linii (np. M3, M4), konfiguracji nazw, kolorów ścian, układu peronów (wyspowy/boczny) i odległości między stacjami.
- **Realistyczny profil toru i środowisko 3D:**
  - Zakręty w poziomie z przechyłką (*cant*) i ograniczeniami prędkości na łukach, wzniesienia i spadki wpływające na bezwładność składu, rozjazdy przed stacjami, iskry z trzeciej szyny oraz dynamiczny culling segmentów tunelu gwarantujący wysokie FPS.

### 🎥 Kamery, Lusterka Live, Efekty i Tryby Gry
- **Działające w czasie rzeczywistym lusterka boczne i system CCTV (`WebGLRenderTarget` + podgląd PiP `[M]`)** oraz **6 kamer (`[V]`)**: Kabina FPP, Lusterko boczne, Kamera zewnętrzna, Wnętrze pasażerskie, Kamera wózka przy trzeciej szynie oraz Kamera peronowa.
- **Zaawansowane oświetlenie i pogoda:** światła krótkie/długie (`[L]`) z bonusem za przygaszenie przed pociągiem z naprzeciwka, lampka sufitowa w kabinie (`[K]`), tryb **Deszcz** z mokrymi szynami na odcinku naziemnym, poślizgiem kół i wycieraczkami (`[X]`).
- **6 trybów rozgrywki:**
  - **Służba (Duty)** — jazda rozkładowa na punkty, oceny `S–D`, rekordy, Ghost Delta na żywo i wykres **Tachografu** na podsumowaniu.
  - **Akademia Maszynisty (Tutorial)** — interaktywne szkolenie krok po kroku z podświetlaniem kontrolek i przyznaniem Licencji Maszynisty.
  - **Wyzwania (Challenges)** — scenariusze specjalne (*Awaria falownika*, *Czarna seria*, *Przejazd techniczny*).
  - **Nocny Serwis / Inspekcja Tunelu (02:30)** — przejazd inspekcyjny przez przygaszone stacje z oświetlonymi ekipami spawaczy w tunelu (wymóg zwolnienia do `≤ 20 km/h` i podania sygnału `Klakson [H]`).
  - **Przejazd jako Pasażer (ATO)** oraz **Tryb Swobodny (Sandbox)** z obsługą **Autopilota ATO (`[A]`)**.
- **Tryb Fotograficzny (`[F]`)** z wolną kamerą 3D, regulacją FOV, przechyłu (Tilt), filtrami kolorystycznymi i zapisem zrzutów do pliku PNG.
- **Pełna obsługa kontrolerów (Gamepad API z wibracjami), ekranów dotykowych (Mobile / Tablet)** oraz **dwujęzyczny interfejs (Polski / Angielski)**.

---

## ⌨️ Sterowanie (Controls Overview)

| Klawisz / Kontrolka | Funkcja |
| :--- | :--- |
| `W` / `S` lub `↑` / `↓` | Zwiększ / zmniejsz moc i hamowanie (nastawnik jazdy) |
| `Spacja` | Hamulec roboczy (płynne zwalnianie) |
| `B` | Hamulec awaryjny |
| `Q` / `E` | Otwórz / zamknij drzwi **Lewe** (peron wyspowy) / **Prawe** (peron boczny) |
| `I` | **Interkom PA** — panel ręcznych komunikatów głosowych dla pasażerów |
| `T` | **Zmień kabinę** na torze odstawczym (rozpocznij ciągły kurs powrotny) |
| `L` / `K` | Przełącz reflektory (Wył. → Krótkie → Długie) / Lampka w kabinie |
| `C` / `R` | Potwierdzenie **Czuwaka** / Potwierdzenie **Radia dyspozytora (+40 pkt)** |
| `H` / `X` | Klakson / Wycieraczki przedniej szyby |
| `V` / `M` | Zmiana kamery (1–6) / Powiększony monitor **CCTV PiP** |
| `A` | Autopilot **ATO** (w trybie Sandbox i Przejazd Pasażera) |
| `F` | **Tryb Fotograficzny** (wolna kamera na pauzie + eksport PNG) |
| `P` / `Esc` / `?` | Pauza i Ustawienia / Pomoc ze skrótami klawiszowymi |

---

## 🚀 Instalacja i uruchomienie (Installation & Setup)

Projekt korzysta z narzędzia **Vite** oraz menedżera pakietów **npm** (lub **bun**).

### Wymagania wstępne
- **Node.js** w wersji `18.x` lub nowszej (`20.x+` zalecane)
- Przeglądarka wspierająca **WebGL2**, **Web Audio API** oraz **Web Speech API** (Chrome, Edge, Firefox, Safari)

### Kroki instalacji

1. **Sklonuj repozytorium:**
   ```bash
   git clone https://github.com/TWOJ-LOGIN/metro-m1.git
   cd metro-m1
   ```

2. **Zainstaluj zależności:**
   ```bash
   npm install
   ```

3. **Uruchom serwer deweloperski Vite (domyślnie na porcie `3000`):**
   ```bash
   npm run dev
   ```
   Następnie otwórz w przeglądarce adres: `http://localhost:3000`

4. **Uruchom testy jednostkowe warstwy domenowej oraz sprawdzanie typów TypeScript:**
   ```bash
   npm run lint
   npx tsx --test src/domain/*.test.ts
   ```

5. **Zbuduj wersję produkcyjną:**
   ```bash
   npm run build
   npm run preview
   ```

---

## 🏗️ Architektura projektu (Clean Architecture & SOLID)

Kod źródłowy przestrzega rygorystycznego rozdzielenia odpowiedzialności (**Separation of Concerns**):

- `src/domain/` — czysta logika domenowa i symulacyjna TypeScript (zero zależności od DOM, Reacta czy Three.js): fizyka pociągu, profil toru, semafory, rozkład, komfort pasażerów i G-Force (`comfortSystem.ts`), procedura zawracania (`turnaroundSystem.ts`), interkom PA (`paIntercomSystem.ts`), autopilot ATO, awarie, pogoda, profil maszynisty i osiągnięcia + komplet testów jednostkowych (`*.test.ts`).
- `src/scene/` — silnik renderowania 3D w **Three.js**: budowniczy tunelu, stacji, składów 3D, kokpitów FPP, systemu lusterek i kamer CCTV (`WebGLRenderTarget`), kozła oporowego na torze odstawczym (`turnaroundSidingBuilder.ts`) oraz efektów cząsteczkowych.
- `src/audio/` — proceduralny silnik dźwiękowy **Web Audio API** (dźwięk falowników, stukot szyn, syk pneumatyki, trzaski trzeciej szyny, gong i echo interkomu PA) oraz syntezator zapowiedzi **Web Speech API**.
- `src/input/` — kontrolery wejścia dla klawiatury oraz padów (**Gamepad API**).
- `src/components/` & `src/hooks/` — responsywny interfejs użytkownika w **React + Tailwind CSS** z pełną lokalizacją PL/EN.
