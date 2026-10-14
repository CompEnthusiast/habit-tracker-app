/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#100E0C',
        surface: '#1E1D1C',
        borderSlate: '#494848',
        silver: '#C1C1C1',
        primary: '#FF7A00',
        secondary: '#FF9433',
        accent1: '#FF7A00',
        accent2: '#FFA64D',
        accent3: '#FF5500',
        success: '#FF7A00',
        danger: '#FF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
