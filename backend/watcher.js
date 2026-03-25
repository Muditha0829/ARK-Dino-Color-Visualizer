/**
 * File watcher using chokidar.
 * Watches the ARK SaveGames directory for changes to .ark files.
 * On change, re-parses affected files and broadcasts an update via WebSocket.
 */

const chokidar = require('chokidar');
const path = require('path');
const { parseArkFile } = require('./parser/arkParser');
const { upsertDinos } = require('./db');

const SAVE_DIR = path.join(
  'D:\\SteamLibrary\\steamapps\\common\\ARK Survival Ascended\\ShooterGame\\Saved\\SaveGames'
);

let wss = null; // WebSocket server reference, set via init()
let watcher = null;
let debounceTimers = {};

/**
 * Broadcast a JSON message to all connected WebSocket clients.
 */
function broadcast(type, payload = {}) {
  if (!wss) return;
  const msg = JSON.stringify({ type, ...payload });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(msg);
    }
  });
}

/**
 * Handle a changed/added .ark file.
 * Debounces rapid successive changes (save files are often written in chunks).
 */
function handleArkChange(filePath) {
  if (debounceTimers[filePath]) {
    clearTimeout(debounceTimers[filePath]);
  }

  debounceTimers[filePath] = setTimeout(async () => {
    delete debounceTimers[filePath];
    const fileName = path.basename(filePath);
    console.log(`[watcher] Detected change: ${fileName}`);
    broadcast('parse_start', { file: fileName });

    try {
      const dinos = parseArkFile(filePath);
      upsertDinos(dinos);
      console.log(`[watcher] Re-parsed ${fileName}: ${dinos.length} dinos`);
      broadcast('dinos_updated', {
        file: fileName,
        count: dinos.length,
        message: `Detected ${dinos.length} dinos in ${fileName}`,
      });
    } catch (err) {
      console.error(`[watcher] Parse error for ${fileName}: ${err.message}`);
      broadcast('parse_error', { file: fileName, error: err.message });
    }
  }, 1500); // 1.5s debounce
}

/**
 * Start the file watcher.
 * @param {object} websocketServer - ws.Server instance
 * @param {string} [saveDir] - override the default save directory
 */
function startWatcher(websocketServer, saveDir = SAVE_DIR) {
  wss = websocketServer;

  if (watcher) {
    watcher.close();
  }

  watcher = chokidar.watch(saveDir, {
    persistent: true,
    ignoreInitial: true,
    depth: 2,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 200,
    },
  });

  watcher
    .on('add',    filePath => filePath.endsWith('.ark') && handleArkChange(filePath))
    .on('change', filePath => filePath.endsWith('.ark') && handleArkChange(filePath))
    .on('error',  err => console.error('[watcher] Error:', err));

  console.log(`[watcher] Watching: ${saveDir}`);
  return watcher;
}

function stopWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

module.exports = { startWatcher, stopWatcher };
