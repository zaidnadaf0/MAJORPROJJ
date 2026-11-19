import type { Config } from 'tailwindcss';

/**
 * RoadAssist design tokens — "Warm White + Indigo".
 *
 * The token NAMES are the public contract every page already uses (cream =
 * primary text, graphite = surfaces, grease = page ground, safety = accent,
 * steel = secondary text, line = borders). Only the VALUES changed for the
 * light reconstruction, so one theme change reaches every portal without
 * per-page duplication.
 *
 * Palette (locked):
 *   page      #F6F6F4   warm white ground
 *   card      #FFFFFF   surfaces
 *   elevated  #F4F5F7   wells, hovers, inset panels
 *   accent    #4F46E5   indigo-600
 *   accent-2  #4338CA   indigo-700 (hover / link text)
 *   text      #0E1525   near-black navy
 *   muted     #5B6679   secondary copy
 *   border    #E6E8EC   hairline
 *
 * Accent steps 300–600 are intentionally dark enough to be readable as TEXT on
 * white (≥ 6:1). Tinted surfaces use alpha (`bg-safety-500/10`), so the same
 * steps still work as backgrounds behind dark labels.
 *
 * Semantic colour families (success / warning / danger) stay distinct from the
 * indigo accent so status is never conveyed by colour alone — every use also
 * carries a label or an icon.
 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Page ground and input wells. */
        grease: {
          DEFAULT: '#F6F6F4',
          soft: '#F1F1ED',
        },
        /** Surfaces: cards, sidebar, hover states, scaffold panels. */
        graphite: {
          DEFAULT: '#FFFFFF',
          soft: '#F4F5F7',
          card: '#FFFFFF',
          hover: '#F7F8FA',
          /** Extend 'card' as a gradient-safe color name. */
          ext: '#FFFFFF',
        },
        /** Primary accent — Indigo. */
        safety: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#4338CA',
          400: '#4F46E5',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
          800: '#312E81',
          900: '#1E1B4B',
        },
        /** Backward-compatible alias for legacy auth/marketing classes. */
        brand: '#4F46E5',
        /** Primary + secondary type. */
        cream: {
          DEFAULT: '#0E1525',
          dim: '#5B6679',
        },
        steel: {
          300: '#3F4A5F',
          400: '#5B6679',
          500: '#7C8798',
        },
        line: {
          soft: '#E6E8EC',
          strong: '#D5D9E0',
        },
        success: { DEFAULT: '#15803D' },
        warning: { DEFAULT: '#B45309' },
        danger: {
          DEFAULT: '#B91C1C',
          /** Filled red surfaces that carry white text (pills, solid buttons). */
          solid: '#DC2626',
        },
        /** Channel-based surfaces for opacity modifiers (bg-graphite-soft/60). */
        surface: {
          1: v('--ra-surface-1'),
          2: v('--ra-surface-2'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        /** Light elevation: a hairline lift plus a soft ambient shadow. */
        card: '0 1px 2px rgb(14 21 37 / 0.04), 0 10px 30px -18px rgb(14 21 37 / 0.18)',
        clay: '0 1px 2px rgb(14 21 37 / 0.04), 0 10px 30px -18px rgb(14 21 37 / 0.18)',
        'clay-sm': '0 1px 2px rgb(14 21 37 / 0.05), 0 4px 12px -8px rgb(14 21 37 / 0.14)',
        'clay-inset': 'inset 0 1px 2px rgb(14 21 37 / 0.06)',
        /** Indigo accent for primary actions only. */
        glow: '0 8px 20px -10px rgb(79 70 229 / 0.55)',
        /** Floating chrome (dropdowns, dialogs). */
        pop: '0 4px 12px -4px rgb(14 21 37 / 0.10), 0 24px 48px -24px rgb(14 21 37 / 0.28)',
      },
      keyframes: {
        'ra-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'ra-fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'ra-shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'ra-fade-in': 'ra-fade-in 220ms ease-out both',
        'ra-fade-up': 'ra-fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'ra-shimmer': 'ra-shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
