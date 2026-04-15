/**
 * ExportCard — 700 px card captured by html2canvas → JPG.
 *
 * Structurally identical to DinoDetail.  Every Tailwind class is
 * translated to an inline style so html2canvas can render it faithfully.
 *
 * html2canvas rules applied throughout:
 *  • NO overflow:hidden on text containers  (clips descenders)
 *  • NO alignItems:'center' on flex rows that contain text  (clips tops)
 *  • Every text node has an explicit lineHeight
 *  • Vertical rhythm via padding, not flex-centering
 *  • Chips / badges: display:'inline-flex' + alignItems:'center'
 */
import React, { useState } from 'react';
import { findNearestArkColor } from '../colorData.js';
import { matchColorCombos, CATEGORY_ICONS } from '../colorCombos.js';

/* ── Same STATS as DinoDetail ─────────────────────────────────────── */
const STATS = [
  { key: 'health',    label: 'Health',    icon: '❤️',  color: '#f87171', max: 120000 },
  { key: 'stamina',   label: 'Stamina',   icon: '⚡',  color: '#fbbf24', max: 20000  },
  { key: 'oxygen',    label: 'Oxygen',    icon: '💧',  color: '#60a5fa', max: 2000   },
  { key: 'food',      label: 'Food',      icon: '🍖',  color: '#34d399', max: 30000  },
  { key: 'weight',    label: 'Weight',    icon: '⚖️',  color: '#c084fc', max: 20000  },
  { key: 'melee',     label: 'Melee',     icon: '⚔️',  color: '#fb923c', max: 20,    fmt: v => `${(v*100).toFixed(0)}%` },
  { key: 'fortitude', label: 'Fort.',     icon: '🛡️',  color: '#86efac', max: 500   },
  { key: 'crafting',  label: 'Craft',     icon: '🔨',  color: '#fde68a', max: 5,     fmt: v => `${(v*100).toFixed(0)}%` },
];

const REGION_FALLBACK = ['Body', 'Head', 'Back', 'Belly', 'Limbs', 'Detail'];

const MAP_STYLES = {
  'The Island':    { background:'rgba(26,92,42,0.8)',  color:'#7edc9a', border:'1px solid #2a7a40' },
  'Scorched Earth':{ background:'rgba(92,46,26,0.8)',  color:'#dcaa7e', border:'1px solid #8a4020' },
  'Aberration':    { background:'rgba(42,26,92,0.8)',  color:'#9a7edc', border:'1px solid #3a2080' },
  'Extinction':    { background:'rgba(61,61,26,0.8)',  color:'#d4dc7e', border:'1px solid #5a5a20' },
  'The Center':    { background:'rgba(26,61,92,0.8)',  color:'#7eb8dc', border:'1px solid #205080' },
  'Fjordur':       { background:'rgba(26,46,92,0.8)',  color:'#7e9edc', border:'1px solid #203880' },
  'Ragnarok':      { background:'rgba(92,26,26,0.8)',  color:'#dc7e7e', border:'1px solid #802020' },
  'Crystal Isles': { background:'rgba(26,79,92,0.8)',  color:'#7ed4dc', border:'1px solid #206878' },
  'Lost Colony':   { background:'rgba(61,26,92,0.8)',  color:'#b47edc', border:'1px solid #501880' },
};

const CATEGORY_ICON_MAP = {
  classic:'🎭', cute_fun:'🍬', nature:'🌿', dark_evil:'💀', bright_flashy:'⚡', royal_legendary:'👑',
};

/* ── Palette (mirrors tailwind.config + index.css) ─────────────────── */
const C = {
  darkBg:     '#0d0f1a',   // ark-dark
  panel:      '#161927',   // ark-panel
  card:       '#1e2236',   // ark-card  / bg-slate-800 ≈
  border:     '#2d3456',   // ark-border
  accent:     '#4f80ff',   // ark-accent
  gold:       '#f5a623',   // ark-gold
  green:      '#39d98a',   // ark-green
  statTrack:  '#1a1f35',
  sl200:      '#e2e8f0',   // text-slate-200
  sl300:      '#cbd5e1',   // text-slate-300
  sl400:      '#94a3b8',   // text-slate-400
  sl500:      '#64748b',   // text-slate-500
  sl600:      '#475569',   // text-slate-600
  sl700:      '#334155',   // text-slate-700
  pink400:    '#f472b6',
  sky400:     '#38bdf8',
  sky300:     '#7dd3fc',
  purple400:  '#c084fc',
  indigo300:  '#a5b4fc',
  indigo200:  '#c7d2fe',
};

