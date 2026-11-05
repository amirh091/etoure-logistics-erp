export const CURRENCY = 'EUR';

export const fmtEUR = (n, compact = false) => {
  const v = Number(n) || 0;
  if (compact) {
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' M€';
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + ' k€';
    return Math.round(v) + ' €';
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
};

export const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtDateShort = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—');
export const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const timeAgo = (d) => {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return fmtDate(d);
};
export const daysUntil = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

/* ---------------- IA : estimation automatique des coûts ---------------- */
export const VEHICLE_RATES = {
  Camion: { base: 180, perKm: 1.35, perKg: 0.045, cap: 12000 },
  Fourgonnette: { base: 75, perKm: 0.72, perKg: 0.03, cap: 1400 },
  Moto: { base: 18, perKm: 0.29, perKg: 0.012, cap: 25 },
};

export const estimateCost = ({ distance = 0, weight = 0, vehicleType = 'Fourgonnette', urgency = 'standard', fragile = false, night = false, returnTrip = false }) => {
  const rate = VEHICLE_RATES[vehicleType] || VEHICLE_RATES.Fourgonnette;
  let base = rate.base + distance * rate.perKm + weight * rate.perKg;
  const factors = { standard: 1, express: 1.28, urgent: 1.55 };
  base *= factors[urgency] || 1;
  if (fragile) base *= 1.12;
  if (night) base *= 1.18;
  if (returnTrip) base *= 1.45;
  const occupancy = Math.min(weight / rate.cap, 1);
  const fillDiscount = 1 - occupancy * 0.08;
  const margin = 0.24;
  const cost = Math.round(base * fillDiscount);
  const price = Math.round(cost * (1 + margin));
  return {
    cost,
    price,
    margin: price - cost,
    marginPct: margin * 100,
    eta: Math.max(1, Math.round(distance / (vehicleType === 'Moto' ? 42 : vehicleType === 'Camion' ? 62 : 75) + (urgency === 'urgent' ? 0.2 : 0.6))),
    confidence: 0.9 + Math.min(0.06, distance / 4000),
    breakdown: [
      { label: 'Prise en charge', value: rate.base },
      { label: `Distance ${distance} km`, value: Math.round(distance * rate.perKm) },
      { label: `Charge ${weight} kg`, value: Math.round(weight * rate.perKg) },
      { label: 'Coefficient urgence / options', value: Math.round(base * fillDiscount - rate.base - distance * rate.perKm - weight * rate.perKg) },
    ],
  };
};

/* ---------------- Analyse prédictive ---------------- */
export const linearRegression = (points) => {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0, predict: () => points[0]?.y || 0, r2: 0 };
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssTot = points.reduce((a, p) => a + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((a, p) => a + (p.y - (slope * p.x + intercept)) ** 2, 0);
  return { slope, intercept, predict: (x) => slope * x + intercept, r2: ssTot ? 1 - ssRes / ssTot : 0 };
};

/* ---------------- export CSV / Excel ---------------- */
export const downloadBlob = (content, filename, type = 'text/csv;charset=utf-8;') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const exportCSV = (rows, columns, filename) => {
  const sep = ';';
  const head = columns.map((c) => `"${c.label}"`).join(sep);
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = typeof c.value === 'function' ? c.value(r) : r[c.key];
      return `"${String(v ?? '').replace(/"/g, '""')}"`;
    }).join(sep)
  ).join('\n');
  downloadBlob('\uFEFF' + head + '\n' + body, filename, 'text/csv;charset=utf-8;');
};

