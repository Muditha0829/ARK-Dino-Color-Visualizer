/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ark: {
          dark:    '#0d0f1a',
          panel:   '#161927',
          card:    '#1e2236',
          border:  '#2d3456',
          accent:  '#4f80ff',
          gold:    '#f5a623',
          green:   '#39d98a',
          red:     '#ff5a5a',
          purple:  '#a855f7',
        },
      },
      fontFamily: {
        ark: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
