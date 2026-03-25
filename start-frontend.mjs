import { resolve } from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
process.chdir(resolve(__dirname, 'frontend'));
process.argv.push('--port', '5173');
await import('./frontend/node_modules/vite/bin/vite.js');
