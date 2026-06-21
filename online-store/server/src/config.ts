import fs from 'fs';
import path from 'path';

// Config sources, in priority order: process.env.PORT (most hosts — Render, Fly.io,
// Railway, etc. — inject this and expect you to listen on it) > config.local.json
// (optional, non-secret overrides — e.g. a different CORS origin for a staging
// environment) > these defaults, which already point at the real production domain
// (api.managerx.store backend, managerx.store frontend) so nothing has to be set to
// deploy this as-is.
const CONFIG_PATH = path.join(__dirname, '../config.local.json');

export interface LocalConfig {
  port: number;
  allowedOrigin: string | string[];
  // The server's own public base URL, used to build absolute URLs for uploaded
  // images (the server can't reliably infer this from a request behind Render's
  // proxy). Override via PUBLIC_API_URL or config.local.json for local/LAN testing.
  publicApiUrl: string;
}

const DEFAULTS: LocalConfig = {
  port: 4100,
  allowedOrigin: ['https://managerx.store', 'https://www.managerx.store'],
  publicApiUrl: 'https://api.managerx.store',
};

function loadConfig(): LocalConfig {
  let fileConfig: Partial<LocalConfig> = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {
      console.error(`Could not parse config.local.json — using defaults. (${e instanceof Error ? e.message : e})`);
    }
  }

  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;

  return {
    ...DEFAULTS,
    ...fileConfig,
    port: envPort ?? fileConfig.port ?? DEFAULTS.port,
    publicApiUrl: process.env.PUBLIC_API_URL ?? fileConfig.publicApiUrl ?? DEFAULTS.publicApiUrl,
  };
}

export const config: LocalConfig = loadConfig();
