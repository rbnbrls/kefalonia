// ═══════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════

const DAYS = [
  { date: '2026-06-13', label: 'Zaterdag 13 juni', short: 'Za 13/6', name: 'Aankomst & eerste avond' },
  { date: '2026-06-14', label: 'Zondag 14 juni', short: 'Zo 14/6', name: 'Dag 2' },
  { date: '2026-06-15', label: 'Maandag 15 juni', short: 'Ma 15/6', name: 'Haar verjaardag 🎂', special: true },
  { date: '2026-06-16', label: 'Dinsdag 16 juni', short: 'Di 16/6', name: 'Dag 4' },
  { date: '2026-06-17', label: 'Woensdag 17 juni', short: 'Wo 17/6', name: 'Dag 5' },
  { date: '2026-06-18', label: 'Donderdag 18 juni', short: 'Do 18/6', name: 'Dag 6' },
  { date: '2026-06-19', label: 'Vrijdag 19 juni', short: 'Vr 19/6', name: 'Dag 7' },
  { date: '2026-06-20', label: 'Zaterdag 20 juni', short: 'Za 20/6', name: 'Dag 8' },
  { date: '2026-06-21', label: 'Zondag 21 juni', short: 'Zo 21/6', name: 'Dag 9 — zomerzonnewende' },
  { date: '2026-06-22', label: 'Maandag 22 juni', short: 'Ma 22/6', name: 'Dag 10' },
  { date: '2026-06-23', label: 'Dinsdag 23 juni', short: 'Di 23/6', name: 'Dag 11' },
  { date: '2026-06-24', label: 'Woensdag 24 juni', short: 'Wo 24/6', name: 'Dag 12' },
  { date: '2026-06-25', label: 'Donderdag 25 juni', short: 'Do 25/6', name: 'Dag 13' },
  { date: '2026-06-26', label: 'Vrijdag 26 juni', short: 'Vr 26/6', name: 'Laatste avond' },
];

const DAY_BUDGET_MINUTES = 540; // 9 uur beschikbaar per dag (09:00–18:00)

// Activiteiten worden geladen uit activities.generated.js (gegenereerd uit
// activities/*.json door build.js). Bewerk de JSON-bestanden, niet deze regel.
const ACTIVITIES = window.ACTIVITIES || [];

const CAT_LABELS = {
  hotel:    '🏨 Hotel & Relaxen',
  bday:     '🎂 Verjaardagsideeën',
  stranden: '🏖️ Stranden & Baaien',
  cultuur:  '🏛️ Cultuur & Dorpjes',
  natuur:   '🌿 Natuur & Actief',
  eten:     '🍷 Eten, Drinken & Ervaringen',
};

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
let state = {
  name: '',
  currentDay: 'heen',
  plan: Array(14).fill(null).map(() => ({ activities: [] })),
};

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════
//  OPSLAAN / HERSTELLEN (localStorage + terugkeer-code)
// ═══════════════════════════════════════════════════════
const STORAGE_KEY = 'kefalonia_plan_v1';

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Compacte representatie van het plan: alleen naam, huidige dag en
// per dag de activiteit-id's (activiteiten komen altijd uit ACTIVITIES).
function serializePlan(s) {
  return {
    v: 1,
    n: s.name,
    c: s.currentDay,
    d: s.plan.map(day => day.activities.map(a => a.id)),
  };
}

// Bouwt vanuit een compacte representatie een geldig state-object terug.
function hydratePlan(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const days = Array.isArray(obj.d) ? obj.d : [];
  const plan = Array(14).fill(null).map((_, i) => {
    const ids = Array.isArray(days[i]) ? days[i] : [];
    const activities = ids
      .map(id => ACTIVITIES.find(a => a.id === id))
      .filter(Boolean);
    return { activities };
  });
  let currentDay = obj.c;
  const validDay = currentDay === 'heen' || currentDay === 'terug' ||
    (Number.isInteger(currentDay) && currentDay >= 0 && currentDay <= 13);
  if (!validDay) currentDay = 'heen';
  return {
    name: typeof obj.n === 'string' ? obj.n : 'Jij',
    currentDay,
    plan,
  };
}

function planHasContent(s) {
  return !!s && s.plan.some(d => d.activities.length > 0);
}

function saveState() {
  const serialized = serializePlan(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    // private mode / quota — stilletjes negeren
  }
  sync.push(serialized);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return hydratePlan(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

function clearSavedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

// ── Terugkeer-code (zelfbevattend, base64url, geen backend) ──
function encodePlanCode() {
  const json = JSON.stringify(serializePlan(state));
  const bytes = new TextEncoder().encode(json);
  const b64 = btoa(String.fromCharCode(...bytes));
  return 'KEF1-' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodePlanCode(code) {
  try {
    const trimmed = (code || '').trim();
    if (!trimmed.startsWith('KEF1-')) return null;
    let b64 = trimmed.slice(5).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
    const json = new TextDecoder().decode(bytes);
    return hydratePlan(JSON.parse(json));
  } catch (e) {
    return null;
  }
}

function dayUsedMinutes(dayIndex) {
  return state.plan[dayIndex].activities.reduce((s, a) => s + (a.duration || 0), 0);
}

function dayIsFullDay(dayIndex) {
  return state.plan[dayIndex].activities.some(a => a.duration >= 420);
}

function formatDuration(minutes) {
  if (minutes === 0) return '';
  if (minutes >= 420) return 'Hele dag';
  if (minutes >= 330) return '~6 uur';
  if (minutes >= 270) return '~5 uur';
  if (minutes >= 240) return '~4 uur';
  if (minutes >= 180) return '~3 uur';
  if (minutes >= 120) return '~2 uur';
  if (minutes >= 90) return '~1,5 uur';
  if (minutes >= 60) return '~1 uur';
  return '~' + minutes + ' min';
}

let collapsedCategories = {
  hotel: false,
  bday: false,
  stranden: false,
  cultuur: false,
  natuur: false,
  eten: false
};

let sortMode = 'category'; // 'category' | 'distance'
let activitySearchQuery = '';

// Track which activities are used
function usedIds() {
  const ids = new Set();
  state.plan.forEach(d => {
    d.activities.forEach(a => ids.add(a.id));
  });
  return ids;
}

function availableActivities(isSpecialDay) {
  const used = usedIds();
  return ACTIVITIES.filter(a => {
    if (used.has(a.id) && a.id !== 'e9') return false;
    if (isSpecialDay && a.cat === 'bday') return true;
    if (!isSpecialDay && a.cat === 'bday') return false;
    return true;
  });
}

// Like availableActivities but includes the current day's own selections
function availableForDay(dayIndex, isSpecialDay) {
  const usedElsewhere = new Set();
  state.plan.forEach((d, i) => {
    if (i === dayIndex) return;
    d.activities.forEach(a => usedElsewhere.add(a.id));
  });
  return ACTIVITIES.filter(a => {
    if (usedElsewhere.has(a.id) && a.id !== 'e9') return false;
    if (isSpecialDay && a.cat === 'bday') return true;
    if (!isSpecialDay && a.cat === 'bday') return false;
    return true;
  });
}

// ═══════════════════════════════════════════════════════
//  WELCOME
// ═══════════════════════════════════════════════════════
const nameInput = document.getElementById('planner-name');
const startBtn = document.getElementById('btn-start');

function updateStartButtonState() {
  if (startBtn && nameInput) {
    startBtn.disabled = nameInput.value.trim().length < 1;
  }
}

if (nameInput) {
  ['input', 'change', 'keyup', 'paste'].forEach(evt => {
    nameInput.addEventListener(evt, updateStartButtonState);
  });

  nameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && startBtn && !startBtn.disabled) {
      startPlanning();
    }
  });

  updateStartButtonState();
}

function startPlanning() {
  const nameEl = document.getElementById('planner-name');
  state.name = nameEl ? (nameEl.value.trim() || 'Jij') : 'Jij';
  state.currentDay = 'heen';
  showScreen('screen-planner');
  renderSidebar();
  renderPlannerDay('heen');
  setTimeout(() => updateMap('heen'), 50);
  updateMobileBar();
}

// Open de planner met een (herstelde) state.
function enterPlanner() {
  showScreen('screen-planner');
  renderSidebar();
  renderPlannerDay(state.currentDay);
  setTimeout(() => updateMap(state.currentDay), 50);
  updateMobileBar();
  const saved = sync.getSavedSession();
  if (saved && !sync.recordId) {
    sync.sessionCode = saved.code;
    sync.recordId = saved.recordId;
    sync.subscribe(saved.recordId, onRemoteUpdate);
  }
}

// ── Welkom-terug banner (auto-herstel via localStorage) ──
let pendingSaved = null;

function resumeSaved() {
  if (!pendingSaved) return;
  state = pendingSaved;
  pendingSaved = null;
  enterPlanner();
}

function startFresh() {
  pendingSaved = null;
  clearSavedState();
  sync.disconnect();
  document.getElementById('welcome-banner').classList.remove('open');
}

// ── Terugkeer-code invoeren ──
function toggleResumeForm() {
  const form = document.getElementById('resume-form');
  form.classList.toggle('open');
  if (form.classList.contains('open')) {
    setTimeout(() => document.getElementById('code-input').focus(), 50);
  }
}

function resumeFromCode() {
  const input = document.getElementById('code-input');
  const err = document.getElementById('resume-error');
  const restored = decodePlanCode(input.value);
  if (!restored || !planHasContent(restored)) {
    err.textContent = 'Deze code is niet geldig. Controleer of je hem volledig hebt geplakt.';
    return;
  }
  err.textContent = '';
  state = restored;
  enterPlanner();
}

// Bij het laden: is er een bewaard plan? Toon dan de welkom-terug banner.
(function initResume() {
  const saved = loadState();
  if (saved && planHasContent(saved)) {
    pendingSaved = saved;
    document.getElementById('welcome-banner').classList.add('open');
  }
})();

