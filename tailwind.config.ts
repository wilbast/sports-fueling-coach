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
        canvas: "#f4f6f1",
        ink: "#1f2522",
        muted: "#66706b",
        line: "#d9dfd6",
        coach: {
          50: "#ecf7f1",
          100: "#d6ecdf",
          500: "#2f7a57",
          600: "#256247",
          900: "#173b2c"
        },
        effort: {
          easy: "#4d8fc8",
          medium: "#c8842d",
          hard: "#b94b56"
        }
      },
      boxShadow: {
        soft: "0 16px 50px rgba(31, 37, 34, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
