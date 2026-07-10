/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Each brand shade reads from a CSS custom property (set per-store by
      // StorefrontView.tsx from the business's Froshiar theme color, via
      // src/lib/theme.ts), falling back to the default gold when no custom
      // property is set (landing page, /demo, stores with no theme color saved
      // yet) — so this stays pixel-identical to the default palette until a
      // store actually has a themeColor.
      colors: {
        brand: {
          50: 'var(--brand-50, #FBF7EA)',
          100: 'var(--brand-100, #F6EED5)',
          200: 'var(--brand-200, #EFE1B3)',
          300: 'var(--brand-300, #E6D089)',
          500: 'var(--brand-500, #D4AF37)',
          600: 'var(--brand-600, #B99727)',
          700: 'var(--brand-700, #977C20)',
          900: 'var(--brand-900, #544512)',
        },
        // Used only by the BexDre footer's dark/premium treatment — kept as its own
        // token even though it coincidentally matches the default brand gold above;
        // the rest of the storefront uses the `brand` scale, not this one.
        gold: {
          light: '#E9CD7B',
          DEFAULT: '#D4AF37',
          dark: '#9C7A1E',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.06), 0 1px 3px 0 rgba(16, 24, 40, 0.10)',
      },
    },
  },
  plugins: [],
};
