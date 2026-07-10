import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Request } from 'express';

// Append-only audit trail for the admin dashboard. Deliberately NOT logged
// through the same withStoreLock() queue as stores.json (storeLock.ts) — that
// queue is not reentrant, and several call sites here run from inside a
// stores.json mutation (e.g. registerOrRecover) or right after one, so
// reusing it would either deadlock or serialize activity-log writes behind
// unrelated store writes for no benefit. This file gets its own queue,
// following the same "one shared Promise chain, never per-key" reasoning as
// storeLock.ts: two concurrent appends must not read-modify-write the same
// file and silently drop one entry.
const LOG_PATH = path.join(__dirname, '../data/activity-log.json');
// Hard cap so a busy store can't grow this file without bound — old entries
// roll off. Generous enough (10k entries) that "Daily Sync Activity" and
// recent-activity views always have plenty of history in practice.
const MAX_ENTRIES = 10_000;

let queue: Promise<unknown> = Promise.resolve();

function withLogLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export type ActivityActor = 'admin' | 'owner' | 'system';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: ActivityActor;
  ip: string;
  action: string;
  slug?: string;
  details?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readLog(): ActivityEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
}

async function writeLog(entries: ActivityEntry[]): Promise<void> {
  const dir = path.dirname(LOG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${LOG_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(entries, null, 2));
  const maxAttempts = 5;
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(tmpPath, LOG_PATH);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (attempt >= maxAttempts || (code !== 'EPERM' && code !== 'EBUSY')) {
        throw e;
      }
      await delay(20 * attempt);
    }
  }
}

function requestIp(req: Request): string {
  // Trusts req.ip as-is — this server sits behind Render's proxy (or plain
  // localhost in dev), not behind an arbitrary untrusted reverse proxy chain,
  // so there's no X-Forwarded-For spoofing concern worth handling here.
  return req.ip ?? 'unknown';
}

// Never throws — a failure to record an audit entry must not fail the
// request that triggered it (same philosophy as recordSubscriptionCheck in
// jsonStoreRepository.ts). Callers should NOT await this on the request's
// critical path; fire-and-forget is intentional.
export async function logActivity(
  req: Request,
  actor: ActivityActor,
  action: string,
  opts?: { slug?: string; details?: string }
): Promise<void> {
  try {
    await withLogLock(async () => {
      const entries = readLog();
      entries.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actor,
        ip: requestIp(req),
        action,
        ...(opts?.slug ? { slug: opts.slug } : {}),
        ...(opts?.details ? { details: opts.details } : {}),
      });
      // Roll off the oldest entries once over the cap, keeping the file itself
      // (and every read of it) bounded regardless of how long the server runs.
      const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
      await writeLog(trimmed);
    });
  } catch (e) {
    console.error('logActivity failed:', e);
  }
}

export interface ActivityQuery {
  slug?: string;
  action?: string;
  actor?: ActivityActor;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export function listActivity(query: ActivityQuery = {}): { entries: ActivityEntry[]; total: number } {
  let entries = readLog().slice().reverse(); // newest first
  if (query.slug) entries = entries.filter((e) => e.slug === query.slug);
  if (query.action) entries = entries.filter((e) => e.action === query.action);
  if (query.actor) entries = entries.filter((e) => e.actor === query.actor);
  if (query.since) entries = entries.filter((e) => e.timestamp >= query.since!);
  if (query.until) entries = entries.filter((e) => e.timestamp <= query.until!);

  const total = entries.length;
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 100;
  return { entries: entries.slice(offset, offset + limit), total };
}
