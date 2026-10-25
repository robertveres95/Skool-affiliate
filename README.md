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
├── script.js    # két funkció: görgetéskor beúszó kártyák és a mobilos sticky CTA mutatása/elrejtése
├── assets/      # a Váltópont-logó webre kicsinyített, veszteségmentes PNG-másolatai (128, 304, 456 px)
└── README.md
```

A Váltópont 2.0 megjelenés tudnivalói:
- A logófájlok az eredeti, jóváhagyott logóból készült arányos kicsinyítések; forma, felirat és színek változatlanok. Az eredeti, nagy felbontású fájl nem része a repónak.
- A beúszás egyszeri és visszafogott; JavaScript nélkül, szkripthiba esetén és csökkentett mozgást kérő beállításnál minden tartalom animáció nélkül látható.

## Kommunikációs alapelvek (tartalmi szabályok)

- Nincs ügyfélvélemény, sikersztori, bevételi statisztika, kitalált szám.
- Nincs garancia, nincs mesterséges sürgetés (visszaszámláló, „csak ma” stb.).
- A „Biztosan fogok pénzt keresni?” kérdésre a válasz egyértelműen: **nem garantálható**.
- **Díj és megújulás:** a 7 napos próba után a nyilvános ajánlat szerint 33 USD + áfa/hó díjú, automatikusan megújuló tagság indul, ha a látogató a próba lejártáig nem mondja le. Az oldal ezt a próbadobozban és a GYIK-ban részletesen, az „Először ismerd meg” és a záró CTA mellett, valamint a mobilos sticky sávban röviden közli.
- **Lemondás:** a részletes lemondási feltételeket a Skool hivatalos oldalán kell ellenőrizni; a GYIK erre irányít.
- **Ajánlói (affiliate) tájékoztatás** – nem csak a láblécben szerepel:
  - a fejléc „7 nap ingyen” gombja alatt diszkrét „Ajánlói link” jelzés áll;
  - a hero, az „Először ismerd meg” és a záró CTA közelében rövid ajánlói tájékoztatás olvasható;
  - a mobilos sticky CTA alatt rövid díj- és ajánlói közlés jelenik meg: „Ajánlói link · a próba után 33 USD + áfa/hó”;
  - a láblécben a teljes ajánlói tájékoztatás szerepel;
  - a főcím előtt nincs hosszú ajánlói bekezdés, az első képernyő a márkaüzenetet és a főcímet emeli ki.
- **Üzemeltető:** a Váltópont nem üzemelteti a bemutatott Skool-közösséget; ezt a hero CTA melletti közlés, a közösségi szakasz, a GYIK és a lábléc is kimondja.

---

## Megvalósítás WordPress + Elementor Pro alatt

> Ez az útmutató az első (v1) dizájn szerkezetét és színeit írja le. A Váltópont 2.0 színei, méretei és animációi a `style.css` `:root` változóiban, illetve a `script.js`-ben vannak; Elementorban ezek közelítésével lehet dolgozni.

### 1. Elementor szekciók / konténerek

Javasolt: **Flexbox Container** alapú felépítés, oldalanként egy külső (boxed, max. 1080 px) konténer szekciónként.

| # | Konténer neve (Elementor Navigator) | HTML megfelelő | Háttér |
|---|---|---|---|
| 0 | `Header` (Theme Builder → Header, vagy oldalon belüli konténer) | `.site-header` | fehér |
| 1 | `S1 Hero` | `#hero` | fehér |
| 2 | `S2 Mit tanulhatsz` | `#tanulas` | világosszürke `#f4f6fa` |
| 3 | `S3 Közösség` | `#kozosseg` | fehér |
| 4 | `S4 Tanulj fejlődj` | `#fejlodes` | világosszürke |
| 5 | `S5 Kinek való` | `#kinek` | fehér |
| 6 | `S6 Ismerd meg` | `#ismerd-meg` | sötétkék `#14284b` |
| 7 | `S7 GYIK` | `#gyik` | fehér |
| 8 | `S8 Záró CTA` | `#zaro` | világosszürke |
| 9 | `Footer` (Theme Builder → Footer, vagy konténer) | `.site-footer` | sötétkék |

