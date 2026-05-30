/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        jelantah: {
          50: '#fef7e4',
          100: '#fdefc3',
          200: '#fbdf87',
          300: '#f8cf4b',
          400: '#f5bf0f',
          500: '#d4a40d',
          600: '#a8830a',
          700: '#7c6208',
          800: '#504105',
          900: '#242003'
        }
      }
    }
  },
  plugins: []
};