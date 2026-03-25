import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import DinoCard from './components/DinoCard.jsx';
import DinoDetail from './components/DinoDetail.jsx';
import FilterBar from './components/FilterBar.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import ImportModal from './components/ImportModal.jsx';
import ExportCard from './components/ExportCard.jsx';
import { ARK_COLORS_FRONTEND } from './colorData.js';

const POLL_INTERVAL = 30000;

/* ── Export helpers ──────────────────────────────────────────────────── */

/**
 * Renders an ExportCard into a hidden off-screen container and captures it
 * with html2canvas, then returns the canvas element.
 */
async function captureExportCard(dino, comboOverride) {
  return new Promise((resolve, reject) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position:fixed;left:-9999px;top:0;z-index:-1;width:700px;pointer-events:none;';
    document.body.appendChild(wrapper);

    const root = createRoot(wrapper);
    root.render(
      <ExportCard dino={dino} colorMap={ARK_COLORS_FRONTEND} comboOverride={comboOverride} />
    );

    // Wait for React render + image load
    const wait = 600;
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(wrapper.firstChild, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0d0f1a',
          logging: false,
        });
        root.unmount();
        document.body.removeChild(wrapper);
        resolve(canvas);
      } catch (err) {
        root.unmount();
        document.body.removeChild(wrapper);
        reject(err);
      }
    }, wait);
  });
}

/**
 * Stitches multiple canvases into a single-column image and triggers download.
 */
