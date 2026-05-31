// ─── PocketBase Sync Module ────────────────────────────────────────────────
// Real-time session sync via PocketBase at https://pocketbase.7rb.nl
// Loaded before app.js — calls into app.js globals only via deferred invocations.

(function () {
  const PB_URL = 'https://pocketbase.7rb.nl';
  const SYNC_KEY = 'kefalonia_sync_v1';

  // No-op stub when PocketBase SDK fails to load (ad-blocker, network error)
  if (typeof PocketBase === 'undefined') {
    window.sync = {
      push() {},
      subscribe() {},
      disconnect() {},
      getSavedSession() { return null; },
      async createSession() { throw new Error('Sync niet beschikbaar'); },
      async loadSession() { return null; },
      isConnected: false,
      sessionCode: null,
      recordId: null,
    };
    return;
  }

  function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'KEF-';
    for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  const pb = new PocketBase(PB_URL);

  window.sync = {
    recordId: null,
    sessionCode: null,
    isConnected: false,
    _suppressDepth: 0,

    async push(serializedPlan) {
      if (!this.recordId) return;
      this._suppressDepth++;
      try {
        await pb.collection('sessions').update(this.recordId, { plan: serializedPlan });
      } catch (e) {
        this._suppressDepth--;
      }
    },

    subscribe(recordId, onRemoteCb) {
      if (this.recordId && this.recordId !== recordId) {
        pb.collection('sessions').unsubscribe(this.recordId);
      }
      this.recordId = recordId;
      if (typeof updateSyncStatusBadge === 'function') updateSyncStatusBadge('connecting');
      pb.collection('sessions').subscribe(recordId, (e) => {
        if (this._suppressDepth > 0) { this._suppressDepth--; return; }
        if (e.action === 'update' && typeof onRemoteCb === 'function') {
          try {
            onRemoteCb(e.record.plan);
          } catch (err) {
            console.error('Sync callback error:', err);
            this.isConnected = false;
            if (typeof updateSyncStatusBadge === 'function') updateSyncStatusBadge('offline');
          }
        }
      }).then(() => {
        this.isConnected = true;
        if (typeof updateSyncStatusBadge === 'function') updateSyncStatusBadge('connected');
      }).catch(() => {
        this.isConnected = false;
        if (typeof updateSyncStatusBadge === 'function') updateSyncStatusBadge('offline');
      });
    },

    async createSession(serializedPlan) {
      let code, record;
      for (let attempt = 0; attempt < 5; attempt++) {
        code = generateSessionCode();
        try {
          record = await pb.collection('sessions').create({
            session_code: code,
            plan: serializedPlan,
          });
          break;
        } catch (e) {
          if (e.status === 409 || (e.data && e.data.code === 409)) continue;
          throw e;
        }
      }
      if (!code) throw new Error('Session code collision after 5 attempts');
      this.sessionCode = code;
      this.recordId = record.id;
      try {
        localStorage.setItem(SYNC_KEY, JSON.stringify({ code, recordId: record.id }));
      } catch (e) {
        console.warn('LocalStorage write failed (session not persisted locally):', e);
      }
      return { code, recordId: record.id };
    },

    async loadSession(code) {
      const normalized = code.toUpperCase().replace(/^KEF-/, '');
      if (!/^[A-Z0-9]{3,10}$/.test(normalized)) {
        throw new Error('Ongeldige sessiecode');
      }
      const result = await pb.collection('sessions').getFirstListItem(
        `session_code = "KEF-${normalized}"`
      );
      this.sessionCode = result.session_code;
      this.recordId = result.id;
      try {
        localStorage.setItem(SYNC_KEY, JSON.stringify({ code: result.session_code, recordId: result.id }));
      } catch (e) {
        console.warn('LocalStorage write failed (session not persisted locally):', e);
      }
      return { plan: result.plan, recordId: result.id };
    },

    disconnect() {
      if (this.recordId) pb.collection('sessions').unsubscribe(this.recordId);
      this.recordId = null;
      this.sessionCode = null;
      this.isConnected = false;
      this._suppressDepth = 0;
      localStorage.removeItem(SYNC_KEY);
    },

    getSavedSession() {
      try {
        const raw = localStorage.getItem(SYNC_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
  };
})();
