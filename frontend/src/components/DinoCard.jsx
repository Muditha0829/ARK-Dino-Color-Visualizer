import React, { useState } from 'react';
import axios from 'axios';
import { findNearestArkColor } from '../colorData.js';
import { matchColorCombos, CATEGORY_ICONS } from '../colorCombos.js';

const MAP_CLASSES = {
  'The Island':    'map-island',
  'Scorched Earth':'map-scorched',
  'Aberration':    'map-aberration',
  'Extinction':    'map-extinction',
  'The Center':    'map-center',
  'Fjordur':       'map-fjordur',
  'Ragnarok':      'map-ragnarok',
  'Crystal Isles': 'map-crystal',
  'Lost Colony':   'map-colony',
};

export default function DinoCard({
  dino, colorMap, onClick, onDelete,
  selectMode, isSelected, onToggleSelect,
  selectedComboName,   // override combo from App (user-selected)
}) {
  const [imgError, setImgError]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const mutations  = (dino.mutationsMale || 0) + (dino.mutationsFemale || 0);
  const imprintPct = Math.round((dino.imprint || 0) * 100);
  const mapCls     = MAP_CLASSES[dino.map] || 'map-default';

  // Auto-detect color combo from available color data
  const activeColorNames = Array.from({ length: 6 }, (_, i) => {
    const hex = dino.colorHex?.[i] || colorMap[dino.colors?.[i]]?.hex || null;
    const isEmpty = !hex || hex === '#101010' || hex === '#000000';
    return isEmpty ? null : (findNearestArkColor(hex)?.name || null);
  }).filter(Boolean);

  const autoCombo  = matchColorCombos(activeColorNames)[0] || null;
  const comboName  = selectedComboName || autoCombo?.name  || null;
  const comboCategory = selectedComboName
    ? (matchColorCombos(activeColorNames).find(c => c.name === selectedComboName)?.category)
    : autoCombo?.category;

  async function handleDelete(e) {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500); return; }
    setDeleting(true);
    try { await axios.delete(`/api/dinos/${dino.id}`); onDelete?.(dino.id); }
    catch { setDeleting(false); setConfirmDelete(false); }
  }

  function handleCardClick() {
    if (selectMode) onToggleSelect?.(dino.id);
    else onClick(dino);
  }

  return (
    <div
      className={`dino-card bg-ark-card border rounded-2xl overflow-hidden cursor-pointer
        ${isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-900/30'
          : 'border-ark-border'
        }`}
      onClick={handleCardClick}
    >
      {/* ── Image area ───────────────────────────────────────────── */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: '4/3',
          background: 'radial-gradient(ellipse at 50% 60%, #252b4a 0%, #111422 100%)',
        }}
      >
        {!imgError ? (
          <img
            src={`/api/render/${dino.id}`}
            alt={dino.species}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <span className="text-5xl">🦕</span>
          </div>
        )}

        {/* Cryopod overlay */}
        {dino.isCryopodded && (
          <div className="absolute inset-0 bg-blue-900/50 flex items-center justify-center">
            <span className="text-3xl">🧊</span>
          </div>
        )}

        {/* Selection checkbox (select mode) */}
        {selectMode && (
          <button
            onClick={e => { e.stopPropagation(); onToggleSelect?.(dino.id); }}
            className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center text-xs border transition-all
              ${isSelected
                ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg'
                : 'bg-black/60 border-white/30 text-transparent hover:border-indigo-400'
              }`}
          >
            {isSelected ? '✓' : ''}
          </button>
        )}

        {/* Delete button — hover only, not in select mode */}
        {!selectMode && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`delete-btn absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-all
              ${confirmDelete
                ? 'bg-red-500 border-red-400 text-white scale-110'
                : 'bg-black/60 border-white/20 text-slate-400 hover:border-red-500 hover:text-red-400'
              }`}
            title={confirmDelete ? 'Confirm delete?' : 'Delete'}
          >
            {deleting ? '…' : '×'}
          </button>
        )}

        {/* Color strip — bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 flex h-[6px]">
          {Array.from({ length: 6 }, (_, i) => {
            const hex = dino.colorHex?.[i] || colorMap[dino.colors?.[i]]?.hex;
            return <div key={i} className="flex-1" style={{ backgroundColor: hex || '#1e2236' }} />;
          })}
        </div>
      </div>

      {/* ── Info area ────────────────────────────────────────────── */}
      <div className="p-2.5">

        {/* Name + Level */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="font-semibold text-slate-100 truncate leading-tight text-sm">
            <span className={`mr-0.5 font-bold ${dino.isFemale ? 'text-pink-400' : 'text-sky-400'}`}>{dino.isFemale ? '♀' : '♂'}</span>
            {dino.dinoName || <span className="text-slate-500 italic font-normal">Unnamed</span>}
          </p>
          <span className="text-xs font-bold text-ark-gold flex-shrink-0">Lv {dino.level}</span>
        </div>

        {/* Species */}
        <p className="text-[11px] text-slate-500 truncate">{dino.species}</p>

        {/* Map + Combo badges row */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${mapCls}`}>
            {dino.map}
          </span>
          {comboName && (
            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 truncate max-w-[7rem]">
              {CATEGORY_ICONS?.[comboCategory]} {comboName}
            </span>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex gap-1 mt-1.5">
          <div className="flex-1 bg-ark-dark rounded-lg py-1.5 flex flex-col items-center">
            <span className={`text-xs font-bold leading-none ${mutations > 0 ? 'text-purple-400' : 'text-slate-600'}`}>
              {mutations}
            </span>
            <span className="text-[9px] text-slate-600 mt-0.5">Mut</span>
          </div>
          <div className="flex-1 bg-ark-dark rounded-lg py-1.5 flex flex-col items-center">
            <span className={`text-xs font-bold leading-none ${imprintPct >= 100 ? 'text-ark-green' : imprintPct > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
              {imprintPct}%
            </span>
            <span className="text-[9px] text-slate-600 mt-0.5">Imp</span>
          </div>
          <div className="flex-1 bg-ark-dark rounded-lg py-1.5 flex flex-col items-center">
            <span className="text-xs font-bold leading-none text-slate-400">
              {Math.round((dino.tamingEffectiveness || 0) * 100)}%
            </span>
            <span className="text-[9px] text-slate-600 mt-0.5">TE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
