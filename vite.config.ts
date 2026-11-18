import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Backend satu-satunya: Laravel (php artisan serve -> http://127.0.0.1:8000).
 * Saat development, `npm run dev` menjalankan Vite di port 3000 dan meneruskan
 * semua request API & halaman admin statis ke Laravel.
 */
const LARAVEL = process.env.LARAVEL_URL || 'http://127.0.0.1:8000';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // public/ milik Laravel (index.php, landing.html, dll.) — jangan ikut disalin ke dist/
    publicDir: false,
    build: { outDir: 'dist', emptyOutDir: true },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': { target: LARAVEL, changeOrigin: true },
        '/tap.php': { target: LARAVEL, changeOrigin: true },
        '/cms-landing': { target: LARAVEL, changeOrigin: true },
        '/manajemen-psb': { target: LARAVEL, changeOrigin: true },
        '/registrasi-rfid': { target: LARAVEL, changeOrigin: true },
        '/js': { target: LARAVEL, changeOrigin: true },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
