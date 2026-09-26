/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./context/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
    "./utils/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      spacing: {
        side: "96px",
      },
      colors: {
        primaryColor: "#153979",
        secondaryColor: "#FF6B00",
      },
    },
  },
  plugins: [],
};
