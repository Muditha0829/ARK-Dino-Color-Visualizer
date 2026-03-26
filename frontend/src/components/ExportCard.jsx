/**
 * ExportCard — 700px-wide card captured by html2canvas → JPG.
 *
 * html2canvas rules applied throughout:
 *  • NO overflow:hidden on text containers  (clips descenders/ascenders)
 *  • NO alignItems:'center' on flex rows with text  (clips text tops)
 *  • Every text node has explicit lineHeight
 *  • Vertical space via padding, not flex-centering
 *  • Chips use display:'inline-flex' + alignItems:'center' (not inline-block + lineHeight)
 *  • "Imported" / unrecognised map → no badge shown
 */
import React, { useState } from 'react';
import { findNearestArkColor } from '../colorData.js';
import { matchColorCombos, CATEGORY_ICONS } from '../colorCombos.js';

const STATS = [
  { key: 'health',    label: 'Health',    sym: '♥', color: '#f87171', max: 120000 },
  { key: 'stamina',   label: 'Stamina',   sym: '⚡', color: '#fbbf24', max: 20000  },
  { key: 'oxygen',    label: 'Oxygen',    sym: '~',  color: '#60a5fa', max: 2000   },
  { key: 'food',      label: 'Food',      sym: '◆', color: '#34d399', max: 30000  },
  { key: 'weight',    label: 'Weight',    sym: '▲', color: '#c084fc', max: 20000  },
  { key: 'melee',     label: 'Melee',     sym: '✦', color: '#fb923c', max: 20,    fmt: v => `${(v*100).toFixed(0)}%` },
  { key: 'speed',     label: 'Speed',     sym: '»',  color: '#67e8f9', max: 3,     fmt: v => `${(v*100).toFixed(0)}%` },
  { key: 'fortitude', label: 'Fortitude', sym: '◉', color: '#86efac', max: 500   },
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

/* ── Chip helper ─────────────────────────────────────────────────── */
function Chip({ children, bg, border, color }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '24px',
      height: '18px',
      padding: '0 5px',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '700',
      lineHeight: '18px',
      color,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
    }}>
      {children}
    </span>
  );
}

function Sep() {
  return <span style={{ color: '#334155', fontSize: '10px', lineHeight: '18px', padding: '0 1px' }}>|</span>;
}

