import { useEffect } from "react";

// Sets <html dir>/<html lang> while the marketing homepage is mounted, restoring
// the previous values on cleanup. A wrapper <div dir> only affects CSS layout —
// native browser chrome (form-validation bubbles, context menus, screen readers)
// keys off <html dir>/<html lang> specifically. Safe because this only ever mounts
// under "/", and React Router runs this cleanup before any other route renders.
export function useDocumentDirection(dir: "ltr" | "rtl", lang: string) {
  useEffect(() => {
    const root = document.documentElement;
    const previousDir = root.getAttribute("dir");
    const previousLang = root.getAttribute("lang");

    root.setAttribute("dir", dir);
    root.setAttribute("lang", lang);

    return () => {
      root.setAttribute("dir", previousDir ?? "ltr");
      root.setAttribute("lang", previousLang ?? "en");
    };
  }, [dir, lang]);
}