function stitchAndDownload(canvases, filename = 'ark-dinos') {
  if (canvases.length === 0) return;

  const GAP   = 16;  // px between cards (at 1x; html2canvas uses scale:2 so actual is GAP*2 px)
  const PAD   = 24;
  const W     = canvases[0].width;
  const H     = canvases[0].height;
  const total = canvases.length;

  // Layout: 2 per row
  const COLS  = Math.min(2, total);
  const ROWS  = Math.ceil(total / COLS);
  const CARD_GAP = GAP * 2;  // gap in canvas px (2x scale)
  const PADDING  = PAD * 2;

  const finalW = COLS * W + (COLS - 1) * CARD_GAP + PADDING * 2;
  const finalH = ROWS * H + (ROWS - 1) * CARD_GAP + PADDING * 2;

  const final = document.createElement('canvas');
  final.width  = finalW;
  final.height = finalH;
  const ctx = final.getContext('2d');
  ctx.fillStyle = '#080a12';
  ctx.fillRect(0, 0, finalW, finalH);

  canvases.forEach((canvas, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = PADDING + col * (W + CARD_GAP);
    const y = PADDING + row * (H + CARD_GAP);
    ctx.drawImage(canvas, x, y);
  });

  final.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `${filename}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.93);
}

/* ── Main App ──────────────────────────────────────────────────────────── */
export default function App() {
  const [dinos, setDinos]             = useState([]);
  const [total, setTotal]             = useState(0);
  const [filters, setFilters]         = useState({ sortBy: 'level', sortDir: 'desc' });
  const [maps, setMaps]               = useState([]);
  const [species, setSpecies]         = useState([]);
  const [selectedDino, setSelectedDino] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [dataSource, setDataSource]   = useState('');
  const [liveStatus, setLiveStatus]   = useState('connecting');
  const [notification, setNotification] = useState(null);

  // Export / multi-select state
  const [selectMode, setSelectMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exporting, setExporting]     = useState(false);

  // Per-dino user-selected combo name { [dinoId]: combo object }
  const [dinoComboNames, setDinoComboNames] = useState({});
  // Per-dino custom combo name string { [dinoId]: string }
  const [dinoCustomNames, setDinoCustomNames] = useState({});

  const wsRef   = useRef(null);
  const pollRef = useRef(null);

  // ── Fetch dinos ──────────────────────────────────────────────────────
  const fetchDinos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, v));
      const res = await axios.get(`/api/dinos?${params}`);
      setDinos(res.data.dinos);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to fetch dinos:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await axios.get('/api/dinos/meta');
      setMaps(res.data.maps);
      setSpecies(res.data.species);
    } catch {}
  }, []);

  // ── WebSocket ────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(`ws://${window.location.hostname}:3001`);
    wsRef.current = ws;
    ws.onopen  = () => { setLiveStatus('live'); if (pollRef.current) clearInterval(pollRef.current); };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'dinos_updated') { fetchDinos(); fetchMeta(); notify(`🔄 ${msg.message}`, 'green'); }
        else if (msg.type === 'parse_error') notify(`⚠️ Parse error: ${msg.error}`, 'red');
      } catch {}
    };
    ws.onclose = () => {
      setLiveStatus('disconnected');
      pollRef.current = setInterval(fetchDinos, POLL_INTERVAL);
      setTimeout(connectWS, 5000);
    };
    ws.onerror = () => ws.close();
  }, [fetchDinos, fetchMeta]);

  useEffect(() => {
    connectWS();
    return () => { wsRef.current?.close(); if (pollRef.current) clearInterval(pollRef.current); };
  }, [connectWS]);

  useEffect(() => { fetchDinos(); }, [fetchDinos]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  // ── Notifications ────────────────────────────────────────────────────
  function notify(message, color = 'blue') {
    setNotification({ message, color });
    setTimeout(() => setNotification(null), 4000);
  }

  // ── Actions ──────────────────────────────────────────────────────────
  async function handleParse() {
    setLoading(true);
    notify('Parsing save files...', 'blue');
    try {
      const res = await axios.post('/api/dinos/parse');
      setDataSource(res.data.source);
      await fetchDinos(); await fetchMeta();
      notify(res.data.message, res.data.count > 0 ? 'green' : 'blue');
    } catch (err) {
      notify('Parse failed: ' + err.message, 'red');
    } finally { setLoading(false); }
  }

  async function handleLoadDemo() {
    setLoading(true);
    try {
      const res = await axios.post('/api/dinos/load-demo');
      setDataSource('demo');
      await fetchDinos(); await fetchMeta();
      notify(`Loaded ${res.data.count} demo dinos`, 'green');
    } catch (err) {
      notify('Failed: ' + err.message, 'red');
    } finally { setLoading(false); }
  }

  // ── Toggle selection ─────────────────────────────────────────────────
  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function selectAll() {
    setSelectedIds(new Set(dinos.map(d => d.id)));
  }

  // ── Export ───────────────────────────────────────────────────────────
  async function handleExport(dinosToExport) {
    if (!dinosToExport || dinosToExport.length === 0) return;
    setExporting(true);
    notify(`Generating export for ${dinosToExport.length} dino${dinosToExport.length > 1 ? 's' : ''}…`, 'blue');

    try {
      // Fetch full data (with statLevels & regionNames) for each dino
      const fullDinos = await Promise.all(
        dinosToExport.map(d =>
          axios.get(`/api/dinos/${d.id}`).then(r => r.data).catch(() => d)
        )
      );

      // Capture each card
      const canvases = [];
      for (const d of fullDinos) {
        const comboOverride = dinoCustomNames[d.id] || dinoComboNames[d.id]?.name || null;
        const canvas = await captureExportCard(d, comboOverride);
        canvases.push(canvas);
      }

      const nameHint = fullDinos.length === 1
        ? (fullDinos[0].dinoName || fullDinos[0].species).replace(/\s+/g, '-').toLowerCase()
        : 'dinos';

      stitchAndDownload(canvases, `ark-${nameHint}`);
      notify(`✅ Exported ${canvases.length} dino card${canvases.length > 1 ? 's' : ''}`, 'green');
    } catch (err) {
      console.error('Export failed:', err);
      notify('Export failed: ' + err.message, 'red');
    } finally {
      setExporting(false);
    }
  }

  // Export selected from selection mode
  async function handleExportSelected() {
    const toExport = dinos.filter(d => selectedIds.has(d.id));
    await handleExport(toExport);
  }

  const notifColors = {
    blue:  'bg-blue-900/80 border-blue-600 text-blue-200',
    green: 'bg-green-900/80 border-green-600 text-green-200',
    red:   'bg-red-900/80 border-red-600 text-red-200',
  };

  const selCount = selectedIds.size;

  return (
    <div className="min-h-screen bg-ark-dark text-slate-100 font-ark">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="bg-ark-panel border-b border-ark-border px-6 py-4 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦕</span>
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight">ARK Dino Color Visualizer</h1>
              <p className="text-xs text-slate-500">ASA Save File Reader & Color Renderer</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`live-dot w-2 h-2 rounded-full ${
                liveStatus === 'live' ? 'bg-green-400' : liveStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-slate-500">
                {liveStatus === 'live' ? 'Live' : liveStatus === 'connecting' ? 'Connecting…' : 'Offline'}
              </span>
            </div>

            {dataSource === 'demo' && (
              <span className="text-xs bg-yellow-900/50 border border-yellow-700 text-yellow-400 px-2 py-0.5 rounded-full">
                Demo Data
              </span>
            )}

            <button
              onClick={() => setShowImport(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-900/30 border border-purple-600 text-purple-300 hover:bg-purple-900/50 transition-colors"
            >
              📥 Import .ini
            </button>

            <button
              onClick={() => setShowInsights(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-ark-gold/20 border border-ark-gold text-ark-gold hover:bg-ark-gold/30 transition-colors"
            >
              📊 Insights
            </button>

            {/* Select / Export mode toggle */}
            {!selectMode ? (
              <button
                onClick={() => setSelectMode(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-600 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
              >
                ☐ Select &amp; Export
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {selCount} selected
                </span>
                {selCount < dinos.length && (
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    All
                  </button>
                )}
                <button
                  onClick={handleExportSelected}
                  disabled={selCount === 0 || exporting}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-semibold
                    ${selCount > 0 && !exporting
                      ? 'bg-emerald-700/40 border-emerald-500 text-emerald-300 hover:bg-emerald-700/60'
                      : 'bg-slate-800/40 border-slate-700 text-slate-600 cursor-not-allowed'
                    }`}
                >
                  {exporting ? '⏳ Exporting…' : `⬇ Export ${selCount > 0 ? selCount : ''}`}
                </button>
                <button
                  onClick={exitSelectMode}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Notification toast ──────────────────────────────────────── */}
      {notification && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`border rounded-xl px-4 py-3 text-sm shadow-xl backdrop-blur-sm ${notifColors[notification.color]}`}>
            {notification.message}
          </div>
        </div>
      )}

      {/* ── Export mode banner ──────────────────────────────────────── */}
      {selectMode && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/40 px-6 py-2">
          <p className="max-w-screen-xl mx-auto text-xs text-emerald-400">
            ☐ Click dinos to select them, then click <strong>Export</strong> to save as JPG.
            {selCount > 0 && <span className="ml-2 font-semibold">{selCount} dino{selCount > 1 ? 's' : ''} selected.</span>}
          </p>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-5">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          maps={maps}
          species={species}
          total={total}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
            <div className="animate-spin w-10 h-10 border-2 border-ark-accent border-t-transparent rounded-full" />
            <p>Loading dinos…</p>
          </div>
        ) : dinos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
            <span className="text-5xl">🦕</span>
            <p className="text-lg">No dinos imported yet.</p>
            <p className="text-sm text-center max-w-sm">
              In ARK, open a tamed dino's inventory and click <strong>Export Dino</strong>,
              then use <strong>📥 Import .ini</strong> above to add them here.
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="mt-2 px-5 py-2.5 bg-purple-900/30 border border-purple-600 text-purple-300 rounded-lg text-sm hover:bg-purple-900/50 transition-colors"
            >
              📥 Import .ini Files
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {dinos.map(dino => (
              <DinoCard
                key={dino.id}
                dino={dino}
                colorMap={ARK_COLORS_FRONTEND}
                onClick={setSelectedDino}
                selectedComboName={dinoComboNames[dino.id]?.name || null}
                onDelete={(id) => {
                  if (selectedDino?.id === id) setSelectedDino(null);
                  setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                  fetchDinos();
                  fetchMeta();
                  notify('Dino deleted', 'green');
                }}
                selectMode={selectMode}
                isSelected={selectedIds.has(dino.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {selectedDino && !selectMode && (
        <DinoDetail
          dino={selectedDino}
          colorMap={ARK_COLORS_FRONTEND}
          onClose={() => setSelectedDino(null)}
          onExport={handleExport}
          initialSelectedCombo={dinoComboNames[selectedDino.id] || null}
          initialCustomName={dinoCustomNames[selectedDino.id] || ''}
          onComboSelect={(dinoId, { combo, custom }) => {
            setDinoComboNames(prev => ({ ...prev, [dinoId]: combo }));
            setDinoCustomNames(prev => ({ ...prev, [dinoId]: custom || '' }));
          }}
        />
      )}
      {showInsights && <InsightsPanel onClose={() => setShowInsights(false)} />}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false);
            fetchDinos(); fetchMeta();
            notify(`Imported ${count} dino${count !== 1 ? 's' : ''} from .ini`, 'green');
          }}
        />
      )}
    </div>
  );
}
