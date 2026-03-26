import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { findNearestArkColor } from '../colorData.js';
import { matchColorCombos, CATEGORY_LABELS } from '../colorCombos.js';

const STATS = [
  { key: 'health',    label: 'Health',    icon: '❤️',  color: '#f87171', max: 120000 },
  { key: 'stamina',   label: 'Stamina',   icon: '⚡',  color: '#fbbf24', max: 20000  },
  { key: 'oxygen',    label: 'Oxygen',    icon: '💧',  color: '#60a5fa', max: 2000   },
  { key: 'food',      label: 'Food',      icon: '🍖',  color: '#34d399', max: 30000  },
  { key: 'weight',    label: 'Weight',    icon: '⚖️',  color: '#c084fc', max: 20000  },
  { key: 'melee',     label: 'Melee',     icon: '⚔️',  color: '#fb923c', max: 20,    fmt: v => `${(v * 100).toFixed(0)}%` },
  { key: 'fortitude', label: 'Fort.',     icon: '🛡️',  color: '#86efac', max: 500   },
  { key: 'crafting',  label: 'Craft',     icon: '🔨',  color: '#fde68a', max: 5,     fmt: v => `${(v * 100).toFixed(0)}%` },
];

const MAP_CLASSES = {
  'The Island':'map-island','Scorched Earth':'map-scorched','Aberration':'map-aberration',
  'Extinction':'map-extinction','The Center':'map-center','Fjordur':'map-fjordur',
  'Ragnarok':'map-ragnarok','Crystal Isles':'map-crystal','Lost Colony':'map-colony',
};

const CATEGORY_ICONS = {
  classic:'🎭', cute_fun:'🍬', nature:'🌿', dark_evil:'💀', bright_flashy:'⚡', royal_legendary:'👑',
};

/* ── Tooltip ──────────────────────────────────────────────────────── */
function Tooltip({ text, children, wide, direction = 'up' }) {
  const isDown = direction === 'down';
  return (
    <div className="relative group/tip inline-block">
      {children}
      <div className={`
        absolute ${isDown ? 'top-full mt-2' : 'bottom-full mb-2'}
        left-1/2 -translate-x-1/2
        px-2.5 py-1.5 bg-slate-900 border border-slate-600
        text-[10px] text-slate-200 rounded-lg shadow-2xl leading-relaxed
        opacity-0 group-hover/tip:opacity-100 transition-opacity delay-100
        pointer-events-none z-[200]
        ${wide ? 'w-56 whitespace-normal' : 'whitespace-nowrap'}
      `}>
        {text}
        <div className={`absolute ${isDown ? 'bottom-full' : 'top-full'} left-1/2 -translate-x-1/2
          border-4 border-transparent ${isDown ? 'border-b-slate-600' : 'border-t-slate-600'}`}
        />
      </div>
    </div>
  );
}

/* ── Gender icon ──────────────────────────────────────────────────── */
function GenderIcon({ isFemale, size = 'text-base' }) {
  return isFemale
    ? <span className={`${size} font-bold text-pink-400`}>♀</span>
    : <span className={`${size} font-bold text-sky-400`}>♂</span>;
}

