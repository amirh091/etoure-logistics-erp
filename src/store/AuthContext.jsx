import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, USE_SUPABASE } from '../lib/supabase';

const AuthCtx = createContext(null);

const DEMO_USERS = [
  { role: 'admin', label: 'Administrateur', email: 'admin@etoure-logistics.eu' },
  { role: 'manager', label: 'Manager', email: 'manager@etoure-logistics.eu' },
  { role: 'dispatcher', label: 'Exploitant', email: 'dispatcher@etoure-logistics.eu' },
  { role: 'client', label: 'Client', email: 'client@maisonlaurent.fr', client_id: 'CLI-1001' },
];

export const normalizeRole = (value) => String(value ?? '').trim().toLowerCase();

function getTokenClaims(accessToken) {
  try {
    const encoded = accessToken?.split('.')[1];
    if (!encoded) return {};
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
  } catch (error) {
    console.warn('Impossible de lire les rôles du jeton Supabase :', error);
    return {};
  }
}

function getTrustedRole(authUser, accessToken) {
  const claims = getTokenClaims(accessToken);
  const allowedRoles = new Set(['admin', 'manager', 'dispatcher', 'accountant', 'client']);
  const candidates = [
    authUser?.app_metadata?.user_role,
    authUser?.app_metadata?.role,
    claims.user_role,
  ];
  return candidates.map(normalizeRole).find((role) => allowedRoles.has(role)) || '';
}

async function loadProfile(authUser, accessToken) {
  const { data, error } = await supabase
    .from('users')
    .select('name, tenant_id, client_id, roles(code)')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (error) {
    console.error('Erreur de chargement du profil Supabase :', error);
    throw new Error('Connexion réussie, mais le profil utilisateur n’a pas pu être lu. Vérifie les règles RLS et le profil dans Supabase.');
  }

  const role = normalizeRole(data?.roles?.code) || getTrustedRole(authUser, accessToken);
  if (!role) return null;

  return {
    name: data?.name || authUser.email,
    role,
    tenant_id: data?.tenant_id,
    client_id: data?.client_id,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // Stocke les infos (nom, rôle) venant de la base
  const [demoUser, setDemoUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setLoading(false);
      return;
    }

    // 1. Récupérer la session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session);
      else setLoading(false);
    });

    // 2. Écouter les changements (connexion / déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fonction pour aller chercher le profil (nom, rôle) dans la table "users"
  const fetchProfile = async (currentSession) => {
    setLoading(true);
    try {
      const loadedProfile = await loadProfile(currentSession.user, currentSession.access_token);
      setProfile(loadedProfile);
    } catch (error) {
      console.error('Erreur profil :', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    if (!USE_SUPABASE) {
      const normalizedEmail = String(email ?? '').trim().toLowerCase();
      const demoAccount = DEMO_USERS.find((account) => normalizeRole(account.email) === normalizeRole(normalizedEmail));
      if (password !== 'demo1234' || !demoAccount) {
        return { ok: false, error: 'Adresse e-mail ou mot de passe démo invalide.' };
      }

      const user = {
        id: `demo-${demoAccount.role}`,
        email: demoAccount.email,
        name: demoAccount.label,
        role: demoAccount.role,
        client_id: demoAccount.client_id,
      };
      setDemoUser(user);
      return { ok: true, user };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    setSession(data.session);
    let userProfile;
    try {
      userProfile = await loadProfile(data.user, data.session.access_token);
    } catch (profileError) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return { ok: false, error: profileError.message };
    }

    if (!userProfile) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return {
        ok: false,
        error: 'Le compte est authentifié, mais aucun rôle administrateur/utilisateur n’est associé à ce profil Supabase. Il faut relier cheikdev7@gmail.com à un profil dans la table users et lui attribuer le rôle admin.',
      };
    }

    setProfile(userProfile);
    const user = { id: data.user.id, email: data.user.email, ...userProfile };

    return { ok: true, user };
  };

  const loginAs = (roleLabel) => {
    if (USE_SUPABASE) throw new Error('L’accès démo est désactivé.');

    const normalizedRole = normalizeRole(roleLabel);
    const demoAccount = DEMO_USERS.find(
      (account) => normalizeRole(account.label) === normalizedRole || normalizeRole(account.role) === normalizedRole,
    );
    if (!demoAccount) throw new Error('Rôle démo inconnu.');

    const user = {
      id: `demo-${demoAccount.role}`,
      email: demoAccount.email,
      name: demoAccount.label,
      role: demoAccount.role,
      client_id: demoAccount.client_id,
    };
    setDemoUser(user);
    return user;
  };

  const logout = async () => {
    if (USE_SUPABASE) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setDemoUser(null);
  };

  const value = useMemo(() => {
    let user = !USE_SUPABASE ? demoUser : null;
    if (session?.user) {
      user = {
        id: session.user.id,
        email: session.user.email,
        name: profile?.name || session.user.email, // Utilise le nom de la base
        role: profile?.role || '',
        tenant_id: profile?.tenant_id,
        client_id: profile?.client_id,
      };
    }

    const role = user?.role;
    const map = {
      admin:        ['dashboard','clients','livraisons','chauffeurs','vehicules','finance','carte','notifications','administration','portail'],
      manager:      ['dashboard','clients','livraisons','chauffeurs','vehicules','finance','carte','notifications'],
      dispatcher:   ['dashboard','clients','livraisons','chauffeurs','vehicules','carte','notifications'],
      accountant:   ['dashboard','finance','clients','notifications'],
      client:       ['portail','dashboard'],
    };

    return {
      user,
      token: session?.access_token || null,
      isAuthenticated: (!!session?.user && !!profile?.role) || (!USE_SUPABASE && !!demoUser),
      loading,
      login,
      loginAs,
      logout,
      can: (moduleKey) => (map[role] || []).includes(moduleKey),
    };
  }, [session, profile, demoUser, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);