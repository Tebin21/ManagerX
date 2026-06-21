import fs from 'fs';
import path from 'path';

// This is the ONLY place server settings come from — no environment variables,
// no Railway/Vercel/cloud config of any kind. Everything is read from the local
// config.local.json file next to package.json.
//
//   - To change the admin login password: edit "adminPassword" below.
//   - To change which port the server listens on: edit "port" below.
//   - To change which frontend origin is allowed to call this API (CORS):
//     edit "allowedOrigin" below — this must match exactly where the client
//     is served from (e.g. "http://localhost:5173").
//
// config.local.json is gitignored (it holds the real admin password). A safe,
// secret-free template lives at config.local.json.example.
const CONFIG_PATH = path.join(__dirname, '../config.local.json');

export interface LocalConfig {
  adminPassword: string;
  port: number;
  allowedOrigin: string;
}

function fail(message: string): never {
  console.error('\nLicense Admin Server configuration error:');
  console.error(`  ${message}\n`);
  console.error(`Expected a valid config file at: ${CONFIG_PATH}`);
  console.error('See config.local.json.example for the required shape:');
  console.error('  { "adminPassword": "...", "port": 4000, "allowedOrigin": "http://localhost:5173" }\n');
  process.exit(1);
}

function loadConfig(): LocalConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    fail(`Missing config file (${path.basename(CONFIG_PATH)} not found).`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    fail(`Could not parse config.local.json as JSON — ${e instanceof Error ? e.message : String(e)}`);
  }

  const cfg = raw as Partial<LocalConfig>;
  const problems: string[] = [];

  if (typeof cfg.adminPassword !== 'string' || cfg.adminPassword.trim() === '') {
    problems.push('"adminPassword" must be a non-empty string.');
  }
  if (typeof cfg.port !== 'number' || !Number.isInteger(cfg.port) || cfg.port <= 0) {
    problems.push('"port" must be a positive integer.');
  }
  if (typeof cfg.allowedOrigin !== 'string' || cfg.allowedOrigin.trim() === '') {
    problems.push('"allowedOrigin" must be a non-empty string (e.g. "http://localhost:5173").');
  }

  if (problems.length > 0) {
    fail(`Invalid config.local.json:\n  - ${problems.join('\n  - ')}`);
  }

  return cfg as LocalConfig;
}

export const config: LocalConfig = loadConfig();