// ═══════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════
function renderSidebar() {
  document.getElementById('sb-name').textContent = state.name;

  const plannedCount = state.plan.filter(d => d.activities.length > 0).length;
  const pct = Math.round((plannedCount / 14) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${plannedCount} van 14 dagen gepland`;

  const list = document.getElementById('day-list');
  list.innerHTML = '';

  // Heenreis flight item at the top
  const heenItem = document.createElement('div');
  heenItem.className = 'day-item flight-item' + (state.currentDay === 'heen' ? ' current' : '');
  heenItem.onclick = () => { activitySearchQuery = ''; state.currentDay = 'heen'; renderSidebar(); renderPlannerDay('heen'); scrollToTop(); setTimeout(() => updateMap('heen'), 50); };
  heenItem.innerHTML = `
    <div class="day-dot">✈️</div>
    <div class="day-meta">
      <div class="day-date">Za 13/6</div>
      <div class="day-name">Heenreis (AMS → EFL)</div>
      <div class="day-activity" style="color:var(--sea); font-weight: 500;">Vertrek 05:05 · Transavia</div>
    </div>
  `;
  list.appendChild(heenItem);

  DAYS.forEach((day, i) => {
    const d = state.plan[i];
    const isDone = d.activities.length > 0;
    const isCurrent = i === state.currentDay;
    const usedMin = dayUsedMinutes(i);

    const item = document.createElement('div');
    item.className = 'day-item' + (isDone ? ' done' : '') + (isCurrent ? ' current' : '');
    item.onclick = () => { activitySearchQuery = ''; state.currentDay = i; renderSidebar(); renderPlannerDay(i); scrollToTop(); setTimeout(() => updateMap(i), 50); };

    const checkmark = isDone ? '✓' : (i + 1);
    const actText = d.activities.map(a => a.icon + ' ' + a.title).join(' · ');

    // Check for travel warning
    let warningIcon = '';
    if (d.activities.length >= 2) {
      const lngs = d.activities.map(a => a.lng);
      const crossing = lngs.some(lng => lng < 20.46) && lngs.some(lng => lng >= 20.46);
      if (crossing) {
        warningIcon = ' <span title="Let op: Activiteiten liggen in verschillende regio\'s!" style="font-size:0.85rem; margin-left:4px; cursor:help;">🚗⚠️</span>';
      }
    }

    const timeLabel = usedMin > 0 ? `<span style="font-size:0.65rem; color:var(--muted); margin-left:4px;">${dayIsFullDay(i) ? '🌅 hele dag' : Math.floor(usedMin/60) + 'u' + (usedMin%60>0?' '+(usedMin%60)+'m':'')}</span>` : '';

    item.innerHTML = `
      <div class="day-dot">${checkmark}</div>
      <div class="day-meta">
        <div class="day-date">${day.short}${timeLabel}</div>
        <div class="day-name">${day.name}${warningIcon}</div>
        ${actText ? `<div class="day-activity">${actText}</div>` : ''}
      </div>
      ${day.special ? '<div class="special-badge">Verjaardag</div>' : ''}
    `;
    list.appendChild(item);
  });

  // Terugreis flight item at the bottom
  const terugItem = document.createElement('div');
  terugItem.className = 'day-item flight-item' + (state.currentDay === 'terug' ? ' current' : '');
  terugItem.onclick = () => { activitySearchQuery = ''; state.currentDay = 'terug'; renderSidebar(); renderPlannerDay('terug'); scrollToTop(); setTimeout(() => updateMap('terug'), 50); };
  terugItem.innerHTML = `
    <div class="day-dot">✈️</div>
    <div class="day-meta">
      <div class="day-date">Za 27/6</div>
      <div class="day-name">Terugreis (EFL → AMS)</div>
      <div class="day-activity" style="color:var(--sea); font-weight: 500;">Vertrek 10:05 · Transavia</div>
    </div>
  `;
  list.appendChild(terugItem);

  // Bewaar het plan automatisch na elke wijziging (naam/dag/activiteiten)
  saveState();
}

function scrollToTop() {
  document.getElementById('planner-main').scrollTo({ top: 0, behavior: 'smooth' });
}

window.toggleCategory = function(cat) {
  collapsedCategories[cat] = !collapsedCategories[cat];
  renderPlannerDay(state.currentDay);
};

window.setSortMode = function(mode) {
  sortMode = mode;
  renderPlannerDay(state.currentDay);
};

window.setActivitySearch = function(query) {
  activitySearchQuery = query;
  renderPlannerDay(state.currentDay);
  // Restore focus & cursor position after re-render
  const el = document.getElementById('activity-search-input');
  if (el) {
    el.focus();
    el.value = query;
    el.setSelectionRange(query.length, query.length);
  }
};

// ═══════════════════════════════════════════════════════
//  MAP & TRAVEL CALCULATIONS
// ═══════════════════════════════════════════════════════
let map = null;
let mapMarkers = [];
let overviewMap = null;
let overviewMapMarkers = [];
let routeLines = [];
const HOTEL_COORDS = [38.188, 20.407];

// Used only for sort-ordering approximation (not displayed as exact distances)
function calculateTravelStats(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDist = R * c;

  // Road multiplier for Kefalonia's winding mountain roads
  let roadDist = straightDist * 1.5;
  let timeMins = (roadDist / 40) * 60;

  // Lixouri Bay Penalty (crossing to the main body of Kefalonia)
  const isLixouri1 = lng1 < 20.46;
  const isLixouri2 = lng2 < 20.46;
  if (isLixouri1 !== isLixouri2) {
    roadDist += 28; // km penalty to drive around (or waiting + boarding ferry)
    timeMins += 35; // mins penalty
  }

  return {
    distance: Math.round(roadDist * 10) / 10,
    time: Math.round(timeMins)
  };
}

// ── OSRM real road distances ──────────────────────────
const routeDistanceCache = {};
const roadGeometryCache = {};

// OSRM service state tracking
const osrm = {
  consecutiveFailures: 0,
  disabled: false,         // true after 3 consecutive failures this session
  lastFailureType: null,   // 'ratelimited' | 'server' | 'network' | 'timeout'
  usingFallback: false,
};
const OSRM_TIMEOUT_MS = 6000;
const OSRM_MAX_FAILURES = 3;

function setMapRouteStatus(statusClass, text, titleText) {
  const el = document.getElementById('map-route-status');
  if (!el) return;
  el.className = `map-route-status ${statusClass}`;
  el.textContent = text;
  if (titleText) el.title = titleText;
  else el.removeAttribute('title');

  if (statusClass === 'status-ok') {
    clearTimeout(el._fadeTimer);
    el._fadeTimer = setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => { el.className = 'map-route-status'; }, 450);
    }, 3000);
  } else {
    clearTimeout(el._fadeTimer);
    el.classList.remove('fade-out');
  }
}

async function osrmFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 429) {
      osrm.consecutiveFailures++;
      osrm.lastFailureType = 'ratelimited';
      return null;
    }
    if (!res.ok) {
      osrm.consecutiveFailures++;
      osrm.lastFailureType = 'server';
      return null;
    }
    const data = await res.json();
    osrm.consecutiveFailures = 0;
    osrm.lastFailureType = null;
    return data;
  } catch (e) {
    clearTimeout(timer);
    osrm.consecutiveFailures++;
    osrm.lastFailureType = e.name === 'AbortError' ? 'timeout' : 'network';
    return null;
  } finally {
    if (osrm.consecutiveFailures >= OSRM_MAX_FAILURES) {
      osrm.disabled = true;
    }
  }
}

async function getRoadSegmentDistance(lat1, lng1, lat2, lng2) {
  const key = `${lat1.toFixed(4)},${lng1.toFixed(4)}|${lat2.toFixed(4)},${lng2.toFixed(4)}`;
  if (routeDistanceCache[key]) return routeDistanceCache[key];
  if (!osrm.disabled) {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const data = await osrmFetch(url);
    if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
      const result = {
        distance: Math.round(data.routes[0].distance / 100) / 10,
        time: Math.round(data.routes[0].duration / 60),
        exact: true,
      };
      routeDistanceCache[key] = result;
      return result;
    }
  }
  const fallback = calculateTravelStats(lat1, lng1, lat2, lng2);
  const result = { ...fallback, exact: false };
  routeDistanceCache[key] = result;
  return result;
}

async function fetchRoadRouteGeometry(waypoints) {
  const key = waypoints.map(w => w.join(',')).join('|');
  if (roadGeometryCache[key]) return roadGeometryCache[key];
  if (osrm.disabled) return null;
  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const data = await osrmFetch(url);
  if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
    const result = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    roadGeometryCache[key] = result;
    return result;
  }
  return null;
}

function osrmStatusBadgeAfterFetch(routeCoords) {
  if (routeCoords) {
    osrm.usingFallback = false;
    setMapRouteStatus('status-ok', '✓ Echte routes');
  } else if (osrm.disabled) {
    const msgs = {
      ratelimited: 'OSRM snelheidslimiet bereikt — afstanden zijn schattingen. Probeer later opnieuw.',
      server: 'Routeservice tijdelijk onbereikbaar — afstanden zijn schattingen.',
      timeout: 'Routeservice reageert niet — afstanden zijn schattingen.',
      network: 'Geen verbinding met routeservice — afstanden zijn schattingen.',
    };
    const type = osrm.lastFailureType || 'server';
    const labels = {
      ratelimited: '⚠ Snelheidslimiet bereikt',
      server: '✕ Routeservice onbereikbaar',
      timeout: '✕ Routeservice reageert niet',
      network: '✕ Geen verbinding',
    };
    setMapRouteStatus(
      type === 'ratelimited' ? 'status-ratelimited' : 'status-error',
      labels[type],
      msgs[type]
    );
    osrm.usingFallback = true;
  } else {
    osrm.usingFallback = true;
    setMapRouteStatus(
      'status-fallback',
      '~ Geschatte routes',
      'OSRM niet bereikbaar — routes zijn rechte lijnen met geschatte rijafstanden.'
    );
  }
}

function buildGoogleMapsUrl(plan) {
  const hotelLatLng = `${HOTEL_COORDS[0]},${HOTEL_COORDS[1]}`;
  const waypoints = plan.activities.filter(a => a.lat && a.lng).map(a => `${a.lat},${a.lng}`);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${hotelLatLng}&destination=${hotelLatLng}&travelmode=driving`;
  if (waypoints.length > 0) url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
  return url;
}

async function updateRouteStatsCard(dayIndex) {
  const plan = state.plan[dayIndex];
  const numbersEl = document.getElementById(`route-stats-numbers-${dayIndex}`);
  if (!numbersEl) return;

  const acts = plan.activities.filter(a => a.lat && a.lng);
  if (acts.length === 0) return;

  numbersEl.innerHTML = `<div style="font-size:0.75rem;color:var(--muted);">Berekenen…</div>`;

  const [hotelLat, hotelLng] = HOTEL_COORDS;
  let totalDistance = 0, totalTime = 0, allExact = true;

  try {
    if (acts.length === 1) {
      const s = await getRoadSegmentDistance(hotelLat, hotelLng, acts[0].lat, acts[0].lng);
      totalDistance = s.distance * 2;
      totalTime = s.time * 2;
      if (!s.exact) allExact = false;
    } else {
      const waypoints = [
        [hotelLat, hotelLng],
        ...acts.map(a => [a.lat, a.lng]),
        [hotelLat, hotelLng],
      ];
      const segments = await Promise.all(
        waypoints.slice(0, -1).map((wp, i) =>
          getRoadSegmentDistance(wp[0], wp[1], waypoints[i + 1][0], waypoints[i + 1][1])
        )
      );
      totalDistance = segments.reduce((s, seg) => s + seg.distance, 0);
      totalTime = segments.reduce((s, seg) => s + seg.time, 0);
      if (segments.some(s => !s.exact)) allExact = false;
    }
  } catch (e) {
    const el = document.getElementById(`route-stats-numbers-${dayIndex}`);
    if (el) el.innerHTML = `<div style="font-size:0.75rem;color:var(--muted);">Niet beschikbaar</div>`;
    return;
  }

  const el = document.getElementById(`route-stats-numbers-${dayIndex}`);
  if (!el) return;

  const hours = Math.floor(totalTime / 60);
  const mins  = totalTime % 60;
  const timeText = hours > 0 ? `${hours}u ${mins}m` : `${mins}m`;
  const qualityLabel = allExact
    ? ''
    : `<span title="Routeservice niet bereikbaar — schatting op basis van luchtlijn × 1,5" style="font-size:0.65rem;color:var(--muted);margin-left:4px;cursor:help;">~schatting</span>`;

  el.innerHTML = `
    <div style="font-size:1.25rem; font-weight:700; color:var(--sea-deep);">${timeText} reistijd</div>
    <div style="font-size:0.75rem; color:var(--muted); margin-top:2px;">${totalDistance.toFixed(1)} km rijden${qualityLabel}</div>
  `;
}

function initMap() {
  if (map) return;
  
  // Center of Kefalonia
  map = L.map('map', {
    zoomControl: false
  }).setView([38.22, 20.53], 10);
  
  L.control.zoom({ position: 'topright' }).addTo(map);

  // CartoDB Positron clean light theme
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);
  
}

