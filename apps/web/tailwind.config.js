// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tema é resolvido por CSS var em runtime (ThemeProvider), NÃO por variante
  // de classe: nada no app adiciona `.dark`. Mantido só porque plugins de
  // terceiros olham para a chave.
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
        // Tokens do redesign — a única fonte de cor para código novo.
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

        // Aliases do modelo antigo. Saem na fase de limpeza, quando o último
        // bg-background / text-secondary tiver virado token novo.
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        primary: "rgb(var(--primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--secondary-rgb) / <alpha-value>)",
        description: "rgb(var(--description-rgb) / <alpha-value>)",
        icon: "rgb(var(--icon-rgb) / <alpha-value>)",
        placeholder: "rgb(var(--placeholder-rgb) / <alpha-value>)",
        error: "rgb(var(--error-rgb) / <alpha-value>)",
      },
      borderRadius: {
        // Uma família de raio por camada.
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
        // Alias histórico usado pelo wrapper do App.tsx.
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
