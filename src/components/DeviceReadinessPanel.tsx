import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Smartphone, Server } from 'lucide-react';
import { SystemStatusService, ServerHealthReport } from '../services/systemStatusService';

/**
 * Pusat Sinkronisasi → Kesiapan Perangkat & Server.
 * Semua butir diperiksa sungguhan di perangkat ini / di server (dulu daftar centang statis untuk server Linux).
 */
type Level = 'ok' | 'warn' | 'bad' | 'info';
interface Check { label: string; level: Level; detail: string; fix?: string }

const ICON: Record<Level, React.ReactNode> = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
  bad: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />,
  info: <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />,
};
const BOX: Record<Level, string> = {
  ok: 'bg-emerald-50/60 border-emerald-200',
  warn: 'bg-amber-50 border-amber-200',
  bad: 'bg-rose-50 border-rose-200',
  info: 'bg-sky-50 border-sky-200',
};

function readClock(): { offset: number | null; measuredAt: string | null } {
  try {
    const meta = JSON.parse(localStorage.getItem('siuba_offline_metadata') || '{}');
    return { offset: typeof meta.clock_offset_ms === 'number' ? meta.clock_offset_ms : null, measuredAt: meta.clock_measured_at || null };
  } catch {
    return { offset: null, measuredAt: null };
  }
}

