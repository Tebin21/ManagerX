export function ChartCard({
  title,
  caveat,
  children,
}: {
  title: string;
  caveat?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {caveat && <p className="mt-0.5 text-xs text-muted">{caveat}</p>}
      </div>
      <div className="h-56 w-full">{children}</div>
    </div>
  );
}
