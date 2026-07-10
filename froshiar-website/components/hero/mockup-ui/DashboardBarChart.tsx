const BARS = [40, 65, 50, 80, 60, 95, 70];

export function DashboardBarChart() {
  return (
    <div className="flex h-20 items-end gap-1.5 rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
      {BARS.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-full bg-gradient-to-t from-gold-600 to-gold-400"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}