Tipp: a CSS ID-kat (`hero`, `tanulas`, …) állítsd be a konténer *Advanced → CSS ID* mezőjében, így horgonylinkek is működnek.

### 2. Szekciók elemei (widgetek)

- **Header:** Heading/Text (logó szöveg) + Button („7 nap ingyen”, kicsi, sötétkék), alatta kis, szürke „Ajánlói link” jelzés. Belső konténer: row, space-between.
- **S1 Hero:** Text Editor (eyebrow, nagybetűs) → Heading H1 → Text Editor (probléma-mondat, bal oldali narancs vonallal) → Text Editor (alcím) → Text Editor (félkövér: „Akkor is kipróbálhatod, ha most ismerkedsz a témával.”) → belső konténer narancs kerettel (próbadoboz: „7 napos ingyenes próbaidő”, alatta a 33 USD + áfa/hó díj és az automatikus megújulás) → Text Editor (kis betűs ajánlói közlés) → Button (fő CTA).
- **S2 Mit tanulhatsz meg?:** Heading H2 + Text Editor (intro) + belső konténer 3 kártyával. Kártyánként: Icon (vagy emoji szöveg) + Heading H3 + Text Editor. Alternatíva: **Icon Box** widget.
- **S3 Közösség:** Heading H2 + Text Editor + 3× **Icon Box** (ikon balra mobilon, felül desktopon).
- **S4 Tanulj, fejlődj, építs:** Heading H2 + 3 kártya konténer (Heading H3 + Text Editor), felső 4 px sötétkék border.
- **S5 Kinek való?:** Heading H2 + 2 oszlopos belső konténer. Bal: Heading H3 + **Icon List** (✓ zöld ikon). Jobb: Heading H3 + **Icon List** (✕ piros/terrakotta ikon).
- **S6 Ismerd meg:** Heading H2 (fehér) + Text Editor + Text Editor (kis betűs ajánlói és díjközlés) + Button.
- **S7 GYIK:** Heading H2 + **Accordion** (vagy Elementor Pro *Toggle*) widget, 4 elemmel. Alapból minden elem zárva legyen (Accordion → „Default state: collapsed”, ha elérhető).
- **S8 Záró CTA:** Heading H2 + Text Editor (kis betűs ajánlói és díjközlés) + Button.
- **Footer:** Text Editor: nem bevételi ígéret; teljes ajánlói tájékoztatás (jutalék, és hogy a bemutatott Skool-közösséget nem a Váltópont üzemelteti); kapcsolati e-mail-link.
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
- **Mobilos sticky CTA:** Elementor Pro-ban egy külön konténer a lap alján, *Advanced → Motion Effects → Sticky: Bottom*, csak mobilon látható (*Responsive → Hide on Desktop/Tablet*). A gomb alatt rövid díj- és ajánlói közlés: „Ajánlói link · a próba után 33 USD + áfa/hó”. Egyszerűbb MVP-változat: mindig látszik mobilon. (A `script.js` logikája – rejtés, amíg a hero CTA vagy a záró CTA látszik – opcionális, HTML widgetbe beilleszthető.)
- Oldal címe és meta leírás (SEO pluginnal vagy a téma beállításaiban) – a szövegek az `index.html` `<head>` részében.
- A 7 napos próbaidő és a 33 USD + áfa/hó díj **ellenőrzése** a Skool oldalon élesítés előtt; ha változik, frissíteni kell a CTA-feliratokat, a próbadobozt, a CTA-k melletti és a sticky közlést, a GYIK-ot és a meta leírást.

### 6. Amit NEM építünk az MVP-be

- blog
- chatbot
- backend rendszer
- felhasználói regisztráció
- email automatizáció / feliratkozó űrlap
- fizetési rendszer
- analitika, követőkódok, pixelek
- cookie banner / cookie kezelő rendszer (ha később analitika kerül be, akkor válik szükségessé)
- komplex animációk, parallax (kivétel a Váltópont 2.0 egyszeri, visszafogott kártyabeúszása – lásd a fájlstruktúra alatti tudnivalókat)
- A/B tesztelés
- ügyfélvélemények, sikersztorik, bevételi számok, visszaszámlálók – amíg nincs valós, ellenőrizhető forrás
