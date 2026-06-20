/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Design system tokens (calm, wayfinding feel) ----
        ink: {
          DEFAULT: '#16213A', // primary dark surface (cards)
          950: '#0B1220', // app background (deepest)
          900: '#0E1626', // subtle raised background
          800: '#16213A', // card surface
          700: '#1E2B49', // hover / elevated surface
          600: '#283655', // borders / dividers
        },
        teal: {
          DEFAULT: '#2F6F6A',
          300: '#7FC3BB',
          400: '#4FA89F',
          500: '#3C8B83',
          600: '#2F6F6A',
          700: '#27605B',
        },
        paper: {
          DEFAULT: '#F4F6F8', // primary text on dark
          muted: '#AEB9CA',
        },

        // ---- Dark-mode remap of the existing semantic scales ----
        // The app was authored against `slate` (neutral) and `brand` (accent).
        // Re-pointing those tokens flips the whole UI to dark in one place and
        // routes the accent to teal — no per-file class churn.
        slate: {
          50: '#0E1626', // was lightest bg  -> deep surface
          100: '#1B2742', // subtle surface / hover
          200: '#2A3A5C', // borders, dividers
          300: '#3C4F73',
          400: '#8593AB', // muted text
          500: '#9AA7BF', // secondary muted text
          600: '#B7C2D4', // secondary text
          700: '#CED7E4',
          800: '#E4EAF1',
          900: '#F4F6F8', // primary text == paper
        },
        brand: {
          50: '#15302D', // active-nav tint (dark teal)
          100: '#1C413C', // focus ring tint
          500: '#4FA89F', // light accent / focus border
          600: '#2F6F6A', // accent fill (buttons)
          700: '#3C8B83', // hover + legible accent text
        },
      },
      fontFamily: {
        // Used for all data/numbers (prices, commute times, beds).
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      keyframes: {
        fadein: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        fadein: 'fadein 0.7s ease',
      },
    },
  },
  plugins: [],
};
