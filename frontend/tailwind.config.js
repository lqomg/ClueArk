/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ark: {
          bg: 'var(--ark-bg)',
          sidebar: 'var(--ark-sidebar)',
          surface: 'var(--ark-surface)',
          border: 'var(--ark-border)',
          text: 'var(--ark-text)',
          muted: 'var(--ark-muted)',
          accent: 'var(--ark-accent)',
          danger: 'var(--ark-danger)',
          'green-tint': 'var(--ark-green-tint)',
          'green-text': 'var(--ark-green-text)',
        },
      },
    },
  },
  plugins: [],
};
