/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50:  '#ffffff',
          100: '#fafafa',
          200: '#f4f4f4',
          300: '#e5e5e5',
          400: '#d4d4d4',
          500: '#a3a3a3',
          600: '#737373',
          700: '#525252',
          800: '#262626',
          900: '#0a0a0a',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.9)', opacity: 0 },
          '60%': { transform: 'scale(1.04)', opacity: 1 },
          '100%': { transform: 'scale(1)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        confetti: {
          '0%':   { transform: 'translateY(-10vh) rotate(0)', opacity: 1 },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: 0 },
        },
      },
      animation: {
        pop: 'pop .35s ease-out',
        wiggle: 'wiggle 1.2s ease-in-out infinite',
        shake: 'shake .4s ease-in-out',
        confetti: 'confetti 2.8s linear forwards',
      },
    },
  },
  plugins: [],
};
