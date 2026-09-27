'use strict';
/*
 * test/sync.test.js — gedrag van sync.js (PocketBase-sessiesynchronisatie)
 * ─────────────────────────────────────────────────────────────────────────
 * sync.js was het enige stuk productielogica zonder tests: de module zet
 * `window.sync` waarop app.js de hele sessiesynchronisatie bouwt. Deze tests
 * dekken de contracten die daar stil kapot kunnen gaan:
 *
 *   1. zonder PocketBase-SDK (ad-blocker, netwerkfout) valt de app terug op
 *      een no-op stub in plaats van te crashen — niets mag dan gooien;
 *   2. createSession/loadSession: codes, 409-botsingen, normalisatie van een
 *      ingetypte code en localStorage dat niet meewerkt;
 *   3. push + de echo-onderdrukking (_suppressDepth): een eigen update mag
 *      niet als "remote wijziging" terugkomen, een echte wel;
 *   4. subscribe/disconnect: statusbadge, opzeggen van een oude verbinding en
 *      het opruimen van de lokale sessie.
 *
 * De module is een klassiek browserscript, dus de omgeving (window,
 * localStorage, PocketBase, updateSyncStatusBadge) wordt hier per test op
 * globalThis gezet en daarna opnieuw geladen. Geen netwerk, geen SDK.
 *
 * Zero dependencies — node:test + een nep-PocketBase.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SYNC_PATH = path.join(ROOT, 'sync.js');

const PB_URL = 'https://pocketbase.7rb.nl';
const SYNC_KEY = 'kefalonia_sync_v1';

// sync.js en app.js draaien als klassieke scripts: alles hangt aan window.
const sandbox = /** @type {any} */ (globalThis);

function makeLocalStorage(options) {
  const store = new Map();
  return {
    store,
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) {
      if (options && options.failWrites) throw new Error('QuotaExceededError');
      store.set(key, String(value));
    },
    removeItem(key) { store.delete(key); },
  };
}

/**
 * Nep-omgeving voor één sync.js-instantie. `options.create/update/subscribe/
 * unsubscribe/list` programmeren de PocketBase-API per test (bijv. één keer
 * een 409, daarna succes); `options.withoutSdk` laat de SDK ontbreken;
 * `options.failWrites` laat localStorage.setItem gooien.
 */
function createHarness(options) {
  const opts = options || {};
  const calls = { collections: [], create: [], update: [], subscribe: [], unsubscribe: [], list: [] };
  const handlers = [];
  const urls = [];

  const sessions = {
    async create(payload) {
      calls.create.push(payload);
      if (opts.create) return opts.create(payload, calls.create.length);
      return { id: `rec-${calls.create.length}`, session_code: payload.session_code };
    },
    async update(id, payload) {
      calls.update.push({ id, payload });
      if (opts.update) return opts.update(id, payload);
      return {};
    },
    subscribe(recordId, handler) {
      calls.subscribe.push(recordId);
      handlers.push(handler);
      if (opts.subscribe) return opts.subscribe(recordId, handler, handlers);
      return Promise.resolve();
    },
    unsubscribe(recordId) {
      calls.unsubscribe.push(recordId);
      if (opts.unsubscribe) return opts.unsubscribe(recordId);
      return Promise.resolve();
    },
    async getFirstListItem(filter) {
      calls.list.push(filter);
      if (opts.list) return opts.list(filter);
      return { id: 'rec-1', session_code: 'KEF-ABC', plan: '{"days":[]}' };
    },
  };

  function FakePocketBase(url) {
    urls.push(url);
    this.collection = function (name) {
      calls.collections.push(name);
      return sessions;
    };
  }

  return {
    calls,
    handlers,
    urls,
    badge: [],
    storage: makeLocalStorage(opts),
    PocketBase: opts.withoutSdk ? undefined : FakePocketBase,
  };
}

/** Zet de browseromgeving klaar en laadt sync.js opnieuw. */
function loadSync(harness, options) {
  const opts = options || {};
  delete require.cache[require.resolve(SYNC_PATH)];
  sandbox.window = {};
  sandbox.localStorage = harness.storage;
  if (harness.PocketBase) sandbox.PocketBase = harness.PocketBase;
  else delete sandbox.PocketBase;
  if (opts.withBadge === false) delete sandbox.updateSyncStatusBadge;
  else sandbox.updateSyncStatusBadge = (state) => harness.badge.push(state);
  require(SYNC_PATH);
  return sandbox.window.sync;
}

