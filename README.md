# Kefalonia Vakantie Planner 🌊

Een interactieve vakantie-onboarding app waarmee jullie samen de trip naar Kefalonia
(**13 – 27 juni 2026**, 14 nachten) dag voor dag plannen. Eén persoon vult een naam in,
kiest per dag activiteiten uit een rijke catalogus, ziet meteen de reisafstanden op een
kaart, en houdt een terugkeer-code over om later op elk apparaat verder te gaan.

Alles draait in **één enkel `index.html`-bestand** — geen build-stap, geen framework,
geen backend nodig.

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
├── index.html        ← de volledige app (HTML + CSS + JS in één bestand)
├── package.json      ← alleen Playwright als devDependency (testopzet)
├── README.md
└── .gitignore
```

> De app zelf heeft geen runtime-dependencies. `package.json` bevat enkel Playwright,
> bedoeld voor toekomstige end-to-end tests.

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

## Lokaal testen

```bash
# Simpelste manier — open het bestand direct:
open index.html

# Of via een lokale server (aan te raden, zodat fetch/CDN's netjes werken):
npx serve .
```

## Deployen op Coolify

1. Push deze repository naar een Git-host (GitHub, GitLab, Gitea, of `git.7rb.nl`)
2. Open je Coolify dashboard
3. **New Resource → Static Site**
4. Koppel de repository
5. Build settings:
   - **Build pack**: `Static`
   - **Publish directory**: `/` (de root)
   - **Index file**: `index.html`
6. Stel je gewenste domein/subdomain in (bijv. `kefalonia.jouwnaam.nl`)
7. Deploy → klaar!

Geen build-stap nodig — puur HTML/CSS/JS.

## Een nieuwe activiteit toevoegen

Alle activiteiten staan als object-literals in de `ACTIVITIES`-array in `index.html`
(rond regel 1774). Kopieer het onderstaande template en vul alle verplichte velden in.

### Template

```js
{
  // ── VERPLICHT ──────────────────────────────────────────────────────────
  id:       'x1',                    // Unieke string; gebruik prefix per categorie:
                                     //   s=stranden · c=cultuur · n=natuur
                                     //   e=eten · b=bday (verjaardag) · hotel=e9
  cat:      'stranden',              // Categorie — zie tabel hieronder
  icon:     '🏖️',                   // Één emoji als visuele marker op de kaart en kaart
  title:    'Naam van de activiteit',// Korte weergavenaam (Nederlands)
  duration: 120,                     // Duur in minuten — zie toegestane waarden hieronder
  why:      'Waarom dit een ...',    // Motivatie: wat maakt dit de moeite waard? (1–2 zinnen)
  tip:      'Praktische tip ...',    // Concreet advies: beste tijd, wat meenemen, combineren
  cost:     0,                       // Geschatte kosten in euro's (geheel getal; 0 = gratis)
  location: 'Locatienaam, Dorp, Kefalonia', // Leesbare locatie (voor tooltip en overzicht)
  mapUrl:   'https://www.google.com/maps/search/?api=1&query=...+Kefalonia',
  lat:      38.300,                  // Breedtegraad (decimaal, ~5 decimalen)
  lng:      20.500,                  // Lengtegraad (decimaal, ~5 decimalen)

  // ── OPTIONEEL ──────────────────────────────────────────────────────────
  reservation: true,   // Voeg toe als vooraf boeken verplicht of sterk aanbevolen is.
                       // Toont oranje "📋 Reserveer vooraf!"-badge in de dag- en overzichtsweergave
                       // en telt mee in de reserveringsteller op de overzichtspagina.
                       // Weglaten (of false) = geen badge.
  special:     true,   // Uitsluitend voor cat:'bday'-activiteiten. Geeft de kaart gouden
                       // stijl en toont het "Verjaardagsidee"-label. Weglaten voor alle
                       // andere categorieën.
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

> **Positie in de array:** voeg de activiteit toe in de bijpassende blok-sectie
> (gemarkeerd met `// ── STRANDEN ──`, `// ── NATUUR ──`, enzovoort). De volgorde
> binnen een categorie bepaalt de weergavevolgorde in de UI.

---

## Technische details

- **Pure HTML/CSS/JS** — geen framework, geen bundler, één bestand
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
