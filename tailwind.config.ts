import type { Config } from "tailwindcss";

/**
 * HDB Service — design tokens.
 * See docs/ui-ux/02-reglas-de-marca.md before changing anything here.
 */
const config: Config = {
    darkMode: 'class',
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
                mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
            },
            fontSize: {
                '2xs': ['0.6875rem', { lineHeight: '1rem' }],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                    hover: "hsl(var(--primary-hover))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
                },
                warning: {
                    DEFAULT: "hsl(var(--warning))",
                    foreground: "hsl(var(--warning-foreground))",
                },
                info: {
                    DEFAULT: "hsl(var(--info))",
                    foreground: "hsl(var(--info-foreground))",
                },
                danger: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    muted: "hsl(var(--sidebar-muted))",
                    accent: "hsl(var(--sidebar-accent))",
                    border: "hsl(var(--sidebar-border))",
                    active: "hsl(var(--sidebar-active))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xl: "0.75rem",
                // Capped on purpose: brand rules forbid radii above 12px.
                '2xl': "0.75rem",
                '3xl': "0.75rem",
            },
            boxShadow: {
                xs: "0 1px 1px 0 rgb(16 24 40 / 0.04)",
                sm: "0 1px 2px 0 rgb(16 24 40 / 0.06)",
                DEFAULT: "0 1px 3px 0 rgb(16 24 40 / 0.08), 0 1px 2px -1px rgb(16 24 40 / 0.06)",
                md: "0 4px 8px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.04)",
                lg: "0 10px 20px -6px rgb(16 24 40 / 0.12), 0 4px 6px -4px rgb(16 24 40 / 0.04)",
                xl: "0 18px 36px -10px rgb(16 24 40 / 0.18)",
                '2xl': "0 24px 48px -12px rgb(16 24 40 / 0.22)",
            },
            keyframes: {
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(4px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in-right": {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(0)" },
                },
                "sheet-up": {
                    "0%": { transform: "translateY(16px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                "pulse-soft": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.55" },
                },
                "ping-slow": {
                    "0%": { transform: "scale(1)", opacity: "0.8" },
                    "20%, 100%": { transform: "scale(1.8)", opacity: "0" },
                },
                "shimmer": {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.18s ease-out",
                "slide-in-right": "slide-in-right 0.2s ease-out",
                "sheet-up": "sheet-up 0.2s ease-out",
                "pulse-soft": "pulse-soft 2s ease-in-out infinite",
                "ping-slow": "ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite",
                "shimmer": "shimmer 1.6s linear infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
