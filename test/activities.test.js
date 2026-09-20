'use strict';
/*
 * test/activities.test.js — regressietests voor issue #8
 * ─────────────────────────────────────────────────────────────────────────
 * Issue #8: c13 (karaoke bij Bar One in Lassi) stond met coördinaten
 * 38.9555 / 20.8739 in de Amvrakikos-golf op het vasteland, ~90 km van Lassi.
 * `build.js` ving dat niet, want de lat/lng-validatie was een ruime sanity-box
 * (lat 37.5–39 · lng 19.5–21.5) waar bijna heel West-Griekenland in paste.
 *
 * Deze tests dekken de klasse, niet alleen het ene bestand:
 *   1. build.js wijst coördinaten BUITEN Kefalonia af (de sabotage-test: faalt
 *      op de oude sanity-box, slaagt op de echte eiland-bbox);
 *   2. geen enkele activiteit ligt buiten de echte Kefalonia-bbox;
 *   3. c13 ligt in Lassi, niet op het vasteland;
 *   4. elke mapUrl volgt het template uit activities/README.md;
 *   5. activities.generated.js is in sync met de bronbestanden.
 *
 * Zero dependencies — node:test + child_process (Node ≥ 18).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const ACT_DIR = path.join(ROOT, 'activities');

// ── Onafhankelijke referentie ──────────────────────────────────────────────
// Bbox van de OSM-relatie "Κεφαλονιά" (island), opgehaald 2026-09-20 via
// Nominatim (polygon_geojson=1): lat 38.0566–38.4755 · lng 20.3367–20.8159.
// Bewust NIET dezelfde constanten als build.js — anders test de test zichzelf.
const ISLAND_BBOX = { latMin: 38.0566, latMax: 38.4755, lngMin: 20.3367, lngMax: 20.8159 };

// Lassi, OSM node 1587385193 (place=village). Bar One ligt aan de hoofdstraat
// van Lassi, direct ten zuiden van Argostoli.
const LASSI = { lat: 38.1642449, lng: 20.4838322 };
const LASSI_RADIUS_DEG = 0.03; // ~3 km, ruim binnen het dorp

const MAPURL_TEMPLATE = /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=\S+$/;

// De coördinaten uit de oorspronkelijke bugmelding (moeten afgewezen worden).
const MAINLAND_COORDS = { lat: 38.9555, lng: 20.8739 };

function loadActivities() {
  return fs.readdirSync(ACT_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
    .map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(ACT_DIR, f), 'utf8')) }));
}

function inBbox(lat, lng, bbox) {
  return lat >= bbox.latMin && lat <= bbox.latMax && lng >= bbox.lngMin && lng <= bbox.lngMax;
}

/**
 * Kopieert build.js + activities/ naar een tmp-map, voegt optioneel een extra
 * activiteit toe en draait daar `node build.js`. Zo testen we de echte
 * validator zonder de working tree te vervuilen.
 */
function runBuildOnFixture(extraActivity) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kefalonia-build-'));
  fs.cpSync(path.join(ROOT, 'build.js'), path.join(tmp, 'build.js'));
  fs.cpSync(ACT_DIR, path.join(tmp, 'activities'), { recursive: true });
  if (extraActivity) {
    fs.writeFileSync(
      path.join(tmp, 'activities', 'z9-fixture.json'),
      JSON.stringify(extraActivity, null, 2),
    );
  }
  const res = spawnSync(process.execPath, ['build.js'], { cwd: tmp, encoding: 'utf8' });
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    generated: fs.existsSync(path.join(tmp, 'activities.generated.js'))
      ? fs.readFileSync(path.join(tmp, 'activities.generated.js'), 'utf8')
      : null,
  };
}

function validActivity(overrides) {
  return Object.assign({
    id: 'z9',
    cat: 'cultuur',
    icon: '🏛️',
    title: 'Fixture',
    duration: 60,
    why: 'Fixture voor de validatietest.',
    tip: 'Geen.',
    cost: 0,
    location: 'Lassi, Kefalonia',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=38.16424,20.48383',
    lat: LASSI.lat,
    lng: LASSI.lng,
    reservation: false,
    special: false,
  }, overrides || {});
}

// ── 1. De klasse-fix: build.js moet coördinaten buiten Kefalonia afwijzen ──
test('build.js wijst coördinaten buiten Kefalonia af (issue #8: vasteland)', () => {
  const res = runBuildOnFixture(validActivity(MAINLAND_COORDS));
  assert.notEqual(res.status, 0, 'build.js moet falen op coördinaten op het vasteland');
  assert.match(res.stderr, /lat/, 'de foutmelding moet over lat/lng gaan');
});

test('build.js accepteert geldige Kefalonia-coördinaten (geen valse positivie)', () => {
  const res = runBuildOnFixture(validActivity());
  assert.equal(res.status, 0, `build.js moet slagen op Lassi-coördinaten:\n${res.stderr}`);
});

// ── 2. Data: alles binnen de echte eiland-bbox ─────────────────────────────
test('elke activiteit ligt binnen de bbox van Kefalonia', () => {
  const offenders = loadActivities()
    .filter(({ data }) => !inBbox(data.lat, data.lng, ISLAND_BBOX))
    .map(({ file, data }) => `${file}: ${data.lat},${data.lng} (${data.location})`);
  assert.deepEqual(offenders, [], 'deze activiteiten liggen niet op Kefalonia');
});

// ── 3. c13 specifiek: Lassi, niet het vasteland ────────────────────────────
test('c13 (Bar One, Lassi) ligt in Lassi', () => {
  const { data } = loadActivities().find(({ data }) => data.id === 'c13');
  assert.equal(data.location, 'Lassi, Kefalonia');
  assert.ok(
    Math.abs(data.lat - LASSI.lat) <= LASSI_RADIUS_DEG &&
    Math.abs(data.lng - LASSI.lng) <= LASSI_RADIUS_DEG,
    `c13 hoort in Lassi (${LASSI.lat}, ${LASSI.lng}), niet op ${data.lat}, ${data.lng}`,
  );
});

// ── 4. mapUrl volgt het template uit activities/README.md ──────────────────
test('elke mapUrl volgt het template https://www.google.com/maps/search/?api=1&query=…', () => {
  const offenders = loadActivities()
    .filter(({ data }) => !MAPURL_TEMPLATE.test(data.mapUrl))
    .map(({ file, data }) => `${file}: ${data.mapUrl}`);
  assert.deepEqual(offenders, []);
});

test('c13 en c14 gebruiken de coördinaatvariant van het template', () => {
  for (const id of ['c13', 'c14']) {
    const { data } = loadActivities().find(({ data }) => data.id === id);
    assert.equal(
      data.mapUrl,
      `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`,
    );
  }
});

// ── 5. De gegenereerde registry blijft in sync (CI build.yml gate) ─────────
test('activities.generated.js is in sync met activities/*.json', () => {
  const res = runBuildOnFixture(null);
  assert.equal(res.status, 0, res.stderr);
  const committed = fs.readFileSync(path.join(ROOT, 'activities.generated.js'), 'utf8');
  assert.equal(res.generated, committed, 'run `npm run build` en commit het resultaat');
});
