/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      "width": {
        "192": "48rem",
        "152": "38rem",
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}

