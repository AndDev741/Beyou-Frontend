/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Tokens do redesign — espelham packages/theme (cssVars.ts), aplicados
        // em runtime pelo BeyouThemeProvider via nativewind `vars()`.
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        'on-accent': 'var(--on-accent)',
        'accent-soft': 'var(--accent-soft)',
        xp: 'var(--xp)',
        'xp-soft': 'var(--xp-soft)',
        flame: 'var(--flame)',
        'flame-soft': 'var(--flame-soft)',
        success: 'var(--success)',
        danger: 'var(--danger)',

        // Aliases do modelo antigo — saem na fase de limpeza.
        background: 'var(--background)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        description: 'var(--description)',
        icon: 'var(--icon)',
        placeholder: 'var(--placeholder)',
        error: 'var(--error)',
      },
      borderRadius: {
        frame: '24px',
        card: '16px',
        control: '10px',
      },
      fontFamily: {
        sans: ['Geist'],
        mono: ['GeistMono'],
      },
    },
  },
  plugins: [],
};
