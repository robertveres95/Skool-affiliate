# Előbb készség, aztán pénz – landing page MVP

Magyar nyelvű, mobil-first affiliate landing page prototípus.

**Célközönség:** „Elegem van a jelenlegi munkámból, de nem tudom, merre tovább.”
**Pozicionálás:** „Előbb készség, aztán pénz.”

Statikus HTML + CSS, egy minimális JavaScripttel. Nincs build lépés, nincs függőség, nincs backend.
Megtekintés: nyisd meg az `index.html`-t böngészőben (vagy kapcsold be a GitHub Pages-t a repóra).

## Fájlstruktúra

```
.
├── index.html   # az oldal teljes tartalma, 8 szekció + fejléc/lábléc
├── style.css    # mobil-first stílusok, színek CSS változókban (:root)
├── script.js    # egyetlen funkció: mobilos sticky CTA mutatása/elrejtése
└── README.md
```

## Kommunikációs alapelvek (tartalmi szabályok)

- Nincs ügyfélvélemény, sikersztori, bevételi statisztika, kitalált szám.
- Nincs garancia, nincs mesterséges sürgetés (visszaszámláló, „csak ma” stb.).
- A „Biztosan fogok pénzt keresni?” kérdésre a válasz egyértelműen: **nem garantálható**.
- A 7 napos próbaidőn túl **semmilyen további feltételt nem állítunk** (ár, lemondás menete stb.). A GYIK a Skool csatlakozási oldalára irányít a pontos feltételekért.
- A láblécben csak egy rövid „nem bevételi ígéret” nyilatkozat szerepel, látható affiliate közlemény nincs.

---

## Megvalósítás WordPress + Elementor Pro alatt

### 1. Elementor szekciók / konténerek

Javasolt: **Flexbox Container** alapú felépítés, oldalanként egy külső (boxed, max. 1080 px) konténer szekciónként.

| # | Konténer neve (Elementor Navigator) | HTML megfelelő | Háttér |
|---|---|---|---|
| 0 | `Header` (Theme Builder → Header, vagy oldalon belüli konténer) | `.site-header` | fehér |
| 1 | `S1 Hero` | `#hero` | fehér |
| 2 | `S2 Mit tanulhatsz` | `#tanulas` | világosszürke `#f4f6fa` |
| 3 | `S3 Nem kell egyedül` | `#kozosseg` | fehér |
| 4 | `S4 Tanulj fejlődj` | `#fejlodes` | világosszürke |
| 5 | `S5 Kinek való` | `#kinek` | fehér |
| 6 | `S6 Ismerd meg` | `#ismerd-meg` | sötétkék `#14284b` |
| 7 | `S7 GYIK` | `#gyik` | fehér |
| 8 | `S8 Záró CTA` | `#zaro` | világosszürke |
| 9 | `Footer` (Theme Builder → Footer, vagy konténer) | `.site-footer` | sötétkék |

Tipp: a CSS ID-kat (`hero`, `tanulas`, …) állítsd be a konténer *Advanced → CSS ID* mezőjében, így horgonylinkek is működnek.

### 2. Szekciók elemei (widgetek)

- **Header:** Heading/Text (logó szöveg) + Button („7 nap ingyen”, kicsi, sötétkék). Belső konténer: row, space-between.
- **S1 Hero:** Text Editor (eyebrow, nagybetűs) → Heading H1 → Text Editor (probléma-mondat, bal oldali narancs vonallal) → Text Editor (alcím) → Text Editor (félkövér: „Nem szükséges előzetes tudás…”) → belső konténer narancs kerettel (7 napos próba kiemelés: 2 Text Editor) → Button (fő CTA).
- **S2 Mit tanulhatsz meg?:** Heading H2 + Text Editor (intro) + belső konténer 3 kártyával. Kártyánként: Icon (vagy emoji szöveg) + Heading H3 + Text Editor. Alternatíva: **Icon Box** widget.
- **S3 Nem kell egyedül:** Heading H2 + Text Editor + 3× **Icon Box** (ikon balra mobilon, felül desktopon).
- **S4 Tanulj, fejlődj, építs:** Heading H2 + 3 kártya konténer (Heading H3 + Text Editor), felső 4 px sötétkék border.
- **S5 Kinek való?:** Heading H2 + 2 oszlopos belső konténer. Bal: Heading H3 + **Icon List** (✓ zöld ikon). Jobb: Heading H3 + **Icon List** (✕ piros/terrakotta ikon).
- **S6 Ismerd meg:** Heading H2 (fehér) + Text Editor + Button.
- **S7 GYIK:** Heading H2 + **Accordion** (vagy Elementor Pro *Toggle*) widget, 4 elemmel. Alapból minden elem zárva legyen (Accordion → „Default state: collapsed”, ha elérhető).
- **S8 Záró CTA:** Heading H2 + Button.
- **Footer:** 1 Text Editor (nem bevételi ígéret).
- **Mobilos sticky CTA (opcionális):** lásd 5. pont.

