import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#57BEEB',
          50:  '#f0f9fe',
          100: '#d9f0fb',
          200: '#bbe3f8',
          300: '#8dd0f3',
          400: '#57BEEB',  // brand primary
          500: '#2aa8dd',
          600: '#1a8ec4',
          700: '#1872a0',
          800: '#195f84',
          900: '#1a4f6d',
        },
        secondary: {
          DEFAULT: '#58C697',
          50:  '#f0fdf6',
          100: '#dbfaec',
          200: '#b9f3d9',
          300: '#84e8be',
          400: '#58C697',  // brand secondary
          500: '#25a872',
          600: '#178a5c',
          700: '#146f4b',
          800: '#13583d',
          900: '#114933',
        },
      },
      fontFamily: {
        // Anika is a custom font — place Anika.woff2 (and .woff) in
        // src/assets/fonts/ and the @font-face in index.css will pick it up.
        sans: ['Anika', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
