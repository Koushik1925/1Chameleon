/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#090a0f',
        glassBg: 'rgba(15, 17, 26, 0.7)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        accentBlue: '#00d8ff',
        accentCyan: '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
