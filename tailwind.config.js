/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#08090d',
        surface:  '#0e1018',
        border:   '#1c1f2b',
        'border-subtle': '#14171f',
        accent:   '#3b82f6',
        'accent-dim': '#1d4ed8',
        text:     '#f0f2f7',
        muted:    '#6b7280',
        faint:    '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
