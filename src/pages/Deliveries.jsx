import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Package, Sparkles, MapPin, Truck, Trash2, Pencil, Download, Filter, Eye,
  CheckCircle2, Clock, XCircle, ArrowRight, Navigation, User, Weight, Euro, FileText,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import ProofModal from '../components/ProofModal';
import { useAuth } from '../store/AuthContext';
import {
  Badge, ConfirmDialog, Empty, Modal, Pagination, SearchInput, SectionCard, StatusBadge, Tabs, usePaged, Avatar, Bar,
} from '../components/ui';
import {
  estimateCost, fmtEUR, fmtDate, fmtDateTime, timeAgo, exportCSV, exportXLSX, uid, todayISO, VEHICLE_RATES,
} from '../lib/helpers';
import { CITIES } from '../data/seed';

const STATUSES = ['En attente', 'Confirmée', 'En cours', 'Livrée', 'Annulée'];
const GOODS = [
  'Palettes agroalimentaires', 'Colis e-commerce', 'Mobilier de bureau', '??quipements médicaux',
  'Cartons déménagement', 'Piéces détachées', 'Produits frais sous température', 'Matériel informatique',
  'Marchandise fragile', 'Textile conditionné', 'Documents confidentiels', 'Matériel solaire',
];

const emptyForm = {
  clientId: '', pickupCity: 'Paris', dropoffCity: 'Lyon', pickupAddress: '', dropoffAddress: '',
  goods: GOODS[0], weight: 250, distance: 465, vehicleType: 'Fourgonnette',
  urgency: 'standard', fragile: false, night: false, returnTrip: false,
  priority: 'Normale', driverId: '', vehicleId: '', scheduledAt: todayISO(), notes: '',
};

