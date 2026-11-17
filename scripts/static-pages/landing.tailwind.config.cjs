// Dibuat dari konfigurasi Tailwind CDN di public/landing.html — dipakai scripts/build-static-pages.mjs
const tailwind = {};
tailwind.config = {
      theme: {
        screens: {
          'xs': '420px',
          'sm': '640px',
          'md': '768px',
          'lg': '1024px',
          'xl': '1280px',
          '2xl': '1440px',
        },
        extend: {
          fontFamily: {
            sans: ['Urbanist', 'sans-serif'],
          },
          colors: {
            forest: {
              950: '#071f12',
              900: '#0d331d',
              800: '#14492b',
              700: '#1c633a',
            },
            limeaccent: {
              400: '#a3e635',
              500: '#84cc16',
              600: '#65a30d',
            }
          }
        }
      }
    };
module.exports = { ...tailwind.config, content: ['./public/landing.html'] };
