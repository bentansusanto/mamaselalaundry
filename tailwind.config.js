/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB", // blue-600
          hover: "#1D4ED8",
          light: "#DBEAFE",
        },
        warning: {
          DEFAULT: "#EAB308", // yellow-500
          light: "#FEF9C3",
        },
        danger: {
          DEFAULT: "#EF4444", // red-500
          light: "#FEE2E2",
        },
        success: {
          DEFAULT: "#22C55E", // green-500
          light: "#DCFCE7",
        },
        text: {
          DEFAULT: "#0F172A", // slate-900
          muted: "#64748B", // slate-500
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F8FAFC", // slate-50
          border: "#E2E8F0", // slate-200
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
};
