import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Truck, IdCard, Car, Wallet, Map, Bell, ShieldCheck, Menu, Search,
  Sun, Moon, LogOut, ChevronDown, Package, Download, X, Settings, Building2, Sparkles,
  LayoutGrid, ArrowRight, Clock3,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { normalizeRole, useAuth } from '../store/AuthContext';
import { Avatar } from './ui';
import { timeAgo } from '../lib/helpers';

const NAV = [
  { group: 'Pilotage', items: [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, key: 'dashboard' },
    { to: '/carte', label: 'Géolocalisation', icon: Map, key: 'carte', badge: 'LIVE' },
  ] },
  { group: 'Opérations', items: [
    { to: '/livraisons', label: 'Livraisons', icon: Package, key: 'livraisons' },
    { to: '/chauffeurs', label: 'Chauffeurs', icon: IdCard, key: 'chauffeurs' },
    { to: '/vehicules', label: 'Véhicules', icon: Car, key: 'vehicules' },
  ] },
  { group: 'Commercial & Finance', items: [
    { to: '/clients', label: 'Clients', icon: Users, key: 'clients' },
    { to: '/finance', label: 'Finance', icon: Wallet, key: 'finance' },
    { to: '/notifications', label: 'Notifications', icon: Bell, key: 'notifications' },
  ] },
  { group: 'Système', items: [
    { to: '/administration', label: 'Administration', icon: ShieldCheck, key: 'administration' },
    { to: '/portail', label: 'Portail client', icon: Building2, key: 'portail' },
  ] },
];

const TITLES = {
  '/dashboard': 'Tableau de bord',
  '/clients': 'Clients',
  '/livraisons': 'Livraisons',
  '/chauffeurs': 'Chauffeurs',
  '/vehicules': 'Véhicules',
  '/finance': 'Gestion financière',
  '/carte': 'Géolocalisation',
  '/notifications': 'Notifications',
  '/administration': 'Administration',
  '/portail': 'Portail client',
};

