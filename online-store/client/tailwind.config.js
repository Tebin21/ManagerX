/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Each brand shade reads from a CSS custom property (set per-store by
      // StorefrontView.tsx from the business's ManagerX theme color, via
      // src/lib/theme.ts), falling back to the original default blue when no
      // custom property is set (landing page, /demo, stores with no theme color
      // saved yet) — so this stays pixel-identical to the old hardcoded palette
      // until a store actually has a themeColor.
      colors: {
        brand: {
          50: 'var(--brand-50, #EFF6FF)',
          100: 'var(--brand-100, #DBEAFE)',
          200: 'var(--brand-200, #BFDBFE)',
          300: 'var(--brand-300, #93C5FD)',
          500: 'var(--brand-500, #3B82F6)',
          600: 'var(--brand-600, #2563EB)',
          700: 'var(--brand-700, #1E40AF)',
          900: 'var(--brand-900, #1E3A8A)',
        },
        // Used only by the BexDre footer's dark/premium treatment — the rest of the
        // storefront keeps the blue brand palette above.
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
