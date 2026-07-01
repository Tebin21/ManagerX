import type { CSSProperties } from 'react';

// Generates a brand shade ramp from a single business-picked hex color, for the
// storefront's dynamic theming (see StorefrontView.tsx). Uses plain RGB mixing
// toward white/black rather than HSL lightness shifts: shifting only HSL
// lightness while holding saturation constant turns saturated colors "neon" as
// they lighten (e.g. a dark green's 100-tint comes out bright teal instead of a
// pale mint) and collapses dark colors' darkest shades toward pure black,
// losing the hue entirely. Mixing toward white/black in RGB space avoids both.

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

// ratio 0 = hex unchanged, ratio 1 = fully `target`.
function mix(hex: string, target: string, ratio: number): string {
  const c1 = hexToRgb(hex);
  const c2 = hexToRgb(target);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * ratio,
    c1.g + (c2.g - c1.g) * ratio,
    c1.b + (c2.b - c1.b) * ratio
  );
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export function isValidHex(value: string | undefined | null): value is string {
  return !!value && HEX_PATTERN.test(value);
}

type BrandShadeKey = '50' | '100' | '200' | '300' | '500' | '600' | '700' | '900';

// Mix ratios toward white (light tints) / black (dark shades), tuned so the
// current default blue (#3B82F6) reproduces a ramp close to today's hardcoded
// palette in tailwind.config.js, while staying well-behaved (no neon tints, no
// pure-black shades) across the full range of ThemePreset colors in
// constants/themes.ts, including the darker/muted ones (Midnight, Deep Gray, Teal).
const WHITE_MIX: Record<'50' | '100' | '200' | '300', number> = {
  '50': 0.94,
  '100': 0.85,
  '200': 0.65,
  '300': 0.40,
};
const BLACK_MIX: Record<'600' | '700' | '900', number> = {
  '600': 0.18,
  '700': 0.45,
  '900': 0.62,
};

export function getBrandShades(hex: string): Record<BrandShadeKey, string> {
  const shades = { '500': hex } as Record<BrandShadeKey, string>;
  for (const key of Object.keys(WHITE_MIX) as (keyof typeof WHITE_MIX)[]) {
    shades[key] = mix(hex, '#ffffff', WHITE_MIX[key]);
  }
  for (const key of Object.keys(BLACK_MIX) as (keyof typeof BLACK_MIX)[]) {
    shades[key] = mix(hex, '#000000', BLACK_MIX[key]);
  }
  return shades;
}

// Returns undefined for a missing/invalid color so callers can skip setting any
// inline style at all — the Tailwind config's own `var(--brand-500, #3B82F6)`
// fallback then renders the current default blue, unchanged.
export function getBrandCssVars(hex: string | undefined): CSSProperties | undefined {
  if (!isValidHex(hex)) return undefined;
  const shades = getBrandShades(hex);
  const vars: Record<string, string> = {};
  for (const key of Object.keys(shades) as BrandShadeKey[]) {
    vars[`--brand-${key}`] = shades[key];
  }
  return vars as CSSProperties;
}
