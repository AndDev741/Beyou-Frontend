// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    screens: {
      xs: "200px",
      sm: "400px",
      md: "719px",
      lg: "1100px",
      xl: "1280px"
    },
    extend: {
      colors: {
        blueMain: "#0082E1"
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
