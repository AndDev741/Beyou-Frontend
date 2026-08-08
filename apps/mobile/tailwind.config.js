/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Tokens do redesign — espelham packages/theme (cssVars.ts), aplicados
        // em runtime pelo BeyouThemeProvider via nativewind `vars()`.
        //
        // Forma `rgb(var(--x-rgb) / <alpha-value>)` e não `var(--x)`: sem os
        // canais crus o Tailwind v3 não emite as classes com barra, e
        // `bg-success/10` ou `bg-accent/25` saíam SEM FUNDO NENHUM. O
        // themeToVars já publica os dois formatos; é o mesmo shape da web.
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

        // Já vêm com alfa embutido; não participam das variantes de opacidade.
        'accent-soft': 'var(--accent-soft)',
        'xp-soft': 'var(--xp-soft)',
        'flame-soft': 'var(--flame-soft)',

        // Aliases do modelo antigo — saem na fase de limpeza.
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
        // Cada peso é uma família própria: o RN não sintetiza peso a partir de
        // um arquivo só. `font-semibold` sozinho não muda a fonte — use
        // font-medium/font-semibold/font-bold destas famílias.
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
