// Deletes locally-stored files that Delete Account must remove but that have no
// existing owner: images copied via copyToPermanentStorage() (lib/imageStorage.ts)
// and backup JSON files written by exportBackup() (lib/backup.ts). SQLite itself is
// handled separately by wipeAllBusinessData() (see lib/sqlite.ts) — this file only
// touches the filesystem, never the database.
export async function deleteLocalAppFiles(): Promise<void> {
  const { Directory, Paths } = await import('expo-file-system');

  // Subdirs used by copyToPermanentStorage() — see lib/imageStorage.ts,
  // components/setup/LogoUploader.tsx, components/ui/ProductImagePicker.tsx.
  for (const subdir of ['logo_images', 'product_images']) {
    try {
      const dir = new Directory(Paths.document, subdir);
      if (dir.exists) dir.delete();
    } catch (e) {
      console.error(`[Froshiar] Failed to delete ${subdir}:`, e);
    }
  }

  // Exported backup JSON files written into Paths.document root by exportBackup().
  try {
    const docDir = new Directory(Paths.document);
    for (const entry of docDir.list()) {
      if (!(entry instanceof Directory) && entry.name.endsWith('.json')) {
        entry.delete();
      }
    }
  } catch (e) {
    console.error('[Froshiar] Failed to delete exported files:', e);
  }
}
