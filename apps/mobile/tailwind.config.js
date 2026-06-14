/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', './App.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        description: 'var(--description)',
        icon: 'var(--icon)',
        placeholder: 'var(--placeholder)',
        success: 'var(--success)',
        error: 'var(--error)',
      },
    },
  },
  plugins: [],
};
