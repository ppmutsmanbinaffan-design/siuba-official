/** Tanggal hari ini (zona waktu perangkat) dalam format YYYY-MM-DD. */
export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tanggal YYYY-MM-DD yang bergeser `days` hari dari hari ini (negatif = ke belakang). */
export function shiftLocalDate(days: number, from: string = todayLocalDate()): string {
  const [y, m, d] = from.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Awal & akhir bulan berjalan (YYYY-MM-DD) serta labelnya, mis. "November 2026". */
export function currentMonthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end), label: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) };
}
