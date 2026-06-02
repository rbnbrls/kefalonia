# Activiteiten — losse bronbestanden

Elke activiteit in de app is **één JSON-bestand** in deze map. Dit is de
**bron van waarheid**. `build.js` leest alle `*.json`-bestanden hier, valideert
ze tegen het template hieronder, en genereert daaruit `../activities.generated.js`
(`window.ACTIVITIES = [...]`) die de app inlaadt.

> Bestanden die met `_` beginnen (zoals `_TEMPLATE.json`) worden door de build
> genegeerd — handig als kopieersjabloon.

## Een activiteit toevoegen

1. Kopieer [`_TEMPLATE.json`](_TEMPLATE.json) naar een nieuw bestand met de naam
   `<id>-<slug>.json`, bijvoorbeeld `s10-skala-beach.json`.
2. Vul alle **verplichte** velden in (zie tabel). Laat `reservation`/`special`
   op `false` staan tenzij van toepassing.
3. Run vanuit de projectroot:
   ```bash
   npm run build
   ```
   De build **valideert** je bestand en regenereert `activities.generated.js`.
   Bij een fout (ontbrekend veld, foute `cat`, dubbele `id`, …) stopt de build
   met een duidelijke melding.
4. Commit zowel je nieuwe `.json` als de bijgewerkte `activities.generated.js`.

> De build **globt** automatisch alle bestanden in deze map — je hoeft nergens
> een lijst/manifest bij te werken. Eén bestand neerzetten is genoeg.

### Voor AI-agents

Voeg/bewerk uitsluitend bestanden in deze map volgens het template hieronder.
Verzin geen nieuwe velden — onbekende velden laten de build falen. Draai daarna
`npm run build` en bevestig dat de validatie slaagt voordat je commit.

## Verplicht template

Zie [`_TEMPLATE.json`](_TEMPLATE.json) voor het volledig geannoteerde sjabloon met toegestane waarden per veld.

Minimale geldige activiteit (verplichte velden, geen optionele):

```json
// Kefalonia Activiteiten — Sjabloon voor nieuwe activiteiten
// ─────────────────────────────────────────────────────────────────────────────
// GEBRUIK: Kopieer dit bestand naar een nieuw bestand: <id>-<slug>.json
//          (bijv. c10-venetiaans-fort.json). Verwijder ALLE commentaren
//          voordat je het opslaat, anders mislukt JSON.parse. Draai daarna:
//              npm run build
//
// ID-prefix per categorie:
//   s = stranden · c = cultuur · n = natuur · e = eten · b = bday
//   Het volgnummer bepaalt de positie in de UI (s1, s2, … s9, s10, …).
//   Het hotelverblijf gebruikt historisch id "e9".
//
// Onbekende velden laten de build falen — voeg niets toe buiten dit template.
// ─────────────────────────────────────────────────────────────────────────────
{
  "id": "c10",
  // ↑ string — uniek in de hele app; prefix (zie boven) + oplopend volgnummer.

  "cat": "cultuur",
  // ↑ KIES PRECIES ÉÉN van de volgende waarden (zonder aanhalingstekens aanpassen):
  //   "stranden"  →  🏖️  Stranden & Baaien       (stranden, baaien, zwemplekken)
  //   "cultuur"   →  🏛️  Cultuur & Dorpjes        (dorpen, kastelen, musea, grotten, kloosters)
  //   "natuur"    →  🌿  Natuur & Actief           (wandelen, kajakken, boten, parken)
  //   "eten"      →  🍷  Eten, Drinken & Ervaringen (restaurants, proeverijen, markten, cafés)
  //   "hotel"     →  🏨  Hotel & Relaxen           (alleen voor hotel- en spa-activiteiten)
  //   "bday"      →  🎂  Verjaardagsideeën         (exclusief; alleen zichtbaar op 15 juni)

  "icon": "🏛️",
  // ↑ Één emoji; verschijnt als marker op de kaart en op de activiteitenkaart.

  "title": "Naam van de activiteit",
  // ↑ Weergavenaam in het Nederlands.

  "duration": 120,
  // ↑ Duur in MINUTEN (niet uren!). Telt mee in het dagbudget van 9 uur.
  //   KIES PRECIES ÉÉN van deze waarden:
  //   0 | 45 | 60 | 90 | 120 | 150 | 180 | 240 | 360 | 480
  //   0   = geen tijdsindicatie (bijv. hotel/spa-ontspanning)
  //   480 = hele dag; blokkeert andere activiteiten op dezelfde dag

  "why": "Waarom is dit de moeite waard? (1–2 zinnen, in het Nederlands)",
  // ↑ Motivatietekst in de detail-modal ("Waarom dit?").

  "tip": "Praktische tip: beste tijd, wat meenemen, slim combineren. (Nederlands)",
  // ↑ Praktisch advies in de detail-modal.

  "cost": 0,
  // ↑ Geschatte kosten in € — geheel getal ≥ 0. Gebruik 0 voor gratis.

  "location": "Locatienaam, Dorp, Kefalonia",
  // ↑ Leesbare locatiestring voor tooltip en overzicht.

  "mapUrl": "https://www.google.com/maps/search/?api=1&query=38.300,20.500",
  // ↑ Google Maps-link; vervang de coördinaten door de echte lat,lng hieronder.

  "lat": 38.300,
  // ↑ Breedtegraad (decimaal, ~5 decimalen). Kefalonia ligt tussen ≈ 37.5 en 39.0.

  "lng": 20.500,
  // ↑ Lengtegraad (decimaal, ~5 decimalen). Kefalonia ligt tussen ≈ 19.5 en 21.5.

  "reservation": false,
  // ↑ true = toont "📋 Reserveer vooraf!"-badge en telt in reserveringsteller.
  //   false = geen reservering nodig (default).

  "special": false,
  // ↑ true = gouden "Verjaardagsidee"-stijl.
  //   ⚠️  ALLEEN toegestaan bij cat:"bday". Bij elke andere cat MOET dit false zijn.

  // ── Optionele velden — verwijder onderstaande regels als je ze niet gebruikt ──

  "timeOfDay": "morning",
  // ↑ Aanbevolen dagdeel. KIES PRECIES ÉÉN:
  //   "morning" | "afternoon" | "evening" | "fullday"

  "highlights": ["Hoogtepunt 1", "Hoogtepunt 2"],
  // ↑ Lijst van korte highlights (array van niet-lege strings).

  "combineWith": ["c1", "c2"],
  // ↑ Id's van activiteiten die goed combineren met deze (array van strings).

  "googleRating": 4.7,
  // ↑ Google Maps steroordeel (decimaal getal, 0.0–5.0).
  //   ⚠️  Altijd samen met googleReviewCount opgeven — beide of geen van beide.

  "googleReviewCount": 1284
  // ↑ Aantal Google-reviews (geheel getal ≥ 0).
  //   ⚠️  Altijd samen met googleRating opgeven — beide of geen van beide.
  //   Geen komma na het laatste veld!
}

```

