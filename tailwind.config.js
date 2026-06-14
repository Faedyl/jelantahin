/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        /* Earth — Warm neutral scale */
        earth: {
          50: '#FDFCFA',
          100: '#FBF8F3',
          200: '#F6F0E6',
          300: '#EFE5D5',
          400: '#DDCEB0',
          500: '#C2AD87',
          600: '#9E8A6A',
          700: '#7B6950',
          800: '#5A4A35',
          900: '#3A2E20',
        },
        /* Gold — Brand accent (existing jelantah palette extended) */
        gold: {
          100: '#FEF7E4',
          200: '#FBEFC0',
          300: '#F5D980',
          400: '#EBC245',
          500: '#D4A40D',
          600: '#AD8B0C',
          700: '#8A6F0A',
        },
        /* Herb — Nature / Sustainability / Success */
        herb: {
          100: '#E8F6ED',
          200: '#C8ECD3',
          300: '#9FD9AE',
          400: '#72C283',
          500: '#4FA862',
          600: '#3D8A4F',
          700: '#2D6A3B',
        },
        /* Semantic */
        danger: '#C4443C',
        warning: '#D9A520',
        info: '#3A7DC2',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'xs':  ['0.75rem',  { lineHeight: '1.333' }],
        'sm':  ['0.875rem', { lineHeight: '1.429' }],
        'base':['1rem',     { lineHeight: '1.5' }],
        'lg':  ['1.125rem', { lineHeight: '1.333' }],
        'xl':  ['1.25rem',  { lineHeight: '1.4' }],
        '2xl': ['1.5rem',   { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem',  { lineHeight: '1.15' }],
        '5xl': ['3rem',     { lineHeight: '1.1' }],
        '6xl': ['3.75rem',  { lineHeight: '1.05' }],
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.625rem',
        'lg': '1rem',
        'xl': '1.5rem',
      },
      boxShadow: {
        'brand-sm': '0 1px 2px oklch(0 0 0 / 0.04), 0 1px 1px oklch(0 0 0 / 0.02)',
        'brand-md': '0 2px 4px oklch(0 0 0 / 0.04), 0 4px 8px oklch(0 0 0 / 0.03)',
        'brand-lg': '0 4px 8px oklch(0 0 0 / 0.04), 0 8px 24px oklch(0 0 0 / 0.03)',
        'brand-xl': '0 8px 16px oklch(0 0 0 / 0.05), 0 16px 48px oklch(0 0 0 / 0.04)',
        'brand-gold': '0 0 0 2px oklch(0.70 0.15 80 / 0.3)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      maxWidth: {
        'content': '1200px',
        'narrow':  '480px',
        'wide':    '1440px',
      },
    },
  },
  plugins: [],
};
