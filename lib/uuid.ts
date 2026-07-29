/**
 * UUID generation for business records, used as a stable cross-device identity
 * for merge-restore duplicate detection (see lib/backup.ts). expo-crypto is
 * imported lazily so requiring this module never calls requireNativeModule()
 * at evaluation time — same convention as lib/backup.ts.
 */

export async function newUuid(): Promise<string> {
  const Crypto = await import('expo-crypto');
  return Crypto.randomUUID();
}
