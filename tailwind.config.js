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
      md: "712px",
      lg: "1100px",
      lg2: "1200px"
    },
    extend: {
      colors: {
        blueMain: "#0082E1",
        ligthBlue: "#3FA5F2"
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
