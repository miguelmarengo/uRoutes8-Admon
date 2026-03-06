/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ff5500",
          hover: "#e64d00",
          light: "rgba(255, 85, 0, 0.14)",
        },
        surface: {
          50: "#16161f",
          100: "#0f0f17",
          200: "#0a0a0f",
          900: "#050507",
        },
        muted: "#8888a0",
        border: "rgba(255, 255, 255, 0.07)",
        "border-2": "rgba(255, 255, 255, 0.12)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
