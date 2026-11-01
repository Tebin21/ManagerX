'use client';

import { useEffect, useState } from 'react';

interface Props {
  message: string;
  durationMs?: number;
}

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
      <div className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xl">
        {message}
      </div>
    </div>
  );
}