/* ── Stat row ─────────────────────────────────────────────────────── */
function StatRow({ def, value, levels }) {
  const pct      = Math.min(100, (value / def.max) * 100);
  const display  = def.fmt ? def.fmt(value) : Math.round(value).toLocaleString();
  const hasPoints = levels && levels.total != null && levels.total >= 0;
  const totalPts  = hasPoints ? (levels.total ?? levels.wild) : null;

  return (
    <div className="grid items-center gap-1.5"
         style={{ gridTemplateColumns: '1.2rem 3.8rem 1fr 4.5rem 2rem' }}>
      <span className="text-xs text-center leading-none">{def.icon}</span>
      <span className="text-[11px] text-slate-400 truncate">{def.label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, backgroundColor: def.color }} />
      </div>

      <div className="flex items-center justify-end">
        <span className="text-[11px] font-semibold text-slate-300 font-mono tabular-nums">{display}</span>
      </div>
      <div className="flex items-center justify-end">
        {hasPoints ? (
          <Tooltip text={`Estimated total stat points: ${totalPts}`} direction="up">
            <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded text-[11px] font-bold leading-none border border-sky-500/30 tabular-nums cursor-help">
              {totalPts}
            </span>
          </Tooltip>
        ) : (
          <Tooltip text="Stat points unavailable — species not in database" direction="up">
            <span className="px-1.5 py-0.5 bg-slate-700/40 text-slate-600 rounded text-[11px] font-bold leading-none border border-slate-700/40 tabular-nums cursor-help">
              ?
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ── Color region tile (with ID on swatch) ────────────────────────── */
function ColorTile({ index, hex, regionName }) {
  const isEmpty  = !hex || hex === '#000000';
  const isUnused = isEmpty && !regionName;
  const nearest  = !isEmpty ? findNearestArkColor(hex) : null;

  const shortLabel = regionName
    ? (regionName.length > 9 ? regionName.split(' ')[0] : regionName)
    : `R${index}`;

  const fullTip = isUnused
    ? `Region ${index}: Unused by this species`
    : isEmpty
      ? `${regionName || `Region ${index}`}: No color assigned`
      : `${regionName || `Region ${index}`}  ·  #${nearest?.id ?? '?'} ${nearest?.name ?? hex}`;

  return (
    <Tooltip text={fullTip}>
      <div className={`flex items-center gap-1.5 rounded-lg p-1.5 cursor-default w-full transition-opacity
        ${isUnused ? 'bg-slate-900/40 opacity-40' : 'bg-ark-dark'}`}>

        {/* Swatch with ID overlaid */}
        <div className="relative w-8 h-8 rounded-md flex-shrink-0 border border-white/10 overflow-hidden"
             style={{ backgroundColor: isEmpty ? '#111827' : hex }}>
          {isUnused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-slate-700 text-[10px] font-bold">✕</span>
            </div>
          )}
          {!isUnused && nearest && (
            <div className="absolute bottom-0 inset-x-0 bg-black/55 text-center leading-none py-[2px]">
              <span className="text-[9px] font-bold text-white/90">{nearest.id}</span>
            </div>
          )}
        </div>

        {/* Label + color name */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[9px] font-semibold text-slate-500 truncate leading-tight">{shortLabel}</p>
          {isUnused ? (
            <p className="text-[9px] text-slate-600 leading-tight">Unused</p>
          ) : isEmpty ? (
            <p className="text-[9px] text-slate-500 leading-tight">None</p>
          ) : (
            <p className="text-[9px] leading-tight truncate font-medium text-slate-200">
              {nearest?.name || hex}
            </p>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

/* ── 2×2 info badge ───────────────────────────────────────────────── */
function Badge({ value, label, sub, color = 'text-slate-200', tooltip, direction = 'down' }) {
  const inner = (
    <div className="bg-ark-dark rounded-xl p-2.5 text-center h-full">
      <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5 font-semibold">{label}</p>
      {sub && <p className="text-[9px] text-slate-600 mt-1 leading-tight">{sub}</p>}
    </div>
  );
  if (tooltip) {
    return (
      <Tooltip text={tooltip} wide direction={direction}>
        <div className="cursor-help h-full">{inner}</div>
      </Tooltip>
    );
  }
  return inner;
}

/* ── Main component ───────────────────────────────────────────────── */
export default function DinoDetail({
  dino: baseDino, colorMap, onClose, onExport,
  onComboSelect, initialSelectedCombo, initialCustomName,
}) {
  const [dino, setDino]                 = useState(baseDino);
  const [imgError, setImgError]         = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(initialSelectedCombo || null);
  const [customName, setCustomName]     = useState(initialCustomName || '');

  useEffect(() => {
    if (!baseDino?.id) return;
    setDino(baseDino);
    setImgError(false);
    setSelectedCombo(initialSelectedCombo || null);
    setCustomName(initialCustomName || '');
    axios.get(`/api/dinos/${baseDino.id}`)
      .then(r => setDino(r.data))
      .catch(() => {});
  }, [baseDino?.id]);

  if (!dino) return null;

  const mutations   = (dino.mutationsMale || 0) + (dino.mutationsFemale || 0);
  const imprintPct  = Math.round((dino.imprint || 0) * 100);
  const tePct       = Math.round((dino.tamingEffectiveness || 0) * 100);
  const mapCls      = MAP_CLASSES[dino.map] || 'map-default';
  const statLevels  = dino.statLevels  || null;
  const regionNames = dino.regionNames || null;

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

  const combos      = matchColorCombos(activeColorNames);
  const activeCombo = selectedCombo || combos[0] || null;
  // The name shown in header and used for export
  const effectiveName = customName.trim() || activeCombo?.name || null;

  function handleComboClick(combo) {
    const next = selectedCombo?.name === combo.name ? null : combo;
    setSelectedCombo(next);
    fireCallback(next, customName);
  }

  function handleCustomNameChange(val) {
    setCustomName(val);
    fireCallback(selectedCombo, val);
  }

  function fireCallback(combo, custom) {
    onComboSelect?.(dino.id, {
      combo,
      custom: custom.trim(),
    });
  }

  const visibleStats = STATS.filter(def => (dino.stats?.[def.key] || 0) > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-content bg-ark-panel border border-ark-border rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ark-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <GenderIcon isFemale={dino.isFemale} size="text-sm" />
                {dino.dinoName || <span className="italic text-slate-500 font-normal">Unnamed</span>}
              </h2>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${mapCls}`}>{dino.map}</span>
              {dino.isCryopodded && (
                <span className="text-[10px] bg-blue-900/40 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded-md">🧊 Cryopod</span>
              )}
              {effectiveName && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-900/50 text-indigo-200 border border-indigo-600/50">
                  {activeCombo ? (CATEGORY_ICONS[activeCombo.category] || '✦') : '✦'} {effectiveName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {dino.species}
              <span className="mx-1.5 text-slate-700">·</span>
              <span className="text-ark-gold font-bold">Lv {dino.level}</span>
              {dino.ownerName && <><span className="mx-1.5 text-slate-700">·</span>{dino.ownerName}</>}
            </p>
          </div>
          <button
            onClick={() => onExport?.([dino])}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors flex-shrink-0"
            title="Export as JPG"
          >⬇</button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-100 hover:bg-white/10 transition-colors flex-shrink-0"
          >✕</button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="flex flex-row flex-1 overflow-hidden min-h-0">

          {/* ── Left column ─────────────────────────────────────────── */}
          <div className="w-[38%] flex-shrink-0 flex flex-col border-r border-ark-border overflow-hidden">

            {/* Image */}
            <div className="flex-shrink-0 flex items-center justify-center"
                 style={{ height: '185px', background: 'radial-gradient(ellipse at 50% 60%, #252b4a 0%, #0f1220 100%)' }}>
              {!imgError ? (
                <img src={`/api/render/${dino.id}`} alt={dino.species}
                     className="w-full h-full object-contain" onError={() => setImgError(true)} />
              ) : (
                <div className="flex flex-col items-center text-slate-700 gap-1">
                  <span className="text-5xl">🦕</span>
                  <span className="text-xs">{dino.species}</span>
                </div>
              )}
            </div>

            {/* Color regions + combos */}
            <div className="p-3 flex flex-col gap-2 flex-1 overflow-hidden">

              <p className="section-label mb-0">Color Regions</p>

              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 6 }, (_, i) => {
                  const hex = dino.colorHex?.[i] || colorMap[dino.colors?.[i]]?.hex || null;
                  return <ColorTile key={i} index={i} hex={hex} regionName={regionNames?.[i]} />;
                })}
              </div>

              {/* Color combo picker */}
              <div className="mt-0.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                  Color Combos — click to select
                </p>
                {combos.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {combos.map(c => {
                      const isActive = selectedCombo?.name === c.name || (!selectedCombo && c === combos[0]);
                      return (
                        <Tooltip key={c.name} text={`${CATEGORY_LABELS[c.category]}: ${c.colors.join(' + ')}`}>
                          <button
                            onClick={() => handleComboClick(c)}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all
                              ${isActive
                                ? 'bg-indigo-600/40 border-indigo-500 text-indigo-200 shadow-sm shadow-indigo-900/50'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-indigo-600 hover:text-indigo-300'
                              }`}
                          >
                            {CATEGORY_ICONS[c.category]} {c.name}
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-700 mb-2">No combo matched — enter a custom name below.</p>
                )}

                {/* Custom name input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customName}
                    onChange={e => handleCustomNameChange(e.target.value)}
                    placeholder={activeCombo?.name || 'Custom combo name…'}
                    maxLength={30}
                    className="flex-1 min-w-0 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1.5
                               text-[11px] text-slate-200 placeholder-slate-600
                               focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-colors"
                  />
                  {customName && (
                    <button
                      onClick={() => handleCustomNameChange('')}
                      className="text-slate-600 hover:text-slate-400 text-sm flex-shrink-0"
                      title="Clear custom name"
                    >✕</button>
                  )}
                </div>
                <p className="text-[9px] text-slate-700 mt-1">Overrides the suggested combo name</p>
              </div>
            </div>
          </div>

          {/* ── Right column ──────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* 2×2 Badge grid */}
            <div className="grid grid-cols-2 gap-1.5 px-3 py-2.5 border-b border-ark-border/50 flex-shrink-0">
              <Badge
                value={mutations}
                label="Mutations"
                sub={`♂ ${dino.mutationsMale || 0}  ·  ♀ ${dino.mutationsFemale || 0}`}
                color={mutations > 0 ? 'text-purple-400' : 'text-slate-600'}
                tooltip="Total mutations across both parents. Each mutation adds 2 wild levels to one random stat. 20 per parent is the common cap."
                direction="down"
              />
              <Badge
                value={`${imprintPct}%`}
                label="Imprint"
                color={imprintPct >= 100 ? 'text-ark-green' : imprintPct > 0 ? 'text-slate-200' : 'text-slate-600'}
                tooltip="Imprint quality (0–100%). A 100% imprint grants a 30% stat boost while the imprinter is riding the dino."
                direction="down"
              />
              <Badge
                value={breedScore}
                label="Breed Score"
                color="text-ark-accent"
                tooltip="Breed Score = Melee 30% + Health 25% + Imprint 20% + Mutations 15% + Taming Eff. 10%. Max 100."
                direction="up"
              />
              <Badge
                value={`${tePct}%`}
                label="Taming Eff."
                color="text-slate-300"
                tooltip="Taming Effectiveness. Higher TE means better post-tame bonus levels in melee and other stats."
                direction="up"
              />
            </div>

            {/* Stats */}
            <div className="px-3 pt-2.5 pb-1 flex flex-col gap-1.5 flex-1 overflow-hidden">
              <div className="flex-shrink-0 mb-0.5">
                <p className="section-label mb-0">Statistics</p>
              </div>

              <div className="flex flex-col gap-1.5">
                {visibleStats.map(def => {
                  const value = dino.stats?.[def.key] || 0;
                  return (
                    <StatRow key={def.key} def={def} value={value} levels={statLevels?.[def.key] || null} />
                  );
                })}
              </div>
            </div>

            {/* Details footer */}
            <div className="px-3 py-2 border-t border-ark-border/40 flex-shrink-0 bg-ark-dark/30">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {dino.ownerName    && <span className="text-[10px] text-slate-500">Owner: <span className="text-slate-300">{dino.ownerName}</span></span>}
                {dino.tribeName    && <span className="text-[10px] text-slate-500">Tribe: <span className="text-indigo-300">{dino.tribeName}</span></span>}
                {dino.imprinterName && <span className="text-[10px] text-slate-500">Imprinter: <span className="text-slate-300">{dino.imprinterName}</span></span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