/* ── Shared style helpers ───────────────────────────────────────────── */
const sectionLabel = {
  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: C.accent, lineHeight: 1.4,
};

export default function ExportCard({ dino, colorMap, comboOverride }) {
  const [imgError, setImgError] = useState(false);
  if (!dino) return null;

  const statLevels  = dino.statLevels  || null;
  const regionNames = dino.regionNames || null;
  const mutations   = (dino.mutationsMale || 0) + (dino.mutationsFemale || 0);
  const imprintPct  = Math.round((dino.imprint || 0) * 100);
  const tePct       = Math.round((dino.tamingEffectiveness || 0) * 100);
  const mapStyle    = MAP_STYLES[dino.map] || null;

  const breedScore = Math.min(100, Math.round(
    ((dino.stats?.melee  || 0) / 10 * 30) +
    ((dino.stats?.health || 0) / 100000 * 25) +
    ((dino.imprint || 0) * 20) +
    (Math.min(mutations, 40) / 40 * 15) +
    ((dino.tamingEffectiveness || 0) * 10)
  ));

  const activeColorNames = Array.from({ length: 6 }, (_, i) => {
    const hex = dino.colorHex?.[i] || colorMap[dino.colors?.[i]]?.hex || null;
    const empty = !hex || hex === '#000000';
    return empty ? null : (findNearestArkColor(hex)?.name || null);
  }).filter(Boolean);

  const combos   = matchColorCombos(activeColorNames);
  const topCombo = combos[0] || null;
  const effectiveName     = comboOverride || topCombo?.name || null;
  const effectiveCategory = comboOverride
    ? (combos.find(c => c.name === comboOverride)?.category || topCombo?.category)
    : topCombo?.category;

  const visibleStats = STATS.filter(def => (dino.stats?.[def.key] || 0) > 0);

  /* ── StatRow — display:table for reliable html2canvas alignment ─── */
  function StatRow({ def }) {
    const value    = dino.stats?.[def.key] || 0;
    const pct      = Math.min(100, (value / def.max) * 100);
    const display  = def.fmt ? def.fmt(value) : Math.round(value).toLocaleString();
    const lvls     = statLevels?.[def.key];
    const hasPoints = lvls && lvls.total != null && lvls.total >= 0;
    const totalPts  = hasPoints ? (lvls.total ?? lvls.wild) : null;

    /* table layout: no overflow:hidden, no alignItems — verticalAlign + padding lifts text */
    const cellPad = { paddingTop: '5px', paddingBottom: '7px' };
    return (
      <div style={{ display: 'table', width: '100%', borderCollapse: 'collapse' }}>
        <div style={{ display: 'table-row' }}>
          {/* icon */}
          <div style={{ display: 'table-cell', width: '22px', textAlign: 'center', verticalAlign: 'top', paddingRight: '4px', ...cellPad }}>
            <span style={{ fontSize: '14px', lineHeight: '1.6' }}>{def.icon}</span>
          </div>
          {/* label */}
          <div style={{ display: 'table-cell', width: '54px', verticalAlign: 'top', paddingRight: '6px', ...cellPad }}>
            <span style={{ fontSize: '12px', color: C.sl400, lineHeight: '1.6', whiteSpace: 'nowrap' }}>{def.label}</span>
          </div>
          {/* bar track — padded to align with text midline */}
          <div style={{ display: 'table-cell', verticalAlign: 'top', paddingRight: '8px', paddingTop: '11px', paddingBottom: '7px' }}>
            <div style={{ background: C.statTrack, borderRadius: '99px', height: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: def.color, borderRadius: '99px' }} />
            </div>
          </div>
          {/* value */}
          <div style={{ display: 'table-cell', width: '66px', verticalAlign: 'top', textAlign: 'right', paddingRight: '8px', ...cellPad }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: C.sl300, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', lineHeight: '1.6' }}>{display}</span>
          </div>
          {/* pts chip */}
          <div style={{ display: 'table-cell', width: '34px', verticalAlign: 'top', textAlign: 'right', paddingTop: '4px', paddingBottom: '7px' }}>
            {hasPoints ? (
              <span style={{
                display: 'inline-block',
                padding: '1px 6px 5px',
                background: 'rgba(14,165,233,0.20)', border: '1px solid rgba(14,165,233,0.30)',
                borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                color: C.sky300, fontVariantNumeric: 'tabular-nums', lineHeight: '1.4',
              }}>{totalPts}</span>
            ) : (
              <span style={{
                display: 'inline-block',
                padding: '3px 6px 5px',
                background: 'rgba(51,65,85,0.40)', border: '1px solid rgba(51,65,85,0.40)',
                borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                color: C.sl600, lineHeight: '1.4',
              }}>?</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Badge — mirrors DinoDetail Badge ────────────────────────────── */
  function Badge({ value, label, sub, color }) {
    return (
      <div style={{ background: C.darkBg, borderRadius: '12px', padding: '8px 8px 10px', textAlign: 'center', flex: 1, boxSizing: 'border-box' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color, lineHeight: '1.6' }}>{value}</div>
        {sub && <div style={{ fontSize: '9px', color: C.sl600, lineHeight: '1.5', marginTop: '2px' }}>{sub}</div>}
        <div style={{ fontSize: '9px', color: C.sl500, textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: '1.5', marginTop: '4px', fontWeight: 600 }}>{label}</div>
      </div>
    );
  }

  /* ── ColorTile — mirrors DinoDetail ColorTile ────────────────────── */
  function ColorTile({ idx }) {
    const hex      = dino.colorHex?.[idx] || colorMap[dino.colors?.[idx]]?.hex || null;
    const isEmpty  = !hex || hex === '#000000';
    const nearest  = !isEmpty ? findNearestArkColor(hex) : null;
    const rName    = regionNames?.[idx] || REGION_FALLBACK[idx];
    const isUnused = isEmpty && !regionNames?.[idx];
    const shortLabel = rName.length > 9 ? rName.split(' ')[0] : rName;

    return (
      <div style={{
        display: 'flex', gap: '6px',
        borderRadius: '8px', padding: '6px',
        backgroundColor: isUnused ? 'rgba(15,18,32,0.4)' : C.card,
        opacity: isUnused ? 0.4 : 1, boxSizing: 'border-box',
      }}>
        {/* swatch */}
        <div style={{
          position: 'relative', width: '32px', height: '32px', flexShrink: 0,
          borderRadius: '6px', border: '1px solid rgba(255,255,255,0.10)',
          backgroundColor: isEmpty ? '#111827' : hex, overflow: 'hidden',
        }}>
          {isUnused && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: C.sl700, lineHeight: 1 }}>✕</span>
            </div>
          )}
          {!isUnused && nearest && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', textAlign: 'center', padding: '3px 0 4px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: '1.4', marginBottom:'4px', display: 'block' }}>{nearest.id}</span>
            </div>
          )}
        </div>
        {/* text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: C.sl500, lineHeight: '1.6', paddingBottom: '1px' }}>{shortLabel}</div>
          <div style={{ fontSize: '9px', fontWeight: 500, lineHeight: '1', marginBottom:'2px', paddingBottom: '2px', color: isUnused ? C.sl700 : isEmpty ? C.sl500 : C.sl200 }}>
            {isUnused ? 'Unused' : isEmpty ? 'None' : (nearest?.name || hex)}
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{
      width: '700px',
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: '16px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: C.sl200,
      boxSizing: 'border-box',
      fontSize: '13px',
      /* NO overflow:hidden — html2canvas clips text descenders */
    }}>

      {/* ══ HEADER ══════════════════════════════════════════════════ */}
      {/* NO alignItems:center — clips text tops in html2canvas */}
      <div style={{
        display: 'flex', gap: '12px',
        padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
      }}>
        {/* left: name row + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* name row */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: dino.isFemale ? C.pink400 : C.sky400, lineHeight: 1.3 }}>
              {dino.isFemale ? '♀' : '♂'}
            </span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: C.sl200, lineHeight: 1.3 }}>
              {dino.dinoName || <em style={{ color: C.sl500, fontWeight: 400 }}>Unnamed</em>}
            </span>
            {/* map badge */}
            {mapStyle && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px',
                lineHeight: 1.4, ...mapStyle,
              }}>{dino.map}</span>
            )}
            {dino.isCryopodded && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px',
                background: 'rgba(30,64,175,0.4)', color: '#93c5fd',
                border: '1px solid rgba(59,130,246,0.5)', lineHeight: 1.4,
              }}>🧊 Cryopod</span>
            )}
            {effectiveName && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(49,46,129,0.5)', color: C.indigo200,
                border: `1px solid rgba(79,70,229,0.5)`, lineHeight: 1.4,
              }}>
                {effectiveCategory && CATEGORY_ICON_MAP[effectiveCategory]
                  ? CATEGORY_ICON_MAP[effectiveCategory] + ' ' : '✦ '}
                {effectiveName}
              </span>
            )}
          </div>
          {/* subtitle: species · Lv · owner */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
            <span style={{ fontSize: '12px', color: C.sl500, lineHeight: 1.4 }}>{dino.species}</span>
            <span style={{ fontSize: '12px', color: C.border, lineHeight: 1.4 }}>·</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: C.gold, lineHeight: 1.4 }}>Lv {dino.level}</span>
            {dino.ownerName && (
              <>
                <span style={{ fontSize: '12px', color: C.border, lineHeight: 1.4 }}>·</span>
                <span style={{ fontSize: '12px', color: C.sl500, lineHeight: 1.4 }}>{dino.ownerName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ BODY ════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex' }}>

        {/* ── LEFT column: image + color regions (48%) ─────────── */}
        <div style={{ width: '48%', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}` }}>

          {/* Dino image */}
          <div style={{
            height: '240px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 60%, #252b4a 0%, #0f1220 100%)',
            overflow: 'hidden',
          }}>
            {!imgError ? (
              <img src={`/api/render/${dino.id}`} alt={dino.species} crossOrigin="anonymous"
                   onError={() => setImgError(true)}
                   style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: C.sl700 }}>
                <div style={{ fontSize: '40px', lineHeight: 1.2 }}>🦕</div>
                <div style={{ fontSize: '11px', lineHeight: 1.4, marginTop: '6px' }}>{dino.species}</div>
              </div>
            )}
          </div>

          {/* Color regions + combos */}
          <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={sectionLabel}>Color Regions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
              {Array.from({ length: 6 }, (_, i) => <ColorTile key={i} idx={i} />)}
            </div>
          </div>
        </div>

        {/* ── RIGHT column: badges + stats ─────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* 1×4 badge row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px',
            padding: '8px 12px', borderBottom: `1px solid rgba(45,52,86,0.5)`, flexShrink: 0,
          }}>
            <Badge
              value={mutations}
              label="Mutations"
              sub={`♂ ${dino.mutationsMale||0}  ·  ♀ ${dino.mutationsFemale||0}`}
              color={mutations > 0 ? C.purple400 : C.sl700}
            />
            <Badge
              value={`${imprintPct}%`}
              label="Imprint"
              color={imprintPct >= 100 ? C.green : imprintPct > 0 ? C.sl200 : C.sl700}
            />
            <Badge
              value={breedScore}
              label="Breed Score"
              color={C.accent}
            />
            <Badge
              value={`${tePct}%`}
              label="Taming Eff."
              color={C.sl300}
            />
          </div>

          {/* Statistics */}
          <div style={{ padding: '10px 12px 8px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...sectionLabel, marginBottom: '6px', flexShrink: 0 }}>Statistics</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {visibleStats.map(def => <StatRow key={def.key} def={def} />)}
            </div>
          </div>

          {/* Footer */}
          {(dino.ownerName || dino.tribeName || dino.imprinterName) && (
            <div style={{ padding: '6px 12px', borderTop: `1px solid rgba(45,52,86,0.4)`, display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {dino.ownerName     && <span style={{ fontSize: '10px', color: C.sl500, lineHeight: 1.4 }}>Owner: <span style={{ color: C.sl300 }}>{dino.ownerName}</span></span>}
              {dino.tribeName     && <span style={{ fontSize: '10px', color: C.sl500, lineHeight: 1.4 }}>Tribe: <span style={{ color: C.indigo300 }}>{dino.tribeName}</span></span>}
              {dino.imprinterName && <span style={{ fontSize: '10px', color: C.sl500, lineHeight: 1.4 }}>Imprinter: <span style={{ color: C.sl300 }}>{dino.imprinterName}</span></span>}
            </div>
          )}
        </div>
      </div>

      {/* Watermark */}
      <div style={{ fontSize: '8px', color: C.sl700, textAlign: 'center', lineHeight: '16px', background: C.darkBg, borderTop: `1px solid ${C.border}` }}>
        ARK Dino Color Visualizer
      </div>
    </div>
  );
}
