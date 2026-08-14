// Lazy-imports expo-image-picker (avoids a throwing native-module lookup at module-evaluation
// time if the module isn't linked in a given build — same reasoning as LogoUploader.tsx).
//
// Checks status via get*PermissionsAsync before ever calling request*PermissionsAsync, so a
// prior denial is never re-prompted by iOS's native dialog (which only shows once). This lets
// callers distinguish "just denied for the first time" from "already denied, trying again" —
// required to comply with Apple 5.1.1(iv): no custom message/Settings redirect on first denial.
export type MediaAccessResult = 'granted' | 'denied-first-time' | 'denied-repeat';

export async function ensureGalleryAccess(): Promise<MediaAccessResult> {
  const ImagePicker = await import('expo-image-picker');
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (current.status === 'undetermined') {
    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return requested.status === 'granted' ? 'granted' : 'denied-first-time';
  }
  return 'denied-repeat';
}

export async function ensureCameraAccess(): Promise<MediaAccessResult> {
  const ImagePicker = await import('expo-image-picker');
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (current.status === 'undetermined') {
    const requested = await ImagePicker.requestCameraPermissionsAsync();
    return requested.status === 'granted' ? 'granted' : 'denied-first-time';
  }
  return 'denied-repeat';
}
