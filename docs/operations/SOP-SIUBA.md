# SIUBA — Standar Operasional Prosedur (SOP) Master
**Sistem Informasi Utsman Bin Affan — Modul Presensi Santri**

---

## 1. SOP Rutinitas Harian Administrator Sistem (Daily Admin Checklist)
1. **05:00 WIB**: Pemeriksaan kesehatan server, konektivitas database, status cron scheduler sesi harian.
2. **06:30 WIB**: Verifikasi ketersediaan terminal presensi RFID di masjid dan gerbang asrama.
3. **12:00 WIB & 18:00 WIB**: Monitor antrean sinkronisasi (Pending Sync Queue) dan verifikasi zero sync conflicts.
4. **22:00 WIB**: Verifikasi eksekusi auto-backup harian (DB dump + SHA256 checksum) ke secondary storage.

---

## 2. SOP Operator Presensi (Alur Input & Penutupan Sesi)
1. **Buka Aplikasi SIUBA**: Pastikan login dengan kredensial resmi.
2. **Pilih Sesi Terjadwal**: Buka tab *Sesi Absensi* dan pastikan tanggal & nama kegiatan sesuai.
3. **Buka Sesi (Open Session)**: Klik tombol *Buka Sesi* agar sesi menerima data rekam kehadiran.
4. **Rekam Kehadiran**:
   - Gunakan metode RFID / QR Scanner / Input Manual.
   - Perhatikan feedback suara dan visual (Warna Hijau = Hadir, Kuning = Terlambat, Merah = Ditolak/Bukan Peserta).
5. **Verifikasi Kehadiran & Izin**: Pastikan santri dengan surat izin/sakit telah disetujui di modul *Izin & Dispensasi*.
6. **Tutup Sesi (Close Session)**: Klik tombol *Tutup Sesi & Finalisasi*. Santri yang belum terekam otomatis ditetapkan berstatus *Alpha* dengan aman.

---

## 3. SOP Operasional Offline Mode & Sinkronisasi
1. **Persiapan (Saat Online)**: Buka tab kegiatan/sesi saat terhubung ke jaringan agar data santri & snapshot peserta tersimpan di IndexedDB browser.
2. **Kondisi Offline (Jaringan Putus)**: Aplikasi otomatis beralih ke *Mode Offline*. Lakukan input presensi seperti biasa. Data masuk ke *Pending Queue*.
3. **Koneksi Pulih (Online)**: Buka *Pusat Sinkronisasi*, klik *Sinkronkan Antrean Sekarang*.
4. **Verifikasi Status**: Pastikan status seluruh record berubah menjadi *SYNCED* dan tidak ada konflik yang tertunda.

---

## 4. SOP Penanganan Insiden & Emergency Fallback
- **RFID Reader Mati / Error**: Alihkan presensi santri ke **Live QR Scanner** menggunakan kamera smartphone operator.
- **Kamera QR Rusak / Tidak Ada**: Gunakan **Absensi Manual** (fitur *Hadirkan Semua* dan sesuaikan yang berhalangan).
- **Server Utama Tidak Terjangkau**: Lanjutkan presensi pada PWA offline di tablet/laptop operator. Data akan disinkronkan saat server kembali online.
- **Kartu RFID / QR Hilang**:
  - Untuk QR: Buka master santri, klik *Regenerate QR Token*, cetak ulang kartu santri baru. Token lama otomatis tidak berlaku.
  - Untuk RFID: Hapus UID lama pada master santri, tap kartu pengganti pada menu assignment.
