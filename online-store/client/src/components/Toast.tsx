import { useEffect, useState } from 'react';

interface Props {
  message: string;
  durationMs?: number;
}

// Minimal fixed-position, auto-dismissing message -- this client has no toast/
// alert/modal component anywhere and no i18n system, so the message is a plain
// hardcoded English string. Deliberately not a shared/global toast manager (no
// state library in this app) -- each mount is a single, independent,
// self-dismissing message triggered by remounting this component with a fresh
// key from the parent.
export function Toast({ message, durationMs = 2500 }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white shadow-card">
        {message}
      </div>
    </div>
  );
}
