'use strict';
/*
 * test/validation.test.js — het volledige template-contract van build.js
 * ─────────────────────────────────────────────────────────────────────────
 * `test/activities.test.js` dekt de klassenfix van issue #8 (coördinaten).
 * Dit bestand dekt de rest van de validator: elke regel uit
 * activities/README.md en activities/_TEMPLATE.json heeft hier een test die
 * bewijst dat build.js — en dus ook CI (build.yml) en de Coolify-build — een
 * schending écht afwijst. Zonder deze tests was alleen de lat/lng-regel
 * gedekt en liep een typefout in bijvoorbeeld `duration` of `cost` pas op
 * productie tegen de lamp.
 *
 * Elke test draait `node build.js` in een eigen tmp-fixture met alleen de
 * fixture-activiteiten. Zo raakt een fout in een fixture nooit een echt
 * activiteitenbestand en kan een foutmelding maar één bron hebben.
 *
 * Drie soorten tests:
 *   1. elke afwijzingsregel, één per test (met de exacte foutmelding);
 *   2. de sabotage-omgekeerde: een geldige fixture met álle optionele velden
 *      wordt geaccepteerd (geen valse positieven);
 *   3. het uitvoercontract van activities.generated.js: sortering, KEY_ORDER
 *      en de defaults voor reservation/special.
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
const LASSI = { lat: 38.1642449, lng: 20.4838322 };

// Uit activities/README.md — moet gelijk blijven aan BBOX in build.js.
const BBOX = { latMin: 38.00, latMax: 38.53, lngMin: 20.28, lngMax: 20.85 };

// De sleutelvolgorde die build.js in activities.generated.js wegschrijft
// (KEY_ORDER in build.js, gesplitst in verplicht en optioneel).
const REQUIRED_KEY_ORDER = ['id', 'cat', 'icon', 'title', 'duration', 'why', 'tip',
  'cost', 'location', 'mapUrl', 'lat', 'lng', 'reservation', 'special'];

const OPTIONAL_KEY_ORDER = ['timeOfDay', 'highlights', 'combineWith',
  'googleRating', 'googleReviewCount'];

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
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${LASSI.lat},${LASSI.lng}`,
    lat: LASSI.lat,
    lng: LASSI.lng,
    reservation: false,
    special: false,
  }, overrides || {});
}

function without(overrides, keys) {
  const copy = Object.assign({}, overrides);
  for (const key of keys) delete copy[key];
  return copy;
}

function tmpFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefalonia-template-'));
  fs.cpSync(path.join(ROOT, 'build.js'), path.join(dir, 'build.js'));
  fs.mkdirSync(path.join(dir, 'activities'));
  return dir;
}

/**
 * Draait `node build.js` in een tmp-map met precies deze fixture-bestanden.
 * `files` mapt bestandsnaam → object (JSON.stringify) of string (ruwe inhoud).
 */
function runBuild(files) {
  const dir = tmpFixture();
  for (const [name, content] of Object.entries(files || {})) {
    fs.writeFileSync(
      path.join(dir, 'activities', name),
      typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    );
  }
  const res = spawnSync(process.execPath, ['build.js'], { cwd: dir, encoding: 'utf8' });
  const out = path.join(dir, 'activities.generated.js');
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    generated: fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null,
  };
}

function runBuildOn(activity) {
  return runBuild({ 'z9-fixture.json': activity });
}

/** Leest `window.ACTIVITIES = [ … ];` terug als array. */
function parseGenerated(text) {
  const marker = text.indexOf('window.ACTIVITIES = ');
  const start = text.indexOf('[', marker);
  const end = text.lastIndexOf(']');
  // build.js schrijft een trailing comma vóór de sluitende haak → JSON-strikt.
  return JSON.parse(text.slice(start, end + 1).replace(/,\s*\]$/, ']'));
}

