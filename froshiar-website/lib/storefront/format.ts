export function formatIQD(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} IQD`;
}
