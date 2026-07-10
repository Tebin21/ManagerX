export function GradientBlob({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-gradient-to-br from-gold-300/50 to-gold-500/30 blur-3xl ${className}`}
    />
  );
}
