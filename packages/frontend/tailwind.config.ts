import type { Config } from "tailwindcss";

/**
 * Design tokens — "refined crypto-native dark".
 *
 * Two-color semantic system that color-codes the composable-privacy split:
 *   - violet (#7C5CFF) = the encrypted / auditor-gated world (FHE, credentials)
 *   - cyan   (#22D3EE) = the public / revealed world (verdicts, public data)
 * Status colors are tuned for AA against the near-black background.
 *
 * Components MUST reference these tokens (e.g. `text-accent`, `bg-surface`)
 * rather than raw hex — keeps the palette auditable in one place.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — deep, cool near-black with a layered surface system.
        bg: "#07080F",
        surface: {
          DEFAULT: "#0D0F1A", // card base
          2: "#12141F", // raised / hover
        },
        // Accents — the violet/cyan semantic pair.
        accent: {
          DEFAULT: "#7C5CFF", // violet — encrypted / auditor-gated
          foreground: "#FFFFFF",
        },
        cyan: {
          DEFAULT: "#22D3EE", // public / revealed verdicts
          foreground: "#04111A",
        },
        foreground: "#EDEFF7",
        muted: {
          DEFAULT: "#9AA0BC", // AA on bg — body secondary text
          foreground: "#6B7193", // tertiary / captions
        },
        // Semantic status (kept, retuned against the new bg).
        success: "#34D399",
        warning: "#FBBF24",
        danger: "#F87171",
        line: "rgba(255,255,255,0.08)",
        "line-strong": "rgba(255,255,255,0.14)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Bigger display jumps for a confident hierarchy.
        "hero": ["clamp(2.5rem, 6vw, 4.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      boxShadow: {
        // Soft accent glows for key data / hover states.
        "glow-accent": "0 0 0 1px rgba(124,92,255,0.35), 0 8px 32px -8px rgba(124,92,255,0.45)",
        "glow-cyan": "0 0 0 1px rgba(34,211,238,0.35), 0 8px 32px -8px rgba(34,211,238,0.4)",
        "glow-success": "0 0 0 1px rgba(52,211,153,0.35), 0 8px 32px -8px rgba(52,211,153,0.4)",
        "card": "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 40px -16px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-texture":
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        "accent-radial":
          "radial-gradient(60% 50% at 50% 0%, rgba(124,92,255,0.12) 0%, transparent 70%)",
      },
      backgroundSize: {
        grid: "44px 44px",
      },
      keyframes: {
        "flow-dot": {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "20%": { opacity: "1" },
          "80%": { opacity: "1" },
          "100%": { transform: "translateY(48px)", opacity: "0" },
        },
        "verdict-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(34,211,238,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(34,211,238,0)" },
        },
        "gate-shimmer": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "flow-dot": "flow-dot 2.4s ease-in-out infinite",
        "verdict-pulse": "verdict-pulse 2s ease-in-out infinite",
        "gate-shimmer": "gate-shimmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
