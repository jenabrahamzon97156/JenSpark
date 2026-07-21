import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Optima ships as a built-in system font on macOS/iOS, so no web
        // font loading is needed for it to work on Jen's own devices.
        // Falls back to Apple's system sans (then a generic sans) on any
        // platform that doesn't have Optima installed.
        sans: ['Optima', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
