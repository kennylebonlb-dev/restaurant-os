import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/stores/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#16201d",
        moss: "#2e5d50",
        clay: "#b66f45",
        linen: "#f7f1e8",
        sage: "#dfe9df"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(22, 32, 29, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