export const DeviceReadinessPanel: React.FC = () => {
  const [deviceChecks, setDeviceChecks] = useState<Check[]>([]);
  const [server, setServer] = useState<ServerHealthReport | null>(null);
  const [serverNote, setServerNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const checks: Check[] = [];
    const host = window.location.hostname;

    // 1. Kamera (QR) butuh HTTPS atau localhost
    if (window.isSecureContext) {
      checks.push({ label: 'Kamera untuk scan QR', level: 'ok', detail: `Diizinkan browser (alamat aman: ${window.location.protocol}//${host}).` });
    } else {
      // Tahap 29: cek apakah HTTPS LAN (Apache :8443) tersedia dan sertifikatnya sudah dipercaya perangkat ini
      const httpsUrl = `https://${host}:8443`;
      const httpsOk = await Promise.race([
        fetch(`${httpsUrl}/api/v1/health`, { mode: 'no-cors', cache: 'no-store' }).then(() => true).catch(() => false),
        new Promise<boolean>((r) => setTimeout(() => r(false), 4000)),
      ]);
      checks.push(httpsOk
        ? {
            label: 'Kamera untuk scan QR', level: 'warn',
            detail: `Alamat ini (http) tidak boleh memakai kamera, tetapi HTTPS sudah siap dan dipercaya perangkat ini.`,
            fix: `Buka SIUBA lewat ${httpsUrl} (simpan sebagai bookmark / tambahkan ke layar utama).`,
          }
        : {
            label: 'Kamera untuk scan QR', level: 'bad',
            detail: `Browser memblokir kamera di alamat http://${host} (bukan HTTPS/localhost).`,
            fix: `Admin: jalankan pasang-https-lan.bat di komputer server (sekali). Lalu di HP ini buka http://${window.location.host}/sertifikat, pasang sertifikat SIUBA, dan pakai ${httpsUrl}. Alternatif: alat RFID atau presensi manual.`,
          });
    }

    // 2. Mode offline (service worker)
    const sw = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined;
    checks.push(sw
      ? { label: 'Mode offline aplikasi', level: 'ok', detail: 'Aplikasi tersimpan di perangkat dan bisa dibuka saat server mati.' }
      : {
          label: 'Mode offline aplikasi', level: window.isSecureContext ? 'warn' : 'info',
          detail: window.isSecureContext ? 'Belum terpasang — muat ulang halaman sekali saat online.' : 'Tidak tersedia di alamat http (aturan browser). Antrean absensi offline tetap berjalan selama halaman terbuka.',
        });

    // 3. Penyimpanan
    let persisted = false;
    let usage = '';
    try {
      persisted = (await navigator.storage?.persisted?.()) ?? false;
      const est = await navigator.storage?.estimate?.();
      if (est?.quota) usage = ` Terpakai ${((est.usage || 0) / 1048576).toFixed(1)} MB dari ${(est.quota / 1048576).toFixed(0)} MB.`;
    } catch {
      /* tidak didukung */
    }
    checks.push(persisted
      ? { label: 'Penyimpanan antrean offline', level: 'ok', detail: `Dilindungi dari pembersihan otomatis browser.${usage}` }
      : { label: 'Penyimpanan antrean offline', level: 'info', detail: `Bisa dibersihkan browser bila memori HP penuh — kirim antrean sesegera mungkin.${usage}` });

    // 4. Jam perangkat
    const { offset, measuredAt } = readClock();
    if (offset === null) {
      checks.push({ label: 'Jam perangkat', level: 'info', detail: 'Belum diukur — akan diukur otomatis saat terhubung ke server.' });
    } else {
      const sec = Math.round(Math.abs(offset) / 1000);
      const dir = offset > 0 ? 'lebih lambat' : 'lebih cepat';
      checks.push({
        label: 'Jam perangkat',
        level: sec <= 60 ? 'ok' : sec <= 300 ? 'warn' : 'bad',
        detail: sec <= 2 ? 'Sama dengan jam server.' : `Jam perangkat ${dir} ${sec} detik dari server (diukur ${measuredAt ? new Date(measuredAt).toLocaleString('id-ID') : '-'}). Waktu absensi offline dikoreksi otomatis.`,
        fix: sec > 60 ? 'Aktifkan "Tanggal & waktu otomatis" di pengaturan HP.' : undefined,
      });
    }
    setDeviceChecks(checks);

    // Server (khusus admin; pengguna lain cukup melihat butir perangkat)
    try {
      setServer(await SystemStatusService.fetchHealth());
      setServerNote(null);
    } catch (err: any) {
      setServer(null);
      setServerNote(err?.status === 403 ? 'Status server hanya terlihat oleh admin.' : 'Server tidak terjangkau saat ini.');
    }
    setBusy(false);
  };

  useEffect(() => {
    void run();
  }, []);

  const serverChecks: Check[] = server
    ? [
        {
          label: 'Penjadwal otomatis (Task Scheduler)',
          level: server.scheduler_status === 'healthy' ? 'ok' : server.scheduler_status === 'warning' ? 'warn' : 'bad',
          detail: server.scheduler_last_heartbeat ? `Terakhir berjalan ${new Date(server.scheduler_last_heartbeat).toLocaleString('id-ID')}.` : 'Belum pernah berjalan.',
          fix: server.scheduler_status !== 'healthy' ? 'Di komputer server jalankan pasang-penjadwal-windows.bat sekali.' : undefined,
        },
        {
          label: 'Backup database',
          level: server.backup_freshness_status === 'healthy' ? 'ok' : server.backup_freshness_status === 'warning' ? 'warn' : 'bad',
          detail: server.backup_last_successful_at ? `Terakhir ${new Date(server.backup_last_successful_at).toLocaleString('id-ID')} (${server.backup_count_stored} tersimpan).` : 'Belum ada backup.',
          fix: 'Unduh backup berkala (tab Backup) dan simpan di flashdisk/NAS di luar komputer server.',
        },
        {
          label: 'Ruang disk server',
          level: server.disk_status === 'healthy' ? 'ok' : server.disk_status === 'warning' ? 'warn' : 'bad',
          detail: server.disk_free_gb != null ? `${server.disk_free_gb} GB bebas (${server.disk_free_percentage}%).` : 'Tidak terbaca.',
        },
        {
          label: 'Kunci alat RFID',
          level: server.iot_key_configured ? 'ok' : 'warn',
          detail: server.iot_key_configured ? 'NEXABSEN_GLOBAL_KEY sudah diisi.' : 'NEXABSEN_GLOBAL_KEY belum diisi di .env — alat RFID tidak bisa mengirim tap.',
        },
        {
          label: 'Mode debug',
          level: server.debug_mode ? 'warn' : 'ok',
          detail: server.debug_mode ? 'APP_DEBUG masih aktif — ubah ke false di .env.' : 'Nonaktif.',
        },
      ]
    : [];

  const renderList = (list: Check[]) => (
    <div className="space-y-2">
      {list.map((c) => (
        <div key={c.label} className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${BOX[c.level]}`}>
          {ICON[c.level]}
          <div>
            <div className="font-bold text-slate-900">{c.label}</div>
            <div className="text-slate-600 mt-0.5">{c.detail}</div>
            {c.fix && <div className="text-slate-800 font-semibold mt-1">Perbaiki: {c.fix}</div>}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div id="device-readiness" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-base flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-600" /> Perangkat Ini</h3>
          <button onClick={run} disabled={busy} className="text-xs font-bold text-emerald-700 flex items-center gap-1 cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Periksa ulang
          </button>
        </div>
        {renderList(deviceChecks)}
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="font-black text-slate-900 text-base flex items-center gap-2"><Server className="w-4 h-4 text-emerald-600" /> Server</h3>
        {serverNote ? <p className="text-xs text-slate-500">{serverNote}</p> : renderList(serverChecks)}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">Panduan server Windows (XAMPP)</p>
          <p>1. Beri komputer server IP tetap di router (mis. 192.168.1.10) agar HP & alat RFID selalu menemukannya.</p>
          <p>2. Jalankan <b>jalankan-siuba.bat</b> setiap komputer server dinyalakan (atau masukkan ke Startup Windows).</p>
          <p>3. Pasang penjadwal sekali: <b>pasang-penjadwal-windows.bat</b>.</p>
          <p>4. Pakai UPS untuk komputer server & router agar database tidak rusak saat listrik padam.</p>
        </div>
      </div>
    </div>
  );
};
