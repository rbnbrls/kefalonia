// ESLint-configuratie (flat config, ESLint ≥ 9) — Kefalonia Vakantie Planner
// ─────────────────────────────────────────────────────────────────────────
// De repo is een statische site zonder bundler: `app.js`, `sync.js` en
// `service-worker.js` zijn klassieke scripts die via <script>-tags in
// index.html (of als service worker) draaien, en `build.js`,
// `generate-favicons.js` en `test/*.test.js` draaien in Node. Daarom krijgt
// elke groep zijn eigen omgeving in plaats van één globale set.
//
// `npm run lint` draait exact deze config; CI (build.yml) faalt erop.
'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    // Geïnstalleerde pakketten, coverage-uitvoer en het gegenereerde
    // activiteitenregister worden niet gelint (de bron staat in activities/*.json).
    ignores: ['node_modules/**', 'coverage/**', 'activities.generated.js'],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      // `catch (_)` / `.catch(_ => …)` is de bestaande conventie in deze repo:
      // bewust genegeerde fouten krijgen een underscore als naam.
      'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_' }],
    },
  },

  {
    // Klassieke browserscripts, geladen via <script src="..."> in index.html.
    // `L` (Leaflet) en `PocketBase` komen van CDN-tags in index.html; `sync` is
    // de globale die sync.js op window zet en waar app.js op terugvalt.
    files: ['app.js', 'sync.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        L: 'readonly',
        PocketBase: 'readonly',
        sync: 'readonly',
      },
    },
  },

  {
    // Service worker: worker-globals (self, caches, clients, skipWaiting, …).
    files: ['service-worker.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.serviceworker,
      },
    },
  },

  {
    // sync.js roept `updateSyncStatusBadge()` aan: een functie die in app.js
    // staat, dat ná sync.js wordt geladen.
    files: ['sync.js'],
    languageOptions: {
      globals: {
        updateSyncStatusBadge: 'readonly',
      },
    },
  },

  {
    // Node-scripts (build, favicon-generatie, tests) en deze config zelf.
    files: ['build.js', 'generate-favicons.js', 'server.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