/** Laat de microtask-queue leeglopen (voor de .then() van subscribe). */
function settle() {
  return new Promise((resolve) => setImmediate(resolve));
}

/** Foutobject zoals PocketBase dat bij een botsing teruggeeft. */
function conflictError() {
  return Object.assign(new Error('Failed to create record'), { status: 409 });
}

// ── 1. Terugval zonder SDK ────────────────────────────────────────────────
test('zonder PocketBase-SDK zet sync.js een no-op stub neer in plaats van te crashen', async () => {
  const h = createHarness({ withoutSdk: true });
  const sync = loadSync(h);

  assert.equal(typeof sync, 'object');
  assert.equal(sync.isConnected, false);
  assert.equal(sync.sessionCode, null);
  assert.equal(sync.recordId, null);
  assert.deepEqual(h.urls, [], 'zonder SDK wordt er geen client gebouwd');

  // Niets van de stub mag gooien — app.js roept deze altijd aan.
  sync.push('{"days":[]}');
  sync.subscribe('rec-1', () => {});
  sync.disconnect();
  assert.equal(sync.getSavedSession(), null);

  await assert.rejects(() => sync.createSession('{}'), /Sync niet beschikbaar/);
  assert.equal(await sync.loadSession('KEF-ABC'), null);
});

// ── 2. Sessies aanmaken ───────────────────────────────────────────────────
test('de client wijst naar de vaste PocketBase-URL en gebruikt de "sessions"-collectie', async () => {
  const h = createHarness();
  const sync = loadSync(h);

  await sync.createSession('{"days":[]}');

  assert.deepEqual(h.urls, [PB_URL]);
  assert.deepEqual(h.calls.collections, ['sessions']);
});

test('createSession genereert een ondubbelzinnige KEF-code en bewaart de sessie lokaal', async () => {
  const h = createHarness();
  const sync = loadSync(h);

  const result = await sync.createSession('{"days":[1]}');

  // De tekenset sluit I, O, 0 en 1 uit (niet te verwarren als je de code
  // hardop doorgeeft).
  assert.match(result.code, /^KEF-[A-HJ-NP-Z2-9]{3}$/);
  assert.equal(result.recordId, 'rec-1');
  assert.equal(sync.sessionCode, result.code);
  assert.equal(sync.recordId, 'rec-1');
  assert.deepEqual(h.calls.create, [{ session_code: result.code, plan: '{"days":[1]}' }]);
  assert.deepEqual(
    JSON.parse(h.storage.getItem(SYNC_KEY)),
    { code: result.code, recordId: 'rec-1' },
  );
});

test('een botsende sessiecode (409) wordt opnieuw geprobeerd', async () => {
  const h = createHarness({
    create: (payload, attempt) => {
      if (attempt === 1) throw conflictError();
      return { id: 'rec-2', session_code: payload.session_code };
    },
  });
  const sync = loadSync(h);

  const result = await sync.createSession('{}');

  assert.equal(h.calls.create.length, 2);
  assert.equal(result.recordId, 'rec-2');
  assert.equal(sync.recordId, 'rec-2');
});

test('een 409 die alleen in e.data.code staat wordt ook als botsing gezien', async () => {
  const h = createHarness({
    create: (payload, attempt) => {
      if (attempt === 1) {
        throw Object.assign(new Error('Failed to create record'), { data: { code: 409 } });
      }
      return { id: 'rec-2', session_code: payload.session_code };
    },
  });
  const sync = loadSync(h);

  const result = await sync.createSession('{}');

  assert.equal(h.calls.create.length, 2);
  assert.equal(result.recordId, 'rec-2');
});

test('na vijf botsingen stopt createSession met een expliciete fout', async () => {
  const h = createHarness({ create: () => { throw conflictError(); } });
  const sync = loadSync(h);

  await assert.rejects(() => sync.createSession('{}'), /Session code collision after 5 attempts/);
  assert.equal(h.calls.create.length, 5);
  assert.equal(sync.sessionCode, null);
  assert.equal(h.storage.getItem(SYNC_KEY), null);
});

