import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { List, X } from "lucide-react";

type LegalSectionMeta = { id: string; title: string };

export function TableOfContents({ sections }: { sections: readonly LegalSectionMeta[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-112px 0px -60% 0px", threshold: 0 }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  const linkClass = (id: string) =>
    `block border-l-2 py-1.5 pl-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-r-sm ${
      activeId === id
        ? "border-gold font-medium text-gold-dark"
        : "border-slate-200 text-slate-500 hover:text-ink"
    }`;

  return (
    <>
      {/* Desktop */}
      <nav
        aria-label="Table of contents"
        className="hidden lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">On this page</p>
        <ol>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className={linkClass(section.id)}>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile */}
      <div className="mb-6 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Table of contents"
          className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <span className="flex items-center gap-2">
            <List size={16} />
            On this page
          </span>
          {open ? <X size={16} /> : <List size={16} className="opacity-0" />}
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.nav
              aria-label="Table of contents"
              initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="mt-2 overflow-hidden rounded-xl border border-slate-100 bg-white"
            >
              <ol className="p-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={() => setOpen(false)}
                      className={linkClass(section.id)}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
