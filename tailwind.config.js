/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],

  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FEA500',
          dark:    '#986300',
          light:   '#FFB733',
        },
        market: {
          up:        '#16a34a',
          down:      '#dc2626',
          upDark:    '#22c55e',
          downDark:  '#ef4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
