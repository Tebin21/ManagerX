export function NewApiKeyModal({
  slug,
  apiKey,
  onClose,
}: {
  slug: string;
  apiKey: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <h2 className="text-base font-semibold">New API key for {slug}</h2>
        <p className="mt-1 text-sm text-muted">
          Shown once — copy it now. The store&apos;s ManagerX app must be updated with this key.
        </p>
        <code className="mt-3 block break-all rounded-lg bg-canvas px-3 py-2 text-xs">{apiKey}</code>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
