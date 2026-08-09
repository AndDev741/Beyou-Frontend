/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // The redesign's tokens — they mirror packages/theme (cssVars.ts), applied
        // at runtime by BeyouThemeProvider through nativewind `vars()`.
        //
        // The `rgb(var(--x-rgb) / <alpha-value>)` shape and not `var(--x)`: without
        // the raw channels Tailwind v3 emits no slash classes at all, and
        // `bg-success/10` or `bg-accent/25` came out WITH NO BACKGROUND. themeToVars
        // already publishes both formats; it is the same shape as the web.
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2-rgb) / <alpha-value>)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        text: 'rgb(var(--text-rgb) / <alpha-value>)',
        'text-2': 'rgb(var(--text-2-rgb) / <alpha-value>)',
        'text-3': 'rgb(var(--text-3-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-strong': 'rgb(var(--accent-strong-rgb) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent-rgb) / <alpha-value>)',
        xp: 'rgb(var(--xp-rgb) / <alpha-value>)',
        flame: 'rgb(var(--flame-rgb) / <alpha-value>)',
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',

        // These already carry alpha; they take no part in the opacity variants.
        'accent-soft': 'var(--accent-soft)',
        'xp-soft': 'var(--xp-soft)',
        'flame-soft': 'var(--flame-soft)',

        // The old model's aliases — they leave in the cleanup phase.
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
        description: 'rgb(var(--description-rgb) / <alpha-value>)',
        icon: 'rgb(var(--icon-rgb) / <alpha-value>)',
        placeholder: 'rgb(var(--placeholder-rgb) / <alpha-value>)',
        error: 'rgb(var(--error-rgb) / <alpha-value>)',
      },
      borderRadius: {
        frame: '24px',
        card: '16px',
        control: '10px',
      },
      fontFamily: {
        // Every weight is a family of its own: RN does not synthesize weight from a
        // single file. `font-semibold` alone changes nothing — use
        // font-medium/font-semibold/font-bold from these families.
        sans: ['Geist'],
        medium: ['GeistMedium'],
        semibold: ['GeistSemiBold'],
        bold: ['GeistBold'],
        mono: ['GeistMono'],
        'mono-semibold': ['GeistMonoSemiBold'],
      },
    },
  },
  plugins: [],
};
