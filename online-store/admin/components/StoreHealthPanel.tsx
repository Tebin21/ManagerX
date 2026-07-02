import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { StoreHealth } from "@/lib/health";

function Row({ label, state }: { label: string; state: boolean | "unknown" }) {
  const icon =
    state === "unknown" ? (
      <HelpCircle size={15} className="text-muted" />
    ) : state ? (
      <CheckCircle2 size={15} className="text-emerald-500" />
    ) : (
      <XCircle size={15} className="text-red-500" />
    );
  const text = state === "unknown" ? "Unknown" : state ? "OK" : "Failing";
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {icon}
        {text}
      </span>
    </div>
  );
}

export function StoreHealthPanel({ health }: { health: StoreHealth }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold">Store Health</h2>
      <p className="mt-0.5 text-xs text-muted">Best-effort, cheaply-computed signals — not a full uptime monitor.</p>
      <div className="mt-3 divide-y divide-border">
        <Row label="Website reachable" state={health.websiteOnline} />
        <Row label="Admin API connected" state={health.apiConnected} />
        <Row label="Recent sync activity" state={health.syncWorking} />
        <Row label="Subscription valid" state={health.subscriptionValid} />
        <Row label="Sample image reachable" state={health.imagesOk} />
      </div>
      {health.lastError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          Last error: {health.lastError}
        </p>
      )}
    </div>
  );
}
