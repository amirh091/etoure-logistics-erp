import React, { useMemo } from 'react';
import {
  TrendingUp, Package, Truck, Euro, Users, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Map as MapIcon, Bell, Sparkles, CheckCircle2, Clock, Star, Wallet, Route,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { Badge, Kpi, SectionCard, StatusBadge, Bar, Sparkline } from '../components/ui';
import { BarChart, Donut } from '../components/Charts';
import { fmtEUR, fmtNum, fmtDate, timeAgo, monthKey, MONTH_LABELS, linearRegression } from '../lib/helpers';

export default function Dashboard() {
  const { state } = useStore();
  const { user } = useAuth();

  const kpis = useMemo(() => {
    const delivered = state.deliveries.filter((d) => d.status === 'Livrée');
    const active = state.deliveries.filter((d) => ['En cours', 'Confirmée'].includes(d.status));
    const pending = state.deliveries.filter((d) => d.status === 'En attente');
    const revenue = state.deliveries.filter((d) => d.status !== 'Annulée').reduce((a, d) => a + (d.price || 0), 0);
    const expenses = state.expenses.reduce((a, e) => a + (e.amount || 0), 0);
    const onTime = delivered.length ? (delivered.filter((d) => d.onTime !== false).length / delivered.length) * 100 : 96;
    return { delivered, active, pending, revenue, expenses, profit: revenue - expenses, onTime };
  }, [state]);

  const monthly = useMemo(() => {
    const map = new Map();
    state.deliveries.forEach((d) => {
      const k = monthKey(d.createdAt);
      if (!map.has(k)) map.set(k, { revenue: 0, count: 0 });
      const m = map.get(k);
      m.revenue += d.price || 0;
      m.count += 1;
    });
    state.expenses.forEach((e) => {
      const k = monthKey(e.date);
      if (!map.has(k)) map.set(k, { revenue: 0, count: 0 });
      const m = map.get(k);
      m.expenses = (m.expenses || 0) + (e.amount || 0);
    });
    const keys = [...map.keys()].sort().slice(-7);
    return keys.map((k) => ({
      label: MONTH_LABELS[Number(k.slice(5, 7)) - 1],
      revenue: map.get(k).revenue || 0,
      expenses: map.get(k).expenses || 0,
      count: map.get(k).count,
    }));
  }, [state.deliveries, state.expenses]);

  const forecast = useMemo(() => {
    const pts = monthly.map((m, i) => ({ x: i, y: m.revenue }));
    return linearRegression(pts);
  }, [monthly]);

  const topDrivers = useMemo(
    () => state.drivers.slice().sort((a, b) => (b.deliveriesDone || 0) - (a.deliveriesDone || 0)).slice(0, 5),
    [state.drivers]
  );

  const recent = state.deliveries.slice(0, 6);
  const alerts = [
    ...state.drivers.filter((d) => d.status === 'Repos' && d.licenseExpiry && new Date(d.licenseExpiry) < new Date(Date.now() + 60 * 86400000)).map((d) => ({ icon: 'id', text: `Permis de ${d.name} à renouveler`, tone: 'amber' })),
    ...state.vehicles.filter((v) => v.status === 'Maintenance').map((v) => ({ icon: 'truck', text: `${v.plate} en maintenance`, tone: 'red' })),
    ...state.invoices.filter((i) => i.status === 'En attente' && new Date(i.dueDate) < new Date()).slice(0, 2).map((i) => ({ icon: 'euro', text: `Facture ${i.number} en retard`, tone: 'red' })),
  ].slice(0, 5);

  const revSpark = monthly.map((m) => m.revenue);
  const revenueTrend = monthly.length >= 2 ? ((monthly[monthly.length - 1].revenue - monthly[monthly.length - 2].revenue) / (monthly[monthly.length - 2].revenue || 1)) * 100 : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Pilotage</div>
          <h1>Bonjour, {user?.name?.split(' ')[0] || 'Bienvenue'} 👋</h1>
          <p>Chaque livraison compte. Chaque franc aussi. {kpis.active.length} missions en cours, {fmtEUR(kpis.revenue, true)} de CA cumulé.</p>
        </div>
        <div className="page-head-actions">
          <Badge tone="green" className="live">Données temps réel</Badge>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        <Kpi
          icon={<Euro size={18} />} label="Chiffre d'affaires" value={fmtEUR(kpis.revenue, true)}
          trend={revenueTrend} foot="vs mois précédent" tint="var(--green-100)" color="var(--green-500)"
          spark={<Sparkline data={revSpark} color="#12B76A" />}
        />
        <Kpi
          icon={<Package size={18} />} label="Livraisons totales" value={fmtNum(state.deliveries.length)}
          foot={`${kpis.active.length} en cours · ${kpis.pending.length} en attente`} tint="var(--orange-100)" color="var(--orange-600)"
        />
        <Kpi
          icon={<CheckCircle2 size={18} />} label="Ponctualité" value={`${kpis.onTime.toFixed(1)} %`}
          foot="Objectif : 95 %" tint="var(--blue-100)" color="var(--blue-500)"
        />
        <Kpi
          icon={<Truck size={18} />} label="Flotte active" value={`${state.vehicles.filter((v) => v.status === 'En mission').length}/${state.vehicles.length}`}
          foot="Véhicules en mission" tint="var(--amber-100)" color="var(--amber-500)"
        />
      </div>

      {/* Hero : profit + prévision IA */}
      <div className="split-2 mb-3" style={{ alignItems: 'stretch' }}>
        <div className="hero-card">
          <div className="row" style={{ justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div>
              <Badge tone="orange" className="live"><Sparkles size={10} /> IA PRÉDICTIVE</Badge>
              <h2 style={{ marginTop: 10 }}>Résultat net consolidé</h2>
              <div className="hero-num">{fmtEUR(kpis.profit, true)}</div>
              <p style={{ marginTop: 6 }}>
                CA {fmtEUR(kpis.revenue, true)} · Dépenses {fmtEUR(kpis.expenses, true)} · Marge {((kpis.profit / (kpis.revenue || 1)) * 100).toFixed(0)} %
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="hero-chip"><TrendingUp size={12} /> Prévision M+1</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: 8 }}>{fmtEUR(forecast.predict(monthly.length), true)}</div>
              <p style={{ fontSize: '.72rem', color: '#A9BBD4', marginTop: 4 }}>R² = {forecast.r2.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <SectionCard title="Évolution mensuelle" subtitle="CA vs dépenses (7 derniers mois)">
          <BarChart
            labels={monthly.map((m) => m.label)}
            series={[
              { name: 'CA', data: monthly.map((m) => m.revenue), color: '#FF7A1A' },
              { name: 'Dépenses', data: monthly.map((m) => m.expenses || 0), color: '#1E3D63' },
            ]}
            height={200}
          />
        </SectionCard>
      </div>

      <div className="split-2 mb-3">
        <section className="card">
          <div className="card-head">
            <div><h3>Livraisons récentes</h3><div className="sub">Dernières missions enregistrées</div></div>
            <div className="card-head-actions"><Badge tone="orange">{state.deliveries.length}</Badge></div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Réf.</th><th>Client</th><th>Trajet</th><th>Statut</th><th>Montant</th></tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr key={d.id}>
                    <td className="mono td-strong">{d.id}</td>
                    <td className="truncate" style={{ maxWidth: 130 }}>{d.clientName}</td>
                    <td className="small muted truncate" style={{ maxWidth: 150 }}>
                      <Route size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {d.pickupCity} → {d.dropoffCity}
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="mono td-strong">{fmtEUR(d.price || 0, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <SectionCard title="Alertes & actions" subtitle={`${alerts.length} points d'attention`} action={<Badge tone={alerts.length ? 'red' : 'green'}>{alerts.length}</Badge>}>
            <div className="stack" style={{ gap: 4 }}>
              {alerts.map((a, i) => (
                <div key={i} className="list-row">
                  <div className={`icon-tile ${a.tone === 'red' ? 'red' : 'amber'}`}>
                    {a.icon === 'id' ? <Clock size={14} /> : a.icon === 'truck' ? <Truck size={14} /> : <Euro size={14} />}
                  </div>
                  <div className="lr-main"><div className="lr-title" style={{ fontSize: '.8rem' }}>{a.text}</div></div>
                </div>
              ))}
              {!alerts.length && <p className="small muted">Tout est sous contrôle. Aucune alerte active.</p>}
            </div>
          </SectionCard>

          <SectionCard title="Top chauffeurs" subtitle="Par livraisons réalisées" action={<Badge tone="navy">Top 5</Badge>}>
            <div className="stack" style={{ gap: 9 }}>
              {topDrivers.map((d, i) => (
                <div key={d.id} className="row" style={{ gap: 10 }}>
                  <span className="mono muted" style={{ width: 16, fontWeight: 700 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: '.79rem' }}>
                      <span className="td-strong truncate">{d.name}</span>
                      <span className="mono">{d.deliveriesDone || 0}</span>
                    </div>
                    <Bar value={((d.deliveriesDone || 0) / (topDrivers[0]?.deliveriesDone || 1)) * 100} tone={i === 0 ? 'green' : ''} />
                  </div>
                  <span className="rating" style={{ fontSize: '.72rem' }}><Star size={10} fill="currentColor" /> {d.rating}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="split-even">
        <SectionCard title="Répartition des livraisons" subtitle="Par statut">
          <Donut
            data={['En attente', 'Confirmée', 'En cours', 'Livrée', 'Annulée'].map((s) => ({
              label: s,
              value: state.deliveries.filter((d) => d.status === s).length,
            })).filter((x) => x.value > 0)}
            size={170}
            thickness={22}
            centerLabel="Total"
            centerValue={state.deliveries.length}
          />
        </SectionCard>

        <SectionCard title="Activité de l'équipe" subtitle="Journal des dernières actions">
          <div className="stack" style={{ gap: 4, maxHeight: 230, overflowY: 'auto' }}>
            {(state.activityLog || []).slice(0, 6).map((l) => (
              <div key={l.id} className="list-row">
                <div className="icon-tile blue"><Users size={13} /></div>
                <div className="lr-main">
                  <div className="lr-title" style={{ fontSize: '.78rem' }}>{l.action}</div>
                  <div className="lr-sub">{l.user} · {l.target}</div>
                </div>
                <span className="muted" style={{ fontSize: '.68rem' }}>{timeAgo(l.created_at || l.time)}</span>
              </div>
            ))}
            {!(state.activityLog || []).length && <p className="small muted">Aucune activité enregistrée.</p>}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
