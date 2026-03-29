// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Aptos-Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'brand': 'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      // Extend typography styles
      typography: (theme) => ({
        DEFAULT: {
          css: {
            // --- Unstyle default code blocks to prevent "box-in-box" ---
            pre: {
              backgroundColor: null,
              padding: null,
              margin: null,
              borderRadius: null,
              border: null,
            },
            'pre code': {
              backgroundColor: 'transparent',
              borderWidth: '0',
              borderRadius: '0',
              padding: '0',
              fontWeight: '400',
              color: 'inherit',
              fontFamily: 'inherit',
            },
            // --- Define a consistent style for inline code ---
            ':not(pre) > code': {
              backgroundColor: 'var(--color-border)',
              padding: '0.2em 0.4em',
              margin: '0 0.1em',
              fontSize: '0.9em',
              borderRadius: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontWeight: '500',
            },
            // --- Reset pseudo-elements that prose adds ---
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};