test('een andere fout dan 409 stopt createSession meteen en laat de sessie leeg', async () => {
  const h = createHarness({
    create: () => {
      throw Object.assign(new Error('server kapot'), { status: 500 });
    },
  });
  const sync = loadSync(h);

  await assert.rejects(() => sync.createSession('{}'), /server kapot/);
  assert.equal(h.calls.create.length, 1);
  assert.equal(sync.recordId, null);
  assert.equal(h.storage.getItem(SYNC_KEY), null);
});

test('een mislukte localStorage-write blokkeert createSession niet', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const h = createHarness({ failWrites: true });
  const sync = loadSync(h);

  const result = await sync.createSession('{}');

  assert.equal(result.recordId, 'rec-1');
  assert.equal(sync.sessionCode, result.code);
  assert.equal(warn.mock.calls.length, 1, 'de niet-bewaarde sessie wordt wel gemeld');
});

// ── 3. Sessies laden ──────────────────────────────────────────────────────
test('loadSession normaliseert de ingetypte code naar het KEF-formaat', async () => {
  const h = createHarness({
    list: (filter) => ({ id: 'rec-9', session_code: 'KEF-QQ7', plan: '{"days":[2]}', filter }),
  });
  const sync = loadSync(h);

  const result = await sync.loadSession('kef-qq7');

  assert.deepEqual(h.calls.list, ['session_code = "KEF-QQ7"']);
  assert.deepEqual(result, { plan: '{"days":[2]}', recordId: 'rec-9' });
  assert.equal(sync.sessionCode, 'KEF-QQ7');
  assert.equal(sync.recordId, 'rec-9');
  assert.deepEqual(
    JSON.parse(h.storage.getItem(SYNC_KEY)),
    { code: 'KEF-QQ7', recordId: 'rec-9' },
  );
});

test('een ongeldige sessiecode wordt lokaal afgewezen zonder netwerkcall', async () => {
  const h = createHarness();
  const sync = loadSync(h);

  for (const code of ['', 'ab', 'kef-toolang1234', 'kef-ab!', 'kef-a b']) {
    await assert.rejects(() => sync.loadSession(code), /Ongeldige sessiecode/, `code: ${code}`);
  }
  assert.deepEqual(h.calls.list, []);
});

test('een mislukte localStorage-write blokkeert loadSession niet', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const h = createHarness({ failWrites: true });
  const sync = loadSync(h);

  const result = await sync.loadSession('KEF-ABC');

  assert.equal(result.recordId, 'rec-1');
  assert.equal(sync.recordId, 'rec-1');
  assert.equal(warn.mock.calls.length, 1);
});

// ── 4. Push en echo-onderdrukking ─────────────────────────────────────────
test('push doet niets zonder recordId en schrijft anders het plan weg', async () => {
  const h = createHarness();
  const sync = loadSync(h);

  await sync.push('{}');
  assert.deepEqual(h.calls.update, [], 'zonder sessie is er niets om te pushen');

  sync.recordId = 'rec-7';
  await sync.push('{"days":[3]}');

  assert.deepEqual(h.calls.update, [{ id: 'rec-7', payload: { plan: '{"days":[3]}' } }]);
  assert.equal(sync._suppressDepth, 1, 'de eigen update wordt één keer onderdrukt');
});

test('een mislukte push gooit niet en ruimt de onderdrukking weer op', async () => {
  const h = createHarness({ update: () => { throw new Error('offline'); } });
  const sync = loadSync(h);
  sync.recordId = 'rec-7';

  await sync.push('{"days":[3]}');

  assert.equal(h.calls.update.length, 1);
  assert.equal(sync._suppressDepth, 0, 'een mislukte push mag de volgende remote update niet opslokken');
});

test('de eigen push komt niet als remote update terug (echo-onderdrukking)', async () => {
  const h = createHarness();
  const sync = loadSync(h);
  const received = [];
  sync.subscribe('rec-1', (plan) => received.push(plan));

  await sync.push('{"days":[5]}');
  h.handlers[0]({ action: 'update', record: { plan: '{"days":[5]}' } }); // eigen echo
  assert.deepEqual(received, [], 'de eigen wijziging is geen remote wijziging');
  assert.equal(sync._suppressDepth, 0, 'de onderdrukking is nu verbruikt');

  h.handlers[0]({ action: 'update', record: { plan: '{"days":[6]}' } }); // echte remote wijziging
  assert.deepEqual(received, ['{"days":[6]}']);
});

