/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx,vue}'],
  theme: {
    extend: {
      colors: {
        // Warm bold palette — confident but human, not corporate.
        ink: '#14100E',          // warm near-black — dark sections / body text
        paper: '#FAF6EF',        // warm off-white — light background
        clay: {
          DEFAULT: '#C43C11',    // warm orange — AA-safe: white text 5.25:1, on paper 4.87:1
          600: '#A22E0C',        // darker — hover / active states
          400: '#F2683B',        // lighter — accents on DARK backgrounds only
        },
        teal: {
          DEFAULT: '#0B403B',    // deep teal — secondary dark / duotone
          600: '#115E56',
        },
        sand: '#F4B740',         // warm gold — small highlights
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['clamp(2.75rem, 8.5vw, 7.5rem)', { lineHeight: '0.92', letterSpacing: '-0.025em' }],
        display: ['clamp(2rem, 5vw, 3.75rem)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
      },
      maxWidth: { '8xl': '90rem' },
      transitionTimingFunction: { soft: 'cubic-bezier(.2,.7,.2,1)' },
    },
  },
  plugins: [],
};
