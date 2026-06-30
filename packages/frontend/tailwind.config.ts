import type { Config } from "tailwindcss";

/**
 * Design tokens. Components MUST reference these (e.g. `text-accent`,
 * `bg-surface`, `text-muted`) rather than raw hex — this keeps the palette
 * auditable in one place and makes a future retheme a one-file change.
 *
 * Contrast targets (against `navy` #0A0E27):
 *   - `foreground` #E8EAF6  →  ~14:1 (AAA)
 *   - `muted`      #A6ADD6  →  ~8.5:1 (AAA) — replaces the old /30-/40 whites
 *   - `accent`     #FFD700  →  ~13:1 (AAA)
 * All semantic status colors are tuned for AA against `navy`.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0A0E27",
        surface: "#0F1437",
        accent: {
          DEFAULT: "#FFD700",
          foreground: "#0A0E27",
        },
        foreground: "#E8EAF6",
        muted: {
          DEFAULT: "#A6ADD6", // AA on navy — use instead of text-white/30..40
          foreground: "#8B92B9",
        },
        success: "#34D399",
        warning: "#FBBF24",
        danger: "#F87171",
        line: "rgba(255,255,255,0.10)",
      },
      fontFamily: {
        // CSS vars set by next/font in layout.tsx (Phase 2). Until then these
        // fall back to the system stack via globals.css.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