export const exportXLSX = async (sheets, filename) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows, columns }) => {
    const data = [
      columns.map((c) => c.label),
      ...rows.map((r) => columns.map((c) => (typeof c.value === 'function' ? c.value(r) : r[c.key]))),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = columns.map((c) => ({ wch: Math.max(12, c.label.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
};

/* ---------------- PDF ---------------- */
const NAVY = [11, 27, 51];
const ORANGE = [255, 122, 26];

/* les polices PDF standard (WinAnsi) ne gèrent pas certains glyphes */
const pdfSafe = (v) =>
  String(v ?? '')
    .replace(/→/g, ' - ')
    .replace(/[✅✔]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[\u2028\u2029]/g, ' ');

export const generatePDF = async (doc, { company, client, type = 'facture' }) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const title = type === 'facture' ? 'FACTURE' : 'DEVIS';

  // Header band
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, W, 42, 'F');
  pdf.setFillColor(...ORANGE);
  pdf.rect(0, 42, W, 2.4, 'F');

  // Logo mark
  pdf.setFillColor(...ORANGE);
  pdf.roundedRect(14, 12, 16, 16, 4, 4, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('ET', 22, 22.6, { align: 'center' });

  pdf.setFontSize(15);
  pdf.text(company.name, 34, 19);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.6);
  pdf.setTextColor(185, 199, 219);
  pdf.text(pdfSafe(company.address), 34, 24.5);
  pdf.text(pdfSafe(`${company.email}  -  ${company.phone}  -  ${company.vat}`), 34, 28.8);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, W - 14, 21, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.4);
  pdf.setTextColor(255, 200, 160);
  pdf.text(doc.number, W - 14, 27.5, { align: 'right' });
  pdf.setTextColor(185, 199, 219);
  pdf.text(pdfSafe(`Émise le ${fmtDate(doc.date)}`), W - 14, 32.5, { align: 'right' });
  pdf.text(pdfSafe(`Échéance ${fmtDate(doc.dueDate)}`), W - 14, 36.8, { align: 'right' });

  // Parties
  let y = 54;
  pdf.setTextColor(120, 134, 158);
  pdf.setFontSize(7.4);
  pdf.text('FACTURÉ À', 14, y);
  pdf.text('DÉTAILS DE LA PRESTATION', W / 2 + 4, y);
  y += 5;
  pdf.setTextColor(...NAVY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(client?.name || 'Client comptoir', 14, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.2);
  pdf.setTextColor(74, 91, 117);
  const clientLines = [client?.contact, client?.address, client?.city, client?.email, client?.phone].filter(Boolean);
  clientLines.forEach((l, i) => pdf.text(pdfSafe(l), 14, y + 5 + i * 4.2));

  const info = [
    ['Statut', doc.status],
    ['Mode de règlement', doc.paymentMethod || 'Virement bancaire'],
    ['Livraisons liées', String(doc.deliveries?.length || 0)],
    ['Devise', 'EUR'],
  ];
  info.forEach(([k, v], i) => {
    pdf.setTextColor(120, 134, 158);
    pdf.text(k, W / 2 + 4, y + 5 + i * 4.6);
    pdf.setTextColor(...NAVY);
    pdf.text(pdfSafe(v), W - 14, y + 5 + i * 4.6, { align: 'right' });
  });

  // Table
  autoTable(pdf, {
    startY: y + (Math.max(clientLines.length, 4) * 4.6) + 16,
    head: [['Description', 'Qté', 'P.U. HT', 'Total HT']],
    body: (doc.items || []).map((it) => [pdfSafe(it.label), String(it.qty), pdfSafe(fmtEUR(it.unitPrice)), pdfSafe(fmtEUR(it.qty * it.unitPrice))]),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', cellPadding: 3.5 },
    bodyStyles: { fontSize: 8.4, textColor: [30, 45, 70], cellPadding: 3.5 },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: { 1: { halign: 'center', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 32 }, 3: { halign: 'right', cellWidth: 34 } },
    margin: { left: 14, right: 14 },
  });

  const endY = pdf.lastAutoTable.finalY + 8;
  const totals = doc.totals;
  const rows = [
    ['Sous-total HT', fmtEUR(totals.subtotal)],
    [`TVA (${totals.vatRate} %)`, fmtEUR(totals.vat)],
  ];
  pdf.setFontSize(8.6);
  rows.forEach(([k, v], i) => {
    k = pdfSafe(k);
    pdf.setTextColor(120, 134, 158);
    pdf.text(k, W - 74, endY + i * 6);
    pdf.setTextColor(...NAVY);
    pdf.text(v, W - 14, endY + i * 6, { align: 'right' });
  });
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(W - 80, endY + 14, 66, 13, 2.5, 2.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('TOTAL TTC', W - 76, endY + 22.5);
  pdf.setFontSize(11);
  pdf.text(fmtEUR(totals.total), W - 17, endY + 22.5, { align: 'right' });

  if (doc.notes) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 134, 158);
    pdf.text(pdf.splitTextToSize(pdfSafe(doc.notes), W - 100), 14, endY + 8);
  }

  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(227, 233, 242);
  pdf.line(14, pageH - 22, W - 14, pageH - 22);
  pdf.setFontSize(7);
  pdf.setTextColor(140, 154, 176);
  pdf.text(pdfSafe(`${company.name} — ${company.legal} — ${company.vat}`), 14, pageH - 16);
  pdf.text(`${company.bank} · IBAN ${company.iban}`, 14, pageH - 12);
  pdf.text(pdfSafe(`${title} ${doc.number} · Page 1/1`), W - 14, pageH - 16, { align: 'right' });
  pdf.text('Document généré par E-TOURÉ LOGISTICS ERP', W - 14, pageH - 12, { align: 'right' });

  pdf.save(`${title.toLowerCase()}-${doc.number}.pdf`);
  return true;
};

export const generateReportPDF = async ({ title, subtitle, sections, company }) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, W, 34, 'F');
  pdf.setFillColor(...ORANGE);
  pdf.rect(0, 34, W, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(pdfSafe(title), 14, 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.4);
  pdf.setTextColor(185, 199, 219);
  pdf.text(pdfSafe(subtitle), 14, 23);
  pdf.text(fmtDate(new Date()), W - 14, 23, { align: 'right' });

  let y = 46;
  sections.forEach((sec) => {
    pdf.setTextColor(...NAVY);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(pdfSafe(sec.heading), 14, y);
    y += 3;
    if (sec.rows) {
      autoTable(pdf, {
        startY: y + 2,
        head: [sec.columns.map((c) => pdfSafe(c.label))],
        body: sec.rows.map((r) => sec.columns.map((c) => pdfSafe(typeof c.value === 'function' ? c.value(r) : r[c.key]))),
        theme: 'striped',
        headStyles: { fillColor: NAVY, fontSize: 7.6, textColor: 255 },
        bodyStyles: { fontSize: 7.8, textColor: [40, 55, 80] },
        margin: { left: 14, right: 14 },
      });
      y = pdf.lastAutoTable.finalY + 12;
    }
  });

  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(7);
  pdf.setTextColor(140, 154, 176);
  pdf.text(pdfSafe(`${company.name} · Rapport confidentiel · ${company.vat}`), 14, pageH - 12);
  pdf.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${todayISO()}.pdf`);
  return true;
};

export const STATUS_META = {
  'En attente': { tone: 'amber', color: 'var(--amber-500)' },
  Confirmée: { tone: 'blue', color: 'var(--blue-500)' },
  'En cours': { tone: 'orange', color: 'var(--orange-500)' },
  Livrée: { tone: 'green', color: 'var(--green-500)' },
  Annulée: { tone: 'red', color: 'var(--red-500)' },
};

export const statusMeta = (s) => STATUS_META[s] || { tone: 'navy', color: 'var(--text-3)' };

export const monthKey = (d) => new Date(d).toISOString().slice(0, 7);
export const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
