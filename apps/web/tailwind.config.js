// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // The theme resolves through CSS vars at runtime (ThemeProvider), NOT through a
  // class variant: nothing in the app adds `.dark`. Kept only because third-party
  // plugins look at the key.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    screens: {
      xs: "200px",
      sm: "350px",
      // INTENTIONAL deviations from Tailwind defaults (md:768 / lg:1024).
      // The dashboard layout was tuned around these values — do not "fix" them
      // without retesting 640-1200px on real devices. See CLAUDE.md.
      md: "712px",
      lg: "1100px",
      lg2: "1200px"
    },
    extend: {
      colors: {
        // The redesign's tokens — the only source of colour for new code.
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2-rgb) / <alpha-value>)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        text: "rgb(var(--text-rgb) / <alpha-value>)",
        "text-2": "rgb(var(--text-2-rgb) / <alpha-value>)",
        "text-3": "rgb(var(--text-3-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-strong": "rgb(var(--accent-strong-rgb) / <alpha-value>)",
        "on-accent": "rgb(var(--on-accent-rgb) / <alpha-value>)",
        "accent-soft": "var(--accent-soft)",
        xp: "rgb(var(--xp-rgb) / <alpha-value>)",
        "xp-soft": "var(--xp-soft)",
        flame: "rgb(var(--flame-rgb) / <alpha-value>)",
        "flame-soft": "var(--flame-soft)",
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",

        // The old model's aliases. They leave in the cleanup phase, once the last
        // bg-background / text-secondary has become a new token.
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        primary: "rgb(var(--primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--secondary-rgb) / <alpha-value>)",
        description: "rgb(var(--description-rgb) / <alpha-value>)",
        icon: "rgb(var(--icon-rgb) / <alpha-value>)",
        placeholder: "rgb(var(--placeholder-rgb) / <alpha-value>)",
        error: "rgb(var(--error-rgb) / <alpha-value>)",
      },
      gridTemplateColumns: {
        // the streak strip: 14 columns x 2 rows = 28 days
        14: "repeat(14, minmax(0, 1fr))",
      },
      borderRadius: {
        // One radius family per layer.
        frame: "24px",
        card: "16px",
        control: "10px",
      },
      boxShadow: {
        surface: "var(--shadow)",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SF Mono", "monospace"],
        // A historical alias used by the App.tsx wrapper.
        mainFont: ["Geist", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
}
