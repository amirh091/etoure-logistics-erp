import React, { useMemo, useState } from 'react';
import {
  ShieldCheck, Users, Key, History, Database, Plus, Trash2, Pencil, Download,
  CheckCircle2, XCircle, Building2, Lock, UserPlus, RefreshCw, HardDrive, Activity,
  FileJson, AlertTriangle, Settings, Globe, Clock,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import {
  Avatar, Badge, ConfirmDialog, Empty, Modal, Pagination, SearchInput, SectionCard, StatusBadge, Switch, Tabs, usePaged,
} from '../components/ui';
import { fmtDate, fmtDateTime, timeAgo, exportXLSX, todayISO, downloadBlob } from '../lib/helpers';
import { ROLES } from '../data/seed';

const ACTION_META = {
  create: { tone: 'green', icon: Plus },
  update: { tone: 'blue', icon: Pencil },
  delete: { tone: 'red', icon: Trash2 },
  export: { tone: 'amber', icon: Download },
  auth: { tone: 'navy', icon: Lock },
  system: { tone: 'navy', icon: RefreshCw },
};

export default function Admin() {
  const { state, add, update, remove, dispatch, toast, log, reset } = useStore();
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  const [q, setQ] = useState('');
  const [userModal, setUserModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backing, setBacking] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Exploitant', password: 'demo1234', phone: '', active: true, clientId: '' });

  const logs = useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = state.activityLog;
    if (term) rows = rows.filter((l) => `${l.user} ${l.action} ${l.target}`.toLowerCase().includes(term));
    return rows;
  }, [state.activityLog, q]);
  const logsPaged = usePaged(logs, 12);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', role: 'Exploitant', password: 'demo1234', phone: '', active: true, clientId: '' });
    setUserModal(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ ...u });
    setUserModal(true);
  };

  const saveUser = () => {
    if (!form.name || !form.email) return toast('Nom et e-mail requis', 'err');
    if (editing) {
      update('users', { ...form, id: editing.id }, user?.name);
      toast('Utilisateur mis é jour');
    } else {
      add('users', { ...form, id: `USR-${Math.floor(10 + Math.random() * 90)}`, lastLogin: null, avatarColor: '#FF7A1A' }, user?.name);
      toast(`Utilisateur ${form.name} créé`);
    }
    setUserModal(false);
  };

  const backup = async () => {
    setBacking(true);
    const snapshot = {
      exportedAt: new Date().toISOString(),
      company: state.settings.company,
      collections: {
        clients: state.clients.length,
        drivers: state.drivers.length,
        vehicles: state.vehicles.length,
        deliveries: state.deliveries.length,
        expenses: state.expenses.length,
        invoices: state.invoices.length,
        quotes: state.quotes.length,
        users: state.users.length,
      },
      data: state,
    };
    await exportXLSX([
      { name: 'Clients', rows: state.clients, columns: [{ label: 'ID', key: 'id' }, { label: 'Nom', key: 'name' }, { label: 'Ville', key: 'city' }, { label: 'Statut', key: 'status' }] },
      { name: 'Chauffeurs', rows: state.drivers, columns: [{ label: 'ID', key: 'id' }, { label: 'Nom', key: 'name' }, { label: 'Statut', key: 'status' }] },
      { name: 'Véhicules', rows: state.vehicles, columns: [{ label: 'ID', key: 'id' }, { label: 'Immat.', key: 'plate' }, { label: 'Type', key: 'type' }] },
      { name: 'Livraisons', rows: state.deliveries, columns: [{ label: 'ID', key: 'id' }, { label: 'Client', key: 'clientName' }, { label: 'Statut', key: 'status' }, { label: 'Prix', key: 'price' }] },
      { name: 'Factures', rows: state.invoices, columns: [{ label: 'Numéro', key: 'number' }, { label: 'Client', key: 'clientName' }, { label: 'Statut', key: 'status' }] },
      { name: 'Dépenses', rows: state.expenses, columns: [{ label: 'ID', key: 'id' }, { label: 'Catégorie', key: 'category' }, { label: 'Montant', key: 'amount' }] },
    ], `etoure-backup-${todayISO()}.xlsx`);
    downloadBlob(JSON.stringify(snapshot, null, 2), `etoure-snapshot-${todayISO()}.json`, 'application/json');
    log({ user: user?.name, action: 'Sauvegarde complète', target: 'Excel + JSON', type: 'export' });
    setBacking(false);
    toast('Sauvegarde générée (Excel + JSON)');
  };

  const usersPaged = usePaged(state.users, 8);
  const totalRecords = state.clients.length + state.drivers.length + state.vehicles.length
    + state.deliveries.length + state.expenses.length + state.invoices.length + state.quotes.length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Système</div>
          <h1>Administration</h1>
          <p>Utilisateurs, rôles et permissions, journal des activités et sauvegardes chiffréess.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={backup} disabled={backing}>
            <Database size={15} /> {backing ? 'Sauvegarde.' : 'Sauvegarder les données'}
          </button>
          <button className="btn btn-primary" onClick={openCreate}><UserPlus size={16} /> Nouvel utilisateur</button>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        {[
          { l: 'Utilisateurs', v: state.users.length, i: <Users size={18} />, t: 'var(--orange-100)', c: 'var(--orange-600)' },
          { l: 'Rôles configurés', v: Object.keys(ROLES).length, i: <Key size={18} />, t: 'var(--blue-100)', c: 'var(--blue-500)' },
          { l: 'Enregistrements', v: totalRecords.toLocaleString('fr-FR'), i: <Database size={18} />, t: 'var(--green-100)', c: 'var(--green-500)' },
          { l: 'événements journalisés', v: state.activityLog.length, i: <History size={18} />, t: 'var(--amber-100)', c: 'var(--amber-500)' },
        ].map((k) => (
          <div key={k.l} className="card kpi card-hover" style={{ '--kpi-tint': k.t, '--kpi-color': k.c }}>
            <div className="kpi-top"><div className="kpi-icon">{k.i}</div><div className="kpi-label">{k.l}</div></div>
            <div className="kpi-value">{k.v}</div>
          </div>
        ))}
      </div>

      <section className="card mb-3">
        <Tabs
          tabs={[
            { key: 'users', label: 'Utilisateurs', count: state.users.length },
            { key: 'roles', label: 'Rôles & permissions' },
            { key: 'log', label: 'Journal des activités', count: state.activityLog.length },
            { key: 'backup', label: 'Sauvegarde & système' },
            { key: 'settings', label: 'Paramètres société' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'users' && (
          <>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Utilisateur</th><th>Rôle</th><th>Téléphone</th><th>Dernière connexion</th><th>Statut</th><th /></tr>
                </thead>
                <tbody>
                  {usersPaged.slice.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="row" style={{ gap: 9 }}>
                          <Avatar name={u.name} color={u.avatarColor} size={30} />
                          <div>
                            <div className="td-strong">{u.name}</div>
                            <div className="muted" style={{ fontSize: '.7rem' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone={ROLES[u.role]?.color || 'navy'}>{u.role}</Badge></td>
                      <td className="small muted">{u.phone || '-'}</td>
                      <td className="small muted">{u.lastLogin ? timeAgo(u.lastLogin) : 'Jamais'}</td>
                      <td>
                        <span className={`badge ${u.active ? 'green' : 'red'}`}>{u.active ? 'Actif' : 'Suspendu'}</span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => openEdit(u)} title="Modifier"><Pencil size={15} /></button>
                          <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red-500)' }} onClick={() => setConfirmId(u.id)} disabled={u.id === user?.id} title="Supprimer"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={usersPaged.page} pages={usersPaged.pages} onChange={usersPaged.setPage} total={state.users.length} shown={usersPaged.slice.length} />
          </>
        )}

        {tab === 'roles' && (
          <div className="card-pad grid grid-3" style={{ gap: 16 }}>
            {Object.entries(ROLES).map(([name, meta]) => (
              <div key={name} className="card card-pad card-hover">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Badge tone={meta.color}>{name}</Badge>
                  <span className="muted mono small">{state.users.filter((u) => u.role === name).length} utilisateur(s)</span>
                </div>
                <p className="small muted mt-1" style={{ lineHeight: 1.5 }}>{meta.description}</p>
                <div className="row mt-2" style={{ gap: 5, flexWrap: 'wrap' }}>
                  {meta.permissions.map((p) => (
                    <span key={p} className="badge navy" style={{ fontSize: '.66rem' }}>
                      <CheckCircle2 size={9} /> {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'log' && (
          <>
            <div className="filters">
              <SearchInput value={q} onChange={setQ} placeholder="Utilisateur, action, cible." />
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { exportXLSX([{ name: 'Journal', rows: state.activityLog, columns: [{ label: 'Date', value: (r) => fmtDateTime(r.time) }, { label: 'Utilisateur', key: 'user' }, { label: 'Action', key: 'action' }, { label: 'Cible', key: 'target' }, { label: 'Type', key: 'type' }] }], `journal-${todayISO()}.xlsx`); toast('Journal exporté'); }}>
                <Download size={13} /> Exporter
              </button>
            </div>
            <div style={{ padding: '6px 18px 18px' }}>
              <div className="timeline">
                {logsPaged.slice.map((l) => {
                  const M = ACTION_META[l.type] || ACTION_META.system;
                  const Icon = M.icon;
                  return (
                    <div key={l.id} className="tl-item done" style={{ paddingBottom: 13 }}>
                      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                        <div className="row" style={{ gap: 8 }}>
                          <strong style={{ fontSize: '.82rem' }}>{l.action}</strong>
                          <Badge tone={M.tone}><Icon size={9} /> {l.type}</Badge>
                        </div>
                        <span className="muted" style={{ fontSize: '.7rem' }}>{fmtDateTime(l.time)}</span>
                      </div>
                      <div className="muted" style={{ fontSize: '.75rem', marginTop: 2 }}>
                        {l.user} ? <span className="mono">{l.target}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!logs.length && <Empty title="Aucun événement" icon={<History size={22} />} />}
            </div>
            <Pagination page={logsPaged.page} pages={logsPaged.pages} onChange={logsPaged.setPage} total={logs.length} shown={logsPaged.slice.length} />
          </>
        )}

        {tab === 'backup' && (
          <div className="card-pad stack" style={{ gap: 16 }}>
            <div className="grid grid-2">
              <SectionCard title="Sauvegarde des données" subtitle="Export complet (Excel + JSON)">
                <p className="small muted" style={{ lineHeight: 1.6 }}>
                  Génére une archive complète de la base : clients, chauffeurs, véhicules, livraisons, factures et dépenses.
                  Le fichier JSON permet une restauration exacte.
                </p>
                <div className="row mt-2" style={{ gap: 8 }}>
                  <button className="btn btn-primary" onClick={backup} disabled={backing}><Database size={14} /> Lancer la sauvegarde</button>
                  <button className="btn btn-ghost" onClick={() => { downloadBlob(JSON.stringify(state, null, 2), `etoure-snapshot-${todayISO()}.json`, 'application/json'); toast('Snapshot JSON téléchargé'); }}>
                    <FileJson size={14} /> JSON seul
                  </button>
                </div>
                <div className="demo-hint mt-2">
                  <Clock size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Dernière sauvegarde automatique : {fmtDateTime(new Date())} é chiffrement AES-256 é rétention 30 jours
                </div>
              </SectionCard>

              <SectionCard title="Santé du système" subtitle="Disponibilité & performances">
                <div className="stack" style={{ gap: 12 }}>
                  {[
                    ['API REST', 'opérationnelle', 'green', '42 ms'],
                    ['Base de données MySQL', 'opérationnelle', 'green', '12 ms'],
                    ['Service GPS', 'opérationnel', 'green', '98 ms'],
                    ['Passerelle SMS / WhatsApp', 'opérationnelle', 'green', '210 ms'],
                    ['Génération PDF', 'opérationnelle', 'green', '310 ms'],
                  ].map(([n, s, tone, lat]) => (
                    <div key={n} className="row" style={{ justifyContent: 'space-between' }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--green-500)' }} />
                        <span className="small">{n}</span>
                      </div>
                      <div className="row" style={{ gap: 7 }}>
                        <span className="muted mono" style={{ fontSize: '.7rem' }}>{lat}</span>
                        <Badge tone={tone}>{s}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="row mt-2" style={{ gap: 8 }}>
                  <Badge tone="green"><Activity size={10} /> Disponibilité 99,98 %</Badge>
                  <Badge tone="navy"><HardDrive size={10} /> 12,4 Go utilisés</Badge>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Zone sensible" subtitle="Réinitialisation des données de démonstration" className="">
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="icon-tile red"><AlertTriangle size={17} /></div>
                <div style={{ flex: 1 }}>
                  <strong className="small">Réinitialiser la base de démonstration</strong>
                  <p className="muted small mt-1" style={{ lineHeight: 1.55 }}>
                    Toutes les modifications locales (clients, livraisons, factures, dépenses) seront effacéess et remplacéess par le jeu de données d'origine.
                  </p>
                </div>
                <button className="btn btn-danger" onClick={() => setConfirmReset(true)}><RefreshCw size={14} /> Réinitialiser</button>
              </div>
            </SectionCard>
          </div>
        )}

        {tab === 'settings' && (
          <div className="card-pad grid grid-2" style={{ gap: 16 }}>
            <SectionCard title="Identité de l'entreprise" subtitle="Utilisée sur les factures et devis PDF">
              <div className="form-grid">
                <div className="field"><label>Raison sociale</label><input className="input" defaultValue={state.settings.company.name} onBlur={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { company: { ...state.settings.company, name: e.target.value } } })} /></div>
                <div className="field"><label>Forme juridique</label><input className="input" defaultValue={state.settings.company.legal} onBlur={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { company: { ...state.settings.company, legal: e.target.value } } })} /></div>
                <div className="field full"><label>Adresse</label><input className="input" defaultValue={state.settings.company.address} onBlur={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { company: { ...state.settings.company, address: e.target.value } } })} /></div>
                <div className="field"><label>E-mail</label><input className="input" defaultValue={state.settings.company.email} /></div>
                <div className="field"><label>Téléphone</label><input className="input" defaultValue={state.settings.company.phone} /></div>
                <div className="field"><label>TVA intracommunautaire</label><input className="input" defaultValue={state.settings.company.vat} /></div>
                <div className="field"><label>IBAN</label><input className="input" defaultValue={state.settings.company.iban} /></div>
              </div>
              <button className="btn btn-primary mt-2" onClick={() => toast('Paramètres société enregistrés')}><CheckCircle2 size={14} /> Enregistrer</button>
            </SectionCard>

            <div className="stack">
              <SectionCard title="Objectifs de performance" subtitle="Suivi mensuel">
                <div className="form-grid">
                  <div className="field">
                    <label>Objectif de CA mensuel (?)</label>
                    <input className="input" type="number" defaultValue={state.settings.targets.monthlyRevenue} onBlur={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { targets: { ...state.settings.targets, monthlyRevenue: Number(e.target.value) } } })} />
                  </div>
                  <div className="field">
                    <label>Objectif livraisons / mois</label>
                    <input className="input" type="number" defaultValue={state.settings.targets.monthlyDeliveries} onBlur={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { targets: { ...state.settings.targets, monthlyDeliveries: Number(e.target.value) } } })} />
                  </div>
                  <div className="field full">
                    <label>Taux de ponctualité cible (%)</label>
                    <input className="input" type="number" defaultValue={state.settings.targets.onTimeRate} onBlur={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { targets: { ...state.settings.targets, onTimeRate: Number(e.target.value) } } })} />
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Sécurité & conformité">
                <div className="stack" style={{ gap: 12 }}>
                  {[
                    ['Authentification JWT', 'jetons signés, expiration 12 h', true],
                    ['Chiffrement AES-256', 'données au repos et en transit', true],
                    ['Double authentification (2FA)', 'TOTP / SMS pour les admins', true],
                    ['Journal d\'audit complet', 'traçabilité de toutes les actions', true],
                    ['Conformité RGPD', 'registre et droit é l\'effacement', true],
                  ].map(([label, desc, on]) => (
                    <div key={label} className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div className="small" style={{ fontWeight: 620 }}>{label}</div>
                        <div className="muted" style={{ fontSize: '.7rem' }}>{desc}</div>
                      </div>
                      <Switch on={on} onChange={() => toast('Option de sécurité géréee par le plan Entreprise')} label={label} />
                    </div>
                  ))}
                </div>
                <div className="row mt-2" style={{ gap: 8 }}>
                  <Badge tone="green"><ShieldCheck size={10} /> ISO 27001</Badge>
                  <Badge tone="blue"><Globe size={10} /> Hébergement UE</Badge>
                  <Badge tone="navy"><Building2 size={10} /> Multi-entreprises</Badge>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </section>

      {/* modal utilisateur */}
      <Modal
        open={userModal}
        onClose={() => setUserModal(false)}
        title={editing ? `Modifier ${editing.name}` : 'Créer un utilisateur'}
        subtitle="Rôles et permissions appliqués immédiatement."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setUserModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={saveUser}>{editing ? 'Enregistrer' : 'Créer l\'utilisateur'}</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field full"><label>Nom complet</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>E-mail</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label>Téléphone</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field">
            <label>Rôle</label>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.keys(ROLES).map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field"><label>Mot de passe provisoire</label><input className="input" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="field full">
            <label>Statut du compte</label>
            <div className="row" style={{ gap: 9 }}>
              <Switch on={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Compte actif" />
              <span className="small muted">{form.active ? 'Compte actif - connexion autorisée' : 'Compte suspendu'}</span>
            </div>
          </div>
          {form.role === 'Client' && (
            <div className="field full">
              <label>Client rattaché (portail)</label>
              <select className="select" value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">- Aucun -</option>
                {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="demo-hint mt-2">
          <strong>Permissions du rôle {form.role} :</strong> {(ROLES[form.role]?.permissions || []).join(' é ')}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => { remove('users', confirmId, user?.name); toast('Utilisateur supprimé'); }}
        title="Supprimer cet utilisateur ?"
        message="L'accés é la plateforme sera immédiatement révoqué."
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => { reset(); toast('Base de démonstration réinitialisée'); }}
        title="Réinitialiser les données ?"
        message="Toutes vos modifications locales seront perdues."
        confirmLabel="Réinitialiser"
      />
    </>
  );
}
