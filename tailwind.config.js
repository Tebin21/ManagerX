/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D4AF37',
          50: '#FBF7EA',
          100: '#F6EED5',
          200: '#EFE1B3',
          300: '#E6D089',
          400: '#DDC05F',
          500: '#D4AF37',
          600: '#B99727',
          700: '#977C20',
          800: '#766019',
          900: '#544512',
        },
      },
      fontFamily: {
        'inter-regular': ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};
