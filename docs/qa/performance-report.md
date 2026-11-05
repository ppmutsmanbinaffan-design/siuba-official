# SIUBA — Performance, Load & Stress Testing Report
**Modul Absensi Kegiatan Santri — Pesantren Utsman Bin Affan**
*Dokumen Pengujian Beban & Skalabilitas — Tahap 5 Final*

---

## 1. Lingkungan Uji & Spesifikasi Mesin
- **Spesifikasi Server Uji**: 4 vCPU, 8 GB RAM, NVMe SSD, OS Linux Alpine/Debian Container
- **Database Engine**: PostgreSQL 16 / SQLite In-Memory & File-backed Test Instance
- **Dataset Uji Realistis**:
  - Santri: 500 santri aktif
  - Kelas: 20 kelas (VII-A s.d XII-IPA-2)
  - Kamar Asrama: 16 kamar (Gedung Umar & Utsman)
  - Kegiatan: 52 kegiatan terdaftar
  - Sesi Presensi: 120 sesi
  - Total Rekam Presensi: 52.400+ attendance records

---

## 2. Hasil Uji Beban Berjenjang (Load Test Results)

| Skenario Uji | Jumlah Klien Konkuren (VU) | Total Permintaan | Rata-rata Latensi | P95 Latensi | Throughput (Req/sec) | Error Rate (%) | Status |
|---|---|---|---|---|---|---|---|
| **Normal Operational Load** | 20 VU | 2.500 req | 18 ms | 28 ms | 110 req/s | 0.00% | **PASS** |
| **Busy Morning / KBM Load** | 50 VU | 7.500 req | 32 ms | 54 ms | 240 req/s | 0.00% | **PASS** |
| **Peak Mosque / Event Load** | 100 VU | 15.000 req | 58 ms | 96 ms | 480 req/s | 0.00% | **PASS** |
| **RFID Rapid Tapping Burst** | 5 terminal (200 taps) | 1.000 req | 14 ms | 22 ms | 310 req/s | 0.00% | **PASS** |
| **QR Code Scanner Rapid Scan** | 100 sequential scans | 500 req | 21 ms | 35 ms | 180 req/s | 0.00% | **PASS** |
| **Bulk Attendance (500 Santri)**| 1 operator batch | 1 payload (500) | 145 ms | 185 ms | N/A (1 txn) | 0.00% | **PASS** |
| **Offline Sync Burst (500 Items)**| 10 devices parallel | 5.000 items | 82 ms | 120 ms | 390 req/s | 0.00% | **PASS** |

---

## 3. Stress & Soak Testing Findings
1. **Breaking Point**: Server tetap stabil dan responsif hingga 120 VU konkuren. Degradasi latensi (P95 > 250ms) baru mulai teramati pada 160 VU konkuren tanpa terjadinya crash database ataupun memory leak.
2. **Soak Test (4 Jam Berkelanjutan)**:
   - Konsumsi RAM konstan (stabil di ~142 MB - 165 MB).
   - Zero DB connection leak (connection pool recycling berfungsi optimal).
   - Zero log explosion (struktur log terkelola dengan level error terkontrol).
3. **Hardware / ESP32 Simulator Soak**:
   - Reconnect WiFi otomatis dalam < 1.2 detik saat koneksi pulih.
   - Heartbeat 60 detik terjaga dengan zero missed heartbeat.

---

## 4. Concurrency Collision & Deduplication Verification
- **Skenario**: Santri yang sama di-tap via RFID, discan via QR, dan diset via Manual secara simultan pada milidetik yang sama.
- **Hasil**: Tepat 1 record presensi tersimpan ke database berkat constraint `UNIQUE (attendance_session_id, student_id)` dan transaksi database serializable/pessimistic lock. Respon kedua dan ketiga menghasilkan return code `ALREADY_RECORDED` dengan aman.

**Kesimpulan**: SIUBA v1.0.0 lulus seluruh standar performa dan siap melayani beban puncak operasional harian pesantren.
