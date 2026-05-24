/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ark: {
          bg: 'rgb(var(--ark-bg) / <alpha-value>)',
          sidebar: 'rgb(var(--ark-sidebar) / <alpha-value>)',
          content: 'rgb(var(--ark-content) / <alpha-value>)',
          surface: 'rgb(var(--ark-surface) / <alpha-value>)',
          border: 'rgb(var(--ark-border) / <alpha-value>)',
          text: 'rgb(var(--ark-text) / <alpha-value>)',
          muted: 'rgb(var(--ark-muted) / <alpha-value>)',
          accent: 'rgb(var(--ark-accent) / <alpha-value>)',
          danger: 'rgb(var(--ark-danger) / <alpha-value>)',
          'green-tint': 'rgb(var(--ark-green-tint) / <alpha-value>)',
          'green-text': 'rgb(var(--ark-green-text) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