// ── 1. Afwijzingsregels: één fixture per regel ─────────────────────────────
const REJECT_CASES = [
  {
    name: 'een onbekend veld wordt geweigerd (template blijft strak voor AI-agents)',
    activity: () => validActivity({ nickname: 'Bar One' }),
    pattern: /onbekend veld "nickname" \(toegestaan: id, cat, icon/,
  },
  {
    name: 'een ontbrekend verplicht veld wordt geweigerd',
    activity: () => without(validActivity(), ['tip']),
    pattern: /verplicht veld "tip" ontbreekt/,
  },
  {
    name: '"id" moet een string zijn',
    activity: () => validActivity({ id: 13 }),
    pattern: /"id" moet een niet-lege string zijn/,
  },
  {
    name: 'een lege "id" wordt geweigerd',
    activity: () => validActivity({ id: '   ' }),
    pattern: /"id" moet een niet-lege string zijn/,
  },
  {
    name: '"cat" moet in de categorie-volgorde van de UI staan',
    activity: () => validActivity({ cat: 'sport' }),
    pattern: /ongeldige cat "sport"/,
  },
  {
    name: '"duration" moet een toegestane bloklengte zijn',
    activity: () => validActivity({ duration: 75 }),
    pattern: /ongeldige duration 75 \(toegestaan: 0, 45, 60, 90/,
  },
  {
    name: 'een negatieve "cost" wordt geweigerd',
    activity: () => validActivity({ cost: -1 }),
    pattern: /"cost" moet een geheel getal ≥ 0 zijn/,
  },
  {
    name: 'een fractionele "cost" wordt geweigerd',
    activity: () => validActivity({ cost: 12.5 }),
    pattern: /"cost" moet een geheel getal ≥ 0 zijn/,
  },
  {
    name: '"lng" buiten Kefalonia wordt geweigerd (de westkant van de bbox)',
    activity: () => validActivity({ lng: 19.9 }),
    pattern: /"lng" 19\.9 ligt niet op Kefalonia \(verwacht 20\.28–20\.85/,
  },
  {
    name: '"reservation" moet een boolean zijn',
    activity: () => validActivity({ reservation: 'ja' }),
    pattern: /"reservation" moet true\/false zijn/,
  },
  {
    name: '"special" moet een boolean zijn',
    activity: () => validActivity({ special: 'ja' }),
    pattern: /"special" moet true\/false zijn/,
  },
  {
    name: '"special: true" mag alleen bij cat "bday"',
    activity: () => validActivity({ special: true }),
    pattern: /"special: true" mag alleen bij cat:"bday"/,
  },
  {
    name: '"timeOfDay" moet een bekende waarde zijn',
    activity: () => validActivity({ timeOfDay: 'night' }),
    pattern: /"timeOfDay" moet "morning", "afternoon", "evening" of "fullday" zijn/,
  },
  {
    name: '"highlights" moet een array zijn',
    activity: () => validActivity({ highlights: 'zwemmen' }),
    pattern: /"highlights" moet een array zijn/,
  },
  {
    name: '"highlights" mag geen lege strings bevatten',
    activity: () => validActivity({ highlights: ['zwemmen', '  '] }),
    pattern: /"highlights" mag alleen niet-lege strings bevatten/,
  },
  {
    name: '"combineWith" moet een array zijn',
    activity: () => validActivity({ combineWith: 'c1' }),
    pattern: /"combineWith" moet een array zijn/,
  },
  {
    name: '"combineWith" mag geen lege id-strings bevatten',
    activity: () => validActivity({ combineWith: ['c1', ''] }),
    pattern: /"combineWith" mag alleen niet-lege id-strings bevatten/,
  },
  {
    name: '"googleRating" moet tussen 0.0 en 5.0 liggen',
    activity: () => validActivity({ googleRating: 5.5, googleReviewCount: 10 }),
    pattern: /"googleRating" moet een getal tussen 0\.0 en 5\.0 zijn/,
  },
  {
    name: '"googleReviewCount" moet een geheel getal ≥ 0 zijn',
    activity: () => validActivity({ googleRating: 4.5, googleReviewCount: 10.5 }),
    pattern: /"googleReviewCount" moet een geheel getal ≥ 0 zijn/,
  },
  {
    name: '"googleRating" zonder "googleReviewCount" wordt geweigerd',
    activity: () => validActivity({ googleRating: 4.5 }),
    pattern: /"googleRating" en "googleReviewCount" moeten altijd samen worden opgegeven/,
  },
  {
    name: '"googleReviewCount" zonder "googleRating" wordt geweigerd',
    activity: () => validActivity({ googleReviewCount: 10 }),
    pattern: /"googleRating" en "googleReviewCount" moeten altijd samen worden opgegeven/,
  },
];

for (const testCase of REJECT_CASES) {
  test(testCase.name, () => {
    const res = runBuildOn(testCase.activity());
    assert.notEqual(res.status, 0, `build.js had moeten falen:\n${res.stdout}`);
    assert.match(res.stderr, testCase.pattern);
    assert.equal(res.generated, null, 'een afgewezen run mag geen register wegschrijven');
  });
}

// ── 2. Structuurfouten in de bronbestanden ─────────────────────────────────
test('ongeldige JSON in een activiteitenbestand wordt gemeld met de parse-fout', () => {
  const res = runBuild({ 'z9-broken.json': '{ "id": ' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /z9-broken\.json: ongeldige JSON —/);
});

test('een JSON-array is geen geldige activiteit', () => {
  const res = runBuild({ 'z9-array.json': [1, 2] });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /JSON moet een object zijn, geen array/);
});

test('een lege activities-map breekt de build af', () => {
  const res = runBuild({});
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Geen activiteiten gevonden in activities\//);
});

test('een dubbele id wordt gemeld met beide bestanden', () => {
  const res = runBuild({
    'z8-eerste.json': validActivity({ id: 'z9' }),
    'z9-tweede.json': validActivity({ id: 'z9' }),
  });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /dubbele id "z9"/);
  assert.match(res.stderr, /ook in z8-eerste\.json/);
});

test('een fout noemt alleen het bestand dat de fout bevat', () => {
  const res = runBuild({
    'z8-goed.json': validActivity({ id: 'z8' }),
    'z9-fout.json': validActivity({ id: 'z9', duration: 75 }),
  });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /z9-fout\.json/);
  assert.doesNotMatch(res.stderr, /z8-goed\.json/, 'het geldige bestand hoort niet in de foutmelding');
});

// ── 3. Geen valse positieven: het volledige template wordt geaccepteerd ────
test('een geldige activiteit met alle optionele velden wordt geaccepteerd', () => {
  const res = runBuildOn(validActivity({
    id: 'b1',
    cat: 'bday',
    special: true,
    reservation: true,
    timeOfDay: 'evening',
    highlights: ['Sunset', 'Diner'],
    combineWith: ['e1'],
    googleRating: 4.7,
    googleReviewCount: 812,
  }));
  assert.equal(res.status, 0, res.stderr);
  const [activity] = parseGenerated(res.generated);
  assert.deepEqual(activity.highlights, ['Sunset', 'Diner']);
  assert.deepEqual(activity.combineWith, ['e1']);
  assert.equal(activity.googleRating, 4.7);
  assert.equal(activity.googleReviewCount, 812);
});

test('coördinaten op de bbox-grens worden geaccepteerd, erbuiten niet', () => {
  for (const [label, coords] of [
    ['noordwesthoek', { lat: BBOX.latMin, lng: BBOX.lngMin }],
    ['zuidoosthoek', { lat: BBOX.latMax, lng: BBOX.lngMax }],
  ]) {
    const inside = runBuildOn(validActivity(coords));
    assert.equal(inside.status, 0, `${label} moet binnen de bbox vallen:\n${inside.stderr}`);
  }
  const outside = runBuildOn(validActivity({ lat: BBOX.latMax + 0.01 }));
  assert.notEqual(outside.status, 0, 'een tiende graad noordelijker valt buiten Kefalonia');
  assert.match(outside.stderr, /"lat" 38\.54 ligt niet op Kefalonia/);
});

// ── 4. Uitvoercontract van activities.generated.js ─────────────────────────
test('het register sorteert op categorie-volgorde en dan op het numerieke id-deel', () => {
  const res = runBuild({
    'z6-eten-2.json': validActivity({ id: 'e2', cat: 'eten' }),
    'z1-eten-10.json': validActivity({ id: 'e10', cat: 'eten' }),
    'z3-strand.json': validActivity({ id: 's1', cat: 'stranden' }),
    'z2-natuur.json': validActivity({ id: 'n5', cat: 'natuur' }),
  });
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(parseGenerated(res.generated).map((a) => a.id), ['s1', 'n5', 'e2', 'e10']);
});

test('elke activiteit krijgt exact de KEY_ORDER-volgorde en reservation/special als default', () => {
  const res = runBuild({
    'z9-fixture.json': without(validActivity(), ['reservation', 'special']),
  });
  assert.equal(res.status, 0, res.stderr);
  const [activity] = parseGenerated(res.generated);
  assert.deepEqual(Object.keys(activity), REQUIRED_KEY_ORDER,
    'verplichte sleutels in de volgorde van KEY_ORDER');
  for (const key of OPTIONAL_KEY_ORDER) {
    assert.equal(key in activity, false, `optioneel veld "${key}" hoort weggelaten te worden`);
  }
  assert.equal(activity.reservation, false, 'ontbrekende reservation wordt false');
  assert.equal(activity.special, false, 'ontbrekende special wordt false');
});

test('het register is een gewaarschuwd, gegenereerd bestand', () => {
  const res = runBuild({ 'z9-fixture.json': validActivity() });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.generated, /^\/\/ ╔/);
  assert.match(res.generated, /AUTO-GEGENEREERD door build\.js/);
  assert.match(res.generated, /npm run build/);
  assert.match(res.generated, /^window\.ACTIVITIES = \[/m);
  assert.match(res.generated, /\];\n$/);
  assert.match(res.stdout, /✓ 1 activiteiten gevalideerd en gebundeld/);
});
