// Launcher: change to frontend dir and start Vite
const path = require('path');
process.chdir(path.join(__dirname, 'frontend'));
process.argv.push('--port', '5173');
require('./frontend/node_modules/vite/bin/vite.js');
