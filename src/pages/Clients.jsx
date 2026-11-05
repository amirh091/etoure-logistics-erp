import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Trash2, Pencil, Eye, Download, Users, Building2, Mail, Phone, MapPin,
  Star, Package, ArrowRight, FileText, Filter, History,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import {
  Avatar, Badge, ConfirmDialog, Empty, Modal, Pagination, SearchInput, SectionCard, StatusBadge, usePaged,
} from '../components/ui';
import { fmtEUR, fmtDate, timeAgo, exportCSV, exportXLSX, todayISO, initials } from '../lib/helpers';

const emptyClient = {
  name: '', contact: '', email: '', phone: '', address: '', city: 'Paris', cp: '75001',
  sector: '', type: 'Entreprise', siret: '', paymentTerms: '30 jours', status: 'Actif', notes: '',
};

export default function Clients() {
  const { state, add, update, remove, toast } = useStore();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [minRevenue, setMinRevenue] = useState('');
  const [sort, setSort] = useState('revenue');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(emptyClient);

  const enriched = useMemo(() => state.clients.map((c) => {
    const orders = state.deliveries.filter((d) => d.clientId === c.id);
    const revenue = orders.filter((d) => d.status !== 'Annulée').reduce((a, d) => a + d.price, 0);
    const lastOrder = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return { ...c, orderCount: orders.length, revenue, lastOrder: lastOrder?.createdAt, orders };
  }), [state.clients, state.deliveries]);

  const filtered = useMemo(() => {
    let rows = [...enriched];
    const term = q.trim().toLowerCase();
    if (term) rows = rows.filter((c) => `${c.name} ${c.contact} ${c.email} ${c.city} ${c.sector} ${c.id} ${c.siret}`.toLowerCase().includes(term));
    if (city) rows = rows.filter((c) => c.city === city);
    if (type) rows = rows.filter((c) => c.type === type);
    if (status) rows = rows.filter((c) => c.status === status);
    if (minRevenue) rows = rows.filter((c) => c.revenue >= Number(minRevenue));
    if (sort === 'revenue') rows.sort((a, b) => b.revenue - a.revenue);
    if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'orders') rows.sort((a, b) => b.orderCount - a.orderCount);
    if (sort === 'recent') rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return rows;
  }, [enriched, q, city, type, status, minRevenue, sort]);

  const { page, setPage, pages, slice, total } = usePaged(filtered, 8);
  const cities = [...new Set(state.clients.map((c) => c.city))].sort();
  const totalRevenue = filtered.reduce((a, c) => a + c.revenue, 0);

  const openCreate = () => { setEditing(null); setForm(emptyClient); setModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...emptyClient, ...c });
    setModal(true);
  };

  const save = () => {
    if (!form.name.trim()) return toast('Le nom du client est obligatoire', 'err');
    if (editing) {
      update('clients', { ...form, id: editing.id }, user?.name);
      toast('Client mis é jour');
    } else {
      add('clients', {
        ...form,
        id: `CLI-${Math.floor(1100 + Math.random() * 800)}`,
        createdAt: new Date().toISOString(),
        rating: 4.5,
      }, user?.name);
      toast(`Client é ${form.name} é créé`);
    }
    setModal(false);
  };

  const exportList = async () => {
    await exportXLSX([
      {
        name: 'Clients',
        rows: filtered,
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Raison sociale', key: 'name' },
          { label: 'Contact', key: 'contact' },
          { label: 'E-mail', key: 'email' },
          { label: 'Téléphone', key: 'phone' },
          { label: 'Ville', key: 'city' },
          { label: 'Secteur', key: 'sector' },
          { label: 'Type', key: 'type' },
          { label: 'Commandes', key: 'orderCount' },
          { label: 'CA généré', key: 'revenue' },
          { label: 'Statut', key: 'status' },
        ],
      },
    ], `etoure-clients-${todayISO()}.xlsx`);
    toast('Export Excel des clients généré');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Commercial</div>
          <h1>Gestion des clients</h1>
          <p>{total} clients actifs é {fmtEUR(totalRevenue)} de chiffre d'affaires généré é historique et recherche avancée.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={() => { exportCSV(filtered, [{ label: 'Nom', key: 'name' }, { label: 'Contact', key: 'contact' }, { label: 'Ville', key: 'city' }, { label: 'CA', key: 'revenue' }], `clients-${todayISO()}.csv`); toast('CSV exporté'); }}>
            <Download size={15} /> CSV
          </button>
          <button className="btn btn-ghost" onClick={exportList}><FileText size={15} /> Excel</button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Ajouter un client</button>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        {[
          { l: 'Clients totaux', v: state.clients.length, i: <Users size={18} />, t: 'var(--orange-100)', c: 'var(--orange-600)' },
          { l: 'Entreprises / PME', v: state.clients.filter((c) => c.type !== 'Particulier').length, i: <Building2 size={18} />, t: 'var(--blue-100)', c: 'var(--blue-500)' },
          { l: 'CA clients affichés', v: fmtEUR(totalRevenue, true), i: <Star size={18} />, t: 'var(--green-100)', c: 'var(--green-500)' },
          { l: 'Note moyenne', v: `${(state.clients.reduce((a, c) => a + c.rating, 0) / state.clients.length).toFixed(2)} / 5`, i: <Star size={18} />, t: 'var(--amber-100)', c: 'var(--amber-500)' },
        ].map((k) => (
          <div key={k.l} className="card kpi card-hover" style={{ '--kpi-tint': k.t, '--kpi-color': k.c }}>
            <div className="kpi-top"><div className="kpi-icon">{k.i}</div><div className="kpi-label">{k.l}</div></div>
            <div className="kpi-value">{k.v}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Répertoire clients</h3>
            <div className="sub">Recherche avancée multi-critéres</div>
          </div>
          <div className="card-head-actions"><Badge tone="orange">{filtered.length} résultats</Badge></div>
        </div>
        <div className="filters">
          <SearchInput value={q} onChange={setQ} placeholder="Nom, contact, e-mail, SIRET, secteuréé" />
          <select className="select" style={{ flex: '0 1 150px' }} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Toutes les villes</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="select" style={{ flex: '0 1 150px' }} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous les types</option>
            {['Entreprise', 'PME', 'Grand compte', 'Particulier'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="select" style={{ flex: '0 1 130px' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous statuts</option>
            <option>Actif</option>
            <option>Inactif</option>
          </select>
          <select className="select" style={{ flex: '0 1 160px' }} value={minRevenue} onChange={(e) => setMinRevenue(e.target.value)}>
            <option value="">CA minimum</option>
            <option value="5000">éé 5 000 é,é</option>
            <option value="15000">éé 15 000 é,é</option>
            <option value="30000">éé 30 000 é,é</option>
          </select>
          <select className="select" style={{ flex: '0 1 150px' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="revenue">CA décroissant</option>
            <option value="orders">Nb commandes</option>
            <option value="name">Nom A→?'Z</option>
            <option value="recent">Plus récents</option>
          </select>
          {(q || city || type || status || minRevenue) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setCity(''); setType(''); setStatus(''); setMinRevenue(''); }}>
              <Filter size={13} /> Réinitialiser
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Localisation</th>
                <th>Secteur</th>
                <th>Commandes</th>
                <th>CA généré</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slice.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="row" style={{ gap: 9 }}>
                      <Avatar name={c.name} size={32} color="#1E3D63" />
                      <div style={{ minWidth: 0 }}>
                        <div className="td-strong truncate" style={{ maxWidth: 170 }}>{c.name}</div>
                        <div className="muted" style={{ fontSize: '.7rem' }}>{c.id} é {c.type}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="small truncate" style={{ maxWidth: 150 }}>{c.contact}</div>
                    <div className="muted truncate" style={{ fontSize: '.7rem', maxWidth: 150 }}>{c.email}</div>
                  </td>
                  <td>
                    <div className="small">{c.city}</div>
                    <div className="muted" style={{ fontSize: '.7rem' }}>{c.cp}</div>
                  </td>
                  <td><span className="small" style={{ color: 'var(--text-2)' }}>{c.sector}</span></td>
                  <td>
                    <span className="mono" style={{ fontWeight: 700 }}>{c.orderCount}</span>
                    <div className="muted" style={{ fontSize: '.68rem' }}>{c.lastOrder ? timeAgo(c.lastOrder) : 'é?"'}</div>
                  </td>
                  <td className="mono td-strong">{fmtEUR(c.revenue)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>
                    <div className="td-actions">
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setDetail(c)} title="Fiche client"><Eye size={15} /></button>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => openEdit(c)} title="Modifier"><Pencil size={15} /></button>
                      <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red-500)' }} onClick={() => setConfirmId(c.id)} title="Supprimer"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!slice.length && <Empty title="Aucun client trouvé" message="Essayez d'élargir vos critéres de recherche." icon={<Users size={22} />} />}
        </div>
        <Pagination page={page} pages={pages} onChange={setPage} total={total} shown={slice.length} />
      </section>

      {/* -------- Modal formulaire -------- */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Modifier ${editing.name}` : 'Ajouter un client'}
        subtitle="Les informations servent é la facturation et é l'optimisation des tournées."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={save}>{editing ? 'Enregistrer' : 'Créer le client'}</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field full">
            <label>Raison sociale *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Maison Laurent" />
          </div>
          <div className="field">
            <label>Personne de contact</label>
            <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Prénom Nom" />
          </div>
          <div className="field">
            <label>Type de compte</label>
            <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['Entreprise', 'PME', 'Grand compte', 'Particulier'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@entreprise.fr" />
          </div>
          <div className="field">
            <label>Téléphone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+33 1 23 45 67 89" />
          </div>
          <div className="field full">
            <label>Adresse</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Né et rue" />
          </div>
          <div className="field">
            <label>Ville</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="field">
            <label>Code postal</label>
            <input className="input" value={form.cp} onChange={(e) => setForm({ ...form, cp: e.target.value })} />
          </div>
          <div className="field">
            <label>Secteur d'activité</label>
            <input className="input" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Ex. E-commerce" />
          </div>
          <div className="field">
            <label>SIRET</label>
            <input className="input" value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
          </div>
          <div className="field">
            <label>Conditions de paiement</label>
            <select className="select" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
              {['Comptant', '15 jours', '30 jours', '45 jours', '60 jours'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Statut</label>
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Actif</option>
              <option>Inactif</option>
            </select>
          </div>
          <div className="field full">
            <label>Notes internes</label>
            <textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contraintes d'accés, interlocuteurs, préférenceséé" />
          </div>
        </div>
      </Modal>

      {/* -------- Modal fiche client -------- */}
      <Modal open={!!detail} onClose={() => setDetail(null)} wide title={detail?.name || ''} subtitle={`${detail?.id} é Client depuis ${fmtDate(detail?.createdAt)}`}>
        {detail && (
          <div className="split-even">
            <div className="stack" style={{ gap: 14 }}>
              <SectionCard title="Coordonnées">
                <div className="stack" style={{ gap: 10 }}>
                  {[
                    [<Mail key="m" size={14} />, detail.email],
                    [<Phone key="p" size={14} />, detail.phone],
                    [<MapPin key="mp" size={14} />, `${detail.address}, ${detail.cp} ${detail.city}`],
                    [<Building2 key="b" size={14} />, detail.sector],
                  ].map(([ic, v], i) => (
                    <div key={i} className="row" style={{ gap: 9, fontSize: '.8rem' }}>
                      <span style={{ color: 'var(--text-3)' }}>{ic}</span> {v}
                    </div>
                  ))}
                </div>
                <div className="row mt-2" style={{ gap: 8 }}>
                  <StatusBadge status={detail.status} />
                  <Badge tone="navy">{detail.paymentTerms}</Badge>
                  <Badge tone="amber"><Star size={10} /> {detail.rating?.toFixed(1)}</Badge>
                </div>
              </SectionCard>
              <SectionCard title="Synthése commerciale">
                <div className="grid grid-2" style={{ gap: 12 }}>
                  {[
                    ['Commandes', detail.orderCount],
                    ['CA total', fmtEUR(detail.revenue)],
                    ['Panier moyen', fmtEUR(detail.orderCount ? detail.revenue / detail.orderCount : 0)],
                    ['Derniére commande', detail.lastOrder ? fmtDate(detail.lastOrder) : 'é?"'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="muted" style={{ fontSize: '.72rem' }}>{k}</div>
                      <div style={{ fontWeight: 800, fontSize: '.98rem', letterSpacing: '-.02em' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
            <SectionCard title="Historique des commandes" subtitle={`${detail.orders.length} livraisons`} noPad>
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {detail.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((o) => (
                  <div key={o.id} style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="mono small" style={{ fontWeight: 700 }}>{o.id}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="row mt-0" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                      <span className="muted" style={{ fontSize: '.73rem' }}>
                        <Package size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {o.pickupCity} é?' {o.dropoffCity} é {o.distance} km
                      </span>
                      <span className="mono small" style={{ fontWeight: 700 }}>{fmtEUR(o.price)}</span>
                    </div>
                    <div className="muted" style={{ fontSize: '.68rem', marginTop: 2 }}>{fmtDate(o.createdAt)}</div>
                  </div>
                ))}
                {!detail.orders.length && <Empty title="Aucune commande" message="Ce client n'a pas encore passé de commande." icon={<History size={20} />} />}
              </div>
            </SectionCard>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => { remove('clients', confirmId, user?.name); toast('Client supprimé'); }}
        title="Supprimer ce client ?"
        message="Le client et ses informations de contact seront supprimés. L'historique des livraisons sera conservé."
      />
    </>
  );
}

