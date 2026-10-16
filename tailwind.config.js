/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './index.tsx', './App.tsx', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#311b92', deep: '#1c0f5c', ink: '#120a3d' },
        signal: { DEFAULT: '#ff8a3d', light: '#ffa765' },
        ember: { DEFAULT: '#d9322d', light: '#ee5045' },
        mint: { DEFAULT: '#2dd4bf', light: '#99f6e4' },
        paper: { DEFAULT: '#f7f4ec', dark: '#ece6d6' },
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'none' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        rise: 'rise .5s cubic-bezier(.2,.7,.2,1) both',
        fadeIn: 'fadeIn .3s ease-out both',
        spinSlow: 'spinSlow 28s linear infinite',
      },
    },
  },
  plugins: [],
};
