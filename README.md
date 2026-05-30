# Kefalonia Vakantie Planner 🌊

Een interactieve vakantie-onboarding app voor jullie trip naar Kefalonia (13–27 juni).

## Wat het doet

- **Welcome screen** — jouw naam invullen, vakantie starten
- **Dagplanner** — kies per dag 2 activiteiten uit een gevarieerde catalogus van 35+ opties
- Activiteiten die al gekozen zijn verdwijnen uit de pool (geen duplicaten)
- **Speciale verjaardagsdag (15 juni)** — aparte exclusieve pool met romantische ideeën
- **Confetti** bij elke volledig gevulde dag 🎉
- **Overzichtspagina** — heel de vakantie in één oogopslag, printbaar

## Repository structuur

```
kefalonia-planner/
└── index.html   ← alles in één bestand
```

## Deployen op Coolify

1. Push deze repository naar een publieke Git-host (GitHub, GitLab, Gitea)
2. Open je Coolify dashboard
3. **New Resource → Static Site**
4. Koppel de repository
5. Build settings:
   - **Build pack**: `Static`
   - **Publish directory**: `/` (de root)
   - **Index file**: `index.html`
6. Stel je gewenste domein/subdomain in (bijv. `kefalonia.jouwnaam.nl`)
7. Deploy → klaar!

Geen build-stap nodig — puur HTML/CSS/JS, geen dependencies.

## Lokaal testen

```bash
# Simpelste manier:
npx serve .

# Of gewoon index.html openen in je browser
open index.html
```

## Technische details

- Pure HTML/CSS/JS — geen framework, geen build tooling
- Google Fonts: Cormorant Garamond + DM Sans
- Volledig responsive (mobiel via single-column layout)
- Print-stylesheet ingebouwd voor het overzicht
- Alle state in geheugen (geen backend nodig)
