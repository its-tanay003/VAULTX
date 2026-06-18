import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
      },
      colors: {
        /* VAULTX design tokens */
        vault: {
          bg:        "#09090b",
          surface:   "#111113",
          elevated:  "#18181b",
          border:    "#27272a",
          "border-bright": "#3f3f46",
          teal:      "#2dd4bf",
          "teal-dim":"#14b8a6",
          "teal-glow":"rgba(45,212,191,0.15)",
          "teal-faint":"rgba(45,212,191,0.06)",
          muted:     "#71717a",
          subtle:    "#a1a1aa",
          text:      "#fafafa",
          danger:    "#ef4444",
          warning:   "#f59e0b",
          success:   "#22c55e",
          info:      "#3b82f6",
        },
        /* shadcn/ui CSS variable system */
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.4" },
        },
        "teal-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(45,212,191,0)" },
          "50%":       { boxShadow: "0 0 20px 4px rgba(45,212,191,0.2)" },
        },
        "scan-line": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.4s ease-out",
        "fade-up":         "fade-up 0.5s ease-out",
        shimmer:           "shimmer 2s linear infinite",
        "teal-pulse":      "teal-pulse 2s ease-in-out infinite",
        float:             "float 3s ease-in-out infinite",
        "scan-line":       "scan-line 8s linear infinite",
      },
      backgroundImage: {
        "grid-vault":
          "linear-gradient(rgba(45,212,191,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(45,212,191,0.03) 1px, transparent 1px)",
        "glow-teal":
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(45,212,191,0.12), transparent)",
        "glow-teal-sm":
          "radial-gradient(ellipse 40% 30% at 50% 0%, rgba(45,212,191,0.08), transparent)",
      },
      backgroundSize: {
        "grid-vault": "48px 48px",
      },
      boxShadow: {
        "vault-card":  "0 0 0 1px rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.4)",
        "vault-teal":  "0 0 24px rgba(45,212,191,0.2)",
        "inset-border":"inset 0 0 0 1px rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
