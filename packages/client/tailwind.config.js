/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          dark: '#070913',
          card: '#0f172a',
          neonCyan: '#06b6d4',
          neonPink: '#ec4899',
          neonAmber: '#f59e0b',
          neonRed: '#ef4444',
          neonGreen: '#10b981',
          neonPurple: '#a855f7'
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 0.3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.7))' },
          '50%': { opacity: '.6', filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.2))' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
}
