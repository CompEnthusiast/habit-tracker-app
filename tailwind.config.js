/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a24',
        surface: '#2a2a35',
        primary: '#3b82f6',
        secondary: '#a855f7',
        accent1: '#ec4899',
        accent2: '#06b6d4',
        accent3: '#f59e0b',
        success: '#22c55e',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
