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
| `reservation` | boolean   | —         | `true` = toont "📋 Reserveer vooraf!"-badge en telt in de reserveringsteller. Default `false`. |
| `special`     | boolean   | —         | `true` = gouden "Verjaardagsidee"-stijl. **Alleen toegestaan bij `cat: "bday"`.** Default `false`. |

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
