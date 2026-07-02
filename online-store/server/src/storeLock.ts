// Single global async mutex serializing every read-modify-write of the JSON
// ledger. This MUST be one shared queue, not one per slug: every operation —
// no matter which store's slug it touches — does readLedger() (whole file) ->
// mutate in memory -> writeLedger() (whole file, full overwrite). Two of
// these cycles for DIFFERENT slugs racing each other is exactly as unsafe as
// two for the SAME slug racing, because they both read and rewrite the same
// physical file: whichever write() finishes last wins and silently
// reverts/erases whatever the other cycle had just added or changed —
// including a different store's record entirely, if it was created or
// updated in the interim. A per-slug lock (the previous design here) only
// serialized operations that happened to share a key, which did nothing to
// protect against that cross-store race — this is what let a healthy,
// previously-created store silently vanish from the ledger under concurrent
// traffic. Must live in its own module (not on a repository instance) since
// routes/stores.ts and auth.ts each construct their own JsonStoreRepository —
// an instance field would not actually share a lock.
let queue: Promise<unknown> = Promise.resolve();

// Not reentrant: a caller already running inside withStoreLock() must never
// call it again before its own callback resolves, or the inner call
// deadlocks waiting on the outer call that is itself waiting on it.
export function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  // The continuation stored back into the queue must never itself reject, or
  // one failed request would poison every subsequent request.
  queue = run.catch(() => {});
  return run;
}
