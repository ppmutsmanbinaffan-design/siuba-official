# SIUBA Production Update & Deployment Runbook

## 1. Prosedur Pembaruan Aplikasi (Zero-Data-Loss Update)

Ikuti tahapan berurutan berikut saat menerapkan rilis baru ke server produksi:

```bash
# 1. Buat backup database cadangan darurat terlebih dahulu
php artisan system:backup --type=database --notes="Pre-deployment safety backup"

# 2. Masuk ke mode pemeliharaan (Maintenance Mode)
php artisan down --message="SIUBA sedang dalam pembaruan berkala. Layanan akan kembali aktif dalam beberapa saat."

# 3. Tarik source code terbaru dari Git repository
git pull origin main

# 4. Instal dependensi backend & frontend
composer install --no-dev --optimize-autoloader
npm ci
npm run build

# 5. Jalankan migrasi basis data
php artisan migrate --force

# 6. Bersihkan dan optimize cache Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 7. Restart service background (Queue Worker & Scheduler)
sudo systemctl restart siuba-queue || true

# 8. Jalankan pengujian kesehatan sistem dan audit integritas
php artisan system:health
php artisan system:audit-integrity

# 9. Buka kembali akses aplikasi untuk seluruh pengguna
php artisan up
```

## 2. Prosedur Rollback Cepat (Emergency Rollback)
Apabila terjadi anomali kritis pasca pembaruan kode:
1. Kembalikan kode aplikasi ke commit sebelumnya (`git checkout <previous_stable_tag>`).
2. Jalankan `npm run build` dan `php artisan optimize`.
3. Jika terdapat migrasi skema yang tidak kompatibel, gunakan snapshot backup pre-deployment:
   ```bash
   php artisan system:restore --backup-id="BKP-PRE-DEPLOYMENT-ID" --reason="Emergency rollback pasca kegagalan deploy"
   ```
