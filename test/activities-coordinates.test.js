/*
 * Regressietests voor de activiteiten-validatie in build.js (issue #8).
 * ─────────────────────────────────────────────────────────────────────────
 * Node's eigen test runner — geen dependencies.  Draaien: `npm test`.
 *
 * De tests bouwen een wegwerpmap met een kopie van build.js en een set
 * fixture-activiteiten, en draaien daar de échte build.  Zo testen we het
 * script zoals CI en Coolify het ook draaien, zonder de repo aan te raken.
 */
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ACT_DIR = path.join(ROOT, 'activities');

// Draai build.js in een wegwerpmap met deze activiteiten (bestandsnaam → inhoud).
function runBuild(activities) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefalonia-build-'));
  try {
    fs.copyFileSync(path.join(ROOT, 'build.js'), path.join(dir, 'build.js'));
    fs.mkdirSync(path.join(dir, 'activities'));
    for (const [name, data] of Object.entries(activities)) {
      fs.writeFileSync(path.join(dir, 'activities', name), JSON.stringify(data, null, 2));
    }
    try {
      execFileSync(process.execPath, ['build.js'], { cwd: dir, encoding: 'utf8' });
      return { ok: true, output: '' };
    } catch (e) {
      return { ok: false, output: `${e.stdout || ''}${e.stderr || ''}` };
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Alle bronbestanden uit de repo, als { bestandsnaam: inhoud }.
function shippedActivities() {
  const out = {};
  for (const f of fs.readdirSync(ACT_DIR)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    out[f] = JSON.parse(fs.readFileSync(path.join(ACT_DIR, f), 'utf8'));
  }
  return out;
}

const C13_FILE = 'c13-karaoke-bij-bar-one-in-lassi.json';
const c13 = JSON.parse(fs.readFileSync(path.join(ACT_DIR, C13_FILE), 'utf8'));

test('pre-fix c13 (38.9555/20.8739, bij Vonitsa op het vasteland) breekt de build', () => {
  // Exact de coördinaten uit het issue: ~94 km van Lassi, in de Amvrakikos-golf.
  const r = runBuild({ [C13_FILE]: { ...c13, lat: 38.9555, lng: 20.8739 } });
  assert.equal(r.ok, false, 'build had moeten falen voor coördinaten op het vasteland');
  assert.match(r.output, /"lat"|"lng"/, 'foutmelding noemt lat/lng niet');
});

test('c13 zoals die in de repo staat valideert binnen de Kefalonia-bbox', () => {
  const r = runBuild({ [C13_FILE]: c13 });
  assert.equal(r.ok, true, `c13 wordt geweigerd:\n${r.output}`);
  assert.ok(c13.lat > 38.0 && c13.lat < 38.5 && c13.lng > 20.3 && c13.lng < 20.9,
    `c13 coördinaten liggen niet op Kefalonia: ${c13.lat}/${c13.lng}`);
});

test('mapUrl buiten de template-vorm breekt de build', () => {
  const r = runBuild({ 'x1-fixture.json': { ...c13, id: 'x1', mapUrl: 'https://maps.google.com/maps?q=38.16,20.48&hl=nl' } });
  assert.equal(r.ok, false, 'build had moeten falen voor een afwijkende mapUrl');
  assert.match(r.output, /mapUrl/);
});

test('alle bronbestanden in activities/ valideren (bbox + template)', () => {
  const shipped = shippedActivities();
  assert.ok(Object.keys(shipped).length > 0, 'geen activiteiten gevonden');
  const r = runBuild(shipped);
  assert.equal(r.ok, true, `scheepsdata valideert niet:\n${r.output}`);
});
