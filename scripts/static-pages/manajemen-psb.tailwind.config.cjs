// Dibuat dari konfigurasi Tailwind CDN di public/manajemen-psb.html — dipakai scripts/build-static-pages.mjs
const tailwind = {};
tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Urbanist', 'sans-serif'] },
          colors: {
            forest: { 950: '#071f12', 900: '#12372A', 800: '#1F5C45', 700: '#1c633a' },
            limeaccent: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d' }
          }
        }
      }
    };
module.exports = { ...tailwind.config, content: ['./public/manajemen-psb.html'] };
