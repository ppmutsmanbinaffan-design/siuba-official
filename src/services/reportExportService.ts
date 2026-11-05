import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Classroom, 
  Student 
} from '../types';
import { AttendanceMetricService, MetricSummary } from './attendanceMetricService';

export interface ReportExportOptions {
  title: string;
  subtitle?: string;
  periodeStr?: string;
  filterSummaryStr?: string;
  institutionName?: string;
  authorName?: string;
}

export class ReportExportService {
  /**
   * Export array of JSON objects to CSV file with UTF-8 BOM
   */
  static exportToCsv(
    filename: string,
    headers: string[],
    rows: Array<Array<string | number | undefined>>,
    options: ReportExportOptions
  ) {
    const { title, periodeStr, filterSummaryStr, institutionName = 'PONDOK PESANTREN SIUBA ULUMUL QURAN' } = options;

    const metadataRows = [
      `"${institutionName}"`,
      `"LAPORAN REKAPITULASI: ${title.toUpperCase()}"`,
      periodeStr ? `"Periode: ${periodeStr}"` : '""',
      filterSummaryStr ? `"Filter: ${filterSummaryStr}"` : '""',
      `"Tanggal Cetak: ${new Date().toLocaleString('id-ID')}"`,
      '""', // Blank separator line
    ];

    const formattedRows = rows.map((r) =>
      r
        .map((cell) => {
          if (cell === undefined || cell === null) return '""';
          const val = String(cell).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    );

    const csvContent = [...metadataRows, headers.map((h) => `"${h}"`).join(','), ...formattedRows].join('\r\n');

    // Include UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', this.sanitizeFilename(filename) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export to Formatted HTML Table Spreadsheet (Opens in Excel cleanly)
   */
  static exportToXlsxHtml(
    filename: string,
    headers: string[],
    rows: Array<Array<string | number | undefined>>,
    summaryMetrics: MetricSummary | null,
    options: ReportExportOptions
  ) {
    const { title, periodeStr, filterSummaryStr, institutionName = 'PONDOK PESANTREN SIUBA ULUMUL QURAN' } = options;

    const headerColsHtml = headers.map((h) => `<th style="background-color:#1e293b; color:#ffffff; font-weight:bold; padding:8px; border:1px solid #cbd5e1;">${h}</th>`).join('');

    const bodyRowsHtml = rows
      .map(
        (r, idx) =>
          `<tr style="background-color:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">` +
          r.map((cell) => `<td style="padding:6px; border:1px solid #cbd5e1; text-align:left;">${cell ?? '-'}</td>`).join('') +
          `</tr>`
      )
      .join('');

    let summaryCardHtml = '';
    if (summaryMetrics) {
      summaryCardHtml = `
        <table style="margin-bottom:15px; border-collapse:collapse; font-size:12px;">
          <tr>
            <td style="padding:6px; border:1px solid #cbd5e1; background:#f1f5f9; font-weight:bold;">Total Participant / Eligible:</td>
            <td style="padding:6px; border:1px solid #cbd5e1;"><b>${summaryMetrics.totalEligible}</b></td>
            <td style="padding:6px; border:1px solid #cbd5e1; background:#f1f5f9; font-weight:bold;">Attendance Rate:</td>
            <td style="padding:6px; border:1px solid #cbd5e1; color:#16a34a; font-weight:bold;"><b>${summaryMetrics.attendanceRate}%</b></td>
            <td style="padding:6px; border:1px solid #cbd5e1; background:#f1f5f9; font-weight:bold;">Completion Rate:</td>
            <td style="padding:6px; border:1px solid #cbd5e1;"><b>${summaryMetrics.completionRate}%</b></td>
          </tr>
          <tr>
            <td style="padding:6px; border:1px solid #cbd5e1; background:#f1f5f9;">Hadir (On-Time):</td>
            <td style="padding:6px; border:1px solid #cbd5e1; color:#16a34a;">${summaryMetrics.present} (${summaryMetrics.onTimeRate}%)</td>
            <td style="padding:6px; border:1px solid #cbd5e1; background:#f1f5f9;">Terlambat:</td>
            <td style="padding:6px; border:1px solid #cbd5e1; color:#d97706;">${summaryMetrics.late} (${summaryMetrics.lateRate}%)</td>
            <td style="padding:6px; border:1px solid #cbd5e1; background:#f1f5f9;">Alpha / Absent:</td>
            <td style="padding:6px; border:1px solid #cbd5e1; color:#dc2626;">${summaryMetrics.absent} (${summaryMetrics.absentRate}%)</td>
          </tr>
        </table>
      `;
    }

    const htmlTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Rekap Laporan</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; }
          h2 { color: #0f172a; margin-bottom: 2px; }
          h3 { color: #334155; margin-top: 0; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h2>${institutionName}</h2>
        <h3>LAPORAN REKAPITULASI PRESENSI: ${title.toUpperCase()}</h3>
        <p><b>Periode:</b> ${periodeStr || '-'} | <b>Filter:</b> ${filterSummaryStr || 'Semua Data'} | <b>Dicetak:</b> ${new Date().toLocaleString('id-ID')}</p>
        
        ${summaryCardHtml}

        <table style="border-collapse:collapse; width:100%; font-size:11px;">
          <thead>
            <tr>${headerColsHtml}</tr>
          </thead>
          <tbody>
            ${bodyRowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', this.sanitizeFilename(filename) + '.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Open Print Modal / PDF View Window with Kop Surat and Signature Block
   */
  static printReportView(
    title: string,
    headers: string[],
    rows: Array<Array<string | number | undefined>>,
    options: ReportExportOptions
  ) {
    const { periodeStr, filterSummaryStr, institutionName = 'PONDOK PESANTREN SIUBA ULUMUL QURAN', authorName = 'Administrator Absensi' } = options;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan browser memperbolehkan pop-up.');
      return;
    }

    const headerColsHtml = headers.map((h) => `<th style="border:1px solid #1e293b; padding:8px; background:#f1f5f9; font-weight:bold; text-align:left;">${h}</th>`).join('');

    const bodyRowsHtml = rows
      .map(
        (r, idx) =>
          `<tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">` +
          r.map((cell) => `<td style="border:1px solid #cbd5e1; padding:6px; font-size:11px;">${cell ?? '-'}</td>`).join('') +
          `</tr>`
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Laporan - ${title}</title>
        <style>
          @media print {
            @page { size: A4 landscape; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; }
            .no-print { display: none; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; }
          .kop-header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
          .kop-header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
          .kop-header p { margin: 2px 0; font-size: 12px; color: #475569; }
          .report-info { margin-bottom: 15px; font-size: 12px; }
          .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; page-break-inside: avoid; }
          .signature-box { text-align: center; width: 220px; }
          .signature-space { height: 60px; }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:15px; text-align:right;">
          <button onclick="window.print()" style="padding:8px 16px; background:#0284c7; color:#fff; font-weight:bold; border:none; border-radius:6px; cursor:pointer;">
            🖨️ Cetak Laporan / Simpan PDF
          </button>
        </div>

        <div class="kop-header">
          <h1>${institutionName}</h1>
          <p>Sistem Informasi Absensi & Presensi Santri Pesantren (SIUBA)</p>
          <p style="font-size:10px; color:#64748b;">Jl. Pesantren No. 10, Pasuruan, Jawa Timur | Telp: (0343) 421000</p>
        </div>

        <div style="text-align:center; margin-bottom:15px;">
          <h2 style="margin:0; font-size:16px; font-weight:700;">LAPORAN REKAPITULASI PRESENSI</h2>
          <h3 style="margin:4px 0 0 0; font-size:13px; color:#334155; font-weight:600;">${title.toUpperCase()}</h3>
        </div>

        <div class="report-info">
          <div><strong>Periode Pelaksanaan:</strong> ${periodeStr || 'Seluruh Periode'}</div>
          <div><strong>Filter Kriteria:</strong> ${filterSummaryStr || 'Semua Data'}</div>
          <div><strong>Tanggal Cetak Laporan:</strong> ${new Date().toLocaleString('id-ID')}</div>
        </div>

        <table class="report-table">
          <thead>
            <tr>${headerColsHtml}</tr>
          </thead>
          <tbody>
            ${bodyRowsHtml}
          </tbody>
        </table>

        <div class="signature-section">
          <div class="signature-box">
            <p>Mengetahui,</p>
            <p><strong>Kepala Kesantrian / Pengasuh</strong></p>
            <div class="signature-space"></div>
            <p><strong>( Ustadz Ahmad Fauzi, S.Pd.I )</strong></p>
          </div>

          <div class="signature-box">
            <p>Pasuruan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><strong>Operator Reporting Engine</strong></p>
            <div class="signature-space"></div>
            <p><strong>( ${authorName} )</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  private static sanitizeFilename(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
}
