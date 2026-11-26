# 008 — Przebudowa modelu 3D Siemens Inspiro (nadwozie + kabina FPP)

## Zakres zmian
1. **Zewnętrzny model 3D Siemens Inspiro (`inspiroExteriorParts.ts`, `inspiroTrainBuilder.ts`)**:
   - Aerodynamiczne, pochylone i fazowane czoło pociągu zbudowane na bazie `ExtrudeGeometry` z panoramiczną szybą w czarnej ramie, wycieraczką, bursztynowym wyświetlaczem LED `M1 MŁOCINY` oraz skośnymi reflektorami LED (białe mijania z przodu, czerwone pozycyjne na końcu składu).
   - Malowanie warszawskie: srebrny dach i poszycie, szeroki czarny pas okienny na całej długości składu, dolny czerwony pas oraz żółty akcent na froncie i przy krawędziach drzwi.
   - 4 połączone wagony o wyprofilowanym przekroju poprzecznym, z wielofałdowymi ciemnymi harmonijkami przegubów, dachowymi modułami klimatyzacji HVAC, wózkami jezdnymi (ramy, osie, sprężyny, obracające się koła) oraz 4 parami dwuskrzydłowych drzwi rozsuwanych na boki na każdy wagon.
2. **Realistyczna kabina FPP Siemens Inspiro (`inspiroCabBuilder.ts`, `inspiroTextures.ts`)**:
   - Pochylone słupki przedniej szyby z poręczami oraz górna konsola z dwoma bocznymi monitorami podglądu peronu CCTV.
   - Ciemnoszary pulpit maszynisty z dwoma ostrymi ekranami LCD generowanymi dynamicznie (prędkość, ograniczenie, semafor, pasek mocy/hamowania, napięcie 750V DC, schemat 4-wagonowy stanu drzwi, następna stacja i zegar), podświetlanymi przyciskami funkcyjnymi, czerwonym grzybkiem hamulca awaryjnego oraz ergonomiczną dźwignią nastawnika.
   - Chłodna, delikatna poświata od ekranów pulpitu (bez przesłaniania widoku tunelu).
3. **Integracja (`trainMeshBuilder.ts`, `cabBuilder.ts`, `metroSceneRenderer.ts`)**:
   - Pełne zachowanie oddzielnego klasycznego modelu Seria 81 oraz bezkolizyjne przełączanie geometrii zewnętrznej i kabiny po wyborze składu.
