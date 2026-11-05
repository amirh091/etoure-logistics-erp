import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as seed from '../data/seed';
import { COMPANY, TEAM_TARGETS } from '../data/seed';
import { uid } from '../lib/helpers';
import { supabase, USE_SUPABASE } from '../lib/supabase';
import { useAuth } from './AuthContext'; // ⬅️ NOUVEAU

const STORAGE_KEY = 'etoure-erp-state-v1';
const COLLECTIONS = ['clients','drivers','vehicles','deliveries','expenses','invoices','quotes','notifications','users','activityLog'];

const DEFAULT_SETTINGS = {
  company: { name: COMPANY.name, legal: COMPANY.legal, address: COMPANY.address, email: COMPANY.email, phone: COMPANY.phone, vat: COMPANY.vat, iban: COMPANY.iban },
  targets: { monthlyRevenue: TEAM_TARGETS.monthlyRevenue, monthlyDeliveries: TEAM_TARGETS.monthlyDeliveries, onTimeRate: TEAM_TARGETS.onTimeRate },
};

function withSettings(state) {
  return { ...state, settings: { ...DEFAULT_SETTINGS, ...(state.settings || {}) } };
}

const StoreCtx = createContext(null);

/* ---------- MODE SUPABASE : CRUD + Realtime ---------- */
function useSupabaseStore() {
  const { isAuthenticated } = useAuth(); // ⬅️ On récupère l'état de connexion
  const [state, setState] = useState(() =>
    Object.fromEntries(COLLECTIONS.map(c => [c, []]))
  );

  // On attend que isAuthenticated soit TRUE pour charger les données
  useEffect(() => {
    if (!isAuthenticated) return; // ⬅️ LA CORRECTION EST ICI
    
    (async () => {
      const loaded = {};
      for (const c of COLLECTIONS) {
        const tableName = c === 'activityLog' ? 'activity_logs' : c;
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) console.error(`Erreur chargement ${tableName}:`, error);
        loaded[c] = data || [];
      }
      setState(withSettings(loaded));
    })();
  }, [isAuthenticated]);

  // Realtime sur les tables critiques (seulement si connecté)
  useEffect(() => {
    if (!isAuthenticated) return;

    const tables = ['deliveries', 'delivery_events', 'vehicle_positions', 'notifications'];
    const channel = supabase.channel('erp-live');
    
    tables.forEach(t => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => {
        const coll = t === 'delivery_events' ? 'deliveries' : t;
        supabase.from(t).select('*').then(({ data }) => {
          if (data && COLLECTIONS.includes(coll)) {
            setState(s => ({ ...s, [coll]: data }));
          }
        });
      });
    });
    
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const add = async (collection, payload) => {
    const table = collection === 'activityLog' ? 'activity_logs' : collection;
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    setState(s => ({ ...s, [collection]: [data, ...s[collection]] }));
    return data;
  };
  
  const update = async (collection, payload) => {
    const table = collection === 'activityLog' ? 'activity_logs' : collection;
    const { data, error } = await supabase.from(table).update(payload).eq('id', payload.id).select().single();
    if (error) throw error;
    setState(s => ({ ...s, [collection]: s[collection].map(x => x.id === data.id ? data : x) }));
    return data;
  };
  
  const remove = async (collection, id) => {
    const table = collection === 'activityLog' ? 'activity_logs' : collection;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    setState(s => ({ ...s, [collection]: s[collection].filter(x => x.id !== id) }));
  };

  return { state, add, update, remove };
}

/* ---------- MODE DÉMO (si VITE_USE_SUPABASE=false) ---------- */
function useDemoStore() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return withSettings(raw ? { ...seed, ...JSON.parse(raw) } : seed);
    } catch { return seed; }
  });

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), 260);
    return () => clearTimeout(t);
  }, [state]);

  const add = (c, payload) => setState(s => ({ ...s, [c]: [{ ...payload, id: payload.id || uid(c) }, ...s[c]] }));
  const update = (c, payload) => setState(s => ({ ...s, [c]: s[c].map(x => x.id === payload.id ? { ...x, ...payload } : x) }));
  const remove = (c, id) => setState(s => ({ ...s, [c]: s[c].filter(x => x.id !== id) }));

  return { state, add, update, remove };
}

/* ---------- Provider unifié ---------- */
export function StoreProvider({ children }) {
  const impl = USE_SUPABASE ? useSupabaseStore() : useDemoStore();
  const [toasts, setToasts] = useState([]);

  const toast = (message, kind = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  };

  const log = async (entry) => {
    try {
      await impl.add('activityLog', {
        user: entry.user || 'Système',
        action: entry.action || '',
        target: entry.target || '',
        type: entry.type || 'info',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('log ignoré (activity_logs indisponible):', e?.message);
    }
  };

  /* Notification : marquer lu / tout lire (unifié, fonctionne en démo et Supabase) */
  const markRead = async (id) => {
    try { await impl.update('notifications', { id, read: true }); } catch (e) { console.warn('markRead ignoré:', e?.message); }
  };
  const markAllRead = async () => {
    try {
      for (const n of (impl.state.notifications || []).filter((n) => !n.read)) {
        await impl.update('notifications', { id: n.id, read: true });
      }
    } catch (e) { console.warn('markAllRead ignoré:', e?.message); }
  };
  const updateNotifSettings = async (patch) => {
    try { await impl.update('settings', patch); } catch { /* en démo, géré par l'état local */ }
  };
  const toggleRule = async (ruleId) => {
    const rules = (impl.state.notificationSettings?.rules || []).map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    try { await impl.update('settings', { rules }); } catch { /* démo */ }
  };

  const api = useMemo(() => ({
    state: impl.state,
    add: impl.add,
    update: impl.update,
    remove: impl.remove,
    toast,
    log,
    markRead,
    markAllRead,
    updateNotifSettings,
    toggleRule,
    /* compat dispatch : ADD + CLEAR_NOTIFS + MARK_READ + MARK_ALL_READ */
    dispatch: (action) => {
      if (action?.type === 'ADD' && action.collection) { impl.add(action.collection, action.payload); return; }
      if (action?.type === 'CLEAR_NOTIFS') { (impl.state.notifications || []).forEach((n) => impl.remove('notifications', n.id)); return; }
      if (action?.type === 'MARK_READ' && action.id) { markRead(action.id); return; }
      if (action?.type === 'MARK_ALL_READ') { markAllRead(); return; }
      if (action?.type === 'REMOVE_NOTIF' && action.id) { impl.remove('notifications', action.id); return; }
      console.warn('dispatch ignoré:', action?.type);
    },
    /* compat reset (mode démo uniquement) */
    reset: () => {
      if (USE_SUPABASE) { toast('Réinitialisation disponible uniquement en mode démo', 'err'); return; }
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    },
  }), [impl.state, impl.add, impl.update, impl.remove]);

  return (
    <StoreCtx.Provider value={api}>
      {children}
      <Toasts toasts={toasts} />
    </StoreCtx.Provider>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export const useStore = () => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};