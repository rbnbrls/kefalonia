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
  kosten en een locatie op de kaart
- **Detail-modal** per activiteit met alle info en een "Selecteer voor vandaag"-knop
- **Tijdsbudget per dag** — visuele balk op basis van 9 beschikbare uren (09:00–18:00),
  die oranje/rood kleurt wanneer een dag te vol raakt
- **Speciale verjaardagsdag (15 juni)** met een eigen exclusieve pool romantische ideeën
  (privé sunset cruise, diner bij Tassia, private wine tasting …)
- Een gekozen activiteit verdwijnt uit de pool van andere dagen (geen duplicaten)
- **Confetti** 🎉 wanneer een dag wordt afgerond
- **Activiteit voorstellen** — mis je iets? Een formulier stuurt je suggestie naar de
  beheerder via een n8n-webhook

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

### Overzichtspagina
- Statistieken (aantal geplande dagen, activiteiten, geschatte kosten …)
- Vlucht- & reisinformatie als tickets
- Volledige kaart + dag-voor-dag overzicht
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

## Technische details

- **Pure HTML/CSS/JS** — geen framework, geen bundler, één bestand
- Drie "schermen" (welkom, planner, overzicht) geschakeld via CSS-klassen
- **State** wordt bewaard in `localStorage` én is te exporteren als zelfbevattende
  base64url-code (`KEF1-…`) — volledig serverloos
- Kaart en routing volledig client-side via Leaflet + OSRM, met caching van
  routesegmenten en geometrie
- **OSRM-foutafvang**: AbortController-timeout (6s), 429/5xx/netwerk-detectie,
  automatische sessie-brede uitschakeling na 3 opeenvolgende fouten, haversine-fallback
- Volledig responsive met aparte mobiele navigatie en een ingebouwde print-stylesheet
- Lettertypes: Cormorant Garamond (serif) + DM Sans (sans)
</content>
</invoke>
