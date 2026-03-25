/**
 * ARK Dino Color Visualizer — Express Backend
 *
 * Endpoints:
 *   GET  /api/dinos            — list all dinos (with filters)
 *   GET  /api/dinos/meta       — distinct maps + species
 *   GET  /api/dinos/insights   — cross-map best stats + breed suggestions
 *   GET  /api/dinos/:id        — single dino
 *   POST /api/dinos/parse      — trigger save file re-parse
 *   POST /api/dinos/load-demo  — load demo data
 *   GET  /api/render/:id       — render dino as PNG
 *   GET  /api/render/preview   — render by species + color IDs
 *   WS   ws://localhost:3001   — real-time updates from file watcher
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const dinoRoutes = require('./routes/dinos');
const renderRoutes = require('./routes/render');
const { startWatcher } = require('./watcher');
const { upsertDinos, getDinos } = require('./db');
const { parseAllArkFiles } = require('./parser/arkParser');

const PORT     = process.env.PORT ? Number(process.env.PORT) : 3001;
const SAVE_DIR = 'D:\\SteamLibrary\\steamapps\\common\\ARK Survival Ascended\\ShooterGame\\Saved\\SaveGames';

// Frontend dist is always at ../frontend/dist relative to this file
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve cached rendered images statically
app.use('/cache', express.static(path.join(__dirname, '..', 'cache')));

// Serve built React frontend (production / Electron mode)
const fs = require('fs');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback — serve index.html for any non-API route
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/dinos', dinoRoutes);
app.use('/api/render', renderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('[ws] Client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'ARK Dino Visualizer live updates active' }));
  ws.on('close', () => console.log('[ws] Client disconnected'));
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function startup() {
  // Try to parse real save files first
  let dinoCount = 0;
  try {
    const dinos = parseAllArkFiles(SAVE_DIR);
    if (dinos.length > 0) {
      upsertDinos(dinos);
      dinoCount = dinos.length;
      console.log(`[startup] Loaded ${dinoCount} dinos from save files`);
    }
  } catch (err) {
    console.warn(`[startup] Could not parse save files: ${err.message}`);
  }

  if (dinoCount === 0) {
    const existing = getDinos();
    console.log(`[startup] Using ${existing.length} dinos from database`);
  }

  // Start file watcher
  startWatcher(wss, SAVE_DIR);

  // Start HTTP server
  server.listen(PORT, () => {
    console.log(`[server] ARK Dino Visualizer API running on http://localhost:${PORT}`);
    console.log(`[server] WebSocket available on ws://localhost:${PORT}`);
    // Signal to Electron main process that the server is ready
    if (process.send) process.send('ready');
  });
}

startup().catch(err => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
