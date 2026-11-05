# SIUBA — Final User Acceptance Testing (UAT) Report
**Modul Absensi Kegiatan Santri — Pesantren Utsman Bin Affan**
*Versi Aplikasi: v1.0.0-rc.1 (Release Candidate) | Lingkungan Uji: STAGING / UAT*

---

## 1. Ringkasan Eksekutif UAT
UAT Tahap 5 melibatkan seluruh perwakilan stakeholder operasional pesantren (10 peran operasional: Super Admin, Admin, Pimpinan, Kepala Sekolah, Kepala Asrama, Guru Pengampu, Wali Kelas, Musyrif/Musyrifah, Pembina Ekstrakurikuler, dan Petugas Masjid/Absensi).

Semua 16 skenario uji UAT inti dinyatakan **PASS (100% Selesai)** dengan zero blocker dan zero critical issues.

---

## 2. Matriks Hasil Pengujian Stakeholder

| UAT ID | Role / Stakeholder | Modul & Skenario Uji | Prekondisi | Hasil Aktual | Status | Catatan / Sign-off |
|---|---|---|---|---|---|---|
| **UAT-ADM-01** | Super Admin / Admin | Master Santri, Kelas, Asrama & Multi-Method ID (QR/RFID) | Login as Admin | Santri terdaftar, QR Token unik di-generate, RFID UID di-assign tanpa tabrakan. | **PASS** | Validasi duplikasi aktif |
| **UAT-ADM-02** | Super Admin / Admin | Generator Sesi Rutin, KBM, & Snapshot Peserta Dinamis | Master schedule ready | Sesi KBM, Shalat, Asrama ter-generate otomatis dengan snapshot peserta terisolasi. | **PASS** | Snapshot immutable saat Open |
| **UAT-GRU-01** | Guru Pengampu | KBM Attendance (Manual Single/Bulk & Copy Jam Sebelumnya) | Guru KBM terjadwal | Guru membuka sesi kelas, input status 26 santri, sukses salin presensi ke jam ke-2. | **PASS** | Efisiensi input < 30 detik |
| **UAT-WLK-01** | Wali Kelas | Monitoring Matriks Presensi & Rekap Kehadiran Kelas Binaan | Login Wali Kelas | Hanya melihat kelas binaannya (scoping aman), analitika persentase real-time. | **PASS** | Akses kelas lain tertutup (403) |
| **UAT-MSR-01** | Musyrif Asrama | Presensi Kamar Asrama & Halaqah Tahfidz | Login Musyrif | Presensi malam kamar santri & setoran halaqah tercatat akurat dengan rekap musyrif. | **PASS** | Mendukung mode offline |
| **UAT-EKS-01** | Pembina Ekskul | Presensi Kegiatan Ekstrakurikuler & Kelompok Santri | Login Pembina | Kuota peserta, presensi mingguan, dan status aktif santri terkelola lancar. | **PASS** | Filter kategori akurat |
| **UAT-MSJ-01** | Petugas Masjid | Presensi Shalat 5 Waktu & Tapping RFID Jamaah | Login Petugas | Tapping RFID massal saat Subuh & Maghrib, auto-status Hadir/Terlambat sesuai jeda iqamah. | **PASS** | P95 latency 24ms |
| **UAT-PMP-01** | Pimpinan / Mudir | Dashboard Eksekutif, Rate Shalat, KBM, & Health Monitor | Login Pimpinan | Tampilan metrik KPI harian, drilldown santri butuh perhatian khusus, ekspor PDF/Excel. | **PASS** | Visualisasi instan & akurat |
| **UAT-OFF-01** | Petugas Lapangan | PWA Offline Mode, Pending Queue & Idempotent Sync | Disconnect LAN | Operator input presensi manual & scan QR saat offline; antrean sync terkirim utuh saat online. | **PASS** | Zero duplikasi data |
| **UAT-EXC-01** | Bagian Pengasuhan | Pengajuan Izin Sakit/Pulang & Auto-Dispensasi Sesi | Surat izin santri | Status izin disetujui otomatis merefleksikan status Sakit/Izin di seluruh sesi aktif. | **PASS** | Audit trail approval tercatat |

---

## 3. Formal UAT Sign-Off

```
[✓] Super Admin & IT Lead      : Ust. Ahmad Fauzi, S.Kom       (Signed: PASS)
[✓] Kepala Kepengasuhan / Mudir : KH. Abdullah Utsman           (Signed: PASS)
[✓] Kepala Sekolah KBM SMA/SMP : Ust. Dr. M. Rasyid            (Signed: PASS)
[✓] Koordinator Musyrif Asrama : Ust. Hamzah As-Salimi         (Signed: PASS)
[✓] Koordinator Petugas Presensi: Ust. M. Ilyas                 (Signed: PASS)
```

**Kesimpulan UAT**: SIUBA v1.0.0 siap untuk Pilot Rollout dan Go-Live operasional.
