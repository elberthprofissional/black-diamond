/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfbf2',
          100: '#fbf7e6',
          200: '#f7eecc',
          300: '#f3e6b2',
          400: '#efdd98',
          500: '#ebd57e',
          600: '#d4af37', // Black Diamond Gold
          700: '#9d8129',
          800: '#68561b',
          900: '#342b0e',
        },
        dark: {
          DEFAULT: '#000000',
          card: '#111111',
          border: '#222222',
          muted: '#888888',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
