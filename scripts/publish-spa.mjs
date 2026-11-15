/**
 * Salin hasil `vite build` (dist/) ke public/ agar dilayani Laravel.
 * - dist/assets/*  -> public/assets/ (file lama dihapus)
 * - public/app.html: hanya tag <script src="/assets/index-*.js"> dan <link href="/assets/index-*.css">
 *   yang diganti; script tambahan di app.html (menu CMS, PSB, dll.) tetap dipertahankan.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distAssets = path.join(root, 'dist', 'assets');
const publicAssets = path.join(root, 'public', 'assets');
const appHtml = path.join(root, 'public', 'app.html');

if (!fs.existsSync(distAssets)) {
  console.error('dist/assets tidak ditemukan. Jalankan `vite build` dulu.');
  process.exit(1);
}

const built = fs.readdirSync(distAssets);
const js = built.find((f) => /^index-.*\.js$/.test(f));
const css = built.find((f) => /^index-.*\.css$/.test(f));
if (!js || !css) {
  console.error('Bundle index-*.js / index-*.css tidak ditemukan di dist/assets.');
  process.exit(1);
}

fs.rmSync(publicAssets, { recursive: true, force: true });
fs.mkdirSync(publicAssets, { recursive: true });
for (const f of built) fs.copyFileSync(path.join(distAssets, f), path.join(publicAssets, f));

const version = new Date().toISOString().slice(0, 10).replace(/-/g, '');
let html = fs.readFileSync(appHtml, 'utf8');
html = html
  .replace(/<script type="module" crossorigin src="\/assets\/index-[^"]+"><\/script>/, `<script type="module" crossorigin src="/assets/${js}?v=${version}"></script>`)
  .replace(/<link rel="stylesheet" crossorigin href="\/assets\/index-[^"]+">/, `<link rel="stylesheet" crossorigin href="/assets/${css}">`);
fs.writeFileSync(appHtml, html);

console.log(`✓ SPA dipublikasikan ke public/: ${js}, ${css}`);
