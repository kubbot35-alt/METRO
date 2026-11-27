# 2026-11-27 — Proceduralny System Reklam i Banerów 3D (Stacje & Wnętrze Wagonu)

## Cel zmiany
Rozbudowa symulatora **Metro M1 — Symulator Maszynisty 3D** o w pełni proceduralny system nośników reklamowych 3D na stacjach (wielkoformatowe banery zatorowe, dwustronne podświetlane citylighty peronowe oraz rotujące co 8 sekund cyfrowe ekrany LED DOOH) oraz plakaty i pasek informacyjno-reklamowy wewnątrz wagonu pasażerskiego (`[V]`).

## Architektura i Zgodność z SOLID
1. **Warstwa Domenowa (`src/domain/metroAdsCatalog.ts`)**:
   - Czysta logika TypeScript bez zależności od Three.js i DOM.
   - Definiuje interfejsy `IAdCampaignSpec` oraz `IStationAdAssignment`, katalog 10 dwujęzycznych (PL/EN) kampanii reklamowych (`kocur_coffee`, `metro_kom`, `warszawa_2026`, `karta_miejska`, `pierogarnia_babci`, `szkola_maszynistow`, `energia_rekuperacji`, `kino_tunel`, `muzea_noca`, `bezpieczny_peron`), detekcję stacji węzłowych DOOH (`isDoohStation`) oraz obliczenia rotacji slajdów co 8 sekund (`getDoohSlideIndex`).
2. **Warstwa Rysowania Canvas 2D (`src/scene/adCanvasPainter.ts`)**:
   - Odizolowany moduł rysujący wektorowe ilustracje i typografię PL/EN na trzech formatach płótna: wielkoformatowym `512×256` (banery i DOOH), pionowym `256×384` (citylighty) oraz panoramicznym `512×128` (plakaty nad oknami wagonu).
3. **Współdzielona Pula Tekstur i Materiałów (`src/scene/adTexturePool.ts`)**:
   - Realizuje interfejs `IAdTexturePool`. Tworzy obiekty `THREE.CanvasTexture` i `THREE.MeshStandardMaterial` dokładnie **raz** przy inicjalizacji sceny i współdzieli je pomiędzy wszystkimi stacjami oraz wagonem (minimalne zużycie VRAM/RAM).
   - Obsługuje przełączanie języka (`PL`/`EN`), rotację 3 slotów DOOH co 8 sekund oraz wygaszanie podświetlenia (`emissiveIntensity = 0`) podczas **Nocnego Serwisu (02:30)**.
4. **Konstruktor Nośników 3D (`src/scene/stationAdsBuilder.ts` oraz `src/scene/passengerInteriorBuilder.ts`)**:
   - Buduje wielkoformatowe banery na ścianach zatorowych (`6.0 m × 2.4 m`), dwustronne podświetlane citylighty na peronach wyspowych i bocznych (`1.28 m × 1.86 m`) oraz ekrany LED DOOH (`2.96 m × 1.68 m`) na głównych stacjach, a także ramki plakatowe nad oknami i na ścianie czołowej wewnątrz wagonu pasażerskiego.
