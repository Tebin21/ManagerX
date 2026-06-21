// Mirrors the ManagerX mobile app's own utils/formatters.ts:fmtIQD convention, so a
// price looks identical whether it's seen in the app or on the public storefront.
export function formatIQD(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} IQD`;
}
