/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        mobility: {
          primary: 'hsl(var(--mobility-primary) / <alpha-value>)',
          accent: 'hsl(var(--mobility-accent) / <alpha-value>)',
          background: 'hsl(var(--mobility-background) / <alpha-value>)',
          surface: 'hsl(var(--mobility-surface) / <alpha-value>)',
          border: 'hsl(var(--mobility-border) / <alpha-value>)',
          text: 'hsl(var(--mobility-text) / <alpha-value>)',
          muted: 'hsl(var(--mobility-muted) / <alpha-value>)',
          
          'red-bg': 'hsl(var(--mobility-red-bg) / <alpha-value>)',
          'red-text': 'hsl(var(--mobility-red-text) / <alpha-value>)',
          'amber-bg': 'hsl(var(--mobility-amber-bg) / <alpha-value>)',
          'amber-text': 'hsl(var(--mobility-amber-text) / <alpha-value>)',
          'emerald-bg': 'hsl(var(--mobility-emerald-bg) / <alpha-value>)',
          'emerald-text': 'hsl(var(--mobility-emerald-text) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: '10px',
        md: '12px',
        lg: '14px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(20, 35, 58, 0.08)',
        md: '0 10px 24px rgba(20, 35, 58, 0.12)',
      },
    },
  },
  plugins: [],
};
