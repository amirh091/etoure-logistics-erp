import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, USE_SUPABASE } from '../lib/supabase';
import { users as demoUsers } from '../data/seed';

// v2 : invalide les vieilles sessions localStorage créées avant la correction des rôles
const DEMO_KEY = 'etoure_demo_session_v2';
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!USE_SUPABASE) {
      // Mode démo : restaure la session persistée (survit au F5)
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) setSession(JSON.parse(raw));
      } catch { /* session corrompue : ignorée */ }
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    // ─── MODE DÉMO : authentification locale (VITE_USE_SUPABASE=false) ───
    if (!USE_SUPABASE) {
      const u = demoUsers.find(
        (x) => x.email.toLowerCase() === String(email).toLowerCase() && x.password === password
      );
      if (!u) return { ok: false, error: 'E-mail ou mot de passe incorrect. (Mode démo : mot de passe « demo1234 »)' };
      if (!u.active) return { ok: false, error: 'Ce compte est désactivé. Contactez un administrateur.' };
      const user = {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        client_id: u.clientId,
      };
      const s = { user };
      setSession(s);
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch { /* stockage plein */ }
      return { ok: true, user };
    }

    // ─── MODE SUPABASE ───
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Filet de sécurité : si le compte n'existe pas dans Supabase mais existe
      // dans les comptes démo (seed), on accepte la connexion démo.
      const du = demoUsers.find(
        (x) => x.email.toLowerCase() === String(email).toLowerCase() && x.password === password
      );
      if (du && du.active) {
        const user = { id: du.id, email: du.email, name: du.name, role: du.role, client_id: du.clientId };
        const s = { user };
        setSession(s);
        try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch { /* stockage plein */ }
        console.warn('[Auth] Compte absent de Supabase, connexion démo utilisée pour', du.email);
        return { ok: true, user };
      }
      return { ok: false, error: error.message };
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*, roles(code)')
      .eq('auth_user_id', data.user.id)
      .single();

    // Rôle humain de la base ("Administrateur", "Client"…) plutôt qu'un code technique absent
    const role = profile?.roles?.label || profile?.role || 'Client';

    const user = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || data.user.email,
      role,
      tenant_id: profile?.tenant_id,
      client_id: profile?.client_id,
    };

    return { ok: true, user };
  };

  // Connexion démo instantanée (sans Supabase Auth)
  const loginAs = (roleKey) => {
    const roleMap = {
      Administrateur: 'admin@etoure-logistics.eu',
      Manager: 'manager@etoure-logistics.eu',
      Exploitant: 'dispatcher@etoure-logistics.eu',
      Client: 'client@maisonlaurent.fr',
    };
    const email = roleMap[roleKey] || roleMap.Administrateur;
    const u = demoUsers.find((x) => x.email === email) || demoUsers[0];
    const user = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      client_id: u.clientId,
    };
    const s = { user };
    setSession(s);
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch { /* stockage plein */ }
    return user;
  };

  const logout = async () => {
    if (USE_SUPABASE) await supabase.auth.signOut();
    setSession(null);
    try { localStorage.removeItem(DEMO_KEY); } catch { /* rien à nettoyer */ }
  };

  const value = useMemo(() => {
    let user = null;
    if (session?.user) {
      const su = session.user;
      // Session démo : role directement sur user (su.role) ou dans user_metadata
      // Session Supabase : méta-données + fallback
      const demoRole = su.role || su.user_metadata?.role;
      const isConfiguredAdmin = su.email?.toLowerCase() === 'admin@etoure-logistics.eu';
      user = {
        id: su.id,
        email: su.email,
        name: isConfiguredAdmin ? 'Cheik' : su.name || su.user_metadata?.name || su.email,
        role: isConfiguredAdmin ? 'admin' : demoRole || su.app_metadata?.user_role || 'Client',
        tenant_id: isConfiguredAdmin ? 1 : su.app_metadata?.tenant_id,
        client_id: su.client_id || su.user_metadata?.client_id,
      };
    }

    // Permissions par rôle — clés identiques aux rôles réels du seed
    const map = {
      administrateur: ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'finance', 'carte', 'notifications', 'administration', 'portail'],
      manager:        ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'finance', 'carte', 'notifications'],
      exploitant:     ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'carte', 'notifications'],
      comptable:      ['dashboard', 'finance', 'clients', 'notifications'],
      client:         ['portail', 'dashboard'],
      // alias pour compat Supabase (codes techniques)
      admin:          ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'finance', 'carte', 'notifications', 'administration', 'portail'],
      dispatcher:     ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'carte', 'notifications'],
      accountant:     ['dashboard', 'finance', 'clients', 'notifications'],
    };

    const roleLc = (user?.role || '').toLowerCase();
    return {
      user,
      token: session?.access_token || null,
      isAuthenticated: !!session?.user,
      loading,
      login,
      loginAs,
      logout,
      can: (moduleKey) => (map[roleLc] || []).includes(moduleKey),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
