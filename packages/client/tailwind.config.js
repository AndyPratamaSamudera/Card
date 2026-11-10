/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0618',
        panel: '#160f2e',
        panel2: '#21184a',
        line: '#3b2f73',
        dim: '#8a7fc0',
        snow: '#f4f1ff',
        cyan: '#29f0ff',
        pink: '#ff3df2',
        sun: '#ffe23d',
        lime: '#3dff7a',
        blood: '#ff3d5a',
        violet: '#a66bff',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'ui-monospace', 'monospace'],
        term: ['VT323', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        shake: {
          '0%,100%': { transform: 'translate(0,0)' },
          '20%': { transform: 'translate(-4px,2px)' },
          '40%': { transform: 'translate(4px,-2px)' },
          '60%': { transform: 'translate(-2px,-2px)' },
          '80%': { transform: 'translate(2px,2px)' },
        },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        flicker: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.75' } },
        march: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '32px 0' } },
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        shake: 'shake .25s steps(2) infinite',
        pop: 'pop .25s steps(4) both',
        rise: 'rise .2s steps(3) both',
        flicker: 'flicker 1.2s steps(2) infinite',
        march: 'march .6s steps(4) infinite',
      },
    },
  },
  plugins: [],
};
