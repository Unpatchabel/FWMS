import type { Config } from "tailwindcss";

/**
 * FWMS design tokens.
 *
 * Palette is intentionally named by *role*, not by raw colour, so components
 * never hard-code a hex value. This keeps the "private banking / family office"
 * look consistent and makes future theming a single-file change.
 *
 * Source palette: Off-white, Beige, Brown, Emerald, Silver, Sky Blue.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds & surfaces (off-white / beige)
        canvas: "#FAF8F3", // page background (warm off-white paper)
        surface: "#FFFFFF", // raised cards
        "surface-sunken": "#F1ECE1", // insets, table stripes
        beige: {
          DEFAULT: "#EFE9DE",
          border: "#E4DBCB",
        },

        // Ink & legacy tones (brown)
        ink: {
          DEFAULT: "#3D3125", // primary text
          soft: "#6B5B49", // secondary text
          brand: "#4A3B2A", // brand brown (sidebar, headings)
        },

        // Growth / positive / primary action (emerald)
        emerald: {
          DEFAULT: "#0F6B4F",
          bright: "#12876A",
          soft: "#E3F0EA",
        },

        // Neutral data & dividers (silver)
        silver: {
          DEFAULT: "#B9BEC4",
          muted: "#8B9096",
          line: "#E6E3DC",
        },

        // Modern tech accent / secondary data (sky blue)
        sky: {
          DEFAULT: "#3E8FD0",
          bright: "#5AA9E6",
          soft: "#E6F1FB",
        },

        // Alerts (liabilities / negatives) — a warm clay, kept muted
        danger: {
          DEFAULT: "#B4462F",
          soft: "#F6E6E0",
        },
      },
      fontFamily: {
        // Display serif = legacy / trust; body sans = modern / legible.
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        // Soft, low-contrast elevation — refined rather than heavy.
        card: "0 1px 2px rgba(61,49,37,0.04), 0 8px 24px -12px rgba(61,49,37,0.10)",
        "card-hover": "0 2px 4px rgba(61,49,37,0.06), 0 12px 32px -12px rgba(61,49,37,0.16)",
      },
      fontSize: {
        hero: ["3.25rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
    },
  },
  plugins: [],
};

export default config;
