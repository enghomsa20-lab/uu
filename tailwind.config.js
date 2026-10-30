/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1220',
          800: '#111a2e',
          700: '#1b2742',
          600: '#27345c',
          500: '#3a4a78',
        },
        brand: {
          50: '#eefcfb',
          100: '#d3f8f4',
          200: '#a9f0ea',
          300: '#6fe3da',
          400: '#34cdc4',
          500: '#16b1aa',
          600: '#0c8f8a',
          700: '#0d726f',
          800: '#105b59',
          900: '#124b49',
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        success: { 500: '#22c55e', 600: '#16a34a' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(52, 205, 196, 0.35)',
        soft: '0 10px 40px -12px rgba(0,0,0,0.5)',
        card: '0 8px 30px -10px rgba(2,6,23,0.55)',
      },
      backdropBlur: { xs: '2px' },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(52,205,196,0.45)' }, '50%': { boxShadow: '0 0 0 14px rgba(52,205,196,0)' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
      },
      animation: {
        fadeIn: 'fadeIn .5s ease-out both',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
