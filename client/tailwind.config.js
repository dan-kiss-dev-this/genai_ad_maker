/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Adobe Clean"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#ffcdc9',
          300: '#fda4a4',
          400: '#f87171',
          500: '#ec1000',
          600: '#d40e00',
          700: '#b30c00',
          800: '#930a00',
          900: '#7a0900',
        },
        surface: {
          50: '#1a1a1a',
          100: '#1e1e1e',
          200: '#2a2a2a',
          300: '#323232',
          400: '#3e3e3e',
          500: '#505050',
        },
      },
    },
  },
  plugins: [],
};
