/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5ff',
          100: '#e1ebff',
          200: '#c2d7ff',
          300: '#94b8ff',
          400: '#5e8eff',
          500: '#335eff',
          600: '#1c3fff',
          700: '#142fe6',
          800: '#1727ba',
          900: '#1a2894',
          950: '#10165a',
        },
      },
    },
  },
  plugins: [],
}