export default function Shell() {
  const { state, dispatch, toast } = useStore();
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('etoure-theme') || 'light');
  const [q, setQ] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => (
    window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
  ));
  const [now, setNow] = useState(() => new Date());
  const loc = useLocation();
  const nav = useNavigate();
  const searchRef = useRef(null);
  const isAdmin = normalizeRole(user?.role) === 'admin' || normalizeRole(user?.role) === 'administrateur';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('etoure-theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setOpen(false);
    setShowNotifs(false);
    setShowUser(false);
    setQ('');
  }, [loc.pathname]);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const installed = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const unread = state.notifications.filter((n) => !n.read).length;
  const mobileItems = [
    { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard, key: 'dashboard' },
    { to: '/livraisons', label: 'Livraisons', icon: Package, key: 'livraisons' },
    { to: '/carte', label: 'Carte', icon: Map, key: 'carte' },
    { to: '/finance', label: 'Finance', icon: Wallet, key: 'finance' },
    { to: '/notifications', label: 'Alertes', icon: Bell, key: 'notifications' },
    { to: '/clients', label: 'Clients', icon: Users, key: 'clients' },
    { to: '/portail', label: 'Portail', icon: Building2, key: 'portail' },
  ].filter((item) => isAdmin || can(item.key)).slice(0, 5);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out = [];
    state.deliveries.filter((d) => `${d.id} ${d.clientName} ${d.pickupCity} ${d.dropoffCity}`.toLowerCase().includes(term)).slice(0, 4)
      .forEach((d) => out.push({ label: `${d.id} · ${d.clientName}`, sub: `${d.pickupCity} → ${d.dropoffCity}`, kind: 'Livraison', to: '/livraisons' }));
    state.clients.filter((c) => `${c.name} ${c.contact} ${c.city}`.toLowerCase().includes(term)).slice(0, 3)
      .forEach((c) => out.push({ label: c.name, sub: `${c.city} · ${c.sector}`, kind: 'Client', to: '/clients' }));
    state.drivers.filter((d) => d.name.toLowerCase().includes(term)).slice(0, 2)
      .forEach((d) => out.push({ label: d.name, sub: `${d.licenseType} · ${d.city}`, kind: 'Chauffeur', to: '/chauffeurs' }));
    state.vehicles.filter((v) => `${v.plate} ${v.model}`.toLowerCase().includes(term)).slice(0, 2)
      .forEach((v) => out.push({ label: `${v.plate} · ${v.model}`, sub: `${v.type} · ${v.status}`, kind: 'Véhicule', to: '/vehicules' }));
    state.invoices.filter((i) => `${i.number} ${i.clientName}`.toLowerCase().includes(term)).slice(0, 2)
      .forEach((i) => out.push({ label: i.number, sub: `${i.clientName} · ${i.status}`, kind: 'Facture', to: '/finance' }));
    return out.slice(0, 9);
  }, [q, state]);

  const install = async () => {
    if (!deferredPrompt) {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      toast(isIos
        ? 'Pour installer l’application : touchez Partager, puis « Sur l’écran d’accueil ».'
        : 'Dans le menu de votre navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».', 'info');
      return;
    }

    try {
      const prompt = deferredPrompt;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') setIsInstalled(true);
    } catch (error) {
      console.error('Échec de la demande d’installation PWA :', error);
      toast('L’installation n’a pas pu démarrer. Réessayez depuis le menu du navigateur.', 'err');
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand brand-lockup">
          <img src="/icons/web-app-manifest-192x192.png" alt="" className="brand-logo-image" />
          <span className="brand-copy">
            <span className="brand-title">E-TOURÉ</span>
            <span className="brand-sub">LOGISTICS ERP</span>
          </span>
          <button className="icon-btn sidebar-close" style={{ position: 'absolute', right: 10, top: 10, color: '#7F94B3' }} onClick={() => setOpen(false)} aria-label="Fermer">
            <X size={17} />
          </button>
        </div>

        <nav className="nav-scroll">
          {NAV.map((g) => {
            const isAdmin = normalizeRole(user?.role) === 'admin' || normalizeRole(user?.role) === 'administrateur';
            const items = g.items.filter((it) => !user || can(it.key) || isAdmin);
            if (!items.length) return null;
            return (
              <div key={g.group}>
                <div className="nav-group-label">{g.group}</div>
                {items.map((it) => (
                  <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <it.icon size={17.5} strokeWidth={2.1} />
                    <span>{it.label}</span>
                    {it.badge ? <span className="nav-badge" style={{ background: '#12B76A' }}>{it.badge}</span> : null}
                    {it.key === 'notifications' && unread > 0 ? <span className="nav-badge">{unread}</span> : null}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <button className="upsell" onClick={() => nav('/finance')} style={{ width: '100%', textAlign: 'left' }}>
            <div className="row" style={{ gap: 7, marginBottom: 6, color: '#FF9A4A' }}>
              <Sparkles size={13} /> <span style={{ fontSize: '.66rem', fontWeight: 800, letterSpacing: '.1em' }}>IA PRÉDICTIVE</span>
            </div>
            <strong>Optimisez vos marges</strong>
            <span>Analyse prédictive des dépenses et tarification intelligente activées.</span>
            <span className="row" style={{ gap: 4, marginTop: 8, color: '#fff', fontSize: '.72rem', fontWeight: 700 }}>
              Voir le rapport <ArrowRight size={12} />
            </span>
          </button>
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={19} />
          </button>
          <span className="topbar-title">{TITLES[loc.pathname] || 'E-TOURÉ ERP'}</span>

          <label className="topbar-search">
            <Search size={15} />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher livraison, client, chauffeur, facture…"
              aria-label="Recherche globale"
            />
            <span className="kbd">⌘K</span>
          </label>
          <div className="topbar-spacer" />

          <div className="topbar-clock" aria-label={`Heure locale : ${now.toLocaleTimeString('fr-FR')}`}>
            <Clock3 size={16} aria-hidden="true" />
            <span className="topbar-clock-copy">
              <time className="topbar-clock-time" dateTime={now.toISOString()}>
                {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </time>
              <span className="topbar-clock-date">
                {now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </span>
          </div>

          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Changer de thème" title="Mode sombre / clair">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {!isInstalled && !deferredPrompt && (
            <button className="btn btn-soft btn-sm install-action" onClick={install} title="Installer l'application" aria-label="Installer E-TOURÉ ERP">
              <Download size={14} /> Installer
            </button>
          )}

          {deferredPrompt && !installDismissed && (
            <button className="btn btn-soft btn-sm" onClick={install} title="Installer l'application">
              <Download size={14} /> Installer
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => { setShowNotifs((s) => !s); setShowUser(false); }} aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 && <span className="dot-alert" />}
            </button>
            {showNotifs && (
              <div className="card" style={{ position: 'absolute', right: 0, top: 46, width: 'min(360px, calc(100vw - 32px))', zIndex: 60, overflow: 'hidden', animation: 'pop .18s var(--ease)' }}>
                <div className="card-head" style={{ padding: '12px 14px' }}>
                  <h3>Notifications</h3>
                  <div className="card-head-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'MARK_ALL_READ' })}>Tout lire</button>
                  </div>
                </div>
                <div style={{ maxHeight: 330, overflowY: 'auto' }}>
                  {state.notifications.slice(0, 6).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { dispatch({ type: 'MARK_READ', id: n.id }); nav(n.target || '/notifications'); }}
                      style={{ display: 'flex', gap: 10, padding: '11px 14px', width: '100%', textAlign: 'left', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--surface-3)' }}
                    >
                      <span className={`icon-tile ${n.type === 'alert' ? 'amber' : n.type === 'finance' ? 'green' : n.type === 'delivery' ? 'orange' : 'blue'}`} style={{ width: 28, height: 28, flex: '0 0 28px' }}>
                        {n.type === 'delivery' ? <Package size={14} /> : n.type === 'finance' ? <Wallet size={14} /> : n.type === 'driver' ? <IdCard size={14} /> : n.type === 'alert' ? <Bell size={14} /> : <Settings size={14} />}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '.78rem', fontWeight: n.read ? 500 : 700, display: 'block', lineHeight: 1.3 }}>{n.title}</span>
                        <span style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{timeAgo(n.time)}</span>
                      </span>
                    </button>
                  ))}
                  {!state.notifications.length && <div className="empty-state" style={{ padding: 26 }}><p className="small">Aucune notification</p></div>}
                </div>
                <button className="btn btn-ghost btn-sm btn-block" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }} onClick={() => nav('/notifications')}>
                  Voir toutes les notifications
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button className="user-chip" onClick={() => { setShowUser((s) => !s); setShowNotifs(false); }}>
              <Avatar name={user?.name || 'Utilisateur'} color={user?.avatarColor} size={30} />
              <span className="user-meta">
                <strong>{user?.name}</strong>
                <span>{user?.role}</span>
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
            </button>
            {showUser && (
              <div className="card" style={{ position: 'absolute', right: 0, top: 50, width: 250, zIndex: 60, padding: 8, animation: 'pop .18s var(--ease)' }}>
                <div style={{ padding: '10px 10px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                  <div className="row" style={{ gap: 9 }}>
                    <Avatar name={user?.name} color={user?.avatarColor} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '.82rem', fontWeight: 700 }} className="truncate">{user?.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }} className="truncate">{user?.email}</div>
                    </div>
                  </div>
                  <div className="badge orange" style={{ marginTop: 9 }}>{user?.role}</div>
                </div>
                <button className="nav-item" style={{ color: 'var(--text-2)', width: '100%' }} onClick={() => nav('/administration')}><Settings size={16} /> Paramètres</button>
                <button className="nav-item" style={{ color: 'var(--text-2)', width: '100%' }} onClick={() => nav('/portail')}><LayoutGrid size={16} /> Portail client</button>
                <button className="nav-item" style={{ color: 'var(--red-500)', width: '100%' }} onClick={() => { logout(); nav('/login'); }}><LogOut size={16} /> Déconnexion</button>
              </div>
            )}
          </div>
        </header>

        {q.trim().length >= 2 && (
          <div className="search-results">
            {results.length ? results.map((r, i) => (
              <div key={i} className="sr-item" onClick={() => { nav(r.to); setQ(''); }}>
                <Search size={14} style={{ color: 'var(--text-3)' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }} className="truncate">{r.label}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }} className="truncate">{r.sub}</div>
                </div>
                <span className="sr-kind">{r.kind}</span>
              </div>
            )) : (
              <div className="sr-item" style={{ color: 'var(--text-3)' }}>Aucun résultat pour « {q} »</div>
            )}
          </div>
        )}

        <main className="page">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" style={{ '--mobile-nav-count': mobileItems.length }}>
        {mobileItems.map((it) => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? 'on' : '')}>
            <it.icon size={19} strokeWidth={2.1} />
            {it.label}
          </NavLink>
        ))}
      </nav>

      {deferredPrompt && !installDismissed && (
        <div className="install-bar">
          <Truck size={16} style={{ color: '#FF9A4A', flex: '0 0 auto' }} />
          <span style={{ flex: 1 }}>Installez E-TOURÉ ERP sur votre appareil pour un accès hors-ligne.</span>
          <button className="btn btn-primary btn-sm" onClick={install}>Installer</button>
          <button className="icon-btn" style={{ color: '#93A6C0', width: 30, height: 30 }} onClick={() => setInstallDismissed(true)} aria-label="Ignorer"><X size={15} /></button>
        </div>
        
      )}
    </div>
    
  );
}
