/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Same blue palette as the ManagerX app's constants/colors.ts, so the public
      // storefront feels like part of the same product, not a bolted-on website.
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1E40AF',
          900: '#1E3A8A',
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
