/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // --- Strict 4-color palette (do not add hues outside this set) ---
        base: "#010736", // Base / darkest background
        card: "#0D1C42", // Card / container background
        accent: "#22396F", // Accent / secondary UI (borders, secondary buttons, dividers)
        highlight: "#FCF1D0", // Primary highlight / text accent

        // Semantic aliases used throughout the app. These all resolve to
        // one of the four colors above (or an opacity variant of
        // `highlight`, used for text hierarchy) — see README section
        // "Color system" for the contrast ratios behind each choice.
        paper: "#010736", // = base — page background
        surface: "#0D1C42", // = card — panels/cards
        line: "#22396F", // = accent — borders/dividers
        ink: "#FCF1D0", // = highlight — primary text, full opacity (~17:1 on paper)
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "6px",
      },
      ringColor: {
        DEFAULT: "#FCF1D0",
      },
    },
  },
  plugins: [],
};
