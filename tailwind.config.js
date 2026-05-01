/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#faf7f2",
        brown: {
          dark: "#2c2418",
          warm: "#8b7355",
          light: "#a09484",
          border: "#e8ddd0",
          hover: "#f5efe6",
        },
        terracotta: "#c96442",
        sage: "#5b8a72",
        slate: "#6b7b8d",
        gold: {
          muted: "#8b6914",
          bg: "#fef3e2",
        },
      },
      fontFamily: {
        heading: ["'Outfit'", "sans-serif"],
        body: ["'Source Serif 4'", "Georgia", "serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      borderRadius: {
        card: "18px",
      },
    },
  },
  plugins: [],
}
