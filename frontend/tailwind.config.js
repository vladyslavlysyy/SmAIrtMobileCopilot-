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
          sans: ['DM Sans', 'sans-serif'],
          mono: ['IBM Plex Mono', 'monospace'],
        },
        colors: {
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: {
            DEFAULT: 'hsl(var(--primary))',
            foreground: 'hsl(var(--primary-foreground))',
          },
          secondary: {
            DEFAULT: 'hsl(var(--secondary))',
            foreground: 'hsl(var(--secondary-foreground))',
          },
          muted: {
            DEFAULT: 'hsl(var(--muted))',
            foreground: 'hsl(var(--muted-foreground))',
          },
          accent: {
            DEFAULT: 'hsl(var(--accent))',
            foreground: 'hsl(var(--accent-foreground))',
          },
          destructive: {
            DEFAULT: 'hsl(var(--destructive))',
            foreground: 'hsl(var(--destructive-foreground))',
          },
          card: {
            DEFAULT: 'hsl(var(--card))',
            foreground: 'hsl(var(--card-foreground))',
          },
          success: {
            DEFAULT: 'hsl(var(--success))',
            foreground: 'hsl(var(--success-foreground))',
          },
          warning: {
            DEFAULT: 'hsl(var(--warning))',
            foreground: 'hsl(var(--warning-foreground))',
          },
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
        },
        animation: {
          'fade-in': 'fadeIn 0.2s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out',
          'pulse-warning': 'pulseWarning 2s infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0', transform: 'scale(0.97)' },
            '100%': { opacity: '1', transform: 'scale(1)' },
          },
          slideUp: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          pulseWarning: {
            '0%, 100%': { opacity: '1' },
            '50%': { opacity: '0.6' },
          },
        },
      },
    },
    plugins: [],
  };