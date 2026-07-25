import type { ReactNode } from "react";

const linkClass =
  "font-medium text-ink underline decoration-gold-500/60 underline-offset-2 transition-colors hover:text-gold-600 dark:hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm";

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={linkClass}>
      {children}
    </a>
  );
}

export function SectionAnchorLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={linkClass}>
      {children}
    </a>
  );
}

export function MailLink({ children }: { children: ReactNode }) {
  return (
    <a href="mailto:support@froshiar.store" className={linkClass}>
      {children}
    </a>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-gold-500">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