export default function ExportCard({ dino, colorMap, comboOverride }) {
  const [imgError, setImgError] = useState(false);
  if (!dino) return null;

  const statLevels  = dino.statLevels  || null;
  const regionNames = dino.regionNames || null;
  const mutations   = (dino.mutationsMale || 0) + (dino.mutationsFemale || 0);
  const imprintPct  = Math.round((dino.imprint || 0) * 100);
  const tePct       = Math.round((dino.tamingEffectiveness || 0) * 100);

  // Only show map badge for recognised maps — never "Imported" or unknown
  const mapStyleEntry = MAP_STYLES[dino.map] || null;

  const displayName = dino.dinoName || dino.species;

  const breedScore = Math.min(100, Math.round(
    ((dino.stats?.melee  || 0) / 10 * 30) +
    ((dino.stats?.health || 0) / 100000 * 25) +
    ((dino.imprint || 0) * 20) +
    (Math.min(mutations, 40) / 40 * 15) +
    ((dino.tamingEffectiveness || 0) * 10)
  ));

  const activeColorNames = Array.from({ length: 6 }, (_, i) => {
    const hex = dino.colorHex?.[i] || colorMap[dino.colors?.[i]]?.hex || null;
    const isEmpty = !hex || hex === '#000000';
    return isEmpty ? null : (findNearestArkColor(hex)?.name || null);
  }).filter(Boolean);

  const combos   = matchColorCombos(activeColorNames);
  const topCombo = combos[0] || null;
  const effectiveComboName     = comboOverride || topCombo?.name || null;
  const effectiveComboCategory = comboOverride
    ? (combos.find(c => c.name === comboOverride)?.category || topCombo?.category)
    : topCombo?.category;

  const visibleStats = STATS.filter(def => (dino.stats?.[def.key] || 0) > 0 || statLevels?.[def.key]);

  /* ── Stat row ─────────────────────────────────────────────────── */
  function StatRow({ def }) {
    const value   = dino.stats?.[def.key] || 0;
    const pct     = Math.min(100, (value / def.max) * 100);
    const display = def.fmt ? def.fmt(value) : Math.round(value).toLocaleString();
    const lvls    = statLevels?.[def.key];

    return (
      /* Using display:table + table-cells — most reliable for html2canvas alignment */
      <div style={{ display: 'table', width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
        <div style={{ display: 'table-row' }}>
          {/* Icon */}
          <div style={{ display: 'table-cell', width: '16px', textAlign: 'center', verticalAlign: 'middle', paddingRight: '4px' }}>
            <span style={{ fontSize: '11px', color: def.color, lineHeight: '20px' }}>{def.sym}</span>
          </div>
          {/* Label */}
          <div style={{ display: 'table-cell', width: '60px', verticalAlign: 'middle', paddingRight: '5px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '20px', whiteSpace: 'nowrap' }}>{def.label}</span>
          </div>
          {/* Bar */}
          <div style={{ display: 'table-cell', verticalAlign: 'middle', paddingRight: '6px' }}>
            <div style={{ height: '4px', background: '#1a1f35', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: def.color, borderRadius: '99px' }} />
            </div>
          </div>
          {/* Value */}
          <div style={{ display: 'table-cell', width: '54px', verticalAlign: 'middle', textAlign: 'right', paddingRight: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e1', lineHeight: '20px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{display}</span>
          </div>
          {/* Chips */}
          <div style={{ display: 'table-cell', width: '130px', verticalAlign: 'middle', textAlign: 'right' }}>
            {lvls ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexWrap: 'nowrap' }}>
                <Chip bg="rgba(56,189,248,0.20)" border="rgba(56,189,248,0.35)" color="#7dd3fc">{lvls.wild}</Chip>
                <Sep />
                <Chip bg="rgba(100,116,139,0.20)" border="rgba(100,116,139,0.30)" color="#94a3b8">0</Chip>
                <Sep />
                <Chip bg="rgba(251,191,36,0.20)" border="rgba(251,191,36,0.35)" color="#fcd34d">{lvls.tamed}</Chip>
              </span>
            ) : (
              <span style={{ color: '#1e2440', fontSize: '11px', lineHeight: '20px' }}>—</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div style={{
      width: '700px',
      background: '#0d0f1a',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#e2e8f0',
      boxSizing: 'border-box',
      fontSize: '13px',
      /* NO overflow:hidden — html2canvas clips text */
    }}>

      {/* ══ HEADER ════════════════════════════════════════════════ */}
      {/*  Use padding NOT alignItems:center — prevents top-clip     */}
      <div style={{
        background: 'linear-gradient(135deg,#131a2e 0%,#0d0f1a 100%)',
        padding: '14px 18px 12px',
        borderBottom: '1px solid #1e2440',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
      }}>

        {/* Left: name + combo badge + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1 — gender icon  name  combo badge */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', marginBottom: '5px' }}>
            <span style={{
              fontSize: '16px', fontWeight: '800', lineHeight: '1.3',
              color: dino.isFemale ? '#f472b6' : '#38bdf8',
              flexShrink: 0,
            }}>
              {dino.isFemale ? '♀' : '♂'}
            </span>
            <span style={{
              fontSize: '17px', fontWeight: '700', lineHeight: '1.3',
              color: '#f1f5f9',
              /* No overflow:hidden — html2canvas clips top of text */
            }}>
              {displayName}
            </span>
            {effectiveComboName && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                flexShrink: 0,
                fontSize: '10px', fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '99px',
                background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.5)',
                color: '#a5b4fc',
                whiteSpace: 'nowrap',
                lineHeight: '1.4',
              }}>
                {effectiveComboCategory && CATEGORY_ICONS[effectiveComboCategory]
                  ? CATEGORY_ICONS[effectiveComboCategory] + ' '
                  : ''}
                {effectiveComboName}
              </span>
            )}
          </div>
          {/* Row 2 — species · owner · tribe */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap' }}>
            {dino.dinoName && (
              <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', whiteSpace: 'nowrap' }}>
                {dino.species}
              </span>
            )}
            {dino.ownerName && (
              <>
                <span style={{ fontSize: '11px', color: '#1e2440', lineHeight: '1.4' }}>·</span>
                <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', whiteSpace: 'nowrap' }}>{dino.ownerName}</span>
              </>
            )}
            {dino.tribeName && (
              <>
                <span style={{ fontSize: '11px', color: '#1e2440', lineHeight: '1.4' }}>·</span>
                <span style={{ fontSize: '11px', color: '#6366f1', lineHeight: '1.4', whiteSpace: 'nowrap' }}>{dino.tribeName}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: level + (optional) map badge */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#e2a818', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
            Lv {dino.level}
          </div>
          {mapStyleEntry && (
            <div style={{ marginTop: '5px' }}>
              <span style={{
                fontSize: '10px', fontWeight: '600', lineHeight: '1.4',
                padding: '2px 8px', borderRadius: '5px',
                ...mapStyleEntry,
              }}>
                {dino.map}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══ META BAR ══════════════════════════════════════════════ */}
      <div style={{ background: '#080a12', padding: '8px 16px', display: 'flex', borderBottom: '1px solid #1e2440' }}>
        {[
          { val: mutations,        label: 'MUTATIONS',   sub: `♂${dino.mutationsMale||0} / ♀${dino.mutationsFemale||0}`, color: mutations > 0 ? '#c084fc' : '#334155' },
          { val: `${imprintPct}%`, label: 'IMPRINT',     sub: null, color: imprintPct >= 100 ? '#4ade80' : '#e2e8f0' },
          { val: `${tePct}%`,      label: 'TAMING EFF.', sub: null, color: '#94a3b8' },
          { val: breedScore,       label: 'BREED SCORE', sub: null, color: '#4f80ff' },
        ].map((m, i) => (
          <React.Fragment key={m.label}>
            {i > 0 && <div style={{ width: '1px', background: '#1e2440', margin: '0 12px', alignSelf: 'stretch' }} />}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: m.color, lineHeight: '1.2' }}>{m.val}</div>
              {m.sub && <div style={{ fontSize: '9px', color: '#475569', lineHeight: '1.4', marginTop: '2px' }}>{m.sub}</div>}
              <div style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.07em', lineHeight: '1.4', marginTop: '2px' }}>{m.label}</div>
            </div>
          </React.Fragment>
        ))}
        {dino.isCryopodded && (
          <>
            <div style={{ width: '1px', background: '#1e2440', margin: '0 12px', alignSelf: 'stretch' }} />
            <div style={{ fontSize: '11px', color: '#93c5fd', lineHeight: '1.4', whiteSpace: 'nowrap', paddingTop: '2px' }}>🧊 Cryopodded</div>
          </>
        )}
      </div>

      {/* ══ BODY: image | stats ════════════════════════════════════ */}
      <div style={{ display: 'flex' }}>

        {/* Image column */}
        <div style={{ width: '190px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e2440' }}>
          <div style={{
            flex: 1, minHeight: '170px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 60%,#1e2540 0%,#0a0c16 100%)',
            overflow: 'hidden',   /* OK here — no text in image area */
          }}>
            {!imgError ? (
              <img
                src={`/api/render/${dino.id}`}
                alt={dino.species}
                crossOrigin="anonymous"
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: '#334155', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', lineHeight: '1.2' }}>?</div>
                <div style={{ fontSize: '10px', lineHeight: '1.4', marginTop: '4px' }}>{dino.species}</div>
              </div>
            )}
          </div>
          {/* 6-colour strip */}
          <div style={{ height: '7px', display: 'flex', flexShrink: 0 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const hex = dino.colorHex?.[i] || colorMap[dino.colors?.[i]]?.hex;
              return <div key={i} style={{ flex: 1, backgroundColor: hex || '#1e2236' }} />;
            })}
          </div>
        </div>

        {/* Stats column */}
        <div style={{ flex: 1, padding: '10px 14px', minWidth: 0 }}>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', color: '#4f80ff', lineHeight: '18px' }}>
              STATISTICS
            </span>
            {statLevels && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexWrap: 'nowrap' }}>
                <Chip bg="rgba(56,189,248,0.2)" border="rgba(56,189,248,0.35)" color="#7dd3fc">BASE</Chip>
                <Sep />
                <Chip bg="rgba(100,116,139,0.2)" border="rgba(100,116,139,0.3)" color="#94a3b8">MUT</Chip>
                <Sep />
                <Chip bg="rgba(251,191,36,0.2)" border="rgba(251,191,36,0.35)" color="#fcd34d">DOM</Chip>
              </span>
            )}
          </div>
          {visibleStats.map(def => <StatRow key={def.key} def={def} />)}
        </div>
      </div>

      {/* ══ COLOR REGIONS (3 × 2) ══════════════════════════════════ */}
      <div style={{ borderTop: '1px solid #1e2440', padding: '8px 14px 12px' }}>
        <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', color: '#4f80ff', lineHeight: '1.4', marginBottom: '7px' }}>
          COLOR REGIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px' }}>
          {Array.from({ length: 6 }, (_, i) => {
            const hex      = dino.colorHex?.[i] || colorMap[dino.colors?.[i]]?.hex || null;
            const isEmpty  = !hex || hex === '#000000';
            const nearest  = !isEmpty ? findNearestArkColor(hex) : null;
            const rName    = regionNames?.[i] || REGION_FALLBACK[i];
            const isUnused = isEmpty && !regionNames?.[i];
            /* Match DinoDetail ColorTile shortLabel logic exactly */
            const shortLabel = rName.length > 9 ? rName.split(' ')[0] : rName;

            return (
              /* ── Same structure as DinoDetail <ColorTile> ── */
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',                          /* gap-1.5 */
                borderRadius: '8px',                 /* rounded-lg */
                padding: '6px',                      /* p-1.5 */
                backgroundColor: isUnused ? 'rgba(15,18,32,0.4)' : '#111827', /* bg-slate-900/40 : bg-ark-dark */
                opacity: isUnused ? 0.4 : 1,
                boxSizing: 'border-box',
              }}>

                {/* Swatch — w-8 h-8 rounded-md border border-white/10 overflow-hidden */}
                <div style={{
                  position: 'relative',
                  width: '32px', height: '32px',     /* w-8 h-8 */
                  borderRadius: '6px',               /* rounded-md */
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.10)',
                  backgroundColor: isEmpty ? '#111827' : hex,
                  overflow: 'hidden',                /* OK — no text inside swatch */
                }}>
                  {isUnused && (
                    /* ✕ centred inside unused swatch */
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#374151', lineHeight: '1' }}>✕</span>
                    </div>
                  )}
                  {!isUnused && nearest && (
                    /* ID bar — bottom-0 inset-x-0 bg-black/55 py-[2px] */
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                                  background: 'rgba(0,0,0,0.55)', textAlign: 'center',
                                  paddingTop: '2px', paddingBottom: '2px', lineHeight: '1' }}>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.90)' }}>{nearest.id}</span>
                    </div>
                  )}
                </div>

                {/* Text block — min-w-0 flex-1 (no overflow:hidden — html2canvas clips text) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Region label — text-[9px] font-semibold text-slate-600 leading-tight */}
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#475569',
                                lineHeight: '1.3', marginBottom: '2px' }}>
                    {shortLabel}
                  </div>
                  {/* Color name — text-[9px] font-medium leading-tight, color = nearest.hex */}
                  <div style={{ fontSize: '9px', fontWeight: '500', lineHeight: '1.3',
                                color: isUnused ? '#374151' : isEmpty ? '#475569' : (nearest?.hex || '#94a3b8') }}>
                    {isUnused ? 'Unused' : isEmpty ? 'None' : (nearest?.name || hex)}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Watermark */}
      <div style={{ fontSize: '8px', color: '#1e2440', textAlign: 'center', lineHeight: '18px', background: '#080a12', borderTop: '1px solid #0d0f1a' }}>
        ARK Dino Color Visualizer
      </div>
    </div>
  );
}
