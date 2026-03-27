/** @type {import('tailwindcss').Config} */
module.exports = {
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
          primary: 'hsl(211, 80%, 28%)',
          accent: 'hsl(197, 100%, 43%)',
          background: 'hsl(210, 20%, 98%)',
          surface: 'hsl(0, 0%, 100%)',
          border: 'hsl(214, 20%, 88%)',
          text: 'hsl(211, 80%, 28%)',
          muted: 'hsl(214, 15%, 50%)',
          
          'red-bg': 'hsl(0, 70%, 95%)',
          'red-text': 'hsl(0, 70%, 40%)',
          'amber-bg': 'hsl(35, 90%, 95%)',
          'amber-text': 'hsl(35, 90%, 40%)',
          'emerald-bg': 'hsl(150, 80%, 95%)',
          'emerald-text': 'hsl(150, 80%, 30%)',
        },
      },
      borderRadius: {
        lg: '8px',
        md: '8px',
        sm: '8px',
        xl: '8px', // Ensuring all defaults to exactly 8px or 0.5rem if large is used
        '2xl': '8px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // Very light shadow
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};
