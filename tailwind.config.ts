import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        stemania: {
          teal: {
            50:  "#EEF2FF",
            100: "#E0E7FF",
            200: "#C7D2FE",
            300: "#A5B4FC",
            400: "#818CF8",
            500: "#6366F1",
            600: "#4F46E5",
            700: "#4338CA",
            800: "#3730A3",
            900: "#312E81",
          },
          red: {
            50:  "#FEF2F2",
            400: "#F87171",
            500: "#EF4444",
            600: "#DC2626",
          },
          yellow: {
            50:  "#FEFCE8",
            400: "#FACC15",
            500: "#EAB308",
          },
          green: {
            50:  "#F0FDF4",
            400: "#4ADE80",
            500: "#22C55E",
            600: "#16A34A",
          },
          dark: "#1E293B",
        },
      },
      fontFamily: {
        display: ["Nunito", "system-ui", "sans-serif"],
        heading: ["DM Sans", "system-ui", "sans-serif"],
        body:    ["DM Sans", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
