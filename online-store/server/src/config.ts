import fs from 'fs';
import path from 'path';

// Local-only config — no environment variables, no Railway/Vercel/cloud config of
// any kind (same philosophy as license-admin-panel/server/src/config.ts). Unlike
// that admin panel, nothing in here is a secret, so a missing config.local.json
// just falls back to sane defaults instead of refusing to start — copy
// config.local.json.example only if you need to change the port or CORS origin.
const CONFIG_PATH = path.join(__dirname, '../config.local.json');

export interface LocalConfig {
  port: number;
  allowedOrigin: string;
}

const DEFAULTS: LocalConfig = { port: 4100, allowedOrigin: '*' };

function loadConfig(): LocalConfig {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULTS;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Partial<LocalConfig>;
    return { ...DEFAULTS, ...raw };
  } catch (e) {
    console.error(`Could not parse config.local.json — using defaults. (${e instanceof Error ? e.message : e})`);
    return DEFAULTS;
  }
}

export const config: LocalConfig = loadConfig();
