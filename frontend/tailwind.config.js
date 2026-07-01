/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4e7', 100: '#fbe3c2', 200: '#f7c87a', 300: '#f4a832',
          400: '#e8920f', 500: '#c97b0c', 600: '#a3620a', 700: '#7d4b07',
          800: '#563305', 900: '#301d02',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