// ── 5. Subscribe, statusbadge en disconnect ───────────────────────────────
test('subscribe meldt connecting → connected en zet isConnected', async () => {
  const h = createHarness();
  const sync = loadSync(h);

  sync.subscribe('rec-1', () => {});

  assert.deepEqual(h.calls.subscribe, ['rec-1']);
  assert.equal(sync.recordId, 'rec-1');
  assert.deepEqual(h.badge, ['connecting']);

  await settle();

  assert.deepEqual(h.badge, ['connecting', 'connected']);
  assert.equal(sync.isConnected, true);
});

test('subscribe werkt ook zonder updateSyncStatusBadge (app.js nog niet geladen)', async () => {
  const h = createHarness();
  const sync = loadSync(h, { withBadge: false });

  sync.subscribe('rec-1', () => {});
  await settle();

  assert.equal(sync.isConnected, true);
  assert.deepEqual(h.badge, []);
});

test('een tweede subscribe op een ander record zegt de oude verbinding op', async () => {
  const h = createHarness();
  const sync = loadSync(h);

  sync.subscribe('rec-1', () => {});
  sync.subscribe('rec-2', () => {});

  assert.deepEqual(h.calls.unsubscribe, ['rec-1']);
  assert.equal(sync.recordId, 'rec-2');
});

test('een remote update geeft het plan door aan de callback', async () => {
  const h = createHarness();
  const sync = loadSync(h);
  const received = [];
  sync.subscribe('rec-1', (plan) => received.push(plan));

  h.handlers[0]({ action: 'update', record: { plan: '{"days":[4]}' } });

  assert.deepEqual(received, ['{"days":[4]}']);
});

test('events die geen update zijn (of zonder callback) worden genegeerd', async () => {
  const h = createHarness();
  const sync = loadSync(h);
  const received = [];
  sync.subscribe('rec-1', () => received.push('onverwacht'));
  sync.subscribe('rec-1', 'geen functie');

  h.handlers[0]({ action: 'create', record: { plan: '{"days":[4]}' } });
  h.handlers[1]({ action: 'update', record: { plan: '{"days":[4]}' } });

  assert.deepEqual(received, []);
});

test('een fout in de remote-callback zet de status op offline in plaats van te crashen', async (t) => {
  const error = t.mock.method(console, 'error', () => {});
  const h = createHarness();
  const sync = loadSync(h);
  sync.subscribe('rec-1', () => { throw new Error('kapotte toepassing'); });

  h.handlers[0]({ action: 'update', record: { plan: '{"days":[4]}' } });

  assert.equal(sync.isConnected, false);
  assert.deepEqual(h.badge, ['connecting', 'offline']);
  assert.equal(error.mock.calls.length, 1);
});

test('een mislukte subscribe-verbinding meldt offline', async () => {
  const h = createHarness({ subscribe: () => Promise.reject(new Error('geen verbinding')) });
  const sync = loadSync(h);

  sync.subscribe('rec-1', () => {});
  await settle();

  assert.equal(sync.isConnected, false);
  assert.deepEqual(h.badge, ['connecting', 'offline']);
});

test('disconnect zegt de verbinding op en wist de lokale sessie', async () => {
  const h = createHarness();
  const sync = loadSync(h);
  sync.subscribe('rec-1', () => {});
  await sync.push('{}');

  sync.disconnect();

  assert.deepEqual(h.calls.unsubscribe, ['rec-1']);
  assert.equal(sync.recordId, null);
  assert.equal(sync.sessionCode, null);
  assert.equal(sync.isConnected, false);
  assert.equal(sync._suppressDepth, 0);
  assert.equal(h.storage.getItem(SYNC_KEY), null);
});

test('disconnect zonder sessie doet niets bijzonders', () => {
  const h = createHarness();
  const sync = loadSync(h);

  sync.disconnect();

  assert.deepEqual(h.calls.unsubscribe, []);
});

// ── 6. Lokale sessie uitlezen ─────────────────────────────────────────────
test('getSavedSession leest de bewaarde sessie en is stil bij kapotte JSON', async () => {
  const h = createHarness();
  const sync = loadSync(h);

  assert.equal(sync.getSavedSession(), null);

  h.storage.setItem(SYNC_KEY, JSON.stringify({ code: 'KEF-QQ7', recordId: 'rec-9' }));
  assert.deepEqual(sync.getSavedSession(), { code: 'KEF-QQ7', recordId: 'rec-9' });

  h.storage.setItem(SYNC_KEY, '{kapot');
  assert.equal(sync.getSavedSession(), null);
});
