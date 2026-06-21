// Per-slug async mutex so concurrent requests to the same store (e.g. two /sync
// calls racing) serialize their read-modify-write of the JSON ledger instead of
// one clobbering the other. Must live in its own module (not on a repository
// instance) since routes/stores.ts and auth.ts each construct their own
// JsonStoreRepository — an instance field would not actually share a lock.
const locks = new Map<string, Promise<unknown>>();

export function withStoreLock<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  const prior = locks.get(slug) ?? Promise.resolve();
  const run = prior.then(fn, fn);
  // The continuation stored back into the map must never itself reject, or one
  // failed request would poison every subsequent request for this slug.
  locks.set(slug, run.catch(() => {}));
  return run;
}
