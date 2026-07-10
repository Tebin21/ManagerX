import { useEffect } from "react";

// Sets <title>/<meta name="description"> while the marketing homepage is mounted,
// restoring the previous values on cleanup. Deliberately not react-helmet-async —
// that expects a single app-wide <HelmetProvider> wrapping App.tsx, which would be
// a second head-management mechanism just for this one page. index.html's static
// title (and the absence of a description meta tag) stays the fallback for every
// other route, unchanged.
export function useDocumentHead({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const createdMeta = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    const previousDescription = meta.getAttribute("content");
    meta.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      if (createdMeta) {
        meta?.remove();
      } else if (previousDescription !== null) {
        meta?.setAttribute("content", previousDescription);
      }
    };
  }, [title, description]);
}
