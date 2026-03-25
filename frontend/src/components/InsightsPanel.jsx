import React, { useEffect, useState } from 'react';
import axios from 'axios';

const STAT_LABELS = {
  stat_health:  { label: 'Best Health',  icon: '❤️',  color: '#ff5a5a' },
  stat_stamina: { label: 'Best Stamina', icon: '⚡',  color: '#f5a623' },
  stat_melee:   { label: 'Best Melee',   icon: '⚔️',  color: '#ff8c42' },
  stat_weight:  { label: 'Best Weight',  icon: '⚖️',  color: '#a855f7' },
  stat_speed:   { label: 'Best Speed',   icon: '💨',  color: '#60efff' },
};

function BestStatSection({ statKey, entries }) {
  const meta = STAT_LABELS[statKey];
  if (!meta || !entries?.length) return null;

  return (
    <div className="bg-ark-dark rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{meta.icon}</span>
        <h4 className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</h4>
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400 truncate">{e.map}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300 truncate">{e.dino_name || e.species}</span>
            </div>
            <span className="font-mono text-slate-200 ml-2 flex-shrink-0">
              {statKey === 'stat_melee' || statKey === 'stat_speed'
                ? `${(e.value * 100).toFixed(0)}%`
                : Math.round(e.value).toLocaleString()
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreedSuggestion({ suggestion }) {
  return (
    <div className="bg-ark-dark rounded-xl p-4 border border-ark-border">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🧬</span>
        <span className="text-xs font-semibold text-ark-gold">Cross-Map Breed Opportunity</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{suggestion.reason}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-ark-panel rounded p-2">
          <p className="text-slate-500 mb-0.5">♂ {suggestion.male.map}</p>
          <p className="text-slate-200 font-medium">{suggestion.male.name || suggestion.male.species}</p>
          <p className="text-orange-400">Melee {(suggestion.male.melee * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-ark-panel rounded p-2">
          <p className="text-slate-500 mb-0.5">♀ {suggestion.female.map}</p>
          <p className="text-slate-200 font-medium">{suggestion.female.name || suggestion.female.species}</p>
          <p className="text-red-400">HP {Math.round(suggestion.female.health).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function InsightsPanel({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dinos/insights')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-ark-panel border border-ark-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ark-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Cross-Map Insights</h2>
              <p className="text-xs text-slate-500">Best stats per map + breeding opportunities</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <div className="animate-spin w-6 h-6 border-2 border-ark-accent border-t-transparent rounded-full mr-3" />
              Loading insights...
            </div>
          ) : !data ? (
            <p className="text-center text-slate-500 py-12">No data available.</p>
          ) : (
            <>
              {/* Best per stat per map */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Best Per Stat Per Map
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(STAT_LABELS).map(([key]) => (
                    <BestStatSection key={key} statKey={key} entries={data.best?.[key] || []} />
                  ))}
                </div>
              </div>

              {/* Breed suggestions */}
              {data.suggestions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Breeding Suggestions
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {data.suggestions.map((s, i) => (
                      <BreedSuggestion key={i} suggestion={s} />
                    ))}
                  </div>
                </div>
              )}

              {(!data.suggestions || data.suggestions.length === 0) && (
                <div className="text-center text-slate-500 py-6 bg-ark-dark rounded-xl">
                  <p className="text-2xl mb-2">🧬</p>
                  <p className="text-sm">No cross-map breed pairs found yet.</p>
                  <p className="text-xs mt-1">Load dinos from multiple maps to see suggestions.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