## Velden

| Veld          | Type      | Verplicht | Beschrijving                                                                 |
|---------------|-----------|:---------:|------------------------------------------------------------------------------|
| `id`          | string    | ✅        | Unieke identifier. Prefix per categorie: `s`=stranden · `c`=cultuur · `n`=natuur · `e`=eten · `b`=bday. (Het hotel gebruikt historisch `e9`.) |
| `cat`         | string    | ✅        | Categorie-key — zie tabel hieronder.                                          |
| `icon`        | string    | ✅        | Eén emoji; marker op de kaart en op de activiteitenkaart.                     |
| `title`       | string    | ✅        | Weergavenaam (Nederlands).                                                    |
| `duration`    | number    | ✅        | Duur in minuten; telt mee in het dagbudget (9 uur). Toegestane waarden hieronder. |
| `why`         | string    | ✅        | Motivatietekst in de detail-modal ("Waarom dit?").                            |
| `tip`         | string    | ✅        | Praktisch advies in de detail-modal.                                          |
| `cost`        | number    | ✅        | Geschatte kosten in € (geheel getal ≥ 0; `0` = gratis).                       |
| `location`    | string    | ✅        | Leesbare locatie voor tooltip en overzicht.                                   |
| `mapUrl`      | string    | ✅        | Google Maps-link die opent bij klik op de locatienaam.                        |
| `lat`         | number    | ✅        | Breedtegraad (decimaal, ~5 decimalen) voor Leaflet + OSRM. Rond Kefalonia (≈ 37.5–39). |
| `lng`         | number    | ✅        | Lengtegraad (decimaal, ~5 decimalen). Rond Kefalonia (≈ 19.5–21.5).           |
| `reservation`        | boolean   | —         | `true` = toont "📋 Reserveer vooraf!"-badge en telt in de reserveringsteller. Default `false`. |
| `special`            | boolean   | —         | `true` = gouden "Verjaardagsidee"-stijl. **Alleen toegestaan bij `cat: "bday"`.** Default `false`. |
| `googleRating`       | number    | —         | Google Maps steroordeel (0.0–5.0). **Altijd samen met `googleReviewCount` opgeven.** |
| `googleReviewCount`  | number    | —         | Aantal Google-reviews (geheel getal ≥ 0). **Altijd samen met `googleRating` opgeven.** |

### Toegestane categorieën (`cat`)

| Waarde     | Label in de UI                  | Wanneer gebruiken                              |
|------------|---------------------------------|------------------------------------------------|
| `stranden` | 🏖️ Stranden & Baaien           | Stranden, baaien, zwemplekken                  |
| `cultuur`  | 🏛️ Cultuur & Dorpjes           | Dorpjes, kastelen, musea, grotten, kloosters   |
| `natuur`   | 🌿 Natuur & Actief             | Wandelen, kajakken, boots, nationale parken    |
| `eten`     | 🍷 Eten, Drinken & Ervaringen  | Restaurants, proeverijen, markten, cafés       |
| `hotel`    | 🏨 Hotel & Relaxen             | Alleen voor hotel/spa-activiteiten             |
| `bday`     | 🎂 Verjaardagsideeën           | Exclusieve pool, alleen zichtbaar op 15 juni   |

### Toegestane `duration`-waarden

`0` · `45` · `60` · `90` · `120` · `150` · `180` · `240` · `360` · `480`

`0` = "geen tijdsindicatie" (bijv. hotel/spa). Waarden ≥ 420 worden weergegeven
als "Hele dag" en blokkeren andere activiteiten op dezelfde dag.

## Volgorde in de UI

De build sorteert op **categorie** (`stranden → cultuur → natuur → eten → hotel
→ bday`) en daarbinnen op het **numerieke deel van de `id`** (`s1`, `s2`, …).
Je hoeft je dus geen zorgen te maken over de bestandsnaam-volgorde; de `id`
bepaalt de positie.
