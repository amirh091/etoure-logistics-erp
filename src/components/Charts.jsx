import React, { useMemo, useState } from 'react';
import { fmtEUR, fmtNum } from '../lib/helpers';

const NAVY = '#1E3D63';
const ORANGE = '#FF7A1A';

/* ============ Area / line chart (multi-series, hover tooltip) ============ */
export function AreaChart({
  series = [],
  labels = [],
  height = 240,
  formatter = fmtNum,
  showGrid = true,
  yTicks = 4,
}) {
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const allVals = series.flatMap((s) => s.data);
  const max = Math.max(...allVals, 1);
  const niceMax = Math.ceil(max / 1000) * 1000 || 100;
  const n = labels.length || series[0]?.data.length || 1;
  const x = (i) => padL + (i / Math.max(1, n - 1)) * iw;
  const y = (v) => padT + ih - (v / niceMax) * ih;

  const pathOf = (data) => data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const areaOf = (data) => `${pathOf(data)} L${x(data.length - 1).toFixed(1)},${padT + ih} L${padL},${padT + ih} Z`;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`ag${si}-${s.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity=".3" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {showGrid && Array.from({ length: yTicks + 1 }).map((_, i) => {
          const val = (niceMax / yTicks) * i;
          const yy = y(val);
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '3 5'} />
              <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="inherit">
                {val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        {series.map((s, si) => (
          <g key={si}>
            <path d={areaOf(s.data)} fill={`url(#ag${si}-${s.color.replace('#', '')})`} />
            <path
              d={pathOf(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeDasharray: 2000, strokeDashoffset: 0, animation: `drawLine 1.4s var(--ease) ${si * 0.12}s both` }}
            />
            {s.data.map((v, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={hover?.i === i ? 5 : 0}
                fill="var(--surface)"
                stroke={s.color}
                strokeWidth="2.5"
              />
            ))}
          </g>
        ))}

        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="inherit">{l}</text>
        ))}

        {labels.map((_, i) => (
          <rect
            key={`h${i}`}
            x={x(i) - iw / (n * 2)}
            y={padT}
            width={iw / n}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover({ i })}
          />
        ))}
        {hover && (
          <line x1={x(hover.i)} x2={x(hover.i)} y1={padT} y2={padT + ih} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 4" />
        )}
      </svg>

      {hover && (
        <div className="chart-tip" style={{ left: `${(x(hover.i) / W) * 100}%`, top: `${(y(Math.max(...series.map((s) => s.data[hover.i]))) / H) * 100}%` }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{labels[hover.i]}</div>
          {series.map((s) => (
            <div key={s.name} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <i style={{ width: 7, height: 7, borderRadius: 2, background: s.color, display: 'inline-block' }} />
              {s.name} <b style={{ marginLeft: 'auto' }}>{formatter(s.data[hover.i])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Bar chart (grouped, vertical) ============ */
export function BarChart({ series = [], labels = [], height = 230, formatter = fmtNum, stacked = false }) {
  const W = 720;
  const H = height;
  const padL = 44, padR = 12, padT = 12, padB = 28;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.data[i] || 0), 0));
  const max = Math.max(...totals, 1);
  const niceStep = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const niceMax = Math.ceil(max / niceStep) * niceStep || 100;
  const groupW = iw / labels.length;
  const barW = stacked ? groupW * 0.44 : (groupW * 0.62) / series.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const val = (niceMax / 4) * i;
        const yy = padT + ih - (val / niceMax) * ih;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--border)" strokeDasharray={i === 0 ? '0' : '3 5'} />
            <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="var(--text-3)">{val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}</text>
          </g>
        );
      })}
      {labels.map((l, i) => {
        const gx = padL + groupW * i;
        let acc = 0;
        return (
          <g key={i}>
            {series.map((s, si) => {
              const v = s.data[i] || 0;
              const h = (v / niceMax) * ih;
              const bx = stacked
                ? gx + groupW / 2 - barW / 2
                : gx + groupW / 2 - (barW * series.length) / 2 + si * barW;
              const by = stacked ? padT + ih - h - acc : padT + ih - h;
              if (stacked) acc += h;
              return (
                <rect
                  key={si}
                  x={bx}
                  y={by}
                  width={barW - 3}
                  height={Math.max(2, h)}
                  rx={4}
                  fill={s.color}
                  opacity={0.92}
                  style={{ transition: 'height .6s var(--ease)' }}
                >
                  <title>{`${s.name} · ${l} : ${formatter(v)}`}</title>
                </rect>
              );
            })}
            <text x={gx + groupW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-3)">{l}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============ Donut ============ */
export function Donut({ data = [], size = 168, thickness = 20, centerLabel, centerValue, formatter = fmtNum }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-soft)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray .8s var(--ease)' }}
            >
              <title>{`${d.label} : ${formatter(d.value)}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '.68rem', color: 'var(--text-3)', fontWeight: 600 }}>{centerLabel}</div>
        <div style={{ fontSize: '1.12rem', fontWeight: 800, letterSpacing: '-.03em', marginTop: 2 }}>{centerValue}</div>
      </div>
    </div>
  );
}

/* ============ Horizontal ranked bars ============ */
export function RankBars({ items = [], formatter = fmtNum, color = ORANGE }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="stack" style={{ gap: 12 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
            <span className="small" style={{ fontWeight: 600 }}>{it.label}</span>
            <span className="small mono" style={{ color: 'var(--text-2)', fontWeight: 700 }}>{formatter(it.value)}</span>
          </div>
          <div className="progress" style={{ height: 6 }}>
            <i style={{ width: `${(it.value / max) * 100}%`, background: it.color || `linear-gradient(90deg, ${color}, ${color}cc)` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Heatmap (activity by weekday/hour) ============ */
export function Heatmap({ data = [], rows = [], cols = [] }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `58px repeat(${cols.length}, minmax(20px, 1fr))`, gap: 4, minWidth: 340 }}>
        <span />
        {cols.map((c) => <span key={c} style={{ fontSize: '.62rem', color: 'var(--text-3)', textAlign: 'center' }}>{c}</span>)}
        {rows.map((r, ri) => (
          <React.Fragment key={r}>
            <span style={{ fontSize: '.66rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>{r}</span>
            {cols.map((c, ci) => {
              const cell = data.find((d) => d.r === ri && d.c === ci);
              const v = cell?.v || 0;
              const alpha = 0.08 + (v / max) * 0.92;
              return (
                <span
                  key={ci}
                  title={`${r} ${c} : ${v} livraisons`}
                  style={{
                    height: 22, borderRadius: 5,
                    background: `rgba(255,122,26,${alpha.toFixed(2)})`,
                    transition: 'background .2s',
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ============ Gauge (semi-circle) ============ */
export function Gauge({ value = 0, max = 100, label, size = 150, suffix = '%' }) {
  const pct = Math.min(1, value / max);
  const r = size / 2 - 12;
  const c = size / 2;
  const circ = Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 22 }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path d={`M12,${c} A${r},${r} 0 0 1 ${size - 12},${c}`} fill="none" stroke="var(--bg-soft)" strokeWidth="11" strokeLinecap="round" />
        <path
          d={`M12,${c} A${r},${r} 0 0 1 ${size - 12},${c}`}
          fill="none"
          stroke={pct > 0.8 ? '#12B76A' : pct > 0.5 ? ORANGE : '#EF4444'}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          style={{ transition: 'stroke-dasharray .9s var(--ease)' }}
        />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-.03em' }}>{value.toFixed(0)}{suffix}</div>
        <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{label}</div>
      </div>
    </div>
  );
}

/* ============ Cost forecast chart (actual + predicted) ============ */
export function ForecastChart({ actual = [], predicted = [], labels = [], height = 220 }) {
  const W = 720, H = height, padL = 44, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const all = [...actual, ...predicted];
  const max = Math.max(...all, 1);
  const niceMax = Math.ceil(max / 1000) * 1000;
  const n = labels.length;
  const x = (i) => padL + (i / Math.max(1, n - 1)) * iw;
  const y = (v) => padT + ih - (v / niceMax) * ih;
  const actualPath = actual.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const startIdx = actual.length - 1;
  const predPath = predicted.map((v, i) => `${i ? 'L' : 'M'}${x(startIdx + i)},${y(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const val = (niceMax / 4) * i;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(val)} y2={y(val)} stroke="var(--border)" strokeDasharray={i === 0 ? '0' : '3 5'} />
            <text x={padL - 8} y={y(val) + 4} textAnchor="end" fontSize="10" fill="var(--text-3)">{Math.round(val / 1000)}k</text>
          </g>
        );
      })}
      <path d={`${actualPath} L${x(actual.length - 1)},${padT + ih} L${padL},${padT + ih} Z`} fill="rgba(30,61,99,.12)" />
      <path d={actualPath} fill="none" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={predPath} fill="none" stroke={ORANGE} strokeWidth="2.6" strokeDasharray="7 6" strokeLinecap="round" />
      {labels.map((l, i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-3)">{l}</text>)}
      <text x={x(startIdx)} y={y(actual[actual.length - 1] || 0) - 8} fontSize="9.5" fill={ORANGE} textAnchor="middle" fontWeight="700">prévision →</text>
    </svg>
  );
}
