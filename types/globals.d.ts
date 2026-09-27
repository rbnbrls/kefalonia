/*
 * types/globals.d.ts — ambient declarations voor de Kefalonia-statische site.
 * ─────────────────────────────────────────────────────────────────────────
 * De site is géén bundler-project: app.js, sync.js en service-worker.js zijn
 * klassieke scripts. TypeScript kent daardoor de volgende dingen niet, terwijl
 * ze op runtime wél bestaan:
 *
 *   • twee CDN-libraries uit index.html (Leaflet, PocketBase) — geen npm-pakket;
 *   • het activiteitenregister dat build.js als `window.ACTIVITIES` wegschrijft;
 *   • de functies die app.js en sync.js over en weer aanroepen;
 *   • de handlers die app.js zélf op `window` zet voor gegenereerde HTML.
 *
 * Alles hier is een verklaring, geen implementatie: `tsc --noEmit` gebruikt ze
 * alleen om de rest van de code te controleren.
 */

// ── CDN-libraries (geen lokale types) ───────────────────────────────────────
// Leaflet 1.9.4 en PocketBase komen als <script> van een CDN. Er zijn geen
// @types voor geïnstalleerd: `L` blijft daarom `any`, PocketBase krijgt de
// minimale vorm die sync.js daadwerkelijk gebruikt.
declare const L: any;

declare class PocketBase {
  constructor(url: string);
  collection(name: string): any;
}

// ── Activiteitenregister (activities.generated.js, geschreven door build.js) ─
// Spiegelt de verplichte + optionele sleutels uit activities/_TEMPLATE.json.
// `startTime`/`endTime` zet de app zelf op een activiteit binnen een dagplan.
interface Activity {
  id: string;
  cat: string;
  icon: string;
  title: string;
  duration: number;
  why: string;
  tip: string;
  cost: number;
  location: string;
  mapUrl: string;
  lat: number;
  lng: number;
  reservation?: boolean;
  special?: boolean;
  timeOfDay?: string;
  highlights?: string[];
  combineWith?: string[];
  googleRating?: number;
  googleReviewCount?: number;
  /** Minuten vanaf 09:00 — door de app gezet op een activiteit in een dagplan. */
  startTime?: number;
}

// ── Gedeelde globals tussen app.js en sync.js ───────────────────────────────
// sync.js wordt vóór app.js geladen en zet `window.sync`; app.js roept die
// module aan en sync.js roept op zijn beurt `updateSyncStatusBadge()` aan.
interface KefaloniaSync {
  recordId: string | null;
  sessionCode: string | null;
  isConnected: boolean;
  _suppressDepth?: number;
  push(serializedPlan: any): void;
  subscribe(recordId: string, onRemoteUpdate: (plan: any) => void): void;
  disconnect(): void;
  getSavedSession(): { code: string; recordId: string } | null;
  createSession(serializedPlan: any): Promise<{ code: string; recordId: string }>;
  loadSession(code: string): Promise<{ plan: any; recordId: string }>;
}

declare const sync: KefaloniaSync;
declare function updateSyncStatusBadge(state?: string): void;

interface Window {
  /** Geschreven door build.js/activities.generated.js, gelezen door app.js. */
  ACTIVITIES?: Activity[];
  sync?: KefaloniaSync;
  /** Handlers die app.js zelf op window zet voor inline onclick in HTML. */
  toggleCategory(cat: string): void;
  setSortMode(mode: string): void;
  setActivitySearch(query: string): void;
  toggleTimelineView(): void;
  selectActivityFromMap(dayIndex: number, actId: string): void;
  removeActivityFromMap(dayIndex: number, actId: string): void;
  /** Ruwe DOM-event (touch of muis) van de tijdlijn-drag; de handler leest
   *  `type`, `touches`, `currentTarget` en `target` zelf uit. */
  initTimelineDrag(event: any, dayIndex: number, actId: string): void;
  /** Service-worker-API's: service-worker.js draait in een worker-scope, maar
   *  de DOM-lib typt `self` als Window. */
  skipWaiting(): Promise<void>;
  clients: Clients;
}

// app.js hangt een eigen timer aan een DOM-element om de statusmelding te laten
// vervagen; dat is geen standaard-DOM-eigenschap.
interface HTMLElement {
  _fadeTimer?: ReturnType<typeof setTimeout>;
}
