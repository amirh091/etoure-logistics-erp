import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, USE_SUPABASE } from '../lib/supabase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // Stocke les infos (nom, rôle) venant de la base
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setLoading(false);
      return;
    }

    // 1. Récupérer la session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Écouter les changements (connexion / déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fonction pour aller chercher le profil (nom, rôle) dans la table "users"
  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*, roles(code)')
        .eq('auth_user_id', userId)
        .single();
      
      if (data) {
        setProfile({
          name: data.name,
          role: data.roles?.code || 'client',
          tenant_id: data.tenant_id,
        });
      }
    } catch (e) {
      console.error("Erreur profil", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    if (!USE_SUPABASE) return { ok: false, error: 'Mode démo désactivé.' };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    // On attend que le profil soit chargé avant de dire que c'est bon
    const { data: userData } = await supabase
      .from('users')
      .select('*, roles(code)')
      .eq('auth_user_id', data.user.id)
      .single();

    const user = {
      id: data.user.id,
      email: data.user.email,
      name: userData?.name || data.user.email,
      role: userData?.roles?.code || 'client',
      tenant_id: userData?.tenant_id,
    };

    return { ok: true, user };
  };

  const logout = async () => {
    if (USE_SUPABASE) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const value = useMemo(() => {
    let user = null;
    if (session?.user) {
      user = {
        id: session.user.id,
        email: session.user.email,
        name: profile?.name || session.user.email, // Utilise le nom de la base
        role: profile?.role || 'client',            // Utilise le rôle de la base
        tenant_id: profile?.tenant_id,
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
      isAuthenticated: !!session?.user,
      loading,
      login,
      logout,
      can: (moduleKey) => (map[role] || []).includes(moduleKey),
    };
  }, [session, profile, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);