import React from 'react';

const SORT_OPTIONS = [
  { value: 'level',               label: 'Level' },
  { value: 'imprint',             label: 'Imprint %' },
  { value: 'mutations_male',      label: 'Mutations' },
  { value: 'taming_effectiveness',label: 'Taming Eff.' },
  { value: 'stat_health',         label: 'Health' },
  { value: 'stat_melee',          label: 'Melee' },
  { value: 'dino_name',           label: 'Name' },
  { value: 'species',             label: 'Species' },
];

export default function FilterBar({ filters, onFilterChange, maps, species, total }) {
  const set = (key, value) => onFilterChange({ ...filters, [key]: value });

  return (
    <div className="bg-ark-panel border border-ark-border rounded-xl p-4 space-y-3">
      {/* Row 1: search + map + species */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="Search by name or species..."
            value={filters.search || ''}
            onChange={e => set('search', e.target.value)}
            className="w-full bg-ark-dark border border-ark-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-ark-accent"
          />
        </div>

        {/* Map */}
        <select
          value={filters.map || ''}
          onChange={e => set('map', e.target.value)}
          className="bg-ark-dark border border-ark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-ark-accent"
        >
          <option value="">All Maps</option>
          {maps.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Species */}
        <select
          value={filters.species || ''}
          onChange={e => set('species', e.target.value)}
          className="bg-ark-dark border border-ark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-ark-accent"
        >
          <option value="">All Species</option>
          {species.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Gender */}
        <select
          value={filters.gender || ''}
          onChange={e => set('gender', e.target.value)}
          className="bg-ark-dark border border-ark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-ark-accent"
        >
          <option value="">Any Gender</option>
          <option value="male">♂ Male</option>
          <option value="female">♀ Female</option>
        </select>

        {/* Cryopodded */}
        <select
          value={filters.cryopodded || ''}
          onChange={e => set('cryopodded', e.target.value)}
          className="bg-ark-dark border border-ark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-ark-accent"
        >
          <option value="">All Storage</option>
          <option value="false">Active</option>
          <option value="true">🧊 Cryopodded</option>
        </select>
      </div>

      {/* Row 2: ranges + sort */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Mutation range */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Mutations:</span>
          <input
            type="number" min="0" max="500" placeholder="min"
            value={filters.minMutations || ''}
            onChange={e => set('minMutations', e.target.value)}
            className="w-16 bg-ark-dark border border-ark-border rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-ark-accent"
          />
          <span>–</span>
          <input
            type="number" min="0" max="500" placeholder="max"
            value={filters.maxMutations || ''}
            onChange={e => set('maxMutations', e.target.value)}
            className="w-16 bg-ark-dark border border-ark-border rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-ark-accent"
          />
        </div>

        {/* Min imprint */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Min Imprint:</span>
          <input
            type="number" min="0" max="1" step="0.05" placeholder="0.0"
            value={filters.minImprint || ''}
            onChange={e => set('minImprint', e.target.value)}
            className="w-20 bg-ark-dark border border-ark-border rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-ark-accent"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 text-sm text-slate-400 ml-auto">
          <span>Sort:</span>
          <select
            value={filters.sortBy || 'level'}
            onChange={e => set('sortBy', e.target.value)}
            className="bg-ark-dark border border-ark-border rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-ark-accent"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => set('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}
            className="bg-ark-dark border border-ark-border rounded px-2 py-1 text-slate-300 hover:border-ark-accent hover:text-ark-accent transition-colors"
            title="Toggle sort direction"
          >
            {filters.sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Clear */}
        <button
          onClick={() => onFilterChange({ sortBy: 'level', sortDir: 'desc' })}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Clear filters
        </button>

        {/* Count */}
        <span className="text-xs text-slate-500">{total} dinos</span>
      </div>
    </div>
  );
}
