import { authService } from './authService';

export interface ImportPreviewRow {
  index: number;
  status: 'valid' | 'warning' | 'error';
  messages: string[];
  is_existing: boolean;
  data: Record<string, any>;
}

export interface ImportPreviewResult {
  total: number;
  valid_count: number;
  warning_count: number;
  error_count: number;
  can_import: boolean;
  mode: 'upsert' | 'skip';
  rows: ImportPreviewRow[];
}

export interface ImportExecutionResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  records: any[];
}

export const dataImportService = {
  /**
   * Trigger download of Santri template CSV
   */
  async downloadStudentTemplate(): Promise<void> {
    const token = authService.getState().token || '';
    try {
      const res = await fetch('/api/v1/import/students/template', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Template_Import_Santri_SIUBA.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // fallback to client-side generation
    }

    // Client-side fallback template
    const headers = [
      'NIS',
      'NISN',
      'Nama Lengkap',
      'Panggilan',
      'Jenis Kelamin (L/P)',
      'Kelas',
      'Kamar Asrama',
      'Tahun Angkatan',
      'RFID UID',
      'Nama Wali',
      'No HP Wali',
      'Alamat',
      'Status',
    ];
    const samples = [
      '202607001,0089123401,Muhammad Abdullah Fauzan,Fauzan,L,VII A,Al-Farabi 01,2026,04A87F12,H. Rahmat Hidayat,081234567890,"Jl. Raya Pesantren No. 12 Surabaya",active',
      '202607002,0089123402,Aisyah Nur Ramadhani,Aisyah,P,VII B,Khadijah 02,2026,,Ir. Bambang Sutejo,081398765432,"Perum Graha Asri Blok C-4 Malang",active',
      '202607003,0089123403,Zaidan Rayhan Al-Ghifari,Rayhan,L,VIII A,Ibnu Sina 03,2025,04F19E3A,Dr. M. Syaifuddin,085611223344,"Jl. Melati No. 8 Sidoarjo",active',
    ];
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + samples.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Santri_SIUBA.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Trigger download of Staff / Teacher / Coach template CSV
   */
  async downloadStaffTemplate(): Promise<void> {
    const token = authService.getState().token || '';
    try {
      const res = await fetch('/api/v1/import/staff/template', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Template_Import_Guru_SDM_SIUBA.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // fallback
    }

    const headers = [
      'NIP/Username',
      'Nama Lengkap',
      'Peran/Role (guru/pelatih/musyrif/operator/admin)',
      'Email',
      'No WhatsApp/HP',
      'Jenis Kelamin (L/P)',
      'Jabatan',
      'Departemen/Divisi',
      'Status Kepegawaian',
      'RFID UID',
    ];
    const samples = [
      'guru.hasan,Ustadz Hasan Basri M.Pd,guru,hasan@utsman.sch.id,081234567801,L,Guru Pengampu Bahasa Arab,Kurikulum & Bahasa,tetap,04B912AF',
      'pelatih.bambang,Coach Bambang Pamungkas,pelatih,pelatih@utsman.sch.id,081234567802,L,Pelatih Ekstrakurikuler Sepak Bola,Bakat & Minat,kontrak,04C88211',
      'musyrif.fauzi,Ustadz Ahmad Fauzi S.Pd.I,musyrif,fauzi@utsman.sch.id,081234567803,L,Pembina Asrama Al-Farabi,Kesantrian & Asrama,tetap,04D33190',
    ];
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + samples.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Guru_SDM_SIUBA.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Preview and Validate Student Import data
   */
  async previewStudents(fileOrContent: File | string, mode: 'upsert' | 'skip' = 'upsert'): Promise<ImportPreviewResult> {
    const token = authService.getState().token || '';
    const formData = new FormData();
    formData.append('mode', mode);

    if (typeof fileOrContent === 'string') {
      formData.append('csv_content', fileOrContent);
    } else {
      formData.append('file', fileOrContent);
    }

    const res = await fetch('/api/v1/import/students/preview', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memvalidasi data santri.');
    }

    return json.data;
  },

  /**
   * Execute Student Import
   */
  async importStudents(fileOrContent: File | string, mode: 'upsert' | 'skip' = 'upsert'): Promise<ImportExecutionResult> {
    const token = authService.getState().token || '';
    const formData = new FormData();
    formData.append('mode', mode);

    if (typeof fileOrContent === 'string') {
      formData.append('csv_content', fileOrContent);
    } else {
      formData.append('file', fileOrContent);
    }

    const res = await fetch('/api/v1/import/students', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal melakukan import santri ke server.');
    }

    return json;
  },

  /**
   * Preview and Validate Staff Import data
   */
  async previewStaff(fileOrContent: File | string, mode: 'upsert' | 'skip' = 'upsert'): Promise<ImportPreviewResult> {
    const token = authService.getState().token || '';
    const formData = new FormData();
    formData.append('mode', mode);

    if (typeof fileOrContent === 'string') {
      formData.append('csv_content', fileOrContent);
    } else {
      formData.append('file', fileOrContent);
    }

    const res = await fetch('/api/v1/import/staff/preview', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memvalidasi data SDM.');
    }

    return json.data;
  },

  /**
   * Execute Staff Import
   */
  async importStaff(fileOrContent: File | string, mode: 'upsert' | 'skip' = 'upsert'): Promise<ImportExecutionResult> {
    const token = authService.getState().token || '';
    const formData = new FormData();
    formData.append('mode', mode);

    if (typeof fileOrContent === 'string') {
      formData.append('csv_content', fileOrContent);
    } else {
      formData.append('file', fileOrContent);
    }

    const res = await fetch('/api/v1/import/staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal melakukan import SDM ke server.');
    }

    return json;
  },
};
