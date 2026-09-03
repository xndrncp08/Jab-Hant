/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F8",
        surface: "#FFFFFF",
        ink: "#12161C",
        muted: "#5B6472",
        faint: "#8B93A1",
        line: "#E2E4E9",
        signal: {
          DEFAULT: "#3452FF",
          dim: "#EAEDFF",
        },
        good: {
          DEFAULT: "#1F9D6B",
          dim: "#E4F5EE",
        },
        warn: {
          DEFAULT: "#B8791C",
          dim: "#FBF0DE",
        },
        bad: {
          DEFAULT: "#C63D3D",
          dim: "#FBEAEA",
        },
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
    },
  },
  plugins: [],
};