### 3. Reszponzív beállítások

Breakpointok a CSS-ben: mobil alap, **≥ 640 px** tablet, **≥ 960 px** desktop. Elementorban: Mobile ≤ 767, Tablet ≤ 1024 – ezek jól illeszkednek.

| Elem | Mobil | Tablet | Desktop |
|---|---|---|---|
| Szekció padding (fent/lent) | 64 px | 64 px | 96 px |
| Oldalsó padding | 20 px | 20 px | 20 px (boxed 1080 px) |
| H1 | 30 px (1.85rem) | 38 px | 46 px |
| H2 | 24 px | 30 px | 34 px |
| Törzsszöveg | 17 px, line-height 1.65 | 17 px | 18 px |
| Kártyák (S2, S4) | 1 oszlop | 1 oszlop | 3 oszlop |
| Icon Box-ok (S3) | 1 oszlop, ikon balra | 1 oszlop | 3 oszlop, ikon felül |
| Kinek való (S5) | 1 oszlop | 2 oszlop | 2 oszlop |
| CTA gomb | **teljes szélesség**, min. 56 px magas | auto szélesség, min. 320 px | auto, min. 320 px |
| Hero/S6/S8 szöveg max. szélesség | – | 720 px | 720 px |

Színek (Elementor → Site Settings → Global Colors):
- Primary: `#14284b` (sötétkék)
- Secondary: `#2c4470`
- Text: `#2b3445`
- Accent: `#e39a2d` (CTA), hover: `#cc8520`, CTA szöveg: `#1c1c1c`
- Háttér váltó: `#f4f6fa`

Betűtípus: rendszer betűkészlet (gyors), vagy Elementorban egy jól olvasható sans-serif (pl. Inter) – egyetlen családdal.

### 4. CTA-k és céljaik

Minden CTA ugyanarra az affiliate URL-re mutat, új lapon (`target="_blank"`, `rel="noopener sponsored"`):

`https://www.skool.com/szabaduszo-affiliate/about?ref=9f8501e9ce73465b9c9ea3abf13c00f2`

| Hely | Gomb szövege |
|---|---|
| Header | „7 nap ingyen” |
| S1 Hero | „Kipróbálom 7 napig ingyen” |
| S6 Ismerd meg | „Kipróbálom 7 napig ingyen” |
| S8 Záró CTA | „Megnézem a közösséget – kipróbálom” |
| Mobilos sticky sáv | „Kipróbálom 7 napig ingyen” |

Elementorban a Button widget *Link* mezőjénél: URL beillesztése, „Open in new window” bekapcsolva, „Add nofollow” bekapcsolva (affiliate linknél ajánlott). Tipp: az URL-t érdemes egy helyen tartani (pl. Global/Dynamic tag vagy egy redirect plugin), hogy később egyszerre lehessen cserélni.

### 5. Amit WordPressben/Elementorban kell megvalósítani

- Új oldal létrehozása, sablon: **Elementor Canvas** vagy **Elementor Full Width** (a téma fejléce/lábléce nélkül, ha saját headert/footert használsz).
- Global Colors és Global Fonts beállítása (lásd 3. pont).
- A 8 szekció + header/footer felépítése konténerekből (lásd 1–2. pont).
- GYIK: Accordion/Toggle widget.
- **Mobilos sticky CTA:** Elementor Pro-ban egy külön konténer a lap alján, *Advanced → Motion Effects → Sticky: Bottom*, csak mobilon látható (*Responsive → Hide on Desktop/Tablet*). Egyszerűbb MVP-változat: mindig látszik mobilon. (A `script.js` logikája – rejtés, amíg a hero CTA látszik – opcionális, HTML widgetbe beilleszthető.)
- Oldal címe és meta leírás (SEO pluginnal vagy a téma beállításaiban) – a szövegek az `index.html` `<head>` részében.
- A 7 napos próbaidő **ellenőrzése** a Skool oldalon élesítés előtt; ha változik, az összes CTA szövegét és a hero kiemelést frissíteni kell.

### 6. Amit NEM építünk az MVP-be

- blog
- chatbot
- backend rendszer
- felhasználói regisztráció
- email automatizáció / feliratkozó űrlap
- fizetési rendszer
- analitika, követőkódok, pixelek
- cookie banner / cookie kezelő rendszer (ha később analitika kerül be, akkor válik szükségessé)
- komplex animációk, parallax, belépő effektek
- A/B tesztelés
- ügyfélvélemények, sikersztorik, bevételi számok, visszaszámlálók – amíg nincs valós, ellenőrizhető forrás
