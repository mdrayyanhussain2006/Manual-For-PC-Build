import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

process.env.HOST = '127.0.0.1';
process.env.PORT = '4321';

console.log('Starting Ask Builder server with AI_MODEL:', process.env.AI_MODEL, 'Key exists:', !!process.env.AI_API_KEY);

const entryUrl = pathToFileURL(path.join(__dirname, 'dist', 'server', 'entry.mjs')).href;
await import(entryUrl);
