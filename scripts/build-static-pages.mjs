/**
 * Membuat ulang CSS Tailwind untuk halaman publik statis (landing, PSB, CMS, registrasi RFID)
 * ke public/offline-assets/css/. Jalankan setelah mengubah class di salah satu file HTML tersebut:
 *
 *   node scripts/build-static-pages.mjs
 *
 * Halaman-halaman ini ditulis untuk Tailwind v3 (dulu dari CDN), sehingga dibangun dengan
 * tailwindcss@3 lewat npx (butuh internet sekali saat menjalankan skrip ini saja).
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['landing', 'cms-landing', 'psb', 'manajemen-psb', 'registrasi-rfid'];

for (const page of pages) {
  const cmd = [
    'npx -y tailwindcss@3.4.17',
    `-c scripts/static-pages/${page}.tailwind.config.cjs`,
    '-i scripts/static-pages/input.css',
    `-o public/offline-assets/css/${page}.css`,
    '--minify',
  ].join(' ');
  console.log(`> ${page}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}
console.log('Selesai: CSS halaman statis diperbarui di public/offline-assets/css/');
