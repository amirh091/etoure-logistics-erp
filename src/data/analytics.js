import { addDays, monthKey, MONTH_LABELS, linearRegression, todayISO } from '../lib/helpers';

/* ---------- série mensuelle revenus / dépenses / bénéfice ---------- */
export function monthlySeries(deliveries, expenses, monthCount = 7) {
  const now = new Date();
  const buckets = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: d.toISOString().slice(0, 7), label: MONTH_LABELS[d.getMonth()], date: d });
  }

  const rows = buckets.map((b) => {
    const dl = deliveries.filter((d) => monthKey(d.createdAt) === b.key && d.status !== 'Annulée');
    const ex = expenses.filter((e) => monthKey(e.date) === b.key);
    const revenue = dl.reduce((a, d) => a + d.price, 0);
    const spent = ex.reduce((a, e) => a + e.amount, 0);
    return {
      key: b.key,
      label: b.label,
      revenue,
      expenses: spent,
      profit: revenue - spent,
      deliveries: dl.length,
      avgTicket: dl.length ? Math.round(revenue / dl.length) : 0,
    };
  });
  return rows;
}

/* ---------- prévision des dépenses (régression linéaire) ---------- */
export function forecastExpenses(expenses, months = 3) {
  const hist = monthlySeries([], expenses, 8);
  const points = hist.map((h, i) => ({ x: i, y: h.expenses }));
  const reg = linearRegression(points);
  const preds = Array.from({ length: months }, (_, i) => {
    const x = hist.length + i;
    const val = Math.max(0, reg.predict(x));
    return { label: `M+${i + 1}`, value: Math.round(val) };
  });
  const avg = hist.reduce((a, h) => a + h.expenses, 0) / (hist.length || 1);
  const last = hist[hist.length - 1]?.expenses || 0;
  const trendPct = avg ? ((preds[0].value - avg) / avg) * 100 : 0;
  return { history: hist, predictions: preds, slope: reg.slope, r2: reg.r2, avg, last, trendPct };
}

/* ---------- répartition des dépenses par catégorie ---------- */
export function expensesByCategory(expenses) {
  const map = {};
  expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
  const colors = ['#FF7A1A', '#1E3D63', '#12B76A', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9', '#64748B', '#EC4899'];
  return Object.entries(map)
    .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }))
    .sort((a, b) => b.value - a.value);
}

/* ---------- performance chauffeurs ---------- */
export function driverPerformance(deliveries, drivers) {
  return drivers.map((dr) => {
    const mine = deliveries.filter((d) => d.driverId === dr.id);
    const done = mine.filter((d) => d.status === 'Livrée');
    const revenue = mine.filter((d) => d.status !== 'Annulée').reduce((a, d) => a + d.price, 0);
    return {
      ...dr,
      assigned: mine.length,
      completed: done.length,
      revenue,
      avgRating: dr.rating,
      onTime: dr.onTimeRate,
      km: mine.reduce((a, d) => a + d.distance, 0),
    };
  }).sort((a, b) => b.completed - a.completed);
}

/* ---------- top clients ---------- */
export function topClients(deliveries, clients, limit = 6) {
  return clients.map((c) => {
    const mine = deliveries.filter((d) => d.clientId === c.id && d.status !== 'Annulée');
    return {
      ...c,
      orders: mine.length,
      revenue: mine.reduce((a, d) => a + d.price, 0),
      lastOrder: mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt,
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/* ---------- heatmap activité ---------- */
export function activityHeatmap(deliveries) {
  const rows = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const cols = ['6h', '9h', '12h', '15h', '18h', '21h'];
  const data = [];
  deliveries.forEach((d) => {
    const dt = new Date(d.createdAt);
    const dow = (dt.getDay() + 6) % 7;
    const hour = dt.getHours();
    const ci = hour < 8 ? 0 : hour < 11 ? 1 : hour < 14 ? 2 : hour < 17 ? 3 : hour < 20 ? 4 : 5;
    const found = data.find((x) => x.r === dow && x.c === ci);
    if (found) found.v += 1;
    else data.push({ r: dow, c: ci, v: 1 });
  });
  return { rows, cols, data };
}

/* ---------- alertes documents ---------- */
export function complianceAlerts(vehicles, drivers) {
  const alerts = [];
  const push = (kind, label, entity, date, ref) => {
    const days = Math.ceil((new Date(date) - Date.now()) / 86400000);
    alerts.push({ kind, label, entity, date, days, ref });
  };
  vehicles.forEach((v) => {
    push('Assurance', `Assurance ${v.plate}`, v.model, v.insuranceExpiry, v.id);
    push('Visite technique', `Visite technique ${v.plate}`, v.model, v.technicalVisitExpiry, v.id);
  });
  drivers.forEach((d) => {
    push('Permis', `Permis ${d.name}`, d.licenseType, d.licenseExpiry, d.id);
    push('Visite médicale', `Visite médicale ${d.name}`, d.city, d.medicalExpiry, d.id);
  });
  return alerts.sort((a, b) => a.days - b.days);
}

/* ---------- KPI globaux ---------- */
export function computeKPIs(state) {
  const { deliveries, expenses, invoices } = state;
  const active = deliveries.filter((d) => !['Annulée'].includes(d.status));
  const revenue = active.reduce((a, d) => a + d.price, 0);
  const spent = expenses.reduce((a, e) => a + e.amount, 0);
  const delivered = deliveries.filter((d) => d.status === 'Livrée').length;
  const pendingInvoices = invoices.filter((i) => i.status === 'En attente');
  return {
    total: deliveries.length,
    inProgress: deliveries.filter((d) => d.status === 'En cours').length,
    delivered,
    waiting: deliveries.filter((d) => d.status === 'En attente').length,
    confirmed: deliveries.filter((d) => d.status === 'Confirmée').length,
    cancelled: deliveries.filter((d) => d.status === 'Annulée').length,
    revenue,
    expenses: spent,
    profit: revenue - spent,
    margin: revenue ? ((revenue - spent) / revenue) * 100 : 0,
    unpaid: pendingInvoices.reduce((a, i) => a + i.totals.total, 0),
    unpaidCount: pendingInvoices.length,
    avgTicket: active.length ? Math.round(revenue / active.length) : 0,
    onTimeRate: 96.4,
    co2: active.reduce((a, d) => a + Math.round(d.distance * 0.62), 0),
  };
}

export const nextDays = (n = 7) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { label: MONTH_LABELS[d.getMonth()] + ' ' + d.getDate(), iso: d.toISOString().slice(0, 10), date: d };
  });
