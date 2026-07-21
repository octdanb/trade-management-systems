/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirrors the web app's shadcn palette (light theme values).
        background: '#ffffff',
        foreground: '#0a0a0a',
        muted: '#f5f5f5',
        'muted-foreground': '#737373',
        border: '#e5e5e5',
        primary: '#171717',
        'primary-foreground': '#fafafa',
        accent: '#10b981',
      },
    },
  },
  plugins: [],
}
