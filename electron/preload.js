// Preload script — runs in renderer with access to Node APIs if needed.
// Currently empty; add contextBridge exposes here if needed in future.
window.addEventListener('DOMContentLoaded', () => {
  // Mark as running inside Electron so the UI can show native hints
  document.documentElement.setAttribute('data-electron', 'true');
});