let mapUpdateToken = 0;

function updateMap(dayIndex) {
  initMap();
  const token = ++mapUpdateToken;

  // Clear layers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  routeLines.forEach(l => map.removeLayer(l));
  routeLines = [];

  if (dayIndex === 'heen' || dayIndex === 'terug') {
    // Zoom on Kefalonia Airport
    const airportCoords = [38.115, 20.501];
    const marker = L.marker(airportCoords, {
      icon: L.divIcon({
        html: dayIndex === 'heen' ? '🛬' : '🛫',
        className: 'custom-map-icon active-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).bindPopup(dayIndex === 'heen' ? '<strong>Kefallinia Airport (EFL)</strong><br>Welkom op Kefalonia!' : '<strong>Kefallinia Airport (EFL)</strong><br>Goede reis terug!').addTo(map);
    mapMarkers.push(marker);
    map.setView(airportCoords, 11);
    return;
  }

  const day = DAYS[dayIndex];
  const plan = state.plan[dayIndex];
  const activeIds = new Set(plan.activities.map(a => a.id));

  // 1. Draw inactive activities (only when no full-day activity planned)
  const dayFull = dayIsFullDay(dayIndex);
  const availIds = new Set(availableForDay(dayIndex, !!day.special).map(a => a.id));
  ACTIVITIES.forEach(act => {
    if (dayFull) return;
    if (activeIds.has(act.id)) return;
    if (!availIds.has(act.id)) return;

    const marker = L.marker([act.lat, act.lng], {
      icon: L.divIcon({
        html: act.icon,
        className: 'custom-map-icon inactive-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family:'DM Sans',sans-serif; width:180px;">
        <strong style="font-size:0.85rem;">${act.icon} ${act.title}</strong>
        <p style="font-size:0.75rem; color:var(--muted); margin:4px 0 8px;">${act.location.split(',')[0]}</p>
        <button onclick="selectActivityFromMap(${dayIndex}, '${act.id}')" style="width:100%; font-size:0.65rem; padding:4px 8px; border:none; border-radius:4px; cursor:pointer; font-weight:500; color:white; background:var(--sea);">+ Toevoegen aan dag</button>
      </div>
    `);
    mapMarkers.push(marker);
  });

  // 2. Hotel
  const hotelMarker = L.marker(HOTEL_COORDS, {
    icon: L.divIcon({
      html: '🏢',
      className: 'custom-map-icon hotel-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    })
  }).bindPopup('<strong>Hotel: Apollonion Asterias Resort & Spa *****</strong>').addTo(map);
  mapMarkers.push(hotelMarker);

  // 3. Active activity markers
  const coords = [HOTEL_COORDS];
  const rmBtnStyle = 'width:100%; font-size:0.65rem; padding:4px 8px; background:#c53030; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:500; margin-top:6px;';

  plan.activities.forEach((act, idx) => {
    coords.push([act.lat, act.lng]);
    const actMarker = L.marker([act.lat, act.lng], {
      icon: L.divIcon({
        html: act.icon,
        className: 'custom-map-icon active-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).bindPopup(`
      <div style="font-family:'DM Sans',sans-serif; width:160px;">
        <strong style="font-size:0.8rem;">${act.icon} ${act.title}</strong>
        <p style="font-size:0.75rem; margin:4px 0 2px; color:var(--muted);">${formatDuration(act.duration)}</p>
        <button onclick="removeActivityFromMap(${dayIndex}, '${act.id}')" style="${rmBtnStyle}">✕ Verwijder</button>
      </div>
    `).addTo(map);
    mapMarkers.push(actMarker);
  });

  coords.push(HOTEL_COORDS);

  // 4. Draw route
  const validActivities = plan.activities.filter(a => typeof a.lat === 'number' && typeof a.lng === 'number');
  if (validActivities.length >= 2) {
    const waypoints = [HOTEL_COORDS, ...validActivities.map(a => [a.lat, a.lng]), HOTEL_COORDS];
    map.fitBounds(L.latLngBounds(waypoints), { padding: [60, 60] });

    setMapRouteStatus('status-loading', '⏳ Routes laden…');

    fetchRoadRouteGeometry(waypoints).then(routeCoords => {
      if (token !== mapUpdateToken) return;
      if (routeCoords) {
        const roadRoute = L.polyline(routeCoords, {
          color: '#1B6CA8',
          weight: 4.5,
          opacity: 0.9
        }).addTo(map);
        routeLines.push(roadRoute);
        map.fitBounds(roadRoute.getBounds(), { padding: [60, 60] });
      } else {
        const route = L.polyline(waypoints, {
          color: 'var(--sea)',
          weight: 3.5,
          dashArray: '6, 8',
          opacity: 0.85
        }).addTo(map);
        routeLines.push(route);
        map.fitBounds(route.getBounds(), { padding: [60, 60] });
      }
      osrmStatusBadgeAfterFetch(routeCoords);
    });
  } else if (coords.length > 2) {
    const route = L.polyline(coords, {
      color: 'var(--sea)',
      weight: 3.5,
      dashArray: '6, 8',
      opacity: 0.85
    }).addTo(map);
    routeLines.push(route);
    map.fitBounds(route.getBounds(), { padding: [50, 50] });
  } else {
    map.setView([38.22, 20.48], 11);
  }
}

// Overzichtskaart: alle ingeplande activiteiten als pins (geen route)
function renderOverviewMap() {
  // Verzamel unieke ingeplande activiteiten + op welke dagen ze staan
  const planned = new Map(); // actId -> { act, days: [dayShort] }
  state.plan.forEach((d, i) => {
    d.activities.forEach(act => {
      if (typeof act.lat !== 'number' || typeof act.lng !== 'number') return;
      if (!planned.has(act.id)) planned.set(act.id, { act, days: [] });
      planned.get(act.id).days.push(DAYS[i].short);
    });
  });

  const card = document.getElementById('overview-map-card');

  // Geen plekken met coördinaten? Verberg de kaart.
  if (planned.size === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';

  // Init kaart (eenmalig)
  if (!overviewMap) {
    overviewMap = L.map('overview-map', { zoomControl: false }).setView([38.22, 20.53], 10);
    L.control.zoom({ position: 'topright' }).addTo(overviewMap);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(overviewMap);
  }

  // Oude markers wissen
  overviewMapMarkers.forEach(m => overviewMap.removeLayer(m));
  overviewMapMarkers = [];

  const bounds = [HOTEL_COORDS];

  // Hotel als ankerpunt
  const hotelMarker = L.marker(HOTEL_COORDS, {
    icon: L.divIcon({
      html: '🏢',
      className: 'custom-map-icon hotel-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    })
  }).bindPopup('<strong>Hotel: Apollonion Asterias Resort & Spa *****</strong>').addTo(overviewMap);
  overviewMapMarkers.push(hotelMarker);

  // Pin per ingeplande activiteit
  planned.forEach(({ act, days }) => {
    bounds.push([act.lat, act.lng]);
    const dayLabel = days.length > 1
      ? `Ingepland op: ${days.join(', ')}`
      : `Ingepland op ${days[0]}`;
    const marker = L.marker([act.lat, act.lng], {
      icon: L.divIcon({
        html: act.icon,
        className: 'custom-map-icon active-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).bindPopup(`
      <div style="font-family:'DM Sans',sans-serif; width:180px;">
        <strong style="font-size:0.85rem;">${act.icon} ${act.title}</strong>
        <p style="font-size:0.72rem; color:var(--muted); margin:4px 0 4px;">${act.location ? act.location.split(',')[0] : ''}</p>
        <p style="font-size:0.68rem; color:var(--sea); margin:0;">📅 ${dayLabel}</p>
      </div>
    `).addTo(overviewMap);
    overviewMapMarkers.push(marker);
  });

  // Tel-tekst bijwerken
  const sub = document.getElementById('overview-map-sub');
  if (sub) sub.textContent = `${planned.size} ingeplande ${planned.size === 1 ? 'plek' : 'plekken'} tijdens jullie vakantie.`;

  // De kaart-div was verborgen bij init; herbereken grootte en zoom op alles
  setTimeout(() => {
    if (!overviewMap) return;
    overviewMap.invalidateSize();
    if (bounds.length > 1) {
      overviewMap.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 13 });
    } else {
      overviewMap.setView([38.22, 20.48], 11);
    }
  }, 80);
}

window.selectActivityFromMap = function(dayIndex, actId) {
  selectActivity(dayIndex, actId);
  map.closePopup();
};

window.removeActivityFromMap = function(dayIndex, actId) {
  const plan = state.plan[dayIndex];
  const idx = plan.activities.findIndex(a => a.id === actId);
  if (idx !== -1) plan.activities.splice(idx, 1);
  map.closePopup();
  renderPlannerDay(dayIndex);
  renderSidebar();
  setTimeout(() => updateMap(dayIndex), 50);
};

// ═══════════════════════════════════════════════════════
//  PLANNER DAY
// ═══════════════════════════════════════════════════════
function renderPlannerDay(i) {
  if (i === 'heen' || i === 'terug') {
    renderFlightPage(i);
    return;
  }
  const day = DAYS[i];
  const plan = state.plan[i];
  const isSpecial = !!day.special;
  let avail = availableForDay(i, isSpecial);

  if (activitySearchQuery.trim()) {
    const q = activitySearchQuery.trim().toLowerCase();
    const catLabelFor = id => (CAT_LABELS[id] || '').toLowerCase();
    avail = avail.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.why.toLowerCase().includes(q) ||
      (a.tip || '').toLowerCase().includes(q) ||
      catLabelFor(a.cat).includes(q) ||
      (a.location || '').toLowerCase().includes(q)
    );
  }

  // Time budget calculation
  const usedMin = dayUsedMinutes(i);
  const budgetPct = Math.min(100, Math.round((usedMin / DAY_BUDGET_MINUTES) * 100));
  const isOverBudget = usedMin > DAY_BUDGET_MINUTES;
  const isFullDayAct = dayIsFullDay(i);
  const budgetColor = isOverBudget ? 'var(--terracotta)' : budgetPct >= 70 ? '#d97706' : 'var(--olive)';

  // Build stats card (real distances fetched async after render)
  let statsHtml = '';
  let regionTip = '';

  if (plan.activities.length > 0) {
    if (plan.activities.length >= 2) {
      const lngs = plan.activities.map(a => a.lng);
      const crossRegion = lngs.some(lng => lng < 20.46) && lngs.some(lng => lng >= 20.46);
      if (crossRegion) {
        regionTip = `<div style="font-size:0.75rem; color:var(--terracotta); font-weight:500; margin-top:6px;">⚠️ Tip: Activiteiten liggen in verschillende regio's van het eiland — houd rekening met extra reistijd!</div>`;
      }
    }

    const gmapsUrl = buildGoogleMapsUrl(plan);

    statsHtml = `
      <div id="route-stats-${i}" class="route-info-card fade-up" style="background:var(--sand-dark); border-radius:var(--radius-lg); padding:1.2rem 1.5rem; margin-bottom:2rem; border:1px solid rgba(0,0,0,0.05);">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:12px; flex:1;">
            <span style="font-size:1.8rem; background:rgba(255,255,255,0.6); padding:6px; border-radius:10px; display:inline-block; line-height:1;">🚗</span>
            <div style="flex:1;">
              <div style="font-size:0.85rem; font-weight:600; color:var(--ink);">Reistijd & Route Vandaag</div>
              <div style="font-size:0.75rem; color:var(--muted); margin-top:2px;">Start & eindigt bij <strong>Apollonion Resort</strong> in Lixouri</div>
              ${regionTip}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:10px; flex-shrink:0;">
            <div id="route-stats-numbers-${i}" style="text-align:right;">
              <div style="font-size:0.85rem; color:var(--muted); font-style:italic;">Berekenen…</div>
            </div>
            <a href="${gmapsUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation();"
               style="display:inline-flex; align-items:center; gap:6px; background:var(--sea-deep); color:white; text-decoration:none; font-size:0.78rem; font-weight:500; padding:8px 16px; border-radius:100px; white-space:nowrap; transition:background 0.15s;"
               onmouseover="this.style.background='var(--sea)'" onmouseout="this.style.background='var(--sea-deep)'">
              🗺️ Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    `;
  } else {
    statsHtml = `
      <div class="route-info-card fade-up" style="background:var(--sand-dark); border-radius:var(--radius-lg); padding:1rem 1.5rem; margin-bottom:2rem; display:flex; align-items:center; gap:12px; opacity:0.65;">
        <span style="font-size:1.5rem;">🚗</span>
        <div style="font-size:0.8rem; color:var(--muted); line-height:1.4;">Kies ten minste één activiteit om de rijafstand te berekenen en de route te exporteren naar Google Maps.</div>
      </div>
    `;
  }

  // Group available by category
  const groups = {};
  avail.forEach(a => {
    if (!groups[a.cat]) groups[a.cat] = [];
    groups[a.cat].push(a);
  });

  const totalDays = 14;
  const isLast = i === totalDays - 1;

  // Tijdsbudget balk
  const budgetBarHtml = `
    <div class="fade-up" style="background:var(--sand-dark); border-radius:var(--radius-lg); padding:1rem 1.5rem; margin-bottom:1.5rem; border:1px solid rgba(0,0,0,0.05);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <div style="font-size:0.82rem; font-weight:600; color:var(--ink);">⏱️ Dagplanning</div>
        <div style="font-size:0.78rem; color:${budgetColor}; font-weight:600;">
          ${isFullDayAct ? 'Hele dag vol' : usedMin === 0 ? 'Leeg — voeg activiteiten toe' : `${Math.floor(usedMin / 60)}u${usedMin % 60 > 0 ? ' ' + (usedMin % 60) + 'm' : ''} / 9 uur${isOverBudget ? ' ⚠️ over budget' : ''}`}
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.08); border-radius:100px; height:8px; overflow:hidden;">
        <div style="height:100%; width:${budgetPct}%; background:${budgetColor}; border-radius:100px; transition:width 0.3s;"></div>
      </div>
      ${plan.activities.length > 0 ? `
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
          ${plan.activities.map(a => `
            <div onclick="selectActivity(${i}, '${a.id}')" style="display:inline-flex; align-items:center; gap:5px; background:white; border:1.5px solid ${isSpecial ? 'var(--gold)' : 'var(--sea)'}; border-radius:100px; padding:4px 10px; font-size:0.75rem; font-weight:500; color:${isSpecial ? 'var(--gold)' : 'var(--sea-deep)'}; cursor:pointer;" title="Klik om te verwijderen">
              ${a.icon} ${a.title} <span style="opacity:0.5; margin-left:2px;">✕</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  const mobileStickyBudget = `
    <div class="mobile-sticky-budget">
      <div class="mobile-sticky-budget-bar-wrap">
        <div class="mobile-sticky-budget-fill" style="width:${budgetPct}%; background:${budgetColor};"></div>
      </div>
      <div class="mobile-sticky-budget-text" style="color:${budgetColor};">
        ${isFullDayAct ? '✓ Hele dag vol' : usedMin === 0 ? 'Leeg' : `${Math.floor(usedMin / 60)}u${usedMin % 60 > 0 ? ' ' + (usedMin % 60) + 'm' : ''} / 9u${isOverBudget ? ' ⚠️' : ''}`}
      </div>
    </div>
  `;

  let html = `
    ${mobileStickyBudget}
    <div class="planner-day-header fade-up">
      <div class="planner-day-label">Dag ${i + 1} van ${totalDays}</div>
      <h2 class="planner-day-title">${day.label}</h2>
      <p class="planner-day-subtitle">${day.name}${isSpecial ? ' — maak er iets onvergetelijks van! ✨' : ''}</p>
    </div>

    ${budgetBarHtml}

    ${statsHtml}
  `;

  html += `
    <div class="sort-toggle fade-up" style="display:flex; align-items:center; gap:10px; margin-bottom:1rem; flex-wrap:wrap;">
      <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); flex-shrink:0;">Sorteren op:</span>
      <div style="display:flex; gap:6px;">
        <button onclick="setSortMode('category')"
          style="font-size:0.78rem; padding:5px 14px; border-radius:100px; border:1.5px solid ${sortMode === 'category' ? 'var(--sea-deep)' : 'var(--sand-dark)'}; background:${sortMode === 'category' ? 'var(--sea-deep)' : 'var(--white)'}; color:${sortMode === 'category' ? 'white' : 'var(--muted)'}; cursor:pointer; font-family:\'DM Sans\',sans-serif; font-weight:500; transition:all 0.15s;">
          📂 Per categorie
        </button>
        <button onclick="setSortMode('distance')"
          style="font-size:0.78rem; padding:5px 14px; border-radius:100px; border:1.5px solid ${sortMode === 'distance' ? 'var(--sea-deep)' : 'var(--sand-dark)'}; background:${sortMode === 'distance' ? 'var(--sea-deep)' : 'var(--white)'}; color:${sortMode === 'distance' ? 'white' : 'var(--muted)'}; cursor:pointer; font-family:\'DM Sans\',sans-serif; font-weight:500; transition:all 0.15s;">
          📍 Op afstand
        </button>
      </div>
      ${sortMode === 'distance' ? `<span style="font-size:0.72rem; color:var(--muted); font-style:italic;">Gesorteerd op afstand vanaf ${plan.activities.length > 0 ? plan.activities[0].title : '🏨 het hotel'}</span>` : ''}
    </div>
    <div class="fade-up" style="position:relative; margin-bottom:1.5rem;">
      <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:0.95rem; pointer-events:none; opacity:0.5;">🔍</span>
      <input
        id="activity-search-input"
        type="text"
        placeholder="Zoek activiteit… bijv. Ithaka, strand, cave"
        value="${escapeHtml(activitySearchQuery)}"
        oninput="setActivitySearch(this.value)"
        style="width:100%; padding:10px 14px 10px 38px; border:1.5px solid var(--sand-dark); border-radius:100px; font-family:'DM Sans',sans-serif; font-size:0.875rem; color:var(--ink); background:var(--white); outline:none; transition:border-color 0.15s;"
        onfocus="this.style.borderColor='var(--sea)'"
        onblur="this.style.borderColor='var(--sand-dark)'"
      >
      ${activitySearchQuery ? `<button onclick="setActivitySearch('')" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:0.85rem; color:var(--muted); padding:2px 6px; border-radius:100px; transition:color 0.15s;" onmouseover="this.style.color='var(--ink)'" onmouseout="this.style.color='var(--muted)'">✕</button>` : ''}
    </div>
  `;

  function renderActivityCard(act) {
    const isSelected = plan.activities.some(a => a.id === act.id);
    const isBlockedByFullDay = !isSelected && isFullDayAct;
    const isFullDayBlocked = !isSelected && act.duration >= 420 && plan.activities.length > 0;
    const isBlocked = isBlockedByFullDay || isFullDayBlocked;
    const durLabel = act.duration > 0 ? formatDuration(act.duration) : '';
    const durColor = act.duration >= 420 ? 'var(--terracotta)' : act.duration >= 240 ? '#d97706' : 'var(--sea-deep)';
    const selectLabel = isSelected ? '✓ Geselecteerd' : (isBlocked ? 'Niet beschikbaar' : '＋ Selecteer');
    return `
      <div class="act-card ${isSelected ? 'selected' : ''} ${act.special ? 'special' : ''} ${isBlocked ? 'blocked' : ''}"
           onclick="openActivityDetail(${i}, '${act.id}')"
           style="${isBlocked ? 'opacity:0.4;' : ''}"
           title="Klik voor meer informatie over deze activiteit">
        <div class="act-info-hint">${isSelected ? '✓' : 'ℹ'}</div>
        <div class="act-icon">${act.icon}</div>
        <div class="act-title">${act.title}</div>
        ${durLabel ? `<div style="display:inline-block; font-size:0.68rem; font-weight:700; color:${durColor}; background:${durColor}18; border-radius:100px; padding:2px 8px; margin-bottom:6px;">⏱️ ${durLabel}</div>` : ''}
        ${act.distKm !== undefined ? `<div style="font-size:0.7rem; color:var(--olive); font-weight:600; margin-bottom:4px;">📏 ${act.distKm} km vanaf ${act.distFrom}</div>` : ''}
        ${act.location ? `
          <div style="font-size:0.7rem; color:var(--sea); margin: 4px 0 8px; display:flex; align-items:center; gap:4px; font-weight:500;">
            📍 <a href="${act.mapUrl}" target="_blank" onclick="event.stopPropagation();" style="color:var(--sea); text-decoration:none; border-bottom:1px dashed var(--sea);">${act.location.split(',')[0]}</a>
          </div>
        ` : ''}
        <div class="act-why">${act.why}</div>
        <div style="margin-top:6px; font-size:0.72rem; font-weight:600; color:${act.cost === 0 ? 'var(--olive)' : 'var(--terracotta)'};">
          ${act.cost === 0 ? '✓ Gratis' : `~€${act.cost} p.p. 2 pers.`}
        </div>
        <div class="act-tip">💡 ${act.tip}</div>
        <button class="act-select-btn ${isSelected ? 'selected' : ''}"
                onclick="event.stopPropagation(); ${isBlocked ? '' : `selectActivity(${i}, '${act.id}')`}"
                ${isBlocked ? 'disabled' : ''}
                title="${isSelected ? 'Klik om te verwijderen uit dag' : isBlocked ? 'Niet combineerbaar met een hele-dag activiteit' : 'Voeg toe aan dag'}">
          ${selectLabel}
        </button>
      </div>`;
  }

  if (sortMode === 'distance') {
    // Reference point: first chosen activity, or hotel
    const refAct = plan.activities[0] || null;
    const refLat = refAct ? refAct.lat : 38.188;
    const refLng = refAct ? refAct.lng : 20.407;
    const refName = refAct ? refAct.title : 'hotel';

    // Collect all available activities flat, add distance info
    const allAvail = avail.map(act => {
      const stats = calculateTravelStats(refLat, refLng, act.lat, act.lng);
      return { ...act, distKm: stats.distance, distFrom: refName };
    });

    // Selected activities always show at top regardless of distance
    const selectedActs = allAvail.filter(a => plan.activities.some(p => p.id === a.id));
    const unselectedActs = allAvail
      .filter(a => !selectedActs.find(s => s.id === a.id))
      .sort((a, b) => a.distKm - b.distKm);

    if (selectedActs.length > 0) {
      html += `<div class="category-section fade-up"><div class="category-label"><span>✅ Al gekozen voor vandaag</span></div><div class="activity-grid">`;
      selectedActs.forEach(act => { html += renderActivityCard(act); });
      html += `</div></div>`;
    }

    if (unselectedActs.length > 0) {
      html += `<div class="category-section fade-up"><div class="category-label"><span>📍 Overige activiteiten op afstand</span></div><div class="activity-grid">`;
      unselectedActs.forEach(act => { html += renderActivityCard(act); });
      html += `</div></div>`;
    } else if (activitySearchQuery && selectedActs.length === 0) {
      html += `<div class="fade-up" style="text-align:center; padding:2.5rem 1rem; color:var(--muted);">
        <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
        <div style="font-size:0.9rem;">Geen activiteiten gevonden voor <strong>"${escapeHtml(activitySearchQuery)}"</strong></div>
        <button onclick="setActivitySearch('')" style="margin-top:0.75rem; background:none; border:1.5px solid var(--sand-dark); border-radius:100px; padding:7px 18px; font-family:'DM Sans',sans-serif; font-size:0.82rem; color:var(--muted); cursor:pointer;">Zoekopdracht wissen</button>
      </div>`;
    }

  } else {
    // Category order
    const order = isSpecial
      ? ['hotel', 'bday', 'stranden', 'cultuur', 'natuur', 'eten']
      : ['hotel', 'stranden', 'cultuur', 'natuur', 'eten'];

    if (activitySearchQuery && avail.length === 0) {
      html += `<div class="fade-up" style="text-align:center; padding:2.5rem 1rem; color:var(--muted);">
        <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
        <div style="font-size:0.9rem;">Geen activiteiten gevonden voor <strong>"${escapeHtml(activitySearchQuery)}"</strong></div>
        <button onclick="setActivitySearch('')" style="margin-top:0.75rem; background:none; border:1.5px solid var(--sand-dark); border-radius:100px; padding:7px 18px; font-family:'DM Sans',sans-serif; font-size:0.82rem; color:var(--muted); cursor:pointer;">Zoekopdracht wissen</button>
      </div>`;
    }

    order.forEach(cat => {
      if (!groups[cat] || groups[cat].length === 0) return;

      const isCollapsed = collapsedCategories[cat];
      const toggleIcon = isCollapsed ? '▶' : '▼';

      html += `<div class="category-section fade-up">
        <div class="category-label" onclick="toggleCategory('${cat}')" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none;" title="Klik om deze categorie in/uit te klappen">
          <span style="display:flex; align-items:center; gap:8px;">${CAT_LABELS[cat]}</span>
          <span class="collapse-toggle" style="font-size:0.68rem; color:var(--muted); font-weight:normal; letter-spacing:0; text-transform:none; opacity:0.6;">${toggleIcon} Klik om in/uit te klappen</span>
        </div>
        <div class="activity-grid" style="${isCollapsed ? 'display:none;' : ''}">`;

      groups[cat].forEach(act => { html += renderActivityCard(act); });

      html += `</div></div>`;
    });
  }

  // Nav
  html += `
    <div class="planner-nav fade-up">
      ${i === 0
        ? `<button class="btn-nav" onclick="goDay('heen')">← Heenreis</button>`
        : `<button class="btn-nav" onclick="goDay(${i - 1})">← Vorige dag</button>`}
      ${isLast
        ? `<button class="btn-next btn-nav" onclick="goDay('terug')">Terugreis bekijken →</button>`
        : `<button class="btn-next btn-nav" onclick="goDay(${i + 1})">Volgende dag →</button>`}
    </div>`;

  document.getElementById('planner-main').innerHTML = html;

  if (plan.activities.length > 0) {
    updateRouteStatsCard(i);
  }
}

function goDay(i) {
  activitySearchQuery = '';
  state.currentDay = i;
  renderSidebar();
  renderPlannerDay(i);
  scrollToTop();
  setTimeout(() => updateMap(i), 50);
  updateMobileBar();
}

// ── MOBILE NAVIGATION ───────────────────────────────────

function updateMobileBar() {
  const bar = document.getElementById('mobile-bottom-bar');
  if (!bar) return;

  const cd = state.currentDay;
  const isHeen = cd === 'heen';
  const isTerug = cd === 'terug';
  const isNum = typeof cd === 'number';

  const labelEl = document.getElementById('mobile-day-label');
  const fillEl = document.getElementById('mobile-budget-fill');
  const textEl = document.getElementById('mobile-budget-text');

  if (isHeen) {
    labelEl.textContent = '✈️ Heenreis';
    fillEl.style.width = '0%';
    textEl.textContent = 'Vluchtinfo';
    textEl.style.color = 'rgba(255,255,255,0.5)';
  } else if (isTerug) {
    labelEl.textContent = '✈️ Terugreis';
    fillEl.style.width = '0%';
    textEl.textContent = 'Vluchtinfo';
    textEl.style.color = 'rgba(255,255,255,0.5)';
  } else {
    const day = DAYS[cd];
    labelEl.textContent = `Dag ${cd + 1} — ${day.name}`;
    const plan = state.plan[cd];
    const usedMin = dayUsedMinutes(cd);
    const pct = Math.min(100, (usedMin / DAY_BUDGET_MINUTES) * 100);
    const isOver = usedMin > DAY_BUDGET_MINUTES;
    const color = isOver ? 'var(--terracotta)' : pct >= 70 ? '#d97706' : 'var(--olive)';
    fillEl.style.width = pct + '%';
    fillEl.style.background = color;
    if (usedMin === 0) {
      textEl.textContent = 'Leeg — tik om te plannen';
      textEl.style.color = 'rgba(255,255,255,0.5)';
    } else {
      textEl.textContent = `${Math.floor(usedMin / 60)}u${usedMin % 60 > 0 ? ' ' + (usedMin % 60) + 'm' : ''} / 9 uur${isOver ? ' ⚠️' : ''}`;
      textEl.style.color = isOver ? 'var(--terracotta)' : 'rgba(255,255,255,0.7)';
    }
  }

  document.getElementById('mobile-prev-btn').disabled = isHeen;
  document.getElementById('mobile-next-btn').disabled = isTerug;
}

function mobilePrevDay() {
  const cd = state.currentDay;
  if (cd === 'heen') return;
  if (cd === 'terug') goDay(13);
  else if (cd === 0) goDay('heen');
  else goDay(cd - 1);
}

function mobileNextDay() {
  const cd = state.currentDay;
  if (cd === 'terug') return;
  if (cd === 'heen') goDay(0);
  else if (cd === 13) goDay('terug');
  else goDay(cd + 1);
}

function openDaySheet() {
  const list = document.getElementById('day-sheet-list');
  const cd = state.currentDay;
  let html = '';

  const heenCls = cd === 'heen' ? 'current' : '';
  html += `<div class="day-sheet-item ${heenCls}" onclick="goDay('heen');closeDaySheet()">
    <div class="day-sheet-dot">✈️</div>
    <div class="day-sheet-meta">
      <div class="day-sheet-name">Heenreis</div>
      <div class="day-sheet-sub">Za 13 juni 2026</div>
    </div>
  </div>`;

  DAYS.forEach((day, i) => {
    const plan = state.plan[i];
    const isDone = plan.activities.length > 0;
    const isCurrent = cd === i;
    const usedMin = dayUsedMinutes(i);
    const badge = isDone
      ? `${Math.floor(usedMin / 60)}u${usedMin % 60 > 0 ? ' ' + (usedMin % 60) + 'm' : ''}`
      : 'Leeg';
    const dot = isDone ? '✓' : String(i + 1);
    const birthday = i === 2 ? ' 🎂' : '';
    html += `<div class="day-sheet-item ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}" onclick="goDay(${i});closeDaySheet()">
      <div class="day-sheet-dot">${dot}</div>
      <div class="day-sheet-meta">
        <div class="day-sheet-name">${day.label}${birthday}</div>
        <div class="day-sheet-sub">${day.name}</div>
      </div>
      <div class="day-sheet-badge">${badge}</div>
    </div>`;
  });

  const terugCls = cd === 'terug' ? 'current' : '';
  html += `<div class="day-sheet-item ${terugCls}" onclick="goDay('terug');closeDaySheet()">
    <div class="day-sheet-dot">✈️</div>
    <div class="day-sheet-meta">
      <div class="day-sheet-name">Terugreis</div>
      <div class="day-sheet-sub">Za 27 juni 2026</div>
    </div>
  </div>`;

  list.innerHTML = html;
  document.getElementById('day-sheet-backdrop').classList.add('open');
}

function closeDaySheet() {
  document.getElementById('day-sheet-backdrop').classList.remove('open');
}

function openMenuSheet() {
  document.getElementById('menu-sheet-backdrop').classList.add('open');
}

function closeMenuSheet() {
  document.getElementById('menu-sheet-backdrop').classList.remove('open');
}

function renderFlightPage(type) {
  const isHeen = type === 'heen';
  const flight = isHeen ? {
    title: 'Heenreis naar Kefalonia',
    date: 'Zaterdag 13 juni 2026',
    depTime: '05:05',
    arrTime: '09:05',
    fromCode: 'AMS',
    fromName: 'Amsterdam Schiphol (AMS)',
    toCode: 'EFL',
    toName: 'Kefallinia Airport (EFL)',
    airline: 'Transavia Airlines',
    flightNum: 'HV 6563',
    class: 'Economy',
    duration: '4u 00m',
    nextText: 'Eerste dag plannen →'
  } : {
    title: 'Terugreis naar Amsterdam',
    date: 'Zaterdag 27 juni 2026',
    depTime: '10:05',
    arrTime: '12:25',
    fromCode: 'EFL',
    fromName: 'Kefallinia Airport (EFL)',
    toCode: 'AMS',
    toName: 'Amsterdam Schiphol (AMS)',
    airline: 'Transavia Airlines',
    flightNum: 'HV 6564',
    class: 'Economy',
    duration: '3u 20m',
    nextText: 'Naar overzicht →'
  };

  const html = `
    <div class="planner-day-header fade-up">
      <div class="planner-day-label">Reisinformatie</div>
      <h2 class="planner-day-title">${flight.title}</h2>
      <p class="planner-day-subtitle">${flight.date} — Goede reis! ✈️</p>
    </div>

    <div class="flight-ticket-container fade-up">
      <div class="flight-ticket">
        <div class="ticket-header">
          <div class="ticket-airline">
            🟢 <strong>${flight.airline}</strong>
          </div>
          <div class="ticket-class">${flight.class}</div>
        </div>
        
        <div class="ticket-body">
          <div class="ticket-airport">
            <span class="airport-code">${flight.fromCode}</span>
            <span class="airport-name">${flight.fromName}</span>
            <span class="ticket-time">${flight.depTime}</span>
          </div>
          
          <div class="ticket-path">
            <span class="ticket-arrow">✈️</span>
            <span class="ticket-duration">${flight.duration}</span>
          </div>
          
          <div class="ticket-airport right">
            <span class="airport-code">${flight.toCode}</span>
            <span class="airport-name">${flight.toName}</span>
            <span class="ticket-time">${flight.arrTime}</span>
          </div>
        </div>
        
        <div class="ticket-footer">
          <div>Vluchtnummer: <strong>${flight.flightNum}</strong></div>
          <div>Klasse: <strong>${flight.class}</strong></div>
          <div>Datum: <strong>${flight.date}</strong></div>
        </div>
      </div>
    </div>

    <div class="planner-nav fade-up" style="margin-top: 3rem;">
      ${isHeen 
        ? `<div></div>`
        : `<button class="btn-nav" onclick="goDay(13)">← Vorige dag</button>`}
      
      ${isHeen
        ? `<button class="btn-next btn-nav" onclick="goDay(0)">${flight.nextText}</button>`
        : `<button class="btn-next btn-nav" onclick="showOverview()">${flight.nextText}</button>`}
    </div>
  `;

  document.getElementById('planner-main').innerHTML = html;
}

function selectActivity(dayIndex, actId) {
  const act = ACTIVITIES.find(a => a.id === actId);
  const plan = state.plan[dayIndex];

  // Deselect if already selected
  const existingIdx = plan.activities.findIndex(a => a.id === actId);
  if (existingIdx !== -1) {
    plan.activities.splice(existingIdx, 1);
    renderPlannerDay(dayIndex);
    renderSidebar();
    setTimeout(() => updateMap(dayIndex), 50);
    updateMobileBar();
    return;
  }

  // Block adding any activity when a full-day activity is already planned
  if (dayIsFullDay(dayIndex)) {
    showToast('⚠️ Deze dag heeft al een hele-dag-activiteit');
    renderPlannerDay(dayIndex);
    return;
  }

  // Block adding a full-day activity when other activities already exist
  if (act.duration >= 420 && plan.activities.length > 0) {
    showToast('⚠️ Deze dag heeft al activiteiten — geen hele-dag-activiteit meer mogelijk');
    renderPlannerDay(dayIndex);
    return;
  }

  plan.activities.push(act);

  const isFullDay = act.duration >= 420;
  if (isFullDay) {
    fireConfetti();
  }

  renderPlannerDay(dayIndex);
  renderSidebar();
  setTimeout(() => updateMap(dayIndex), 50);
  updateMobileBar();

  // Auto-advance only for full-day activities
  if (isFullDay) {
    setTimeout(() => {
      if (state.currentDay !== dayIndex) return;
      if (dayIndex < 13) {
        goDay(dayIndex + 1);
      } else {
        goDay('terug');
      }
    }, 900);
  }
}

// ═══════════════════════════════════════════════════════
//  ACTIVITY DETAIL MODAL
// ═══════════════════════════════════════════════════════
let detailContext = { dayIndex: null, actId: null };

function openActivityDetail(dayIndex, actId) {
  const act = ACTIVITIES.find(a => a.id === actId);
  if (!act) return;

  detailContext = { dayIndex, actId };

  const plan = state.plan[dayIndex];
  const isSelected = plan.activities.some(a => a.id === actId);
  const isFullDayAct = dayIsFullDay(dayIndex);
  const isBlockedByFullDay = !isSelected && isFullDayAct;
  const isFullDayBlocked = !isSelected && act.duration >= 420 && plan.activities.length > 0;
  const isBlocked = isBlockedByFullDay || isFullDayBlocked;

  const durLabel = act.duration > 0 ? formatDuration(act.duration) : '';
  const durColor = act.duration >= 420 ? 'var(--terracotta)' : act.duration >= 240 ? '#d97706' : 'var(--sea-deep)';
  const day = typeof dayIndex === 'number' ? DAYS[dayIndex] : null;
  const catLabel = CAT_LABELS[act.cat] || '';

  document.getElementById('activity-detail-content').innerHTML = `
    <div style="text-align:center; margin-bottom:1rem;">
      <div style="font-size:2.8rem; margin-bottom:0.5rem;">${act.icon}</div>
      <div style="font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:400; line-height:1.2; margin-bottom:0.4rem;">${act.title}</div>
      <div style="font-size:0.75rem; color:var(--muted);">${catLabel}</div>
    </div>

    <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:1.5rem;">
      ${durLabel ? `<span style="font-size:0.78rem; font-weight:700; color:${durColor}; background:${durColor}18; border-radius:100px; padding:5px 14px;">⏱️ ${durLabel}</span>` : ''}
      <span style="font-size:0.78rem; font-weight:700; color:${act.cost === 0 ? 'var(--olive)' : 'var(--terracotta)'}; background:${act.cost === 0 ? 'rgba(90,122,58,0.1)' : 'var(--terracotta-light)'}; border-radius:100px; padding:5px 14px;">
        ${act.cost === 0 ? '✓ Gratis' : `~€${act.cost} p.p. 2 pers.`}
      </span>
      ${day && day.special ? `<span style="font-size:0.78rem; font-weight:700; color:var(--gold); background:var(--gold-light); border-radius:100px; padding:5px 14px;">🎂 Verjaardagsidee</span>` : ''}
    </div>

    ${act.location ? `
      <a href="${act.mapUrl}" target="_blank" onclick="event.stopPropagation();"
         style="display:flex; align-items:center; gap:10px; background:var(--sea-light); border:1px solid rgba(27,108,168,0.2); border-radius:var(--radius); padding:12px 14px; margin-bottom:1.25rem; text-decoration:none; color:var(--sea-deep); transition:background 0.15s;">
        <span style="font-size:1.3rem;">📍</span>
        <div style="flex:1; min-width:0;">
          <div style="font-size:0.85rem; font-weight:600;">${act.location}</div>
          <div style="font-size:0.72rem; color:var(--muted); margin-top:1px;">Tik om te openen in Google Maps ↗</div>
        </div>
      </a>
    ` : ''}

    <div style="margin-bottom:1.25rem;">
      <div style="font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); margin-bottom:8px;">Waarom deze activiteit?</div>
      <div style="font-size:0.9rem; line-height:1.65; color:var(--ink);">${act.why}</div>
    </div>

    <div style="background:var(--sand); border-radius:var(--radius); padding:14px 16px;">
      <div style="font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); margin-bottom:6px;">💡 Tip</div>
      <div style="font-size:0.88rem; line-height:1.55; color:var(--ink);">${act.tip}</div>
    </div>
  `;

  const selectBtn = document.getElementById('btn-detail-select');
  if (isBlocked) {
    selectBtn.textContent = 'Niet combineerbaar';
    selectBtn.disabled = true;
    selectBtn.style.opacity = '0.4';
  } else if (isSelected) {
    selectBtn.textContent = '✕ Verwijder uit dag';
    selectBtn.style.background = 'var(--terracotta)';
    selectBtn.style.borderColor = 'var(--terracotta)';
    selectBtn.disabled = false;
    selectBtn.style.opacity = '1';
  } else {
    selectBtn.textContent = act.special ? '＋ Selecteer voor verjaardag' : '＋ Selecteer voor vandaag';
    selectBtn.style.background = act.special ? 'var(--gold)' : '';
    selectBtn.style.borderColor = act.special ? 'var(--gold)' : '';
    selectBtn.disabled = false;
    selectBtn.style.opacity = '1';
  }

  document.getElementById('modal-activity-detail').classList.add('open');
}

function closeActivityDetail() {
  document.getElementById('modal-activity-detail').classList.remove('open');
  detailContext = { dayIndex: null, actId: null };
}

function handleDetailBackdropClick(e) {
  if (e.target === document.getElementById('modal-activity-detail')) {
    closeActivityDetail();
  }
}

function detailSelectActivity() {
  const { dayIndex, actId } = detailContext;
  if (dayIndex === null || actId === null) return;
  closeActivityDetail();
  selectActivity(dayIndex, actId);
}

// ═══════════════════════════════════════════════════════
//  OVERVIEW
// ═══════════════════════════════════════════════════════
function showOverview() {
  // Stats
  const totalActivities = state.plan.reduce((n, d) => n + d.activities.length, 0);
  const fullDays = state.plan.filter((d, i) => dayUsedMinutes(i) >= DAY_BUDGET_MINUTES * 0.75).length;
  const cats = {};
  state.plan.forEach(d => {
    d.activities.forEach(a => {
      cats[a.cat] = (cats[a.cat] || 0) + 1;
    });
  });
  const topCat = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];

  const totalCost = state.plan.reduce((sum, d) => {
    return sum + d.activities.reduce((s, a) => s + (a.cost || 0), 0);
  }, 0);

  const reservationCount = state.plan.reduce((n, d) => {
    return n + d.activities.filter(a => a.reservation).length;
  }, 0);

  document.getElementById('ov-stats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${totalActivities}</div><div class="stat-label">Geplande activiteiten</div></div>
    <div class="stat-card"><div class="stat-num">${fullDays}</div><div class="stat-label">Goed gevulde dagen</div></div>
    <div class="stat-card"><div class="stat-num">${DAYS.length}</div><div class="stat-label">Nachten in Kefalonia</div></div>
    <div class="stat-card"><div class="stat-num">${topCat ? CAT_LABELS[topCat[0]].split(' ').slice(1).join(' ') : '—'}</div><div class="stat-label">Meest gekozen categorie</div></div>
    <div class="stat-card" style="border-color: var(--terracotta); background: var(--terracotta-light);">
      <div class="stat-num" style="color: var(--terracotta);">~€${totalCost}</div>
      <div class="stat-label">Geschatte activiteitenkosten</div>
    </div>
    ${reservationCount > 0 ? `
    <div class="stat-card" style="border-color: var(--terracotta); background: var(--terracotta-light);">
      <div class="stat-num" style="color: var(--terracotta);">📋 ${reservationCount}</div>
      <div class="stat-label">Vereisen reservering vooraf</div>
    </div>` : ''}
  `;

  // Grid
  const grid = document.getElementById('ov-grid');
  grid.innerHTML = '';
  DAYS.forEach((day, i) => {
    const d = state.plan[i];
    const card = document.createElement('div');
    card.className = 'overview-card' + (day.special ? ' special' : '');

    const renderOverviewAct = (act) => {
      const costLabel = act.cost === 0
        ? `<span style="font-size:0.62rem; color:var(--olive); font-weight:600;">Gratis</span>`
        : `<span style="font-size:0.62rem; color:var(--terracotta); font-weight:600;">~€${act.cost}</span>`;
      const durLabel = act.duration > 0 ? `<span style="font-size:0.62rem; color:var(--sea-deep); font-weight:600;">⏱️ ${formatDuration(act.duration)}</span>` : '';
      const resBadge = act.reservation ? `<span class="ov-res-badge">📋 Reserveer vooraf!</span>` : '';
      return `
        <div class="ov-act" style="display:flex; align-items:flex-start; gap:6px; margin-bottom:4px;">
          <span class="ov-act-icon">${act.icon}</span>
          <div style="display:flex; flex-direction:column; line-height:1.2;">
            <span class="ov-act-name" style="font-weight:500;">${act.title}</span>
            ${act.location ? `
              <a href="${act.mapUrl}" target="_blank" onclick="event.stopPropagation();"
                 style="font-size:0.65rem; color:var(--sea); text-decoration:none; margin-top:2px; display:inline-flex; align-items:center; gap:2px;">
                📍 ${act.location.split(',')[0]} ↗
              </a>
            ` : ''}
            <div style="margin-top:2px; display:flex; gap:6px;">${costLabel}${durLabel}</div>
            ${resBadge}
          </div>
        </div>
      `;
    };

    card.innerHTML = `
      <div class="ov-date">${day.short}</div>
      <div class="ov-day">${day.name}</div>
      ${day.special ? '<div class="ov-bday-badge">🎂 Verjaardag</div>' : ''}
      <div class="ov-activities" style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
        ${d.activities.length > 0 ? d.activities.map(renderOverviewAct).join('') : '<div class="ov-act-none">Vrij houden</div>'}
      </div>
    `;
    card.onclick = () => {
      goBackToPlanner();
      setTimeout(() => { state.currentDay = i; renderSidebar(); renderPlannerDay(i); }, 50);
    };
    grid.appendChild(card);
  });

  document.getElementById('ov-subtitle').textContent = `${state.name}'s vakantieplan — 13 tot 27 juni`;
  showScreen('screen-overview');
  renderOverviewMap();
  window.scrollTo({ top: 0 });
}

function goBackToPlanner() {
  showScreen('screen-planner');
  renderSidebar();
  renderPlannerDay(state.currentDay);
  updateMobileBar();
}

function resetAll() {
  if (!confirm('Weet je zeker dat je opnieuw wilt beginnen? Alle keuzes worden gewist.')) return;
  state = { name: '', currentDay: 'heen', plan: Array(14).fill(null).map(() => ({ activities: [] })) };
  clearSavedState();
  pendingSaved = null;
  document.getElementById('welcome-banner').classList.remove('open');
  document.getElementById('code-box').classList.remove('open');
  const nameEl = document.getElementById('planner-name');
  if (nameEl) nameEl.value = '';
  const startEl = document.getElementById('btn-start');
  if (startEl && nameEl) startEl.disabled = true;
  showScreen('screen-welcome');
}

function copyPlanCode() {
  const code = encodePlanCode();
  const box = document.getElementById('code-box');
  const value = document.getElementById('code-box-value');
  const hint = document.getElementById('code-box-hint');
  value.textContent = code;
  box.classList.add('open');
  const done = ok => { hint.textContent = ok ? '✓ Code gekopieerd naar het klembord' : 'Selecteer en kopieer de code hierboven handmatig.'; };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => done(true)).catch(() => done(false));
  } else {
    done(false);
  }
}

function printPlan() { window.print(); }

// ═══════════════════════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════════════════════
function fireConfetti() {
  const wrap = document.createElement('div');
  wrap.className = 'confetti-wrap';
  document.body.appendChild(wrap);
  const colors = ['#C9962A', '#1B6CA8', '#5A7A3A', '#C4622D', '#F5EFE3'];
  for (let k = 0; k < 40; k++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${0.8 + Math.random() * 1.2}s;
      animation-delay: ${Math.random() * 0.3}s;
      transform: rotate(${Math.random() * 360}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    wrap.appendChild(p);
  }
  setTimeout(() => wrap.remove(), 2500);
}

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const bar = document.getElementById('mobile-bottom-bar');
  if (bar) {
    if (id === 'screen-planner') bar.classList.remove('hidden');
    else bar.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════
//  ACTIVITEITEN CATALOGUS
// ═══════════════════════════════════════════════════════
let catalogSortCol = 'cat';
let catalogSortDir = 'asc';

function showCatalog() {
  showScreen('screen-catalog');
  const total = ACTIVITIES.length;
  document.getElementById('catalog-subtitle').textContent =
    `${total} activiteiten · sorteer en filter naar wens`;
  applyCatalogFilters();
}

function goBackFromCatalog() {
  showScreen('screen-planner');
}

function sortCatalog(col) {
  if (catalogSortCol === col) {
    catalogSortDir = catalogSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    catalogSortCol = col;
    catalogSortDir = 'asc';
  }
  applyCatalogFilters();
}

function applyCatalogFilters() {
  const search = (document.getElementById('catalog-search').value || '').toLowerCase().trim();
  const cat    = document.getElementById('catalog-cat').value;
  const cost   = document.getElementById('catalog-cost').value;
  const res    = document.getElementById('catalog-res').value;

  let filtered = ACTIVITIES.filter(a => {
    if (search) {
      const hay = (a.title + ' ' + a.location + ' ' + a.why + ' ' + (a.tip || '') + ' ' + (CAT_LABELS[a.cat] || '')).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (cat && a.cat !== cat) return false;
    if (cost === 'gratis' && a.cost !== 0) return false;
    if (cost === 'betaald' && a.cost === 0) return false;
    if (res === 'ja' && !a.reservation) return false;
    if (res === 'nee' && a.reservation) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let va, vb;
    switch (catalogSortCol) {
      case 'title':       va = a.title.toLowerCase();    vb = b.title.toLowerCase();    break;
      case 'cat':         va = a.cat;                    vb = b.cat;                    break;
      case 'duration':    va = a.duration;               vb = b.duration;               break;
      case 'cost':        va = a.cost;                   vb = b.cost;                   break;
      case 'location':    va = a.location.toLowerCase(); vb = b.location.toLowerCase(); break;
      case 'reservation': va = a.reservation ? 1 : 0;   vb = b.reservation ? 1 : 0;   break;
      default: return 0;
    }
    if (va < vb) return catalogSortDir === 'asc' ? -1 : 1;
    if (va > vb) return catalogSortDir === 'asc' ?  1 : -1;
    return 0;
  });

  // Update sort header visuals
  const cols = ['title', 'cat', 'duration', 'cost', 'location', 'reservation'];
  cols.forEach(col => {
    const icon = document.getElementById('sort-icon-' + col);
    if (!icon) return;
    icon.textContent = col === catalogSortCol
      ? (catalogSortDir === 'asc' ? '↑' : '↓')
      : '↕';
  });
  document.querySelectorAll('.catalog-th').forEach(th => th.classList.remove('active'));
  const activeTh = document.querySelector(`.catalog-th[data-col="${catalogSortCol}"]`);
  if (activeTh) activeTh.classList.add('active');

  // Build activity→day lookup from current plan
  const actDayMap = {};
  if (state && state.plan) {
    state.plan.forEach((day, i) => {
      day.activities.forEach(a => { actDayMap[a.id] = i; });
    });
  }

  // Update count
  document.getElementById('catalog-count').textContent =
    `${filtered.length} van ${ACTIVITIES.length} activiteit${filtered.length !== 1 ? 'en' : ''}`;

  const tbody = document.getElementById('catalog-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="catalog-empty">Geen activiteiten gevonden met deze filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const dayIdx   = actDayMap[a.id];
    const isPlanned = dayIdx !== undefined;
    const dayLabel  = isPlanned ? DAYS[dayIdx].short : '';
    const catLabel  = (CAT_LABELS[a.cat] || a.cat).split(' ').slice(1).join(' ') || CAT_LABELS[a.cat] || a.cat;
    const catEmoji  = (CAT_LABELS[a.cat] || '').split(' ')[0] || '';
    const durText   = a.duration >= 60
      ? (a.duration % 60 === 0
          ? Math.floor(a.duration / 60) + 'u'
          : Math.floor(a.duration / 60) + 'u ' + (a.duration % 60) + 'm')
      : a.duration + 'm';
    const locationShort = a.location.split(',')[0];

    return `<tr class="catalog-tr${isPlanned ? ' planned' : ''}" onclick="openActivityDetailFromCatalog('${a.id}')">
      <td class="catalog-td">
        <div class="catalog-td-name">
          <span class="catalog-td-icon">${a.icon}</span>
          <div>
            ${a.title}
            ${a.reservation ? `<div class="catalog-td-sub">📋 Reservering vereist</div>` : ''}
          </div>
        </div>
      </td>
      <td class="catalog-td">
        <span class="cat-pill">${catEmoji} ${catLabel}</span>
      </td>
      <td class="catalog-td" style="white-space:nowrap; color:var(--muted);">⏱ ${durText}</td>
      <td class="catalog-td">
        <span class="cost-pill ${a.cost === 0 ? 'gratis' : 'betaald'}">
          ${a.cost === 0 ? '✓ Gratis' : `~€${a.cost} p.p.`}
        </span>
      </td>
      <td class="catalog-td hide-mob catalog-muted">${locationShort}</td>
      <td class="catalog-td">
        ${a.reservation
          ? `<span class="res-pill">📋 Ja</span>`
          : `<span class="catalog-muted">—</span>`}
      </td>
      <td class="catalog-td hide-mob">
        ${isPlanned
          ? `<span class="planned-pill">✓ ${dayLabel}</span>`
          : `<span class="catalog-muted">—</span>`}
      </td>
    </tr>`;
  }).join('');
}

function openActivityDetailFromCatalog(actId) {
  let dayIndex;
  if (typeof state.currentDay === 'number') {
    dayIndex = state.currentDay;
  } else {
    let minActivities = Infinity;
    state.plan.forEach((d, i) => {
      if (d.activities.length < minActivities) {
        minActivities = d.activities.length;
        dayIndex = i;
      }
    });
    if (dayIndex === undefined) dayIndex = 0;
  }
  openActivityDetail(dayIndex, actId);
}

// ═══════════════════════════════════════════════════════
//  ADD-ACTIVITY MODAL
// ═══════════════════════════════════════════════════════
function openAddActivityModal() {
  document.getElementById('act-title-input').value = '';
  document.getElementById('act-desc-input').value = '';
  document.getElementById('modal-status').textContent = '';
  document.getElementById('btn-submit-activity').disabled = false;
  document.getElementById('modal-add-activity').classList.add('open');
  setTimeout(() => document.getElementById('act-title-input').focus(), 50);
}

function closeAddActivityModal() {
  document.getElementById('modal-add-activity').classList.remove('open');
}

function handleBackdropClick(e) {
  if (e.target === document.getElementById('modal-add-activity')) {
    closeAddActivityModal();
  }
}

async function submitActivityRequest() {
  const title = document.getElementById('act-title-input').value.trim();
  const desc  = document.getElementById('act-desc-input').value.trim();
  const status = document.getElementById('modal-status');
  const btn = document.getElementById('btn-submit-activity');

  if (!title) {
    status.style.color = 'var(--terracotta)';
    status.textContent = 'Vul een titel in.';
    document.getElementById('act-title-input').focus();
    return;
  }

  btn.disabled = true;
  status.style.color = 'var(--muted)';
  status.textContent = 'Versturen…';

  try {
    const res = await fetch('https://n8n.7rb.nl/webhook/kefalonia-activiteit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titel: title,
        beschrijving: desc,
        ingediend_door: state.name || 'Onbekend',
        tijdstip: new Date().toISOString(),
      }),
    });

    if (res.status === 429) throw new Error('ratelimit');
    if (!res.ok) throw new Error(`server:${res.status}`);

    status.style.color = 'var(--olive)';
    status.textContent = '✓ Voorstel verzonden! De beheerder bekijkt het zo snel mogelijk.';
    setTimeout(closeAddActivityModal, 2200);
  } catch (err) {
    status.style.color = 'var(--terracotta)';
    if (err.message === 'ratelimit') {
      status.textContent = 'Te veel verzoeken — wacht even en probeer opnieuw.';
    } else if (err.message && err.message.startsWith('server:')) {
      status.textContent = 'De server is tijdelijk niet beschikbaar. Probeer het later opnieuw.';
    } else if (err.name === 'TypeError') {
      status.textContent = 'Geen verbinding. Controleer je internetverbinding en probeer opnieuw.';
    } else {
      status.textContent = 'Er ging iets mis bij het versturen. Probeer het opnieuw.';
    }
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════
//  SYNC: POCKETBASE REAL-TIME COLLABORATION
// ═══════════════════════════════════════════════════════

function mergeRemotePlan(localState, remoteObj) {
  const remote = hydratePlan(remoteObj);
  if (!remote) return null;
  const changedDays = [];
  const plan = localState.plan.map((localDay, i) => {
    const remoteDay = remote.plan[i];
    const localIds = localDay.activities.map(a => a.id).join(',');
    const remoteIds = remoteDay.activities.map(a => a.id).join(',');
    if (localIds !== remoteIds) {
      changedDays.push(i);
      const mergedActivities = new Map();
      remoteDay.activities.forEach(a => mergedActivities.set(a.id, a));
      localDay.activities.forEach(a => {
        if (!mergedActivities.has(a.id)) {
          mergedActivities.set(a.id, a);
        }
      });
      return { activities: [...mergedActivities.values()] };
    }
    return localDay;
  });
  return { merged: { ...localState, plan }, changedDays };
}

function onRemoteUpdate(remotePlanObj) {
  const result = mergeRemotePlan(state, remotePlanObj);
  if (!result) return;
  const { merged, changedDays } = result;
  if (changedDays.length === 0) return;
  state = merged;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serializePlan(state))); } catch (e) {}
  renderSidebar();
  const currentIdx = typeof state.currentDay === 'number' ? state.currentDay : -1;
  if (changedDays.includes(currentIdx)) {
    renderPlannerDay(state.currentDay);
    setTimeout(() => updateMap(state.currentDay), 50);
  }
  showSyncToast(changedDays);
}

function updateSyncStatusBadge(status) {
  const badge = document.getElementById('sync-badge');
  const dot = document.getElementById('sync-dot');
  const text = document.getElementById('sync-badge-text');
  const codeLabel = document.getElementById('sync-code-label');
  if (!badge) return;
  badge.style.display = sync.sessionCode ? 'flex' : 'none';
  dot.className = 'sync-dot ' + status;
  const labels = { connected: 'Gesynchroniseerd', connecting: 'Verbinden…', offline: 'Verbinding verbroken' };
  text.textContent = labels[status] || status;
  codeLabel.textContent = sync.sessionCode ? '· ' + sync.sessionCode : '';
}

// ═══════════════════════════════════════════════════════
//  GENERIC TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════
let _toastTimer = null;
function showToast(message, duration = 3000) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('visible'), duration);
}

let _syncToastTimer = null;
function showSyncToast(changedDays) {
  let el = document.getElementById('sync-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-toast';
    el.className = 'sync-toast';
    document.body.appendChild(el);
  }
  const names = changedDays.map(i => DAYS[i] ? DAYS[i].short : `dag ${i + 1}`);
  el.textContent = '🔄 Partner heeft ' + (names.length === 1 ? names[0] : `${names.length} dagen`) + ' bijgewerkt';
  el.classList.add('visible');
  clearTimeout(_syncToastTimer);
  _syncToastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}

function toggleSyncJoinForm() {
  const form = document.getElementById('sync-join-form');
  form.classList.toggle('open');
  if (form.classList.contains('open')) {
    setTimeout(() => document.getElementById('sync-code-input').focus(), 50);
  }
}

async function joinSyncSession() {
  const input = document.getElementById('sync-code-input');
  const err = document.getElementById('sync-join-error');
  const code = (input.value || '').trim().toUpperCase();
  if (!code) { err.textContent = 'Voer een code in.'; return; }
  err.textContent = 'Zoeken…';
  try {
    const nameEl = document.getElementById('planner-name');
    const name = nameEl ? ((nameEl.value || '').trim() || 'Jij') : 'Jij';
    const result = await sync.loadSession(code);
    if (!result) { err.textContent = 'Code niet gevonden.'; return; }
    const hydrated = hydratePlan(result.plan);
    if (!hydrated) { err.textContent = 'Plan kon niet worden geladen.'; return; }
    state = { ...hydrated, name };
    sync.subscribe(result.recordId, onRemoteUpdate);
    enterPlanner();
  } catch (e) {
    err.textContent = 'Code niet gevonden. Controleer de spelling.';
  }
}

async function createSyncSession() {
  const nameInput = document.getElementById('planner-name');
  const name = (nameInput ? nameInput.value : '').trim() || 'Jij';
  state.name = name;
  state.currentDay = 'heen';
  try {
    const { code, recordId } = await sync.createSession(serializePlan(state));
    sync.subscribe(recordId, onRemoteUpdate);
    showSessionCodeModal(code);
  } catch (e) {
    alert('Kon geen sessie aanmaken. Controleer de verbinding.');
  }
}

function showSessionCodeModal(code) {
  let overlay = document.getElementById('session-code-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'session-code-overlay';
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <div class="modal-box session-code-box">
        <div class="session-code-title">Gedeeld plan aangemaakt!</div>
        <div class="session-code-sub">Stuur deze code naar je partner:</div>
        <div class="session-code-display" id="session-code-display"></div>
        <button class="btn-ghost" style="margin:0 auto;" onclick="copySessionCode()">📋 Kopieer code</button>
        <div class="session-code-hint" id="session-code-copy-hint"></div>
        <button class="btn-primary" onclick="closeSessionCodeModal()">Beginnen met plannen →</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  document.getElementById('session-code-display').textContent = code;
  overlay.classList.add('open');
}

function closeSessionCodeModal() {
  const overlay = document.getElementById('session-code-overlay');
  if (overlay) overlay.classList.remove('open');
  enterPlanner();
}

function copySessionCode() {
  const code = document.getElementById('session-code-display').textContent;
  navigator.clipboard.writeText(code).catch(() => {});
  const hint = document.getElementById('session-code-copy-hint');
  hint.textContent = '✓ Gekopieerd!';
  setTimeout(() => { hint.textContent = ''; }, 2000);
}
