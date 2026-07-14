/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vert dérivé du logo ApollonPay (feuillage "+AFRIK")
        primary: {
          50: '#f6fdf0',
          100: '#eafcdc',
          200: '#d5f7bb',
          300: '#b4ef86',
          400: '#8ade4a',
          500: '#69c522',
          600: '#53a316',
          700: '#3a8015',
          800: '#316516',
          900: '#2a5314',
          950: '#132e05',
        },
        // Or dérivé du logo ApollonPay (lettres "LLON")
        gold: {
          50: '#fffaeb',
          100: '#fef1c7',
          200: '#fde18a',
          300: '#fcd14d',
          400: '#fbc724',
          500: '#f5bc0b',
          600: '#d9a606',
          700: '#b48a09',
          800: '#92720e',
          900: '#785e0f',
          950: '#453503',
        },
        // Navy conservé pour les identités des plateformes externes (1XBET, etc.)
        navy: {
          700: '#1e3a8a',
          800: '#1a3070',
          900: '#162660',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
