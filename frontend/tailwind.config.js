/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // --- Apple-style palette, driven by CSS custom properties so the
        // whole app follows the OS light/dark setting automatically (see
        // :root / prefers-color-scheme in index.css) with zero `dark:`
        // variants needed anywhere in components. ---
        base: "rgb(var(--color-base) / <alpha-value>)", // page background
        paper: "rgb(var(--color-base) / <alpha-value>)", // alias
        card: "rgb(var(--color-card) / <alpha-value>)", // panel/card background
        surface: "rgb(var(--color-card) / <alpha-value>)", // alias
        accent: "rgb(var(--color-accent) / <alpha-value>)", // hairline borders, dividers, subtle washes
        line: "rgb(var(--color-accent) / <alpha-value>)", // alias
        ink: "rgb(var(--color-ink) / <alpha-value>)", // primary text
        highlight: "rgb(var(--color-highlight) / <alpha-value>)", // secondary/tertiary text (used via opacity steps)
        blue: "rgb(var(--color-blue) / <alpha-value>)", // primary accent / links / CTAs / focus rings
        green: "rgb(var(--color-green) / <alpha-value>)",
        red: "rgb(var(--color-red) / <alpha-value>)",
        orange: "rgb(var(--color-orange) / <alpha-value>)",
        purple: "rgb(var(--color-purple) / <alpha-value>)",
      },
      fontFamily: {
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          '"SF Mono"',
          "Menlo",
          "Monaco",
          '"Cascadia Code"',
          "monospace",
        ],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        md: "14px",
        lg: "18px",
        xl: "22px",
      },
      boxShadow: {
        card: "0 1px 1px rgba(0,0,0,0.02), 0 8px 24px -10px rgba(0,0,0,0.14)",
        raised: "0 2px 5px rgba(0,0,0,0.08), 0 14px 34px -12px rgba(0,0,0,0.22)",
      },
      ringColor: {
        DEFAULT: "rgb(var(--color-blue) / 1)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
