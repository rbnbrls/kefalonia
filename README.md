# Kefalonia Vakantie Planner 🌊

Een interactieve vakantie-onboarding app waarmee jullie samen de trip naar Kefalonia
(**13 – 27 juni 2026**, 14 nachten) dag voor dag plannen. Eén persoon vult een naam in,
kiest per dag activiteiten uit een rijke catalogus, ziet meteen de reisafstanden op een
kaart, en houdt een terugkeer-code over om later op elk apparaat verder te gaan.

**Geen framework, geen backend, geen bundler.** De app is opgesplitst in een handvol
losse statische bestanden (`index.html` + `styles.css` + `app.js`) en elke activiteit
staat als **los JSON-bestand** in [`activities/`](activities/). Een klein, dependency-loos
Node-script (`build.js`) bundelt die JSON-bestanden tot `activities.generated.js`. De
gegenereerde site blijft **100% statisch** — Coolify hoeft niets te bouwen.

## Wat het doet

### Welkomstscherm
- Naam invullen en de vakantie starten
- **Welkom-terug banner** — een eerder plan in deze browser wordt automatisch herkend
  (via `localStorage`) en kan met één klik hervat worden
- **Terugkeer-code** — plak een eerder bewaarde `KEF1-…` code om je plan op een ander
  apparaat te herstellen (de code bevat het volledige plan, geen server nodig)

### Dagplanner
- **14 dagen** plus aparte **heen- en terugvlucht­pagina's** met sleek ticket-design
  (Transavia AMS ⇄ EFL)
- Activiteiten­catalogus van 35+ opties verdeeld over categorieën: **stranden, cultuur &
  dorpjes, natuur & actief, eten & drinken, hotel & relaxen**
- Elke activiteit heeft een icoon, beschrijving (waarom), praktische tip, geschatte duur,
  kosten, een locatie op de kaart en een optionele `reservation`-vlag wanneer vooraf boeken
  verplicht of sterk aanbevolen is
- **Detail-modal** per activiteit met alle info en een "Selecteer voor vandaag"-knop
- **Tijdsbudget per dag** — visuele balk op basis van 9 beschikbare uren (09:00–18:00),
  die oranje/rood kleurt wanneer een dag te vol raakt
- **Speciale verjaardagsdag (15 juni)** met een eigen exclusieve pool romantische ideeën
  (privé sunset cruise, diner bij Tassia, private wine tasting …)
- Een gekozen activiteit verdwijnt uit de pool van andere dagen (geen duplicaten)
- **Confetti** 🎉 wanneer een dag wordt afgerond
- **Activiteit voorstellen** — mis je iets? Een formulier stuurt je suggestie naar de
  beheerder via een n8n-webhook
- **"Alle activiteiten"** — knop in de sidebar opent de activiteiten­catalogus (zie hieronder)

### Interactieve kaart
- **Split-screen Leaflet-kaart** naast de planner (op desktop) toont per dag het hotel,
  de gekozen activiteiten en de werkelijke autoroute
- Reisafstanden en -tijden worden live berekend via de **OSRM**-routeservice, met een
  haversine-schatting als fallback (luchtlijn × 1,5 + Lixouri Bay-toeslag)
- **Statusbadge** linksonder op de kaart toont in realtime de kwaliteit van de routes:
  - *✓ Echte routes* — OSRM gaf exacte wegafstanden terug
  - *~ Geschatte routes* — OSRM tijdelijk niet bereikbaar, haversine-schatting gebruikt
  - *⚠ Snelheidslimiet bereikt* — OSRM rate-limit actief, schatting als fallback
  - *✕ Routeservice onbereikbaar* — server/netwerk-fout, schatting als fallback
- Route-statistieken tonen een *~schatting*-label wanneer OSRM niet beschikbaar was
- Knop om de dagroute direct in **Google Maps** te openen
- **Overzichtskaart** met alle ingeplande plekken van de hele vakantie in één blik

### Activiteiten­catalogus
- **Volledig overzicht** van alle 39 activiteiten in één sorteerbare tabel
- **Filteren** op categorie (stranden / cultuur / natuur / eten / hotel / verjaardag),
  kosten (gratis / betaald) en reserveringsverplichting
- **Vrije zoekbalk** doorzoekt naam, locatie en motivatietekst tegelijk
- **Kolomsortering** — klik een kolomhoofd (Activiteit, Categorie, Duur, Kosten,
  Locatie, Reservering) om oplopend te sorteren; nogmaals klikken sorteert aflopend,
  met een ↑ / ↓ pijl als indicator
