#!/usr/bin/env node
/*
 * build.js — Kefalonia Vakantie Planner
 * ─────────────────────────────────────────────────────────────────────────
 * Leest alle activiteiten uit  activities/*.json , valideert ze tegen het
 * verplichte template (zie activities/README.md) en schrijft het resultaat
 * naar  activities.generated.js  als  window.ACTIVITIES = [ ... ] .
 *
 * Zero dependencies — pure Node. Geen framework, geen bundler.
 * De gegenereerde site blijft 100% statisch: dit script draait je LOKAAL
 * (npm run build) en je commit het resultaat mee. Coolify hoeft niets te
 * bouwen — het serveert enkel statische bestanden.
 *
 * Bewerk je een activiteit?  →  pas het JSON-bestand aan, run `npm run build`,
 * commit beide. Voeg je er een toe? →  zet een nieuw `<id>-<slug>.json` neer;
 * de glob hieronder pikt het automatisch op (geen manifest bijhouden).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ACT_DIR = path.join(__dirname, 'activities');
const OUT_FILE = path.join(__dirname, 'activities.generated.js');

// ── Template-regels (moeten matchen met activities/README.md) ───────────────
const REQUIRED_KEYS = ['id', 'cat', 'icon', 'title', 'duration', 'why', 'tip',
  'cost', 'location', 'mapUrl', 'lat', 'lng'];
const OPTIONAL_KEYS = ['reservation', 'special', 'timeOfDay', 'highlights', 'combineWith',
  'googleRating', 'googleReviewCount'];
const ALL_KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

// Categorie-volgorde bepaalt de weergavevolgorde in de UI (pool + catalogus).
const CAT_ORDER = ['stranden', 'cultuur', 'natuur', 'eten', 'hotel', 'bday'];
const ALLOWED_DURATIONS = [0, 45, 60, 90, 120, 150, 180, 240, 360, 480];

// Verzamel alle validatiefouten zodat we ze in één keer kunnen tonen.
const errors = [];
const seenIds = new Map(); // id -> bestandsnaam (voor duplicaat-detectie)

function fail(file, msg) {
  errors.push(`  ✗ ${file}: ${msg}`);
}

function isString(v) { return typeof v === 'string' && v.trim().length > 0; }
function isNumber(v) { return typeof v === 'number' && Number.isFinite(v); }

function validate(file, a) {
  if (a === null || typeof a !== 'object' || Array.isArray(a)) {
    fail(file, 'JSON moet een object zijn, geen ' + (Array.isArray(a) ? 'array' : typeof a));
    return;
  }
  // Onbekende keys weren — houdt het template strak (belangrijk voor AI-agents).
  for (const k of Object.keys(a)) {
    if (!ALL_KEYS.includes(k)) fail(file, `onbekend veld "${k}" (toegestaan: ${ALL_KEYS.join(', ')})`);
  }
  // Verplichte velden aanwezig?
  for (const k of REQUIRED_KEYS) {
    if (!(k in a)) fail(file, `verplicht veld "${k}" ontbreekt`);
  }
  // Types & waarden.
  if ('id' in a && !isString(a.id)) fail(file, '"id" moet een niet-lege string zijn');
  if (isString(a.id)) {
    if (seenIds.has(a.id)) fail(file, `dubbele id "${a.id}" (ook in ${seenIds.get(a.id)})`);
    else seenIds.set(a.id, path.basename(file));
  }
  if ('cat' in a && !CAT_ORDER.includes(a.cat)) {
    fail(file, `ongeldige cat "${a.cat}" (toegestaan: ${CAT_ORDER.join(', ')})`);
  }
  if ('icon' in a && !isString(a.icon)) fail(file, '"icon" moet een (emoji-)string zijn');
  if ('title' in a && !isString(a.title)) fail(file, '"title" moet een niet-lege string zijn');
  if ('duration' in a && !ALLOWED_DURATIONS.includes(a.duration)) {
    fail(file, `ongeldige duration ${JSON.stringify(a.duration)} (toegestaan: ${ALLOWED_DURATIONS.join(', ')})`);
  }
  if ('why' in a && !isString(a.why)) fail(file, '"why" moet een niet-lege string zijn');
  if ('tip' in a && !isString(a.tip)) fail(file, '"tip" moet een niet-lege string zijn');
  if ('cost' in a && (!isNumber(a.cost) || !Number.isInteger(a.cost) || a.cost < 0)) {
    fail(file, '"cost" moet een geheel getal ≥ 0 zijn');
  }
  if ('location' in a && !isString(a.location)) fail(file, '"location" moet een niet-lege string zijn');
  if ('mapUrl' in a && !isString(a.mapUrl)) fail(file, '"mapUrl" moet een niet-lege string zijn');
  if ('lat' in a && (!isNumber(a.lat) || a.lat < 37.5 || a.lat > 39)) {
    fail(file, '"lat" moet een breedtegraad op/rond Kefalonia zijn (≈ 37.5–39)');
  }
  if ('lng' in a && (!isNumber(a.lng) || a.lng < 19.5 || a.lng > 21.5)) {
    fail(file, '"lng" moet een lengtegraad op/rond Kefalonia zijn (≈ 19.5–21.5)');
  }
  if ('reservation' in a && typeof a.reservation !== 'boolean') fail(file, '"reservation" moet true/false zijn');
  if ('special' in a && typeof a.special !== 'boolean') fail(file, '"special" moet true/false zijn');
  if (a.special === true && a.cat !== 'bday') {
    fail(file, '"special: true" mag alleen bij cat:"bday"');
  }
  if ('timeOfDay' in a && !['morning', 'afternoon', 'evening', 'fullday'].includes(a.timeOfDay)) {
    fail(file, '"timeOfDay" moet "morning", "afternoon", "evening" of "fullday" zijn');
  }
  if ('highlights' in a) {
    if (!Array.isArray(a.highlights)) fail(file, '"highlights" moet een array zijn');
    else if (a.highlights.some(h => typeof h !== 'string' || !h.trim())) fail(file, '"highlights" mag alleen niet-lege strings bevatten');
  }
  if ('combineWith' in a) {
    if (!Array.isArray(a.combineWith)) fail(file, '"combineWith" moet een array zijn');
    else if (a.combineWith.some(id => typeof id !== 'string' || !id.trim())) fail(file, '"combineWith" mag alleen niet-lege id-strings bevatten');
  }
  if ('googleRating' in a && (!isNumber(a.googleRating) || a.googleRating < 0 || a.googleRating > 5)) {
    fail(file, '"googleRating" moet een getal tussen 0.0 en 5.0 zijn');
  }
  if ('googleReviewCount' in a && (!isNumber(a.googleReviewCount) || !Number.isInteger(a.googleReviewCount) || a.googleReviewCount < 0)) {
    fail(file, '"googleReviewCount" moet een geheel getal ≥ 0 zijn');
  }
  if (('googleRating' in a) !== ('googleReviewCount' in a)) {
    fail(file, '"googleRating" en "googleReviewCount" moeten altijd samen worden opgegeven');
  }
}

// ── Inlezen ─────────────────────────────────────────────────────────────────
const files = fs.readdirSync(ACT_DIR)
  .filter(f => f.endsWith('.json') && !f.startsWith('_')) // _TEMPLATE.json overslaan
  .sort();

if (files.length === 0) {
  console.error('✗ Geen activiteiten gevonden in activities/. Build afgebroken.');
  process.exit(1);
}

const activities = [];
for (const file of files) {
  const full = path.join(ACT_DIR, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    fail(file, `ongeldige JSON — ${e.message}`);
    continue;
  }
  validate(file, data);
  if (!errors.some(e => e.includes(file))) {
    activities.push(data);
  }
}

if (errors.length > 0) {
  console.error(`\n✗ Validatie mislukt — ${errors.length} probleem(en):\n`);
  console.error(errors.join('\n'));
  console.error('\nLos bovenstaande op en run `npm run build` opnieuw.\n');
  process.exit(1);
}

// ── Sorteren in UI-volgorde: categorie, dan numeriek deel van id ────────────
function idNum(id) {
  const m = String(id).match(/^[a-z]+(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
activities.sort((a, b) => {
  const ca = CAT_ORDER.indexOf(a.cat);
  const cb = CAT_ORDER.indexOf(b.cat);
  if (ca !== cb) return ca - cb;
  return idNum(a.id) - idNum(b.id);
});

// ── Schrijven ───────────────────────────────────────────────────────────────
// Uniforme key-volgorde + altijd reservation/special aanwezig (false default).
const KEY_ORDER = ['id', 'cat', 'icon', 'title', 'duration', 'why', 'tip',
  'cost', 'location', 'mapUrl', 'lat', 'lng', 'reservation', 'special',
  'timeOfDay', 'highlights', 'combineWith', 'googleRating', 'googleReviewCount'];

function normalize(a) {
  const out = {};
  for (const k of KEY_ORDER) {
    if (k === 'reservation' || k === 'special') out[k] = !!a[k];
    else if (k === 'timeOfDay') { if (a[k]) out[k] = a[k]; }
    else if (k === 'highlights') { if (a[k]) out[k] = a[k]; }
    else if (k === 'combineWith') { if (a[k]) out[k] = a[k]; }
    else if (k === 'googleRating') { if (a[k] !== undefined) out[k] = a[k]; }
    else if (k === 'googleReviewCount') { if (a[k] !== undefined) out[k] = a[k]; }
    else out[k] = a[k];
  }
  return out;
}

const lines = activities.map(a => '  ' + JSON.stringify(normalize(a)));
const banner =
  '// ╔══════════════════════════════════════════════════════════════════╗\n' +
  '// ║  AUTO-GEGENEREERD door build.js — NIET met de hand bewerken.       ║\n' +
  '// ║  Bron: activities/*.json · Regenereren: `npm run build`            ║\n' +
  '// ╚══════════════════════════════════════════════════════════════════╝\n';

const output = `${banner}window.ACTIVITIES = [\n${lines.join(',\n')},\n];\n`;
fs.writeFileSync(OUT_FILE, output);

const byCat = activities.reduce((m, a) => (m[a.cat] = (m[a.cat] || 0) + 1, m), {});
console.log(`✓ ${activities.length} activiteiten gevalideerd en gebundeld → activities.generated.js`);
console.log('  ' + CAT_ORDER.filter(c => byCat[c]).map(c => `${c}: ${byCat[c]}`).join(' · '));
