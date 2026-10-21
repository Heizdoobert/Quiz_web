# tailwind.config.js
lines:21 exports:
---
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pureWhite: '#FFFFFF',
        lightOrangeWhite: '#FFF0E0',
        lightOrange: '#FFB878',
        brightOrange: '#FFA500',
        vividOrange: '#FF6B00',
        deepOrange: '#D44800',
      },
    },
  },
  plugins: [],
};
