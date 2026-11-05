# SIUBA — Prosedur Manajemen Insiden (Incident Response Runbook)
**Sistem Informasi Utsman Bin Affan — Modul Presensi Santri**

---

## 1. Klasifikasi Tingkat Keparahan Insiden (Severity Matrix)

| Tingkat Keparahan | Dampak Operasional | Waktu Respon Target (SLA) | Contoh Kasus |
|---|---|---|---|
| **SEV-1 (Critical)** | Sistem lumpuh total, korupsi data massal, bypass otorisasi fatal, seluruh pengguna tidak bisa absen. | < 15 Menit | Database crash, tabel rekam presensi terhapus, server mati total. |
| **SEV-2 (Major)** | Fitur capture utama gagal total untuk semua pengguna, tetapi fallback manual/offline masih berjalan. | < 30 Menit | Semua terminal RFID disconnect, kamera QR tidak terbaca massal. |
| **SEV-3 (Moderate)** | Satu fitur sekunder terganggu atau beberapa santri mengalami anomali token. | < 2 Jam | Ekspor Excel timeout, 1 terminal RFID rusak, 1 kelas jadwal bentrok. |
| **SEV-4 (Minor)** | Kesalahan visual minor, typo teks panduan, atau permintaan bantuan operator. | < 8 Jam | Label status terpotong di layar HP tertentu, filter laporan lambat. |

---

## 2. Alur Penanganan Insiden (8 Langkah Standar)
```
DETECT → CLASSIFY → CONTAIN → PRESERVE EVIDENCE → FIX → VERIFY → RECOVER → DOCUMENT (RCA)
```

1. **Detect (Deteksi)**: Menerima laporan dari alarm monitoring sistem, health check, atau tiket operator.
2. **Classify (Klasifikasi)**: Menetapkan tingkat keparahan (SEV-1 s.d SEV-4) dan menunjuk Incident Commander (IC).
3. **Contain (Pencegahan Perluasan)**: Mengaktifkan fail-safe operasional (misal: mengarahkan operator ke presensi manual atau mode offline).
4. **Preserve Evidence (Preservasi Bukti)**: Mengamankan log error, snapshot database sebelum perbaikan, dan rekaman audit.
5. **Fix (Perbaikan)**: Membuat patch perbaikan pada environment staging/testing dengan verifikasi otomatis.
6. **Verify (Verifikasi)**: Menguji regression test pada modul terdampak sebelum deployment.
7. **Recover (Pemulihan)**: Deploy hotfix resmi ke server produksi dan validasi smoke test.
8. **Document (RCA)**: Menyusun Root Cause Analysis tanpa menyalahkan individu (blame-free postmortem).

---

## 3. Matriks Fail-Safe & Fallback Operasional

| Komponen Bermasalah | Jalur Fallback Pertama | Jalur Fallback Kedua | Jalur Darurat Terakhir |
|---|---|---|---|
| **Terminal RFID Rusak/Mati** | Live QR Scanner (Kamera HP) | Absensi Manual Operator | Form Presensi Kertas Terstandar |
| **Kamera QR Rusak** | Terminal RFID Tapping | Absensi Manual Operator | Form Presensi Kertas Terstandar |
| **WiFi / Jaringan Putus** | PWA Offline Mode (IndexedDB) | PWA Offline Mode di Tablet lain | Absensi Manual Lokal |
| **Server Utama Mati Total** | Cadangan Staging / Failover Node | PWA Offline (Cache Snapshot) | Presensi Darurat Manual |

---

## 4. Format Root Cause Analysis (RCA)
- **Incident ID & Severity**: MISAL: `INC-20260824-01 (SEV-2)`
- **Ringkasan Kejadian**: Apa yang terjadi dan berapa lama durasi dampaknya.
- **Dampak Bisnis**: Berapa santri/sesi yang terdampak selama insiden berlangsung.
- **Kronologi (Timeline)**: Detik demi detik dari awal insiden terdeteksi hingga sistem pulih.
- **Akar Masalah (Root Cause)**: Penjelasan teknis mengapa insiden bisa terjadi.
- **Tindakan Perbaikan & Pencegahan**: Langkah pencegahan struktural agar masalah serupa tidak terulang.
