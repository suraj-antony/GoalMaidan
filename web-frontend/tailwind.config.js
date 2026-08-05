/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Ground type chip — selected state
    'bg-green-700',
    'border-green-700',
    'text-white',
    'shadow-md',
    // Ground type chip — unselected state
    'bg-white',
    'border-gray-300',
    'border-zinc-300',
    'text-gray-800',
    'text-zinc-800',
    'hover:border-green-500',
    'hover:text-green-700',
    // Tournament type card — selected
    'bg-green-50',
    'border-green-600',
    // Award card selected
    'bg-green-800',
    // Status badges
    'bg-gray-100',
    'text-gray-600',
    'bg-green-100',
    'text-green-700',
    'border-green-400',
    'bg-red-100',
    'text-red-700',
    'border-red-400',
    'bg-blue-100',
    'text-blue-700',
    'border-blue-300',
    'bg-amber-50',
    'border-amber-300',
    'text-amber-800',
    // Nav buttons
    'bg-green-800',
    'hover:bg-green-800',
    'active:bg-green-900',
    // Bracket: winner row
    'bg-green-50',
    'text-green-700',
    'font-extrabold',
    // Bracket: loser row
    'bg-gray-50',
    'line-through',
    'opacity-75',
    'opacity-65',
    'text-gray-400',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#d4edda',
          500: '#1a6b2f',
          600: '#155424',
          dark: '#2ecc6a',
        },
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        card: 'var(--card)',
        txt: 'var(--txt)',
        txt2: 'var(--txt2)',
        border: 'var(--border)',
        green: 'var(--green)',
        'green-bg': 'var(--green-bg)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
