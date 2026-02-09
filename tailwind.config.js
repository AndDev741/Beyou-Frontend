// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    screens: {
      xs: "200px",
      sm: "350px",
      md: "712px",
      lg: "1100px",
      lg2: "1200px"
    },
    extend: {
      colors: {
        background: "var(--background)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        description: "var(--description)",
        icon: "var(--icon)",
        placeholder: "var(--placeholder)",
        success: "var(--success)",
        error: "var(--error)",
        
        blueMain: "#0082E1",
        ligthBlue: "#3FA5F2",
        darkBlue: "#0059AB",
        ligthGray: "#D9D9D9",
        darkGray: "#7F8B99",
        descriptionColor: "#7f8b99ff"
      },
      border: {
        mainBorder: "border-solid, border-2px"
      },
      fontFamily: {
        mainFont: "Inter, sans-serif"
      }
    },
  },
  plugins: [],
}
