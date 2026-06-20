import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copies a picker temp URI to permanent app storage so it survives app
 * restarts and OS cache eviction. Falls back to the temp URI if
 * documentDirectory is unavailable (e.g. Expo Go on some platforms).
 */
export async function copyToPermanentStorage(tempUri: string, subdir: string): Promise<string> {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) return tempUri;

  const dir = `${baseDir}${subdir}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  // Strip query params before extracting extension
  const rawPath = tempUri.split('?')[0];
  const lastDot = rawPath.lastIndexOf('.');
  const ext = lastDot !== -1 && lastDot > rawPath.lastIndexOf('/') ? rawPath.slice(lastDot + 1) : 'jpg';

  const dest = `${dir}img_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}
