module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
   theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        primaryDark: '#4F46E5',
        secondary: '#A78BFA',
        background: '#F8FAFC',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
}