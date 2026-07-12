import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/domain/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B1220",
        ink: "#F9FAFB",
        muted: "#9CA3AF",
        line: "#1F2937",
        coach: {
          50: "#172554",
          100: "#1E3A5F",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#60A5FA",
          800: "#93C5FD",
          900: "#EFF6FF"
        },
        effort: {
          easy: "#4d8fc8",
          medium: "#c8842d",
          hard: "#b94b56"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(0, 0, 0, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
