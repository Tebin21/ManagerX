import { AlertTriangle } from "lucide-react";

export function DeletionWarning() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
      <p className="text-sm font-medium text-red-700 dark:text-red-300">
        This action cannot be undone.
      </p>
    </div>
  );
}