- **Ingepland-kolom** toont per activiteit of en op welke dag hij al in het plan zit
- Klikken op een rij opent de bestaande detail-modal met "Selecteer voor vandaag"
- Bereikbaar via de **"📋 Alle activiteiten bekijken"-knop** onderaan de sidebar
  (desktop) of via **Menu → Alle activiteiten** op mobiel

### Overzichtspagina
- Statistieken (aantal geplande dagen, activiteiten, geschatte kosten …)
- **Reserveringsteller** — stat card toont hoeveel geplande activiteiten vooraf gereserveerd
  moeten worden, zodat je niets mist
- Vlucht- & reisinformatie als tickets
- Volledige kaart + dag-voor-dag overzicht
- Per activiteit een **"📋 Reserveer vooraf!"-badge** bij activiteiten die advance booking
  vereisen (bootcharter, restaurantreservering, begeleide tours, privéproeverijen …)
- **Printbaar / op te slaan als PDF** (eigen print-stylesheet)
- Terugkeer-code kopiëren om later verder te gaan

### Mobiel
- Volledig responsive; op telefoon verschijnt een **bottom navigation bar** met
  dag-wisselaar en budget-indicator
- **Bottom sheets** voor het kiezen van een dag en voor het hoofdmenu

## Repository structuur

```
kefalonia/
├── index.html               ← HTML-shell: markup + verwijzingen naar de losse bestanden
├── styles.css               ← alle CSS (los bestand t.b.v. caching)
├── app.js                   ← alle applicatielogica (los bestand t.b.v. caching)
├── activities/              ← bron van waarheid: één JSON-bestand per activiteit
│   ├── README.md            ← het verplichte template + veldspecificatie
│   ├── _TEMPLATE.json       ← kopieersjabloon voor een nieuwe activiteit
│   ├── s1-myrtos-beach.json
│   └── …                    ← 39 activiteiten
├── activities.generated.js  ← GEGENEREERD door build.js (window.ACTIVITIES = […])
├── build.js                 ← zero-dependency Node-script: valideert + bundelt activities/
├── package.json             ← npm-scripts (build/dev) + Playwright als devDependency
├── README.md
└── .gitignore
```

### Hoe het laadt

`index.html` laadt in volgorde: `styles.css`, Leaflet (CDN), `activities.generated.js`
(zet `window.ACTIVITIES` klaar) en daarna `app.js` (de logica, die `window.ACTIVITIES`
inleest). `app.js` blijft een *classic script* in global scope, zodat de inline
`onclick`-handlers in de HTML blijven werken — bewust geen ES-modules of framework.

> **Waarom opgesplitst?** Onderhoudbaarheid (CSS, logica en data los van elkaar) en
> caching: wijzig je alleen een activiteit, dan verandert enkel `activities.generated.js`
> en blijven `styles.css`/`app.js` in de browsercache staan.

> De app heeft geen runtime-dependencies. `package.json` bevat enkel Playwright,
> bedoeld voor end-to-end tests. `build.js` gebruikt **uitsluitend de Node-standaardlib**.

## Externe diensten (via CDN / API, geen eigen backend)

