import { AlertTriangle } from "lucide-react";

export function DeletionWarning() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
      <p className="text-sm font-medium text-red-700">This action cannot be undone.</p>
    </div>
  );
}
