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
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        "on-accent": "var(--on-accent)",
        "accent-soft": "var(--accent-soft)",
        xp: "var(--xp)",
        "xp-soft": "var(--xp-soft)",
        flame: "var(--flame)",
        "flame-soft": "var(--flame-soft)",
        success: "var(--success)",
        danger: "var(--danger)",

        // Aliases do modelo antigo. Saem na fase de limpeza, quando o último
        // bg-background / text-secondary tiver virado token novo.
        background: "var(--background)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        description: "var(--description)",
        icon: "var(--icon)",
        placeholder: "var(--placeholder)",
        error: "var(--error)",
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