export default function Deliveries() {
  const { state, add, update, remove, toast, log } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [proofDelivery, setProofDelivery] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    let rows = [...state.deliveries];
    if (tab !== 'all') rows = rows.filter((d) => d.status === tab);
    const term = q.trim().toLowerCase();
    if (term) {
      rows = rows.filter((d) =>
        `${d.id} ${d.clientName} ${d.pickupCity} ${d.dropoffCity} ${d.driverName} ${d.goods} ${d.trackingCode}`.toLowerCase().includes(term)
      );
    }
    if (driverFilter) rows = rows.filter((d) => d.driverId === driverFilter);
    if (vehicleFilter) rows = rows.filter((d) => d.vehicleId === vehicleFilter);
    if (sort === 'recent') rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'oldest') rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort === 'amount') rows.sort((a, b) => b.price - a.price);
    if (sort === 'distance') rows.sort((a, b) => b.distance - a.distance);
    return rows;
  }, [state.deliveries, tab, q, driverFilter, vehicleFilter, sort]);

  const { page, setPage, pages, slice, total } = usePaged(filtered, 9);
  const counts = useMemo(() => {
    const c = { all: state.deliveries.length };
    STATUSES.forEach((s) => { c[s] = state.deliveries.filter((d) => d.status === s).length; });
    return c;
  }, [state.deliveries]);

  /* ---------- IA estimation en direct ---------- */
  const estimate = useMemo(() => estimateCost({
    distance: Number(form.distance) || 0,
    weight: Number(form.weight) || 0,
    vehicleType: form.vehicleType,
    urgency: form.urgency,
    fragile: form.fragile,
    night: form.night,
    returnTrip: form.returnTrip,
  }), [form.distance, form.weight, form.vehicleType, form.urgency, form.fragile, form.night, form.returnTrip]);

  /* ---------- affectation automatique ---------- */
  const autoAssign = (data) => {
    const candidates = state.drivers.filter((d) => d.status === 'Disponible');
    const pool = candidates.length ? candidates : state.drivers;
    // score : disponibilité, note, zone, charge en cours
    const scored = pool.map((d) => {
      const activeLoad = state.deliveries.filter((x) => x.driverId === d.id && ['En cours', 'Confirmée'].includes(x.status)).length;
      const score = (d.status === 'Disponible' ? 40 : 0) + d.rating * 8 + (d.city === data.pickupCity ? 14 : 0) - activeLoad * 12 + Math.min(d.deliveriesDone, 300) / 20;
      return { d, score, activeLoad };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0]?.d;
    if (!best) return { driver: null, vehicle: null };
    const veh = state.vehicles.find((v) => v.driverId === best.id && v.type === data.vehicleType && v.status !== 'Hors service')
      || state.vehicles.find((v) => v.type === data.vehicleType && v.status === 'Disponible')
      || state.vehicles.find((v) => v.driverId === best.id)
      || state.vehicles.find((v) => v.type === data.vehicleType);
    return { driver: best, vehicle: veh, score: scored[0] };
  };

  const openCreate = () => {
    setEditing(null);
    const d = { ...emptyForm, clientId: state.clients[0]?.id || '', pickupCity: 'Paris', dropoffCity: 'Lyon' };
    const assign = autoAssign(d);
    setForm({
      ...d,
      driverId: assign.driver?.id || '',
      vehicleId: assign.vehicle?.id || '',
      vehicleType: assign.vehicle?.type || d.vehicleType,
      pickupAddress: `12 rue des Docks, ${CITIES[d.pickupCity].cp} ${d.pickupCity}`,
      dropoffAddress: `48 avenue de la Gare, ${CITIES[d.dropoffCity].cp} ${d.dropoffCity}`,
    });
    setModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      clientId: d.clientId, pickupCity: d.pickupCity, dropoffCity: d.dropoffCity,
      pickupAddress: d.pickupAddress, dropoffAddress: d.dropoffAddress, goods: d.goods,
      weight: d.weight, distance: d.distance, vehicleType: d.vehicleType, urgency: d.urgency,
      fragile: d.fragile, night: false, returnTrip: false, priority: d.priority,
      driverId: d.driverId, vehicleId: d.vehicleId, scheduledAt: d.scheduledAt?.slice(0, 10) || todayISO(), notes: d.notes || '',
    });
    setModal(true);
  };

  const save = () => {
    const client = state.clients.find((c) => c.id === form.clientId);
    const driver = state.drivers.find((d) => d.id === form.driverId);
    const vehicle = state.vehicles.find((v) => v.id === form.vehicleId);
    const payload = {
      clientId: form.clientId,
      clientName: client?.name || 'Client comptoir',
      pickupCity: form.pickupCity,
      pickupAddress: form.pickupAddress || `${CITIES[form.pickupCity].cp} ${form.pickupCity}`,
      dropoffCity: form.dropoffCity,
      dropoffAddress: form.dropoffAddress || `${CITIES[form.dropoffCity].cp} ${form.dropoffCity}`,
      distance: Number(form.distance),
      weight: Number(form.weight),
      goods: form.goods,
      vehicleType: vehicle?.type || form.vehicleType,
      vehicleId: form.vehicleId,
      driverId: form.driverId,
      driverName: driver?.name || 'Non affecté',
      priority: form.priority,
      urgency: form.urgency,
      price: editing ? editing.price : estimate.price,
      cost: editing ? editing.cost : estimate.cost,
      fragile: form.fragile,
      notes: form.notes,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    };

    if (editing) {
      update('deliveries', { ...payload, id: editing.id }, user?.name);
      toast('Livraison mise é jour');
    } else {
      const id = `LIV-2026${Math.floor(1000 + Math.random() * 8999)}`;
      add('deliveries', {
        ...payload,
        id,
        status: 'En attente',
        createdAt: new Date().toISOString(),
        deliveredAt: null,
        progress: 0,
        trackingCode: `ET${Math.floor(100000 + Math.random() * 899999)}`,
        temperatureControlled: form.goods.includes('frais'),
      }, user?.name);
      toast(`Livraison ${id} créée é chauffeur ${driver?.name || 'é affecter'}`);
    }
    setModal(false);
  };

  const changeStatus = (d, status) => {
    const patch = { id: d.id, status };
    if (status === 'Livrée') { patch.deliveredAt = new Date().toISOString(); patch.progress = 100; }
    if (status === 'En cours') patch.progress = Math.max(12, d.progress || 0);
    if (status === 'Annulée') patch.progress = 0;
    update('deliveries', patch, user?.name);
    toast(`${d.id} é?' ${status}`);
    if (detail?.id === d.id) setDetail({ ...d, ...patch });
  };

  const autoAssignExisting = (d) => {
    const assign = autoAssign(d);
    if (!assign.driver) return toast('Aucun chauffeur disponible', 'err');
    update('deliveries', { id: d.id, driverId: assign.driver.id, driverName: assign.driver.name, vehicleId: assign.vehicle?.id, vehicleType: assign.vehicle?.type || d.vehicleType }, user?.name);
    toast(`Affecté é ${assign.driver.name} (score ${assign.score.score.toFixed(0)})`);
    if (detail?.id === d.id) setDetail({ ...d, driverId: assign.driver.id, driverName: assign.driver.name });
  };

  const exportExcel = async () => {
    await exportXLSX([
      {
        name: 'Livraisons',
        rows: filtered,
        columns: [
          { label: 'Référence', key: 'id' },
          { label: 'Client', key: 'clientName' },
          { label: 'Départ', key: 'pickupCity' },
          { label: 'Arrivée', key: 'dropoffCity' },
          { label: 'Distance (km)', key: 'distance' },
          { label: 'Poids (kg)', key: 'weight' },
          { label: 'Chauffeur', key: 'driverName' },
          { label: 'Véhicule', key: 'vehicleType' },
          { label: 'Statut', key: 'status' },
          { label: 'Prix HT', key: 'price' },
          { label: 'Coét', key: 'cost' },
          { label: 'Marge', value: (r) => r.price - r.cost },
          { label: 'Créée le', value: (r) => fmtDate(r.createdAt) },
        ],
      },
    ], `etoure-livraisons-${todayISO()}.xlsx`);
    toast('Export Excel généré');
  };

  const totalValue = filtered.reduce((a, d) => a + d.price, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Opérations</div>
          <h1>Gestion des livraisons</h1>
          <p>{total} livraisons é {fmtEUR(totalValue)} de valeur transportée é affectation automatique et suivi temps réel.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={exportExcel}><Download size={15} /> Excel</button>
          <button className="btn btn-ghost" onClick={() => { exportCSV(filtered, [{ label: 'Réf', key: 'id' }, { label: 'Client', key: 'clientName' }, { label: 'Statut', key: 'status' }, { label: 'Prix', key: 'price' }], `livraisons-${todayISO()}.csv`); toast('CSV exporté'); }}>
            <FileText size={15} /> CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer une livraison</button>
        </div>
      </div>

      <div className="grid mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {STATUSES.map((s) => {
          const tone = { 'En attente': 'var(--amber-500)', Confirmée: 'var(--blue-500)', 'En cours': 'var(--orange-500)', Livrée: 'var(--green-500)', Annulée: 'var(--red-500)' }[s];
          return (
            <button
              key={s}
              className="card card-pad card-hover"
              style={{ textAlign: 'left', borderColor: tab === s ? tone : undefined }}
              onClick={() => setTab(tab === s ? 'all' : s)}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{s}</span>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: tone }} />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.03em', marginTop: 6 }}>{counts[s]}</div>
            </button>
          );
        })}
      </div>

      <section className="card">
        <Tabs
          tabs={[{ key: 'all', label: 'Toutes', count: counts.all }, ...STATUSES.map((s) => ({ key: s, label: s, count: counts[s] }))]}
          value={tab}
          onChange={setTab}
        />
        <div className="filters">
          <SearchInput value={q} onChange={setQ} placeholder="Référence, client, ville, chauffeur, code de suiviéé" />
          <select className="select" style={{ flex: '0 1 180px' }} value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}>
            <option value="">Tous les chauffeurs</option>
            {state.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="select" style={{ flex: '0 1 170px' }} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
            <option value="">Tous les véhicules</option>
            {state.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} é {v.type}</option>)}
          </select>
          <select className="select" style={{ flex: '0 1 160px' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
            <option value="amount">Montant décroissant</option>
            <option value="distance">Distance décroissante</option>
          </select>
          {(q || driverFilter || vehicleFilter || tab !== 'all') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setDriverFilter(''); setVehicleFilter(''); setTab('all'); }}>
              <Filter size={13} /> Réinitialiser
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Trajet</th>
                <th>Chauffeur / Véhicule</th>
                <th>Statut</th>
                <th>Avancement</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slice.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="td-strong mono" style={{ fontSize: '.8rem' }}>{d.id}</div>
                    <div className="muted" style={{ fontSize: '.7rem' }}>{timeAgo(d.createdAt)}</div>
                  </td>
                  <td style={{ maxWidth: 140 }}>
                    <div className="truncate" style={{ fontWeight: 600 }}>{d.clientName}</div>
                    <div className="muted truncate" style={{ fontSize: '.7rem' }}>{d.goods}</div>
                  </td>
                  <td>
                    <div className="row-tight small"><MapPin size={11} style={{ color: 'var(--orange-500)' }} />{d.pickupCity} <ArrowRight size={10} style={{ color: 'var(--text-3)' }} /> {d.dropoffCity}</div>
                    <div className="muted" style={{ fontSize: '.7rem' }}>{d.distance} km é {d.weight} kg</div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Avatar name={d.driverName} size={22} />
                      <div style={{ minWidth: 0 }}>
                        <div className="small truncate" style={{ fontWeight: 600 }}>{d.driverName}</div>
                        <div className="muted" style={{ fontSize: '.68rem' }}>{d.vehicleType}</div>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={d.status} live={d.status === 'En cours'} /></td>
                  <td style={{ minWidth: 90 }}>
                    <Bar value={d.progress} tone={d.status === 'Livrée' ? 'green' : d.status === 'Annulée' ? 'red' : 'blue'} />
                    <div className="muted mono" style={{ fontSize: '.68rem', marginTop: 3 }}>{d.progress}%</div>
                  </td>
                  <td className="mono td-strong" style={{ textAlign: 'right' }}>
                    {fmtEUR(d.price)}
                    <div className="muted" style={{ fontSize: '.68rem', fontWeight: 500 }}>marge {fmtEUR(d.price - d.cost)}</div>
                  </td>
                  <td>
                    <div className="td-actions">
                      {d.status === 'En cours' && (
                        <button className="btn btn-sm btn-primary" onClick={() => setProofDelivery(d)} title="Livrer">
                          <CheckCircle2 size={12} /> Livrer
                        </button>
                      )}
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setDetail(d)} title="Détails"><Eye size={15} /></button>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => openEdit(d)} title="Modifier"><Pencil size={15} /></button>
                      <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red-500)' }} onClick={() => setConfirmId(d.id)} title="Supprimer"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!slice.length && <Empty title="Aucune livraison" message="Aucune livraison ne correspond é ces critéres." icon={<Package size={22} />} />}
        </div>
        <Pagination page={page} pages={pages} onChange={setPage} total={total} shown={slice.length} />
      </section>

      {/* ---------------- Modale création / édition ---------------- */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        wide
        title={editing ? `Modifier ${editing.id}` : 'Créer une livraison'}
        subtitle="Renseignez la mission : l'IA calcule automatiquement le tarif optimal et affecte le meilleur chauffeur."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={!form.clientId}>
              {editing ? 'Enregistrer les modifications' : 'Créer la livraison'} <ArrowRight size={15} />
            </button>
          </>
        }
      >
        <div className="split-even">
          <div className="stack" style={{ gap: 14 }}>
            <div className="form-grid">
              <div className="field full">
                <label>Client</label>
                <select className="select" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                  {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name} é?" {c.city}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Ville de départ</label>
                <select className="select" value={form.pickupCity} onChange={(e) => setForm({ ...form, pickupCity: e.target.value, pickupAddress: '', distance: Math.round(form.distance) })}>
                  {Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Ville d'arrivée</label>
                <select className="select" value={form.dropoffCity} onChange={(e) => setForm({ ...form, dropoffCity: e.target.value, dropoffAddress: '' })}>
                  {Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Adresse de chargement</label>
                <input className="input" value={form.pickupAddress} onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} placeholder="Né rue, code postal, ville" />
              </div>
              <div className="field">
                <label>Adresse de livraison</label>
                <input className="input" value={form.dropoffAddress} onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })} placeholder="Né rue, code postal, ville" />
              </div>
              <div className="field">
                <label>Nature de la marchandise</label>
                <select className="select" value={form.goods} onChange={(e) => setForm({ ...form, goods: e.target.value })}>
                  {GOODS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Type de véhicule</label>
                <select className="select" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                  {Object.keys(VEHICLE_RATES).map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Poids (kg)</label>
                <input className="input" type="number" min="1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div className="field">
                <label>Distance estimée (km)</label>
                <input className="input" type="number" min="1" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
              </div>
              <div className="field">
                <label>Date de chargement</label>
                <input className="input" type="date" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <div className="field">
                <label>Niveau d'urgence</label>
                <select className="select" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                  <option value="standard">Standard (48-72 h)</option>
                  <option value="express">Express (24 h)</option>
                  <option value="urgent">Urgent (jour m??me)</option>
                </select>
              </div>
              <div className="field">
                <label>Chauffeur affecté</label>
                <select className="select" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                  <option value="">é?" ?? affecter é?"</option>
                  {state.drivers.map((d) => <option key={d.id} value={d.id}>{d.name} é {d.status}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Véhicule</label>
                <select className="select" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                  <option value="">é?" ?? affecter é?"</option>
                  {state.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} é {v.type}</option>)}
                </select>
              </div>
              <div className="field full">
                <label>Options</label>
                <div className="row" style={{ gap: 8 }}>
                  {[['fragile', 'Marchandise fragile'], ['night', 'Livraison de nuit'], ['returnTrip', 'Aller-retour']].map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      className={`btn btn-sm ${form[k] ? 'btn-soft' : 'btn-ghost'}`}
                      onClick={() => setForm({ ...form, [k]: !form[k] })}
                    >
                      {form[k] && <CheckCircle2 size={13} />} {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field full">
                <label>Instructions particuliéres</label>
                <textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="??tage, code d'accés, horaires, précautionséé" />
              </div>
            </div>
          </div>

          {/* Panneau IA */}
          <div className="stack" style={{ gap: 14 }}>
            <div className="hero-card" style={{ padding: 18 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <p style={{ fontSize: '.68rem', letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 800, color: '#FF9A4A' }}>
                  <Sparkles size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Estimation IA
                </p>
                <span className="hero-chip" style={{ fontSize: '.64rem' }}>fiabilité {(estimate.confidence * 100).toFixed(0)} %</span>
              </div>
              <div className="hero-num" style={{ marginTop: 8 }}>{fmtEUR(estimate.price)}</div>
              <p style={{ fontSize: '.74rem', marginTop: 2 }}>Prix de vente conseillé (HT)</p>
              <div className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                <span className="hero-chip"><Euro size={11} /> Coét {fmtEUR(estimate.cost)}</span>
                <span className="hero-chip"><Sparkles size={11} /> Marge {fmtEUR(estimate.margin)}</span>
                <span className="hero-chip"><Clock size={11} /> ETA {estimate.eta} j</span>
              </div>
            </div>

            <SectionCard title="Détail du calcul" subtitle="Modéle tarifaire pondéré">
              <div className="stack" style={{ gap: 9 }}>
                {estimate.breakdown.map((b) => (
                  <div key={b.label} className="row" style={{ justifyContent: 'space-between', fontSize: '.78rem' }}>
                    <span style={{ color: 'var(--text-2)' }}>{b.label}</span>
                    <span className="mono" style={{ fontWeight: 650 }}>{fmtEUR(b.value)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 9 }} className="row">
                  <span className="small" style={{ fontWeight: 700 }}>Marge appliquée</span>
                  <Badge tone="green" className="ml-auto">{estimate.marginPct} %</Badge>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Affectation intelligente" subtitle="Chauffeur recommandé">
              {(() => {
                const a = form.driverId ? null : autoAssign(form);
                const dr = state.drivers.find((d) => d.id === form.driverId) || a?.driver;
                const veh = state.vehicles.find((v) => v.id === form.vehicleId) || a?.vehicle;
                return dr ? (
                  <>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={dr.name} color={dr.avatarColor} size={38} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '.86rem' }}>{dr.name}</div>
                        <div className="muted" style={{ fontSize: '.72rem' }}>{dr.city} é note {dr.rating.toFixed(1)}/5 é {dr.deliveriesDone} courses</div>
                      </div>
                      <StatusBadge status={dr.status} />
                    </div>
                    <div className="row mt-2" style={{ gap: 8 }}>
                      <Badge tone="blue"><Truck size={11} /> {veh?.plate || 'é?"'}</Badge>
                      <Badge tone="navy"><Weight size={11} /> {dr.onTimeRate}% ponctuel</Badge>
                    </div>
                    {!form.driverId && <button className="btn btn-ghost btn-sm btn-block mt-2" onClick={() => setForm({ ...form, driverId: dr.id, vehicleId: veh?.id || '' })}><CheckCircle2 size={13} /> Confirmer cette affectation</button>}
                  </>
                ) : <p className="small muted">Aucun chauffeur disponible.</p>;
              })()}
            </SectionCard>
          </div>
        </div>
      </Modal>

      {/* ---------------- Modale détail ---------------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail ? `${detail.id} é ${detail.clientName}` : ''}
        subtitle={detail ? `${detail.pickupCity} é?' ${detail.dropoffCity} é ${detail.distance} km é ${detail.weight} kg` : ''}
        footer={
          detail && (
            <>
              <button className="btn btn-ghost" onClick={() => { setDetail(null); openEdit(detail); }}><Pencil size={14} /> Modifier</button>
              {detail.status === 'En attente' && <button className="btn btn-ghost" onClick={() => autoAssignExisting(detail)}><Sparkles size={14} /> Affecter automatiquement</button>}
              {detail.status !== 'Livrée' && detail.status !== 'Annulée' && (
                <button className="btn btn-primary" onClick={() => changeStatus(detail, detail.status === 'En attente' ? 'Confirmée' : detail.status === 'Confirmée' ? 'En cours' : 'Livrée')}>
                  <CheckCircle2 size={14} />
                  {detail.status === 'En attente' ? 'Confirmer' : detail.status === 'Confirmée' ? 'Démarrer la livraison' : 'Marquer comme Livrée'}
                </button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="split-even">
            <div className="stack" style={{ gap: 14 }}>
              <SectionCard title="Informations" noPad>
                <div className="card-pad stack" style={{ gap: 11 }}>
                  {[
                    ['Statut', <StatusBadge key="s" status={detail.status} live={detail.status === 'En cours'} />],
                    ['Code de suivi', <span key="t" className="mono small">{detail.trackingCode}</span>],
                    ['Créée le', fmtDateTime(detail.createdAt)],
                    ['Chargement prévu', fmtDate(detail.scheduledAt)],
                    ['Livrée le', detail.deliveredAt ? fmtDateTime(detail.deliveredAt) : 'é?"'],
                    ['Priorité', <StatusBadge key="p" status={detail.priority} />],
                    ['Marchandise', detail.goods],
                    ['Température dirigée', detail.temperatureControlled ? 'Oui' : 'Non'],
                  ].map(([k, v]) => (
                    <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: '.8rem' }}>
                      <span style={{ color: 'var(--text-3)' }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Chauffeur & véhicule">
                <div className="row" style={{ gap: 10 }}>
                  <Avatar name={detail.driverName} size={36} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{detail.driverName}</div>
                    <div className="muted" style={{ fontSize: '.72rem' }}>{detail.vehicleType} é {state.vehicles.find((v) => v.id === detail.vehicleId)?.plate || 'é?"'}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setDetail(null); navigate('/carte'); }}>
                    <Navigation size={13} /> Suivre
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Incidents / notes">
                <p className="small" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {detail.notes || 'Aucune instruction particuliére pour cette mission.'}
                </p>
              </SectionCard>
            </div>

            <div className="stack" style={{ gap: 14 }}>
              <SectionCard title="Adresses">
                <div className="stack" style={{ gap: 12 }}>
                  <div className="row" style={{ gap: 9, alignItems: 'flex-start' }}>
                    <div className="icon-tile orange"><MapPin size={15} /></div>
                    <div>
                      <div className="small" style={{ fontWeight: 700 }}>Chargement</div>
                      <div className="muted" style={{ fontSize: '.76rem', lineHeight: 1.5 }}>{detail.pickupAddress}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 9, alignItems: 'flex-start' }}>
                    <div className="icon-tile green"><MapPin size={15} /></div>
                    <div>
                      <div className="small" style={{ fontWeight: 700 }}>Livraison</div>
                      <div className="muted" style={{ fontSize: '.76rem', lineHeight: 1.5 }}>{detail.dropoffAddress}</div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Suivi en temps réel">
                <div className="timeline">
                  {[
                    ['Commande enregistrée', fmtDateTime(detail.createdAt), true],
                    ['Mission Confirmée', detail.status !== 'En attente' ? 'Validée' : 'En attente de validation', detail.status !== 'En attente'],
                    ['Chargement effectué', detail.progress > 15 ? 'Marchandise chargée' : '?? venir', detail.progress > 15],
                    ['En route', detail.progress > 15 ? `Progression ${detail.progress}%` : '?? venir', detail.status === 'En cours' || detail.status === 'Livrée'],
                    ['Livrée & signée', detail.deliveredAt ? fmtDateTime(detail.deliveredAt) : '?? venir', detail.status === 'Livrée'],
                  ].map(([t, sub, done], i) => (
                    <div key={i} className={`tl-item ${done ? 'done' : ''} ${detail.status === 'En cours' && done ? 'now' : ''}`}>
                      <div style={{ fontSize: '.8rem', fontWeight: 640 }}>{t}</div>
                      <div className="muted" style={{ fontSize: '.71rem' }}>{sub}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <Bar value={detail.progress} tone={detail.status === 'Livrée' ? 'green' : 'blue'} />
                </div>
              </SectionCard>

              <SectionCard title="Facturation">
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: '.8rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Prix de vente</span>
                    <strong className="mono">{fmtEUR(detail.price)}</strong>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: '.8rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Coét de revient</span>
                    <span className="mono">{fmtEUR(detail.cost)}</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: '.8rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Marge</span>
                    <Badge tone="green">{fmtEUR(detail.price - detail.cost)} é {(((detail.price - detail.cost) / detail.price) * 100).toFixed(1)} %</Badge>
                  </div>
                </div>
              </SectionCard>

              {detail.status !== 'Annulée' && detail.status !== 'Livrée' && (
                <button className="btn btn-danger btn-block" onClick={() => changeStatus(detail, 'Annulée')}>
                  <XCircle size={14} /> Annuler la livraison
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => { remove('deliveries', confirmId, user?.name); toast('Livraison supprimée'); }}
        title="Supprimer la livraison ?"
        message={`La livraison ${confirmId} sera définitivement supprimée de la base.`}
      />

      <ProofModal delivery={proofDelivery} onClose={() => setProofDelivery(null)} />
    </>
  );
}

