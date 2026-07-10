import type { LucideIcon } from "lucide-react";

export function ProductListRow({
  icon: Icon,
  name,
  qty,
  price,
}: {
  icon: LucideIcon;
  name: string;
  qty: string;
  price: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-l-2 border-gold-500 bg-gray-50 px-3 py-2 dark:bg-white/5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">{name}</p>
        <p className="text-[10px] text-gray-400">{qty}</p>
      </div>
      <p className="text-xs font-semibold text-ink">{price}</p>
    </div>
  );
}
