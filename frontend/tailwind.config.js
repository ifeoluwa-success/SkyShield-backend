/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Figma Core (exact from 2025 design system)
        figma: {
          black: {
            1: "#0D0D0D", // Deepest for dark mode text
            2: "#1C1C1C", // Dark backgrounds
            3: "#2D2D2D", // Subtle dark cards
          },
          gray: {
            100: "#F7F7F7", // Light backgrounds
            200: "#E5E5E5", // Borders, subtle dividers
            300: "#D4D4D4", // Disabled states
            400: "#A3A3A3", // Secondary text
          },
          white: "#FFFFFF", // Primary light backgrounds
          // Accents (vibrant for CTAs, highlights)
          blue: "#18A0FB",      // Primary action (buttons, links)
          purple: "#A259FF",    // Secondary/creative (badges, progress)
          green: "#0ACF83",     // Success (e.g., sim completion)
          red: "#F24E1E",       // Danger (threat alerts)
          yellow: "#FFBC2C",    // Warning (e.g., timed decisions)
        },
        // SkyShield Aviation Extensions (blend Figma with cyber/aviation trust)
        shield: {
          blue: "#1E40AF",     // Deeper blue for aviation skies
          gray: "#6B7280",     // Neutral for dashboards
          accent: "#3B82F6",   // Lighter blue for hovers
        },
      },
      // Figma Typography (Inter font, bold headings)
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Figma Spacing (generous, modular)
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      // Figma Gradients (used in hero, cards)
      backgroundImage: {
        'figma-hero': 'linear-gradient(135deg, #A259FF 0%, #18A0FB 100%)',
        'shield-hero': 'linear-gradient(135deg, #A259FF 0%, #1E40AF 100%)', // Purple to aviation blue
      },
      // Figma Animations (subtle for engagement)
      animation: {
        /** Slightly faster than default 1s — keeps loaders from feeling sluggish app-wide */
        spin: 'spin 0.5s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};