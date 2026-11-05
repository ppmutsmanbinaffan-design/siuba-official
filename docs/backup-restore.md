# SIUBA Backup & Restore Procedures

## 1. Arsitektur Backup
- **Lokasi Penyimpanan**: Direktori privat `storage/app/backups/` yang tidak dapat diakses langsung melalui public web root.
- **Integritas & Keamanan**: Setiap backup menghasilkan hash SHA-256 dan catatan di tabel `system_backups` dengan status awal `running` hingga `verified`.
- **Kebijakan Retensi**: Sistem mempertahankan 10 backup harian terbaru secara otomatis, melakukan rotasi dan pembersihan file lama.

## 2. Prosedur Eksekusi Backup (CLI & Scheduled)
```bash
# Menjalankan backup database manual via CLI
php artisan system:backup --type=database --notes="Backup rutin sebelum rilis jadwal"

# Menjalankan backup terjadwal otomatis (dimasukkan ke Laravel Scheduler cron)
$schedule->command('system:backup --type=database')->dailyAt('02:00');
```

## 3. Format Manifest Backup
Setiap berkas cadangan JSON memuat struktur terverifikasi:
```json
{
  "manifest": {
    "backup_id": "BKP-20260824-081500-A9F2",
    "app_name": "SIUBA",
    "app_version": "1.4.0",
    "created_at": "2026-08-24T08:15:00Z",
    "type": "database",
    "environment": "production"
  },
  "tables": {
    "students": [...],
    "attendance_records": [...]
  }
}
```

## 4. Alur Restore Terkendali (Disaster Recovery)
Restore merupakan aksi berisiko tinggi dan **TIDAK BOLEH** berjalan otomatis pasca kegagalan query biasa.

### Urutan Tahapan Restore:
1. **Pilih Berkas Backup**: Konfirmasi ketersediaan dan validasi checksum SHA-256 berkas cadangan.
2. **Safety Pre-Restore Snapshot**: Sistem secara otomatis membuat backup darurat snapshot status saat ini (`Pre-Restore Safety Snapshot`).
3. **Aktifkan Mode Pemeliharaan**:
   ```bash
   php artisan down --message="Sedang berlangsung restorasi basis data SIUBA. Silakan tunggu beberapa menit."
   ```
4. **Eksekusi Pemulihan Tabel**:
   ```bash
   php artisan system:restore --backup-id="BKP-20260824-081500-A9F2" --reason="Pemulihan pasca insiden integritas data"
   ```
5. **Verifikasi Integritas Pasca-Restore**:
   Sistem menjalankan `DataIntegrityAuditService::runFullAudit()` untuk menjamin ketiadaan data duplikat atau orphan records.
6. **Nonaktifkan Mode Pemeliharaan**:
   ```bash
   php artisan up
   ```
7. **Audit Log Trail**: Tercatat di `audit_logs` dengan event `restore_completed`.
