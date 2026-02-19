import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        stemania: {
          teal: {
            50:  "#E8F6F8",
            100: "#C8EBF0",
            200: "#8DD1DA",
            300: "#52B5C2",
            400: "#2A9CAA",
            500: "#238B98",  // PRIMARY — cooler blue-teal
            600: "#1C7280",
            700: "#155963",
            800: "#0E4149",
            900: "#07282E",
          },
          red: {
            50:  "#FEF2F2",
            400: "#F87171",
            500: "#D94545",  // Errors, destructive actions
            600: "#B83C3C",
          },
          yellow: {
            50:  "#FEFCE8",
            400: "#F5C842",  // Warnings, highlights, badges
            500: "#EAB308",
          },
          green: {
            50:  "#F0FDF4",
            400: "#4ADE80",
            500: "#5BBD5B",  // Success, published, active
            600: "#16A34A",
          },
          dark: "#1E293B",   // Dark mode base, dark text alternative
        },
      },
      fontFamily: {
        display: ["Nunito", "system-ui", "sans-serif"],       // Hero headings, marketing
        heading: ["DM Sans", "system-ui", "sans-serif"],       // Page titles, section headers
        body:    ["DM Sans", "system-ui", "sans-serif"],       // Body text, labels
        mono:    ["JetBrains Mono", "monospace"],              // Employee numbers, IDs, code
      },
    },
  },
  plugins: [],
};

export default config;
