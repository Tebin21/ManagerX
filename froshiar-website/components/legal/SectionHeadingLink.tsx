"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { SITE_URL } from "@/lib/seo";

export function SectionHeadingLink({
  id,
  number,
  title,
  path = "/privacy",
}: {
  id: string;
  number: number;
  title: string;
  /** Page this section lives on, used to build the copyable deep link. */
  path?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(`${SITE_URL}${path}#${id}`);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail (permissions, insecure context); fail silently —
      // the section is still reachable via the URL hash itself.
    }
  }

  return (
    <h2 className="group flex items-center gap-2 text-lg font-semibold tracking-tight text-ink sm:text-xl">
      <span className="text-gold-500">{String(number).padStart(2, "0")}.</span>
      <span>{title}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy link to ${title} section`}
        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 group-hover:opacity-100 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-ink"
      >
        {copied ? <Check size={15} className="text-gold-600 dark:text-gold-400" /> : <Link2 size={15} />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </h2>
  );
}