| Dienst | Waarvoor | Beschikbaarheid |
|--------|----------|----------------|
| [Leaflet 1.9.4](https://leafletjs.com/) | Kaartweergave (via unpkg CDN) | Hoog (CDN) |
| [OpenStreetMap / CARTO](https://www.openstreetmap.org/) | Kaarttegels | Hoog (CDN) |
| [OSRM](https://project-osrm.org/) (`router.project-osrm.org`) | Autoroutes & reistijden | Ongegarandeerd — publieke demo-server, rate-limited |
| Google Fonts | Cormorant Garamond + DM Sans | Hoog (CDN) |
| n8n webhook (`n8n.7rb.nl`) | Ontvangt voorgestelde activiteiten | Zelfgehost |

### Productieoverweging: OSRM

De app gebruikt de **publieke demo-server** van OSRM (`router.project-osrm.org`). Die is
**niet SLA-geborgd en rate-limited** — bij intensief gebruik of tijdens piekperiodes kan
de service tijdelijk 429-responses of time-outs geven.

De app vangt dit volledig op:
- **6 seconden timeout** per verzoek (via `AbortController`)
- **429/5xx/netwerk-fouten** worden apart herkend met specifieke gebruikersmeldingen
- Na **3 opeenvolgende fouten** stopt de app met OSRM-verzoeken (sessie-breed) en
  schakelt volledig over op de haversine-fallback
- De **statusbadge** op de kaart en het **~schatting-label** in de route-statistieken
  maken altijd duidelijk welke kwaliteit de getoonde afstanden hebben

Voor een productie-omgeving met gegarandeerde beschikbaarheid:
- **Zelfgehoste OSRM** — draai een eigen OSRM-instantie (bijv. Docker op je VPS)
- **GraphHopper** (open-source, zelfhostbaar) als alternatief
- **Mapbox Directions API** of **Google Routes API** als betaalde optie

## Lokaal draaien

```bash
# Genereer activities.generated.js en start een lokale server:
npm run dev          # = node build.js && npx serve .

# Of los:
npm run build        # valideert activities/ en (her)genereert activities.generated.js
open index.html      # daarna direct te openen (alle scripts laden lokaal, geen fetch)
```

> Je hoeft `npm run build` alleen te draaien als je iets in `activities/` hebt veranderd.
> `activities.generated.js` wordt **meegecommit**, dus een verse clone werkt meteen.

## Deployen op Coolify (blijft statisch)

De gegenereerde site is puur HTML/CSS/JS — **er hoeft op de server niets gebouwd te
worden**, omdat `activities.generated.js` al in de repo zit.

1. Push deze repository naar een Git-host (GitHub, GitLab, Gitea, of `git.7rb.nl`)
2. Open je Coolify dashboard
3. **New Resource → Static Site**
4. Koppel de repository
5. Build settings:
   - **Build pack**: `Static`
   - **Publish directory**: `/` (de root)
   - **Index file**: `index.html`
   - **Build command**: *leeg laten* — niet nodig
6. Stel je gewenste domein/subdomain in (bijv. `kefalonia.jouwnaam.nl`)
7. Deploy → klaar!

> Wil je de build tóch op Coolify laten draaien (bijv. om validatie af te dwingen),
> zet dan de **Build command** op `npm run build` en houd **Publish directory** op `/`.
> Dat blijft binnen de `Static` build pack — de uitvoer is en blijft statisch.

## Een nieuwe activiteit toevoegen

Activiteiten zijn **losse JSON-bestanden** in [`activities/`](activities/) — één bestand
per activiteit. De volledige veldspecificatie staat in
[`activities/README.md`](activities/README.md); hieronder de korte versie.

1. Kopieer [`activities/_TEMPLATE.json`](activities/_TEMPLATE.json) naar
   `activities/<id>-<slug>.json` (bijv. `s10-skala-beach.json`).
2. Vul de verplichte velden in. Laat `reservation`/`special` op `false` tenzij van toepassing.
3. Run `npm run build` — dit **valideert** je bestand en regenereert `activities.generated.js`.
4. Commit zowel het nieuwe `.json`-bestand als de bijgewerkte `activities.generated.js`.

De build **globt** alle bestanden in `activities/` automatisch — er is geen manifest of
lijst om bij te werken. Eén bestand neerzetten volstaat. Bestanden die met `_` beginnen
(zoals `_TEMPLATE.json`) worden overgeslagen.

> **AI-agents:** voeg/bewerk uitsluitend bestanden in `activities/` volgens het template.
> Onbekende velden, een foute `cat`/`duration`, een dubbele `id` of een ontbrekend
> verplicht veld laten `npm run build` **falen met een duidelijke melding** — draai de
> build dus altijd en bevestig dat de validatie slaagt voordat je commit.

### Template

```json
{
  "id": "s10",
  "cat": "stranden",
  "icon": "🏖️",
  "title": "Naam van de activiteit",
  "duration": 120,
  "why": "Waarom is dit de moeite waard? (1–2 zinnen)",
  "tip": "Praktische tip: beste tijd, wat meenemen, slim combineren.",
  "cost": 0,
  "location": "Locatienaam, Dorp, Kefalonia",
  "mapUrl": "https://www.google.com/maps/search/?api=1&query=...+Kefalonia",
  "lat": 38.300,
  "lng": 20.500,
  "reservation": false,
  "special": false
}
```

### Toegestane categorieën (`cat`)

| Waarde     | Label in de UI                    | Wanneer gebruiken                          |
|------------|-----------------------------------|--------------------------------------------|
| `stranden` | 🏖️ Stranden & Baaien             | Stranden, baaien, zwemplekken              |
| `cultuur`  | 🏛️ Cultuur & Dorpjes             | Dorpjes, kastelen, musea, grotten, kloosters |
| `natuur`   | 🌿 Natuur & Actief               | Wandelen, kajakken, boots, nationale parken |
| `eten`     | 🍷 Eten, Drinken & Ervaringen    | Restaurants, proeverijen, markten, cafés   |
| `hotel`    | 🏨 Hotel & Relaxen               | Alleen voor hotel/spa-activiteiten         |
| `bday`     | 🎂 Verjaardagsideeën             | Exclusieve pool, alleen zichtbaar op 15 juni |

### Toegestane duurwaarden (`duration`)

`0` · `45` · `60` · `90` · `120` · `150` · `180` · `240` · `360` · `480`

Waarde `0` = "geen tijdsindicatie" (bijv. hotel/spa). Waarden ≥ 420 worden weergegeven
als "Hele dag" en blokkeren andere activiteiten op dezelfde dag.

### Volledig eigenschappenoverzicht

| Eigenschap    | Type      | Verplicht | Beschrijving                                                      |
|---------------|-----------|:---------:|-------------------------------------------------------------------|
| `id`          | `string`  | Ja        | Unieke identifier; prefix bepaalt categorie (s/c/n/e/b)          |
| `cat`         | `string`  | Ja        | Categorie-key — zie tabel hierboven                               |
| `icon`        | `string`  | Ja        | Één emoji; verschijnt op de kaart-marker en activiteitenkaart     |
| `title`       | `string`  | Ja        | Weergavenaam van de activiteit                                    |
| `duration`    | `number`  | Ja        | Duur in minuten; telt mee in het tijdsbudget van de dag (9 uur)   |
| `why`         | `string`  | Ja        | Motivatietekst in de detail-modal ("Waarom dit?")                 |
| `tip`         | `string`  | Ja        | Praktisch advies in de detail-modal                               |
| `cost`        | `number`  | Ja        | Geschatte kosten in € (geheel getal; 0 = gratis)                  |
| `location`    | `string`  | Ja        | Leesbare locatie voor tooltip en overzichtspagina                 |
| `mapUrl`      | `string`  | Ja        | Google Maps-link die opent bij klikken op de locatienaam          |
| `lat`         | `number`  | Ja        | Breedtegraad voor Leaflet-marker en OSRM-routing                  |
| `lng`         | `number`  | Ja        | Lengtegraad voor Leaflet-marker en OSRM-routing                   |
| `reservation` | `boolean` | Nee       | `true` = badge "📋 Reserveer vooraf!" + telt in reserveringsteller |
| `special`     | `boolean` | Nee       | `true` = gouden UI-stijl; **alleen voor `cat: 'bday'`**           |

> **Volgorde in de UI:** `build.js` sorteert op categorie
> (`stranden → cultuur → natuur → eten → hotel → bday`) en daarbinnen op het numerieke
> deel van de `id` (`s1`, `s2`, …). De bestandsnaam doet er voor de volgorde niet toe;
> de `id` bepaalt de positie.

---

## Technische details

- **Pure HTML/CSS/JS** — geen framework, geen bundler; opgesplitst in `index.html` +
  `styles.css` + `app.js`, met activiteiten als losse JSON-bestanden in `activities/`
- **`build.js`** — zero-dependency Node-script (alleen de standaardlib) dat `activities/*.json`
  valideert tegen het verplichte template en bundelt tot `activities.generated.js`. De
  deploy blijft statisch: het gegenereerde bestand wordt meegecommit, de server bouwt niets
- Vier "schermen" (welkom, planner, catalogus, overzicht) geschakeld via CSS-klassen
- **State** wordt bewaard in `localStorage` én is te exporteren als zelfbevattende
  base64url-code (`KEF1-…`) — volledig serverloos
- Kaart en routing volledig client-side via Leaflet + OSRM, met caching van
  routesegmenten en geometrie
- **OSRM-foutafvang**: AbortController-timeout (6s), 429/5xx/netwerk-detectie,
  automatische sessie-brede uitschakeling na 3 opeenvolgende fouten, haversine-fallback
- **`reservation: true`** op een activiteit markeert dat vooraf boeken verplicht of sterk
  aanbevolen is; de dag-voor-dag weergave toont dan een oranje "📋 Reserveer vooraf!"-badge
  en het statistiekoverzicht telt hoeveel van de geplande activiteiten dit vereisen
- Volledig responsive met aparte mobiele navigatie en een ingebouwde print-stylesheet
- Lettertypes: Cormorant Garamond (serif) + DM Sans (sans)
</content>
</invoke>
