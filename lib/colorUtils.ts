import type { AppColors } from '@/contexts/ThemeContext';

// ─── Hex ↔ HSL ────────────────────────────────────────────────────────────────

export function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / delta + 2) / 6; break;
      case b: h = ((r - g) / delta + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

// ─── Manipulation ─────────────────────────────────────────────────────────────

export function darken(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount * 100));
}

export function lighten(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, l + amount * 100));
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── HSB (Hue / Saturation / Brightness) for the color picker UI ──────────────

export function hsbToHex(h: number, s: number, b: number): string {
  // Convert HSB to HSL for hslToHex
  const l = b * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (b - l) / Math.min(l, 1 - l);
  return hslToHex(h, sl * 100, l * 100);
}

export function hexToHsb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  const sv = max === 0 ? 0 : delta / max;
  const v = max;

  if (delta !== 0) {
    switch (max) {
      case r: h = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / delta + 2) / 6; break;
      case b: h = ((r - g) / delta + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), sv, v];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// ─── Theme color generation ───────────────────────────────────────────────────

export function generateThemeColors(
  accentHex: string,
  isDark: boolean
): Partial<AppColors> {
  const [, , lightness] = hexToHsl(accentHex);

  // For very dark accents, shift the gradient lighter so it stays visible
  const gradientDarkenAmount = lightness < 25 ? 0.05 : 0.25;
  const gradientLightenAmount = lightness < 25 ? 0.30 : 0.18;

  return {
    primary:      accentHex,
    primaryDark:  darken(accentHex, 0.12),
    gradientStart: darken(accentHex, gradientDarkenAmount),
    gradientMid:  accentHex,
    gradientEnd:  lighten(accentHex, gradientLightenAmount),
    darkBlue:     isDark ? lighten(accentHex, 0.20) : darken(accentHex, 0.30),
    navyBlue:     isDark ? lighten(accentHex, 0.35) : darken(accentHex, 0.38),
    info:         accentHex,
    softBlue:     hexToRgba(accentHex, isDark ? 0.13 : 0.08),
    lightBlue:    hexToRgba(accentHex, isDark ? 0.20 : 0.15),
    mediumBlue:   hexToRgba(accentHex, isDark ? 0.28 : 0.22),
    skyBlue:      hexToRgba(accentHex, isDark ? 0.40 : 0.35),
  };
}
