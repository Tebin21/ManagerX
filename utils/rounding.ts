export function roundToNearest250(n: number): number {
  return Math.round(n / 250) * 250;
}

export function roundUSD(n: number): number {
  return Math.round(n * 100) / 100;
}
