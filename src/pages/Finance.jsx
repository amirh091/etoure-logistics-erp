import React, { useMemo, useState } from 'react';
import {
  Plus, FileText, Download, TrendingUp, TrendingDown, Wallet, Euro, Trash2, Eye, Pencil,
  FileSpreadsheet, Receipt, ArrowUpRight, ArrowDownRight, Sparkles, AlertTriangle, CheckCircle2,
  CreditCard, Send, Printer,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import {
  Badge, ConfirmDialog, Empty, Modal, Pagination, SearchInput, SectionCard, StatusBadge, Tabs, usePaged,
} from '../components/ui';
import { AreaChart, Donut, RankBars, ForecastChart } from '../components/Charts';
import {
  fmtEUR, fmtDate, fmtDateTime, generatePDF, generateReportPDF, exportXLSX, exportCSV, todayISO, addDays,
} from '../lib/helpers';
import { monthlySeries, expensesByCategory, forecastExpenses, computeKPIs } from '../data/analytics';
import { COMPANY } from '../data/seed';

const EXPENSE_CATS = ['Carburant', 'Maintenance', 'Salaires', 'Assurance', 'Péages', 'Leasing', 'Fournitures', 'Sous-traitance', 'Loyer', 'Marketing'];

export default function Finance() {
  const { state, add, update, remove, toast, log } = useStore();
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [q, setQ] = useState('');
  const [docKind, setDocKind] = useState('facture');
  const [docStatus, setDocStatus] = useState('');
  const [expModal, setExpModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [expForm, setExpForm] = useState({ category: 'Carburant', label: 'Diesel / Essence flotte', amount: 500, date: todayISO(), supplier: 'Total ??nergies', method: 'Carte entreprise', recurring: false, invoiceRef: '' });
  const [docForm, setDocForm] = useState({ clientId: '', deliveryId: '', kind: 'facture', paymentMethod: 'Virement bancaire' });

  const kpis = useMemo(() => computeKPIs(state), [state]);
  const months = useMemo(() => monthlySeries(state.deliveries, state.expenses, 7), [state]);
  const cats = useMemo(() => expensesByCategory(state.expenses), [state]);
  const forecast = useMemo(() => forecastExpenses(state.expenses, 3), [state]);

  const docs = useMemo(() => {
    const list = docKind === 'facture' ? state.invoices : state.quotes;
    let rows = [...list];
    const term = q.trim().toLowerCase();
    if (term) rows = rows.filter((d) => `${d.number} ${d.clientName} ${d.status}`.toLowerCase().includes(term));
    if (docStatus) rows = rows.filter((d) => d.status === docStatus);
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [state.invoices, state.quotes, docKind, q, docStatus]);

  const expensesFiltered = useMemo(() => {
    let rows = [...state.expenses];
    const term = q.trim().toLowerCase();
    if (term) rows = rows.filter((e) => `${e.category} ${e.supplier} ${e.label} ${e.invoiceRef}`.toLowerCase().includes(term));
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [state.expenses, q]);

  const docsPaged = usePaged(docs, 8);
  const expPaged = usePaged(expensesFiltered, 10);

  const exportPdf = async (doc) => {
    setBusy(true);
    try {
      const client = state.clients.find((c) => c.id === doc.clientId);
      await generatePDF(doc, { company: COMPANY, client, type: doc.kind });
      log({ user: user?.name, action: `Génération PDF ${doc.kind}`, target: doc.number, type: 'export' });
      toast(`${doc.kind === 'facture' ? 'Facture' : 'Devis'} ${doc.number} exporté en PDF`);
    } catch (e) {
      toast('Erreur de génération PDF', 'err');
    }
    setBusy(false);
  };

  const exportReport = async () => {
    setBusy(true);
    try {
      await generateReportPDF({
        title: 'Rapport financier consolidé',
        subtitle: 'Chiffre d\'affaires, dépenses, marges et prévisions',
        company: COMPANY,
        sections: [
          {
            heading: 'Synthése financiére',
            columns: [{ label: 'Poste', value: (r) => r.k }, { label: 'Montant', value: (r) => r.v }],
            rows: [
              { k: 'Chiffre d\'affaires', v: fmtEUR(kpis.revenue) },
              { k: 'Dépenses totales', v: fmtEUR(kpis.expenses) },
              { k: 'Bénéfice net', v: fmtEUR(kpis.profit) },
              { k: 'Marge nette', v: `${kpis.margin.toFixed(1)} %` },
              { k: 'Factures impayées', v: `${fmtEUR(kpis.unpaid)} (${kpis.unpaidCount})` },
              { k: 'Panier moyen', v: fmtEUR(kpis.avgTicket) },
              { k: 'Prévision dépenses M+1', v: fmtEUR(forecast.predictions[0]?.value || 0) },
            ],
          },
          {
            heading: '??volution mensuelle',
            columns: [
              { label: 'Mois', value: (r) => r.key },
              { label: 'CA', value: (r) => fmtEUR(r.revenue) },
              { label: 'Dépenses', value: (r) => fmtEUR(r.expenses) },
              { label: 'Bénéfice', value: (r) => fmtEUR(r.profit) },
            ],
            rows: months,
          },
          {
            heading: 'Dépenses par catégorie',
            columns: [{ label: 'Catégorie', value: (r) => r.label }, { label: 'Montant', value: (r) => fmtEUR(r.value) }],
            rows: cats,
          },
          {
            heading: 'Factures en attente de réglement',
            columns: [
              { label: 'Facture', value: (r) => r.number },
              { label: 'Client', value: (r) => r.clientName },
              { label: '??chéance', value: (r) => fmtDate(r.dueDate) },
              { label: 'Montant TTC', value: (r) => fmtEUR(r.totals.total) },
            ],
            rows: state.invoices.filter((i) => i.status === 'En attente').slice(0, 20),
          },
        ],
      });
      toast('Rapport financier PDF généré');
    } catch {
      toast('Erreur de génération', 'err');
    }
    setBusy(false);
  };

  const exportExcelFinance = async () => {
    await exportXLSX([
      {
        name: 'Factures',
        rows: state.invoices,
        columns: [
          { label: 'Numéro', key: 'number' },
          { label: 'Client', key: 'clientName' },
          { label: 'Date', value: (r) => fmtDate(r.date) },
          { label: '??chéance', value: (r) => fmtDate(r.dueDate) },
          { label: 'HT', value: (r) => r.totals.subtotal },
          { label: 'TVA', value: (r) => r.totals.vat },
          { label: 'TTC', value: (r) => r.totals.total },
          { label: 'Statut', key: 'status' },
        ],
      },
      {
        name: 'Dépenses',
        rows: state.expenses,
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Catégorie', key: 'category' },
          { label: 'Libellé', key: 'label' },
          { label: 'Fournisseur', key: 'supplier' },
          { label: 'Date', value: (r) => fmtDate(r.date) },
          { label: 'Montant', key: 'amount' },
          { label: 'Moyen', key: 'method' },
          { label: 'Statut', key: 'status' },
        ],
      },
      {
        name: '??volution mensuelle',
        rows: months,
        columns: [
          { label: 'Mois', key: 'key' },
          { label: 'CA', key: 'revenue' },
          { label: 'Dépenses', key: 'expenses' },
          { label: 'Bénéfice', key: 'profit' },
          { label: 'Livraisons', key: 'deliveries' },
        ],
      },
    ], `etoure-finance-${todayISO()}.xlsx`);
    toast('Classeur Excel financier généré');
  };

  const createDoc = async () => {
    const client = state.clients.find((c) => c.id === docForm.clientId);
    const delivery = state.deliveries.find((d) => d.id === docForm.deliveryId);
    const base = delivery ? delivery.price : 850;
    const items = [
      { label: delivery ? `Transport ${delivery.pickupCity} é?' ${delivery.dropoffCity}` : 'Prestation de transport', qty: 1, unitPrice: Math.round(base * 0.84) },
      { label: 'Manutention & chargement', qty: 1, unitPrice: Math.round(base * 0.1) },
      { label: 'Suivi GPS temps réel', qty: 1, unitPrice: Math.round(base * 0.06) },
    ];
    const subtotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
    const vat = Math.round(subtotal * 0.2 * 100) / 100;
    const number = `${docForm.kind === 'facture' ? 'FAC' : 'DEV'}-2026-${Math.floor(2000 + Math.random() * 999)}`;
    const doc = {
      id: number, number, kind: docForm.kind,
      deliveryId: docForm.deliveryId || null,
      deliveries: docForm.deliveryId ? [docForm.deliveryId] : [],
      clientId: docForm.clientId, clientName: client?.name || 'Client comptoir',
      date: new Date().toISOString(), dueDate: addDays(new Date(), docForm.kind === 'facture' ? 30 : 21),
      items, totals: { subtotal, vatRate: 20, vat, total: subtotal + vat },
      status: docForm.kind === 'facture' ? 'En attente' : 'Brouillon',
      paymentMethod: docForm.paymentMethod,
      notes: 'Paiement é réception de facture. TVA acquittée sur les prestations de transport.',
      paidAt: null,
    };
    add(docForm.kind === 'facture' ? 'invoices' : 'quotes', doc, user?.name);
    setDocModal(false);
    toast(`${docForm.kind === 'facture' ? 'Facture' : 'Devis'} ${number} créé`);
    if (docForm.kind === 'facture') setTab('invoices'); else setTab('quotes');
    setTimeout(() => exportPdf(doc), 350);
  };

  const saveExpense = () => {
    add('expenses', {
      ...expForm,
      id: `EXP-${Math.floor(5000 + Math.random() * 4000)}`,
      amount: Number(expForm.amount),
      date: new Date(expForm.date).toISOString(),
      status: 'Payée',
    }, user?.name);
    setExpModal(false);
    toast(`Dépense de ${fmtEUR(expForm.amount)} enregistrée`);
  };

  const markPaid = (doc) => {
    update('invoices', { id: doc.id, status: 'Payée', paidAt: new Date().toISOString() }, user?.name);
    toast(`Facture ${doc.number} marquée comme payée`);
    setDetail({ ...doc, status: 'Payée' });
  };

  const unpaid = state.invoices.filter((i) => i.status === 'En attente');
  const overdue = unpaid.filter((i) => new Date(i.dueDate) < Date.now());

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Finance & Comptabilité</div>
          <h1>Gestion financiére</h1>
          <p>Facturation PDF, devis, dépenses, entrées d'argent et rapports é?" {fmtEUR(kpis.unpaid)} en attente de réglement.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={exportExcelFinance}><FileSpreadsheet size={15} /> Export Excel</button>
          <button className="btn btn-ghost" onClick={exportReport} disabled={busy}><FileText size={15} /> Rapport PDF</button>
          <button className="btn btn-primary" onClick={() => setDocModal(true)}><Plus size={16} /> Nouveau document</button>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        {[
          { l: 'Chiffre d\'affaires', v: fmtEUR(kpis.revenue, true), i: <TrendingUp size={18} />, t: 'var(--orange-100)', c: 'var(--orange-600)', f: `Panier moyen ${fmtEUR(kpis.avgTicket)}` },
          { l: 'Dépenses', v: fmtEUR(kpis.expenses, true), i: <Receipt size={18} />, t: 'var(--red-100)', c: 'var(--red-500)', f: `${state.expenses.length} écritures` },
          { l: 'Bénéfice net', v: fmtEUR(kpis.profit, true), i: <Wallet size={18} />, t: 'var(--green-100)', c: 'var(--green-500)', f: `Marge ${kpis.margin.toFixed(1)} %` },
          { l: 'Impayés', v: fmtEUR(kpis.unpaid, true), i: <AlertTriangle size={18} />, t: 'var(--amber-100)', c: 'var(--amber-500)', f: `${unpaid.length} factures é ${overdue.length} en retard` },
        ].map((k) => (
          <div key={k.l} className="card kpi card-hover" style={{ '--kpi-tint': k.t, '--kpi-color': k.c }}>
            <div className="kpi-top"><div className="kpi-icon">{k.i}</div><div className="kpi-label">{k.l}</div></div>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-foot">{k.f}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <Tabs
          tabs={[
            { key: 'overview', label: 'Vue d\'ensemble' },
            { key: 'invoices', label: 'Factures', count: state.invoices.length },
            { key: 'quotes', label: 'Devis', count: state.quotes.length },
            { key: 'expenses', label: 'Dépenses', count: state.expenses.length },
            { key: 'reports', label: 'Rapports & prévisions' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {/* ---------------- VUE D'ENSEMBLE ---------------- */}
        {tab === 'overview' && (
          <div className="card-pad stack" style={{ gap: 20 }}>
            <div className="split-even">
              <div>
                <div className="row mb-2" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <h3>??volution du chiffre d'affaires</h3>
                    <div className="muted">7 derniers mois é CA vs dépenses</div>
                  </div>
                  <div className="chart-legend">
                    <span><i style={{ background: '#FF7A1A' }} />CA</span>
                    <span><i style={{ background: '#1E3D63' }} />Dépenses</span>
                  </div>
                </div>
                <AreaChart
                  labels={months.map((m) => m.label)}
                  series={[
                    { name: 'CA', data: months.map((m) => m.revenue), color: '#FF7A1A' },
                    { name: 'Dépenses', data: months.map((m) => m.expenses), color: '#1E3D63' },
                  ]}
                  formatter={(v) => fmtEUR(v)}
                  height={250}
                />
              </div>
              <div>
                <h3 className="mb-2">Structure des coéts</h3>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <Donut data={cats.slice(0, 7)} size={168} thickness={20} centerLabel="Dépenses" centerValue={fmtEUR(kpis.expenses, true)} formatter={(v) => fmtEUR(v)} />
                </div>
                <div className="stack mt-2" style={{ gap: 7 }}>
                  {cats.slice(0, 5).map((c) => (
                    <div key={c.label} className="row" style={{ justifyContent: 'space-between', fontSize: '.77rem' }}>
                      <span className="row" style={{ gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: 'inline-block' }} />{c.label}</span>
                      <span className="mono" style={{ fontWeight: 700 }}>{fmtEUR(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-3" style={{ gap: 16 }}>
              <SectionCard title="Factures é relancer" subtitle="??chéances dépassées" action={<Badge tone="red">{overdue.length}</Badge>}>
                <div className="stack" style={{ gap: 9, maxHeight: 220, overflowY: 'auto' }}>
                  {overdue.slice(0, 5).map((i) => (
                    <div key={i.id} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="small" style={{ fontWeight: 650 }}>{i.number}</div>
                        <div className="muted truncate" style={{ fontSize: '.7rem' }}>{i.clientName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono small" style={{ fontWeight: 700 }}>{fmtEUR(i.totals.total)}</div>
                        <button className="btn btn-soft btn-sm" style={{ height: 22, padding: '0 7px', fontSize: '.66rem' }} onClick={() => markPaid(i)}>
                          <Send size={10} /> Relancer
                        </button>
                      </div>
                    </div>
                  ))}
                  {!overdue.length && <p className="small muted">Aucune facture en retard ….</p>}
                </div>
              </SectionCard>

              <SectionCard title="Entrées d'argent" subtitle="Encaissements du mois">
                <div style={{ fontSize: '1.5rem', fontWeight: 820, letterSpacing: '-.03em', color: 'var(--green-500)' }}>
                  {fmtEUR(state.invoices.filter((i) => i.status === 'Payée').reduce((a, i) => a + i.totals.total, 0), true)}
                </div>
                <div className="row mt-1" style={{ gap: 6 }}>
                  <Badge tone="green"><ArrowUpRight size={10} /> {state.invoices.filter((i) => i.status === 'Payée').length} factures payées</Badge>
                </div>
                <div className="stack mt-2" style={{ gap: 8 }}>
                  {['Virement bancaire', 'Carte bancaire', 'Prélévement SEPA'].map((m) => {
                    const val = state.invoices.filter((i) => i.status === 'Payée' && i.paymentMethod === m).reduce((a, i) => a + i.totals.total, 0);
                    return (
                      <div key={m} className="row" style={{ justifyContent: 'space-between', fontSize: '.78rem' }}>
                        <span className="muted row" style={{ gap: 6 }}><CreditCard size={11} /> {m}</span>
                        <span className="mono" style={{ fontWeight: 700 }}>{fmtEUR(val, true)}</span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard title="Sorties d'argent" subtitle="Top fournisseurs">
                <RankBars
                  items={Object.entries(state.expenses.reduce((acc, e) => {
                    acc[e.supplier] = (acc[e.supplier] || 0) + e.amount;
                    return acc;
                  }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5)}
                  formatter={(v) => fmtEUR(v, true)}
                  color="#EF4444"
                />
              </SectionCard>
            </div>
          </div>
        )}

        {/* ---------------- FACTURES / DEVIS ---------------- */}
        {(tab === 'invoices' || tab === 'quotes') && (
          <>
            <div className="filters">
              <SearchInput value={q} onChange={setQ} placeholder="Numéro, client, statutéé" />
              <select className="select" style={{ flex: '0 1 170px' }} value={docStatus} onChange={(e) => setDocStatus(e.target.value)}>
                <option value="">Tous les statuts</option>
                {(tab === 'invoices' ? ['En attente', 'Payée', 'Annulée'] : ['Brouillon', 'Envoyé', 'Accepté', 'Refusé']).map((s) => <option key={s}>{s}</option>)}
              </select>
              <div style={{ marginLeft: 'auto' }} className="row">
                <button className="btn btn-primary btn-sm" onClick={() => { setDocForm({ ...docForm, kind: tab === 'invoices' ? 'facture' : 'devis' }); setDocModal(true); }}>
                  <Plus size={14} /> {tab === 'invoices' ? 'Nouvelle facture' : 'Nouveau devis'}
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th>Client</th>
                    <th>??mission</th>
                    <th>??chéance</th>
                    <th>HT</th>
                    <th>TVA</th>
                    <th>TTC</th>
                    <th>Statut</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {docsPaged.slice.map((d) => (
                    <tr key={d.id}>
                      <td className="td-strong mono" style={{ fontSize: '.79rem' }}>{d.number}</td>
                      <td className="truncate" style={{ maxWidth: 160 }}>{d.clientName}</td>
                      <td className="small">{fmtDate(d.date)}</td>
                      <td className="small" style={{ color: new Date(d.dueDate) < Date.now() && d.status !== 'Payée' ? 'var(--red-500)' : undefined }}>
                        {fmtDate(d.dueDate)}
                      </td>
                      <td className="mono small">{fmtEUR(d.totals.subtotal)}</td>
                      <td className="mono small">{fmtEUR(d.totals.vat)}</td>
                      <td className="mono td-strong">{fmtEUR(d.totals.total)}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td>
                        <div className="td-actions">
                          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setDetail(d)} title="Détails"><Eye size={15} /></button>
                          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => exportPdf(d)} title="Télécharger PDF"><Download size={15} /></button>
                          <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red-500)' }} onClick={() => setConfirm({ collection: d.kind === 'facture' ? 'invoices' : 'quotes', id: d.id })} title="Supprimer"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!docsPaged.slice.length && <Empty title="Aucun document" icon={<FileText size={22} />} />}
            </div>
            <Pagination page={docsPaged.page} pages={docsPaged.pages} onChange={docsPaged.setPage} total={docs.length} shown={docsPaged.slice.length} />
          </>
        )}

        {/* ---------------- D??PENSES ---------------- */}
        {tab === 'expenses' && (
          <>
            <div className="filters">
              <SearchInput value={q} onChange={setQ} placeholder="Catégorie, fournisseur, référenceéé" />
              <div style={{ marginLeft: 'auto' }} className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => { exportCSV(expensesFiltered, [{ label: 'Catégorie', key: 'category' }, { label: 'Libellé', key: 'label' }, { label: 'Fournisseur', key: 'supplier' }, { label: 'Montant', key: 'amount' }, { label: 'Date', key: 'date' }], `depenses-${todayISO()}.csv`); toast('CSV des dépenses exporté'); }}>
                  <Download size={13} /> CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setExpModal(true)}><Plus size={14} /> Saisir une dépense</button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Catégorie</th>
                    <th>Fournisseur</th>
                    <th>Date</th>
                    <th>Moyen</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {expPaged.slice.map((e) => (
                    <tr key={e.id}>
                      <td className="mono small td-strong">{e.id}</td>
                      <td><Badge tone="navy">{e.category}</Badge></td>
                      <td className="truncate" style={{ maxWidth: 150 }}>{e.supplier}<div className="muted" style={{ fontSize: '.69rem' }}>{e.label}</div></td>
                      <td className="small">{fmtDate(e.date)}</td>
                      <td className="small muted">{e.method}</td>
                      <td className="mono td-strong">{fmtEUR(e.amount)}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td>
                        <div className="td-actions">
                          <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red-500)' }} onClick={() => setConfirm({ collection: 'expenses', id: e.id })} title="Supprimer"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!expPaged.slice.length && <Empty title="Aucune dépense" icon={<Receipt size={22} />} />}
            </div>
            <Pagination page={expPaged.page} pages={expPaged.pages} onChange={expPaged.setPage} total={expensesFiltered.length} shown={expPaged.slice.length} />
          </>
        )}

        {/* ---------------- RAPPORTS ---------------- */}
        {tab === 'reports' && (
          <div className="card-pad stack" style={{ gap: 20 }}>
            <div className="grid grid-3">
              <SectionCard title="Rapport financier PDF" subtitle="Synthése compléte pr??te é envoyer">
                <p className="small muted" style={{ lineHeight: 1.6 }}>
                  Génére un document professionnel : synthése, évolution mensuelle, dépenses par catégorie et factures en attente.
                </p>
                <button className="btn btn-primary btn-block mt-2" onClick={exportReport} disabled={busy}>
                  <FileText size={14} /> Générer le rapport PDF
                </button>
              </SectionCard>
              <SectionCard title="Export comptable Excel" subtitle="3 feuilles é factures, dépenses, mensuel">
                <p className="small muted" style={{ lineHeight: 1.6 }}>
                  Classeur compatible Excel / LibreOffice / Sage, pr??t pour votre expert-comptable.
                </p>
                <button className="btn btn-dark btn-block mt-2" onClick={exportExcelFinance}>
                  <FileSpreadsheet size={14} /> Télécharger le classeur
                </button>
              </SectionCard>
              <SectionCard title="Prévision IA des dépenses" subtitle="Horizon 3 mois">
                <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 820, letterSpacing: '-.03em' }}>{fmtEUR(forecast.predictions[0]?.value || 0, true)}</div>
                  <Badge tone={forecast.trendPct >= 0 ? 'red' : 'green'}>
                    {forecast.trendPct >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {Math.abs(forecast.trendPct).toFixed(1)} %
                  </Badge>
                </div>
                <div className="muted small mt-1">Dépense prévue le mois prochain</div>
                <div className="stack mt-2" style={{ gap: 6 }}>
                  {forecast.predictions.map((p) => (
                    <div key={p.label} className="row" style={{ justifyContent: 'space-between', fontSize: '.78rem' }}>
                      <span className="muted">{p.label}</span>
                      <span className="mono" style={{ fontWeight: 700 }}>{fmtEUR(p.value)}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Prévision détaillée" subtitle="Historique réel + projection IA (régression linéaire)" action={<Badge tone="orange"><Sparkles size={11} /> IA</Badge>}>
              <ForecastChart
                actual={forecast.history.map((h) => h.expenses)}
                predicted={[forecast.last, ...forecast.predictions.map((p) => p.value)]}
                labels={[...forecast.history.map((h) => h.label), ...forecast.predictions.map((p) => p.label)]}
                height={230}
              />
              <div className="row mt-2" style={{ gap: 16, flexWrap: 'wrap' }}>
                <Badge tone="navy">Ré = {forecast.r2.toFixed(2)}</Badge>
                <Badge tone="navy">Tendance {forecast.slope > 0 ? 'haussiére' : 'baissiére'}</Badge>
                <Badge tone="navy">Moyenne {fmtEUR(forecast.avg)}</Badge>
                <Badge tone="orange">Confiance {(Math.max(0.62, forecast.r2) * 100).toFixed(0)} %</Badge>
              </div>
            </SectionCard>

            <SectionCard title="Relevé mensuel détaillé" noPad>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Mois</th><th>CA</th><th>Dépenses</th><th>Bénéfice</th><th>Marge</th><th>Livraisons</th><th>Panier moyen</th></tr>
                  </thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m.key}>
                        <td className="td-strong">{m.key}</td>
                        <td className="mono">{fmtEUR(m.revenue)}</td>
                        <td className="mono">{fmtEUR(m.expenses)}</td>
                        <td className="mono" style={{ fontWeight: 700, color: m.profit >= 0 ? 'var(--green-500)' : 'var(--red-500)' }}>{fmtEUR(m.profit)}</td>
                        <td><Badge tone={m.revenue ? ((m.profit / m.revenue) * 100 > 15 ? 'green' : 'amber') : 'navy'}>{m.revenue ? ((m.profit / m.revenue) * 100).toFixed(1) : 0} %</Badge></td>
                        <td className="mono">{m.deliveries}</td>
                        <td className="mono">{fmtEUR(m.avgTicket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </section>

      {/* ------- Modal nouveau document ------- */}
      <Modal
        open={docModal}
        onClose={() => setDocModal(false)}
        title={docForm.kind === 'facture' ? 'Créer une facture' : 'Créer un devis'}
        subtitle="Le PDF professionnel est généré automatiquement."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDocModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={createDoc} disabled={!docForm.clientId}>
              <FileText size={14} /> Créer & télécharger le PDF
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field">
            <label>Type de document</label>
            <select className="select" value={docForm.kind} onChange={(e) => setDocForm({ ...docForm, kind: e.target.value })}>
              <option value="facture">Facture</option>
              <option value="devis">Devis</option>
            </select>
          </div>
          <div className="field">
            <label>Client</label>
            <select className="select" value={docForm.clientId} onChange={(e) => setDocForm({ ...docForm, clientId: e.target.value })}>
              <option value="">é?" Sélectionner é?"</option>
              {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field full">
            <label>Livraison associée (optionnel)</label>
            <select className="select" value={docForm.deliveryId} onChange={(e) => setDocForm({ ...docForm, deliveryId: e.target.value })}>
              <option value="">é?" Aucune (prestation libre) é?"</option>
              {state.deliveries.slice(0, 40).map((d) => (
                <option key={d.id} value={d.id}>{d.id} é {d.clientName} é {d.pickupCity} é?' {d.dropoffCity} é {fmtEUR(d.price)}</option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label>Mode de réglement</label>
            <select className="select" value={docForm.paymentMethod} onChange={(e) => setDocForm({ ...docForm, paymentMethod: e.target.value })}>
              {['Virement bancaire', 'Carte bancaire', 'Prélévement SEPA', 'Chéque'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="demo-hint" style={{ marginTop: 14 }}>
          <strong>Astuce :</strong> la TVA é 20 % est appliquée automatiquement, avec mention légale é TVA acquittée sur les prestations de transport é.
        </div>
      </Modal>

      {/* ------- Modal dépense ------- */}
      <Modal
        open={expModal}
        onClose={() => setExpModal(false)}
        title="Saisir une dépense"
        subtitle="Carburant, maintenance, péages, salaireséé"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setExpModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={saveExpense}>Enregistrer la dépense</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field">
            <label>Catégorie</label>
            <select className="select" value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}>
              {EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>Montant (é,é)</label><input className="input" type="number" min="1" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} /></div>
          <div className="field"><label>Libellé</label><input className="input" value={expForm.label} onChange={(e) => setExpForm({ ...expForm, label: e.target.value })} /></div>
          <div className="field"><label>Fournisseur</label><input className="input" value={expForm.supplier} onChange={(e) => setExpForm({ ...expForm, supplier: e.target.value })} /></div>
          <div className="field"><label>Date</label><input className="input" type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} /></div>
          <div className="field">
            <label>Moyen de paiement</label>
            <select className="select" value={expForm.method} onChange={(e) => setExpForm({ ...expForm, method: e.target.value })}>
              {['Carte entreprise', 'Virement', 'Prélévement', 'Espéces'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field full"><label>Référence facture</label><input className="input" value={expForm.invoiceRef} onChange={(e) => setExpForm({ ...expForm, invoiceRef: e.target.value })} placeholder="F12345" /></div>
        </div>
      </Modal>

      {/* ------- Modal détail document ------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail ? `${detail.kind === 'facture' ? 'Facture' : 'Devis'} ${detail.number}` : ''}
        subtitle={detail ? `${detail.clientName} é émise le ${fmtDate(detail.date)} é échéance ${fmtDate(detail.dueDate)}` : ''}
        footer={
          detail && (
            <>
              {detail.kind === 'facture' && detail.status !== 'Payée' && (
                <button className="btn btn-ghost" onClick={() => markPaid(detail)}><CheckCircle2 size={14} /> Marquer payée</button>
              )}
              <button className="btn btn-primary" onClick={() => exportPdf(detail)}><Download size={14} /> Télécharger le PDF</button>
            </>
          )
        }
      >
        {detail && (
          <div className="stack" style={{ gap: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="muted" style={{ fontSize: '.72rem' }}>Facturé é</div>
                <div style={{ fontWeight: 750 }}>{detail.clientName}</div>
                <div className="muted small">{state.clients.find((c) => c.id === detail.clientId)?.address}</div>
                <div className="muted small">{state.clients.find((c) => c.id === detail.clientId)?.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={detail.status} />
                <div className="muted small mt-1">{detail.paymentMethod}</div>
              </div>
            </div>

            <table className="tbl">
              <thead><tr><th>Description</th><th style={{ textAlign: 'center' }}>Qté</th><th style={{ textAlign: 'right' }}>P.U. HT</th><th style={{ textAlign: 'right' }}>Total HT</th></tr></thead>
              <tbody>
                {detail.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.label}</td>
                    <td style={{ textAlign: 'center' }} className="mono">{it.qty}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmtEUR(it.unitPrice)}</td>
                    <td style={{ textAlign: 'right' }} className="mono td-strong">{fmtEUR(it.qty * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ alignSelf: 'flex-end', width: 260 }}>
              {[
                ['Sous-total HT', fmtEUR(detail.totals.subtotal)],
                [`TVA (${detail.totals.vatRate} %)`, fmtEUR(detail.totals.vat)],
              ].map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: '.82rem', padding: '4px 0' }}>
                  <span className="muted">{k}</span><span className="mono">{v}</span>
                </div>
              ))}
              <div className="row" style={{ justifyContent: 'space-between', padding: '9px 12px', background: 'var(--navy-900)', color: '#fff', borderRadius: 10, marginTop: 6 }}>
                <strong style={{ fontSize: '.82rem' }}>TOTAL TTC</strong>
                <strong className="mono">{fmtEUR(detail.totals.total)}</strong>
              </div>
            </div>

            <p className="muted" style={{ fontSize: '.72rem', lineHeight: 1.6 }}>{detail.notes}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { remove(confirm.collection, confirm.id, user?.name); toast('Document supprimé'); }}
        title="Supprimer ce document ?"
        message="Le document sera définitivement supprimé."
      />
    </>
  );
}

