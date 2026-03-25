import { useState, useRef, useEffect } from 'react';

export default function ImportModal({ onClose, onImported }) {
  const [tab, setTab] = useState('scan'); // 'scan' | 'manual'
  const [scanFiles, setScanFiles] = useState(null); // null = loading, [] = none found
  const [selected, setSelected] = useState(new Set());
  const [manualFiles, setManualFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  // Auto-scan DinoExports folder on open
  useEffect(() => {
    fetch('/api/dinos/scan-exports')
      .then(r => r.json())
      .then(data => {
        setScanFiles(data.files || []);
        // Pre-select all
        setSelected(new Set((data.files || []).map(f => f.path)));
      })
      .catch(() => setScanFiles([]));
  }, []);

  function toggleSelect(filePath) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(filePath) ? next.delete(filePath) : next.add(filePath);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set((scanFiles || []).map(f => f.path)));
  }

  // Manual file drop/browse
  function addManualFiles(newFiles) {
    const iniFiles = Array.from(newFiles).filter(f => f.name.endsWith('.ini'));
    if (!iniFiles.length) { setStatus({ type: 'error', message: 'Please select .ini files.' }); return; }
    setManualFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...iniFiles.filter(f => !names.has(f.name))];
    });
    setStatus(null);
  }

  async function handleImportScan() {
    if (!selected.size) return;
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('/api/dinos/import-from-disk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [...selected] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      setStatus({ type: 'success', message: json.message });
      onImported(json.count);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally { setLoading(false); }
  }

  async function handleImportManual() {
    if (!manualFiles.length) return;
    setLoading(true); setStatus(null);
    try {
      const fileData = await Promise.all(manualFiles.map(f => f.text().then(content => ({ name: f.name, content }))));
      const res = await fetch('/api/dinos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      setStatus({ type: 'success', message: json.message });
      onImported(json.count);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally { setLoading(false); }
  }

  const formatSize = b => b > 1024 ? (b/1024).toFixed(1)+'KB' : b+'B';
  const formatTime = ms => new Date(ms).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3e]">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Dino Exports</h2>
            <p className="text-xs text-gray-400 mt-0.5">In ARK: open dino inventory → <strong>Export Dino</strong> button</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2d3e]">
          {[['scan', '📂 Auto-Scan'], ['manual', '📤 Manual']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${tab === id ? 'text-white border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'scan' ? (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Found in <span className="font-mono text-gray-400">DinoExports\</span>:
              </p>
              {scanFiles === null ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-6">
                  <div className="animate-spin w-4 h-4 border border-purple-400 border-t-transparent rounded-full" />
                  Scanning...
                </div>
              ) : scanFiles.length === 0 ? (
                <div className="text-gray-500 text-sm py-6 text-center">
                  No .ini files found in DinoExports folder.<br />
                  <span className="text-xs">Export a dino in ARK first.</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{selected.size}/{scanFiles.length} selected</span>
                    <button onClick={selectAll} className="text-xs text-purple-400 hover:text-purple-300">Select all</button>
                  </div>
                  <ul className="space-y-1.5">
                    {scanFiles.map(f => (
                      <li
                        key={f.path}
                        onClick={() => toggleSelect(f.path)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${selected.has(f.path) ? 'bg-purple-900/30 border border-purple-600/50' : 'bg-[#0d0f1a] border border-[#2a2d3e] hover:border-[#3a3d4e]'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selected.has(f.path) ? 'bg-purple-500 border-purple-400' : 'border-gray-600'}`}>
                          {selected.has(f.path) && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate">{f.name.replace('DinoExport_', '').replace('.ini', '')}</p>
                          <p className="text-xs text-gray-500">{formatSize(f.size)} · {formatTime(f.mtime)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-3 ${dragging ? 'border-purple-400 bg-purple-400/10' : 'border-[#3a3d4e] hover:border-[#5a5d6e]'}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addManualFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
              >
                <div className="text-3xl mb-2">📂</div>
                <p className="text-gray-300 text-sm font-medium">Drop .ini files here or click to browse</p>
                <input ref={inputRef} type="file" accept=".ini" multiple className="hidden" onChange={e => addManualFiles(e.target.files)} />
              </div>
              {manualFiles.length > 0 && (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {manualFiles.map(f => (
                    <li key={f.name} className="flex items-center justify-between bg-[#0d0f1a] rounded px-3 py-1.5 text-sm">
                      <span className="text-gray-300 truncate flex-1 mr-2">{f.name}</span>
                      <button onClick={() => setManualFiles(p => p.filter(x => x.name !== f.name))} className="text-gray-500 hover:text-red-400">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Status */}
        {status && (
          <div className={`mx-6 mb-3 rounded px-3 py-2 text-sm ${status.type === 'success' ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
            {status.message}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2d3e]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={tab === 'scan' ? handleImportScan : handleImportManual}
            disabled={loading || (tab === 'scan' ? !selected.size : !manualFiles.length)}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            {loading ? 'Importing…' : tab === 'scan' ? `Import ${selected.size} File${selected.size !== 1 ? 's' : ''}` : `Import ${manualFiles.length} File${manualFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
