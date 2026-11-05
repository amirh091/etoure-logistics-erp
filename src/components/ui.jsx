import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Inbox, Search, Check, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { statusMeta } from '../lib/helpers';

/* ---------------- Status / Badge ---------------- */
export function StatusBadge({ status, live = false }) {
  const meta = statusMeta(status);
  const tone = {
    'En attente': 'amber', Confirmée: 'blue', 'En cours': 'orange', Livrée: 'green', Annulée: 'red',
    Disponible: 'green', 'En mission': 'blue', Repos: 'amber', Congé: 'navy', Maintenance: 'amber', 'Hors service': 'red',
    Payée: 'green', 'En retard': 'red', Accepté: 'green', Envoyé: 'blue', Brouillon: 'navy', Actif: 'green', Inactif: 'navy',
    Urgente: 'red', Haute: 'orange', Normale: 'navy',
  }[status] || meta.tone;
  return (
    <span className={`badge ${tone} ${live ? 'live' : ''}`}>
      <span className="bdot" />
      {status}
    </span>
  );
}

export function Badge({ children, tone = 'navy', className = '' }) {
  return <span className={`badge ${tone} ${className}`}>{children}</span>;
}

/* ---------------- KPI ---------------- */
export function Kpi({ icon, label, value, foot, trend, trendLabel, tint, color, spark }) {
  return (
    <div className="card kpi card-hover" style={{ '--kpi-tint': tint, '--kpi-color': color }}>
      <div className="kpi-top">
        <div className="kpi-icon">{icon}</div>
        <div>
          <div className="kpi-label">{label}</div>
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {trend != null && (
          <span className={`trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        <span>{foot || trendLabel}</span>
      </div>
      {spark && <div className="kpi-spark">{spark}</div>}
    </div>
  );
}

/* ---------------- Sparkline ---------------- */
export function Sparkline({ data = [], color = '#FF7A1A', w = 76, h = 30, fill = true }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * w, h - ((v - min) / range) * (h - 4) - 2]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const gid = `sg${color.replace(/[^a-z0-9]/gi, '')}${data.length}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Progress ---------------- */
export function Bar({ value, max = 100, tone = '' }) {
  return <div className={`progress ${tone}`}><i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, subtitle, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Fermer"><X size={17} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Supprimer', danger = true }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={message}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <div className="row" style={{ gap: 12 }}>
        <div className={`icon-tile ${danger ? 'red' : 'amber'}`}><AlertTriangle size={18} /></div>
        <p className="small" style={{ color: 'var(--text-2)' }}>Cette action est irréversible. Les données associées resteront visibles dans le journal des activités.</p>
      </div>
    </Modal>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.key} className={`tab ${value === t.key ? 'on' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}{t.count != null && <span style={{ opacity: .6, marginLeft: 6 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Switch ---------------- */
export function Switch({ on, onChange, label }) {
  return (
    <button
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
    />
  );
}

/* ---------------- Pagination ---------------- */
export function Pagination({ page, pages, onChange, total, shown }) {
  if (pages <= 1) {
    return (
      <div className="pager">
        <span>{total} résultat{total > 1 ? 's' : ''}</span>
      </div>
    );
  }
  const nums = [];
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  for (let i = start; i < start + 3 && i <= pages; i++) nums.push(i);
  return (
    <div className="pager">
      <span>{shown} sur {total} résultats</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <button className="pg" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Précédent"><ChevronLeft size={15} /></button>
        {nums.map((n) => (
          <button key={n} className={`pg ${n === page ? 'on' : ''}`} onClick={() => onChange(n)}>{n}</button>
        ))}
        <button className="pg" disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Suivant"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

/* ---------------- Empty ---------------- */
export function Empty({ title = 'Aucun résultat', message = 'Ajustez vos filtres ou créez un nouvel élément.', icon = <Inbox size={22} /> }) {
  return (
    <div className="empty-state">
      <div className="es-icon">{icon}</div>
      <h3 style={{ marginBottom: 5 }}>{title}</h3>
      <p className="small">{message}</p>
    </div>
  );
}

/* ---------------- Search input ---------------- */
export function SearchInput({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <label className="search-inline">
      <Search size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button onClick={() => onChange('')} aria-label="Effacer" style={{ color: 'var(--text-3)', display: 'grid' }}><X size={14} /></button>}
    </label>
  );
}

/* ---------------- usePagination hook ---------------- */
export function usePaged(rows, perPage = 8) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  const slice = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page, perPage]);
  return { page, setPage, pages, slice, total: rows.length };
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name = '', color, size = 32, className = '' }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, flex: `0 0 ${size}px`, fontSize: size * 0.36, background: color ? `linear-gradient(140deg, ${color}, ${color}cc)` : undefined }}
    >
      {ini}
    </span>
  );
}

/* ---------------- Copy / demo helpers ---------------- */
export function CopyBadge({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="badge navy"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      title="Copier"
    >
      {copied ? <Check size={11} /> : null} {text}
    </button>
  );
}

export function SectionCard({ title, subtitle, action, children, noPad = false, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          {action && <div className="card-head-actions">{action}</div>}
        </div>
      )}
      {noPad ? children : <div className="card-pad">{children}</div>}
    </section>
  );
}
