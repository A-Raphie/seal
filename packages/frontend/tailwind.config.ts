import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zama: {
          navy: "#0A0E27",
          dark: "#0F1437",
          accent: "#FFD700",
          muted: "#8B92B9",
        },
      },
    },
  },
  plugins: [],
};
export default config;
