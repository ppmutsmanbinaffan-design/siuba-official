import { 
  StudentCardTemplate, 
  StudentCardTemplateElement, 
  CardOrientation, 
  CardSide 
} from '../types';

const STORAGE_KEY = 'siuba_student_card_templates';

// CR80 / ID-1 Standard Specifications
export const CR80_SPECS = {
  LANDSCAPE: {
    WIDTH_MM: 85.5,
    HEIGHT_MM: 54.0,
    RATIO: 85.5 / 54.0, // ~1.5833
    DPI_300_WIDTH_PX: 1010,
    DPI_300_HEIGHT_PX: 638,
  },
  PORTRAIT: {
    WIDTH_MM: 54.0,
    HEIGHT_MM: 85.5,
    RATIO: 54.0 / 85.5, // ~0.6316
    DPI_300_WIDTH_PX: 638,
    DPI_300_HEIGHT_PX: 1010,
  },
  BLEED_MM: 3.0,
  SAFE_MARGIN_MM: 2.5,
  MM_TO_INCH: 25.4,
  PT_PER_INCH: 72,
};

// Default Pre-Configured Templates for Pesantren
export const DEFAULT_CARD_TEMPLATES: StudentCardTemplate[] = [
  // 1. Reguler Emerald (Landscape) - Default
  {
    id: 'tmpl-reguler-green',
    name: 'Kartu Santri Reguler (Emerald Pesantren)',
    category: 'reguler',
    description: 'Desain resmi santri pondok dengan nuansa hijau zamrud, KOP Pesantren, foto, dan QR Code terverifikasi.',
    orientation: 'landscape',
    width_mm: 85.5,
    height_mm: 54.0,
    bleed_mm: 0,
    bg_fit: 'cover',
    is_default: true,
    is_active: true,
    created_by: 'Super Admin Pesantren',
    created_at: '2026-08-25T08:00:00Z',
    updated_at: '2026-08-25T08:00:00Z',
    elements: [
      {
        id: 'el-school-header',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'school_name',
        label: 'Header Instansi',
        x_mm: 22.0,
        y_mm: 4.0,
        width_mm: 60.0,
        height_mm: 8.0,
        font_size_pt: 9,
        font_weight: 'bold',
        text_align: 'left',
        color: '#ffffff',
        is_visible: true,
        z_index: 10,
        static_text_value: 'PESANTREN UTSMAN BIN AFFAN'
      },
      {
        id: 'el-sub-header',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'static_text',
        label: 'Sub-Header Kartu',
        x_mm: 22.0,
        y_mm: 11.5,
        width_mm: 60.0,
        height_mm: 4.5,
        font_size_pt: 6,
        font_weight: 'medium',
        text_align: 'left',
        color: '#C9A227',
        is_visible: true,
        z_index: 10,
        static_text_value: 'KARTU IDENTITAS SANTRI TERPADU'
      },
      {
        id: 'el-photo',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'student_photo',
        label: 'Foto Santri',
        x_mm: 5.0,
        y_mm: 18.0,
        width_mm: 22.0,
        height_mm: 28.0,
        photo_shape: 'rounded',
        is_visible: true,
        z_index: 12
      },
      {
        id: 'el-name',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'student_name',
        label: 'Nama Lengkap Santri',
        x_mm: 29.0,
        y_mm: 18.5,
        width_mm: 52.0,
        height_mm: 6.5,
        font_size_pt: 9,
        font_weight: 'bold',
        text_align: 'left',
        color: '#ffffff',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-nis',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'student_number',
        label: 'Nomor Induk Santri (NIS)',
        x_mm: 29.0,
        y_mm: 25.5,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7.5,
        font_weight: 'semibold',
        text_align: 'left',
        color: '#C9A227',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-classroom',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'classroom',
        label: 'Kelas / Tingkat',
        x_mm: 29.0,
        y_mm: 31.0,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7,
        font_weight: 'normal',
        text_align: 'left',
        color: '#d4d4d8',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-dormitory',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'dormitory',
        label: 'Asrama & Kamar',
        x_mm: 29.0,
        y_mm: 36.5,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7,
        font_weight: 'normal',
        text_align: 'left',
        color: '#d4d4d8',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-valid-thru',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'valid_thru',
        label: 'Masa Berlaku',
        x_mm: 29.0,
        y_mm: 42.0,
        width_mm: 30.0,
        height_mm: 4.0,
        font_size_pt: 6,
        font_weight: 'medium',
        text_align: 'left',
        color: '#a1a1aa',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-qr',
        template_id: 'tmpl-reguler-green',
        element_side: 'front',
        element_type: 'qr_code',
        label: 'QR Code Absensi',
        x_mm: 61.5,
        y_mm: 25.5,
        width_mm: 20.0,
        height_mm: 20.0,
        is_visible: true,
        z_index: 20
      },
      // Back Side Rules & Terms
      {
        id: 'el-back-header',
        template_id: 'tmpl-reguler-green',
        element_side: 'back',
        element_type: 'static_text',
        label: 'Judul Ketentuan',
        x_mm: 6.0,
        y_mm: 6.0,
        width_mm: 73.5,
        height_mm: 5.0,
        font_size_pt: 8,
        font_weight: 'bold',
        text_align: 'center',
        color: '#ffffff',
        is_visible: true,
        z_index: 10,
        static_text_value: 'TATA TERTIB PENGGUNAAN KARTU SANTRI'
      },
      {
        id: 'el-back-rules',
        template_id: 'tmpl-reguler-green',
        element_side: 'back',
        element_type: 'static_text',
        label: 'Isi Tata Tertib',
        x_mm: 6.0,
        y_mm: 13.0,
        width_mm: 73.5,
        height_mm: 28.0,
        font_size_pt: 5.5,
        font_weight: 'normal',
        text_align: 'left',
        color: '#e4e4e7',
        is_visible: true,
        z_index: 10,
        static_text_value: '1. Kartu ini adalah tanda pengenal resmi santri Pondok Pesantren Utsman Bin Affan.\n2. Wajib dibawa saat presensi shalat 5 waktu, KBM madrasah, dan asrama.\n3. Dilarang memindahtangankan, merusak, atau menggandakan QR Code kartu.\n4. Apabila kartu hilang/rusak, segera lapor ke Biro Kepengasuhan Santri.'
      },
      {
        id: 'el-back-footer',
        template_id: 'tmpl-reguler-green',
        element_side: 'back',
        element_type: 'static_text',
        label: 'Kontak Pesantren',
        x_mm: 6.0,
        y_mm: 43.0,
        width_mm: 73.5,
        height_mm: 6.0,
        font_size_pt: 5.5,
        font_weight: 'medium',
        text_align: 'center',
        color: '#C9A227',
        is_visible: true,
        z_index: 10,
        static_text_value: 'Jl. Pesantren No. 1, Telp: (021) 8899-7766 • siuba.pesantren.id'
      }
    ]
  },

  // 2. Santri Putri (Landscape)
  {
    id: 'tmpl-santriwati-teal',
    name: 'Kartu Santri Putri (Teal & Gold)',
    category: 'santriwati',
    description: 'Desain elegan untuk asrama putri dengan palet warna teal dan aksen emas.',
    orientation: 'landscape',
    width_mm: 85.5,
    height_mm: 54.0,
    bleed_mm: 0,
    bg_fit: 'cover',
    is_default: false,
    is_active: true,
    created_by: 'Super Admin Pesantren',
    created_at: '2026-08-25T08:00:00Z',
    updated_at: '2026-08-25T08:00:00Z',
    elements: [
      {
        id: 'el-sw-header',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'school_name',
        label: 'Header Instansi',
        x_mm: 22.0,
        y_mm: 4.0,
        width_mm: 60.0,
        height_mm: 8.0,
        font_size_pt: 9,
        font_weight: 'bold',
        text_align: 'left',
        color: '#ffffff',
        is_visible: true,
        z_index: 10,
        static_text_value: 'PESANTREN UTSMAN BIN AFFAN'
      },
      {
        id: 'el-sw-sub',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'static_text',
        label: 'Sub Header',
        x_mm: 22.0,
        y_mm: 11.5,
        width_mm: 60.0,
        height_mm: 4.5,
        font_size_pt: 6,
        font_weight: 'medium',
        text_align: 'left',
        color: '#fef08a',
        is_visible: true,
        z_index: 10,
        static_text_value: 'KARTU SANTRIWATI • ASRAMA PUTRI'
      },
      {
        id: 'el-sw-photo',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'student_photo',
        label: 'Foto Santriwati',
        x_mm: 5.0,
        y_mm: 18.0,
        width_mm: 22.0,
        height_mm: 28.0,
        photo_shape: 'rounded',
        is_visible: true,
        z_index: 12
      },
      {
        id: 'el-sw-name',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'student_name',
        label: 'Nama Santriwati',
        x_mm: 29.0,
        y_mm: 18.5,
        width_mm: 52.0,
        height_mm: 6.5,
        font_size_pt: 9,
        font_weight: 'bold',
        text_align: 'left',
        color: '#ffffff',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-sw-nis',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'student_number',
        label: 'NIS',
        x_mm: 29.0,
        y_mm: 25.5,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7.5,
        font_weight: 'semibold',
        text_align: 'left',
        color: '#fde047',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-sw-class',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'classroom',
        label: 'Kelas',
        x_mm: 29.0,
        y_mm: 31.0,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7,
        font_weight: 'normal',
        text_align: 'left',
        color: '#e4e4e7',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-sw-dorm',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'dormitory',
        label: 'Asrama',
        x_mm: 29.0,
        y_mm: 36.5,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7,
        font_weight: 'normal',
        text_align: 'left',
        color: '#e4e4e7',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-sw-qr',
        template_id: 'tmpl-santriwati-teal',
        element_side: 'front',
        element_type: 'qr_code',
        label: 'QR Code Absensi',
        x_mm: 61.5,
        y_mm: 25.5,
        width_mm: 20.0,
        height_mm: 20.0,
        is_visible: true,
        z_index: 20
      }
    ]
  },

  // 3. Asrama & Tahfidz (Portrait — 54 x 85.5 mm)
  {
    id: 'tmpl-asrama-portrait',
    name: 'Kartu Asrama & Tahfidz (Portrait)',
    category: 'asrama',
    description: 'Format vertikal modern (54 × 85.5 mm) dirancang khusus untuk id-card lanyard asrama & halaqah tahfidz.',
    orientation: 'portrait',
    width_mm: 54.0,
    height_mm: 85.5,
    bleed_mm: 0,
    bg_fit: 'cover',
    is_default: false,
    is_active: true,
    created_by: 'Biro Pengasuhan',
    created_at: '2026-08-25T08:00:00Z',
    updated_at: '2026-08-25T08:00:00Z',
    elements: [
      {
        id: 'el-pt-instansi',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'front',
        element_type: 'school_name',
        label: 'Header Instansi',
        x_mm: 4.0,
        y_mm: 4.0,
        width_mm: 46.0,
        height_mm: 6.0,
        font_size_pt: 7.5,
        font_weight: 'bold',
        text_align: 'center',
        color: '#ffffff',
        is_visible: true,
        z_index: 10,
        static_text_value: 'PONDOK PESANTREN UTSMAN'
      },
      {
        id: 'el-pt-badge',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'front',
        element_type: 'static_text',
        label: 'Kategori Santri',
        x_mm: 10.0,
        y_mm: 10.5,
        width_mm: 34.0,
        height_mm: 4.0,
        font_size_pt: 5.5,
        font_weight: 'semibold',
        text_align: 'center',
        color: '#facc15',
        is_visible: true,
        z_index: 10,
        static_text_value: 'ASRAMA & TAHFIDZ QURAN'
      },
      {
        id: 'el-pt-photo',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'front',
        element_type: 'student_photo',
        label: 'Foto Santri (Center)',
        x_mm: 14.5,
        y_mm: 16.0,
        width_mm: 25.0,
        height_mm: 31.0,
        photo_shape: 'rounded',
        is_visible: true,
        z_index: 12
      },
      {
        id: 'el-pt-name',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'front',
        element_type: 'student_name',
        label: 'Nama Lengkap',
        x_mm: 3.0,
        y_mm: 48.5,
        width_mm: 48.0,
        height_mm: 6.5,
        font_size_pt: 8.5,
        font_weight: 'bold',
        text_align: 'center',
        color: '#ffffff',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-pt-nis',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'front',
        element_type: 'student_number',
        label: 'NIS / ID',
        x_mm: 3.0,
        y_mm: 55.0,
        width_mm: 48.0,
        height_mm: 4.0,
        font_size_pt: 7,
        font_weight: 'semibold',
        text_align: 'center',
        color: '#38bdf8',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-pt-dorm',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'front',
        element_type: 'dormitory',
        label: 'Gedung Asrama & Kamar',
        x_mm: 3.0,
        y_mm: 59.5,
        width_mm: 48.0,
        height_mm: 4.0,
        font_size_pt: 6.5,
        font_weight: 'normal',
        text_align: 'center',
        color: '#e2e8f0',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-pt-qr',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'front',
        element_type: 'qr_code',
        label: 'QR Code Absensi Vertikal',
        x_mm: 17.5,
        y_mm: 64.5,
        width_mm: 19.0,
        height_mm: 19.0,
        is_visible: true,
        z_index: 20
      },
      // Back Portrait
      {
        id: 'el-pt-back-title',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'back',
        element_type: 'static_text',
        label: 'Judul Asrama Belakang',
        x_mm: 4.0,
        y_mm: 6.0,
        width_mm: 46.0,
        height_mm: 5.0,
        font_size_pt: 7.5,
        font_weight: 'bold',
        text_align: 'center',
        color: '#ffffff',
        is_visible: true,
        z_index: 10,
        static_text_value: 'KETENTUAN KARTU ASRAMA'
      },
      {
        id: 'el-pt-back-rules',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'back',
        element_type: 'static_text',
        label: 'Ketentuan Asrama',
        x_mm: 4.0,
        y_mm: 13.0,
        width_mm: 46.0,
        height_mm: 56.0,
        font_size_pt: 5,
        font_weight: 'normal',
        text_align: 'left',
        color: '#cbd5e1',
        is_visible: true,
        z_index: 10,
        static_text_value: '1. Kartu identitas resmi wajib dikenakan selama di lingkungan asrama dan masjid.\n2. Digunakan untuk scan presensi shalat berjamaah 5 waktu dan halaqah quran.\n3. Santri bertanggung jawab penuh menjaga keutuhan kartu & barcode.\n4. Kartu yang tertinggal/hilang wajib dilaporkan maksimal 1x24 jam.'
      },
      {
        id: 'el-pt-back-footer',
        template_id: 'tmpl-asrama-portrait',
        element_side: 'back',
        element_type: 'static_text',
        label: 'Kontak Hotline',
        x_mm: 4.0,
        y_mm: 74.0,
        width_mm: 46.0,
        height_mm: 6.0,
        font_size_pt: 5,
        font_weight: 'medium',
        text_align: 'center',
        color: '#38bdf8',
        is_visible: true,
        z_index: 10,
        static_text_value: 'Hotline Asrama: (021) 8899-7788\nsiuba.pesantren.id'
      }
    ]
  },

  // 4. SMP / Madrasah Tsanawiyah (Landscape)
  {
    id: 'tmpl-smp-navy',
    name: 'Kartu Santri MTs / SMP (Navy Modern)',
    category: 'smp',
    description: 'Format landscape modern untuk jenjang MTs/SMP dengan aksen biru tua dan kuning.',
    orientation: 'landscape',
    width_mm: 85.5,
    height_mm: 54.0,
    bleed_mm: 0,
    bg_fit: 'cover',
    is_default: false,
    is_active: true,
    created_by: 'TU MTs Utsman',
    created_at: '2026-08-25T08:00:00Z',
    updated_at: '2026-08-25T08:00:00Z',
    elements: [
      {
        id: 'el-smp-head',
        template_id: 'tmpl-smp-navy',
        element_side: 'front',
        element_type: 'school_name',
        label: 'Instansi MTs',
        x_mm: 22.0,
        y_mm: 4.0,
        width_mm: 60.0,
        height_mm: 7.5,
        font_size_pt: 8.5,
        font_weight: 'bold',
        text_align: 'left',
        color: '#ffffff',
        is_visible: true,
        z_index: 10,
        static_text_value: 'MADRASAH TSANAWIYAH UTSMAN'
      },
      {
        id: 'el-smp-sub',
        template_id: 'tmpl-smp-navy',
        element_side: 'front',
        element_type: 'static_text',
        label: 'Sub Header',
        x_mm: 22.0,
        y_mm: 11.5,
        width_mm: 60.0,
        height_mm: 4.0,
        font_size_pt: 6,
        font_weight: 'semibold',
        text_align: 'left',
        color: '#60a5fa',
        is_visible: true,
        z_index: 10,
        static_text_value: 'STUDENT IDENTIFICATION CARD'
      },
      {
        id: 'el-smp-photo',
        template_id: 'tmpl-smp-navy',
        element_side: 'front',
        element_type: 'student_photo',
        label: 'Foto Siswa',
        x_mm: 5.0,
        y_mm: 18.0,
        width_mm: 22.0,
        height_mm: 28.0,
        photo_shape: 'rounded',
        is_visible: true,
        z_index: 12
      },
      {
        id: 'el-smp-name',
        template_id: 'tmpl-smp-navy',
        element_side: 'front',
        element_type: 'student_name',
        label: 'Nama Siswa',
        x_mm: 29.0,
        y_mm: 18.5,
        width_mm: 52.0,
        height_mm: 6.5,
        font_size_pt: 9,
        font_weight: 'bold',
        text_align: 'left',
        color: '#ffffff',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-smp-nisn',
        template_id: 'tmpl-smp-navy',
        element_side: 'front',
        element_type: 'nisn',
        label: 'NISN Nasional',
        x_mm: 29.0,
        y_mm: 25.5,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7,
        font_weight: 'medium',
        text_align: 'left',
        color: '#93c5fd',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-smp-class',
        template_id: 'tmpl-smp-navy',
        element_side: 'front',
        element_type: 'classroom',
        label: 'Kelas',
        x_mm: 29.0,
        y_mm: 31.0,
        width_mm: 30.0,
        height_mm: 4.5,
        font_size_pt: 7,
        font_weight: 'normal',
        text_align: 'left',
        color: '#e2e8f0',
        is_visible: true,
        z_index: 15
      },
      {
        id: 'el-smp-qr',
        template_id: 'tmpl-smp-navy',
        element_side: 'front',
        element_type: 'qr_code',
        label: 'QR Code',
        x_mm: 61.5,
        y_mm: 25.5,
        width_mm: 20.0,
        height_mm: 20.0,
        is_visible: true,
        z_index: 20
      }
    ]
  }
];

export class StudentCardTemplateService {
  /**
   * Get all active card templates
   */
  public static getTemplates(): StudentCardTemplate[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to load card templates', e);
      }
    }
    // Seed default templates
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CARD_TEMPLATES));
    return DEFAULT_CARD_TEMPLATES;
  }

  /**
   * Get template by ID
   */
  public static getTemplateById(id: string): StudentCardTemplate | null {
    const templates = this.getTemplates();
    return templates.find((t) => t.id === id) || null;
  }

  /**
   * Get the active default template
   */
  public static getDefaultTemplate(): StudentCardTemplate {
    const templates = this.getTemplates();
    return templates.find((t) => t.is_default && t.is_active) || templates[0] || DEFAULT_CARD_TEMPLATES[0];
  }

  /**
   * Save / Update template
   */
  public static saveTemplate(template: StudentCardTemplate): { success: boolean; template?: StudentCardTemplate; error?: string } {
    try {
      // Authoritative physical dimension enforcement
      const isLandscape = template.orientation === 'landscape';
      const enforcedWidth = isLandscape ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM;
      const enforcedHeight = isLandscape ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM;

      const templates = this.getTemplates();
      const existingIdx = templates.findIndex((t) => t.id === template.id);
      
      const updated: StudentCardTemplate = {
        ...template,
        width_mm: enforcedWidth,
        height_mm: enforcedHeight,
        updated_at: new Date().toISOString()
      };

      if (template.is_default) {
        // Unset other defaults
        templates.forEach((t) => {
          if (t.id !== template.id) t.is_default = false;
        });
      }

      if (existingIdx >= 0) {
        templates[existingIdx] = updated;
      } else {
        templates.push(updated);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      return { success: true, template: updated };
    } catch (e: any) {
      return { success: false, error: e.message || 'Gagal menyimpan template kartu' };
    }
  }

  /**
   * Set template as default
   */
  public static setDefaultTemplate(id: string): boolean {
    const templates = this.getTemplates();
    const target = templates.find((t) => t.id === id);
    if (!target) return false;

    templates.forEach((t) => {
      t.is_default = t.id === id;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  }

  /**
   * Duplicate existing template
   */
  public static duplicateTemplate(id: string, newName?: string): StudentCardTemplate | null {
    const target = this.getTemplateById(id);
    if (!target) return null;

    const newId = `tmpl-${Date.now().toString(36)}`;
    const duplicated: StudentCardTemplate = {
      ...target,
      id: newId,
      name: newName || `${target.name} (Salinan)`,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      elements: target.elements.map((el) => ({
        ...el,
        id: `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        template_id: newId
      }))
    };

    const templates = this.getTemplates();
    templates.push(duplicated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return duplicated;
  }

  /**
   * Deactivate or toggle active state
   */
  public static toggleActive(id: string, isActive: boolean): boolean {
    const templates = this.getTemplates();
    const target = templates.find((t) => t.id === id);
    if (!target) return false;

    target.is_active = isActive;
    if (!isActive && target.is_default) {
      target.is_default = false;
      const other = templates.find((t) => t.id !== id && t.is_active);
      if (other) other.is_default = true;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  }

  /**
   * Delete template (Protected: cannot delete default or sole template)
   */
  public static deleteTemplate(id: string): { success: boolean; error?: string } {
    const templates = this.getTemplates();
    if (templates.length <= 1) {
      return { success: false, error: 'Tidak dapat menghapus template terakhir.' };
    }

    const target = templates.find((t) => t.id === id);
    if (!target) {
      return { success: false, error: 'Template tidak ditemukan.' };
    }

    if (target.is_default) {
      return { success: false, error: 'Template berstatus Default. Harap jadikan template lain sebagai default terlebih dahulu.' };
    }

    const filtered = templates.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  /**
   * Proportionally transform coordinates when template orientation changes
   * (Option 1: Pertahankan Posisi Relatif)
   */
  public static transformElementsForOrientation(
    elements: StudentCardTemplateElement[],
    oldOrientation: CardOrientation,
    newOrientation: CardOrientation
  ): StudentCardTemplateElement[] {
    if (oldOrientation === newOrientation) return elements;

    const oldWidth = oldOrientation === 'landscape' ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM;
    const oldHeight = oldOrientation === 'landscape' ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM;

    const newWidth = newOrientation === 'landscape' ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM;
    const newHeight = newOrientation === 'landscape' ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM;

    return elements.map((el) => {
      // Calculate normalized relative coordinates
      const normX = el.x_mm / oldWidth;
      const normY = el.y_mm / oldHeight;
      const normW = el.width_mm / oldWidth;
      const normH = el.height_mm / oldHeight;

      let newX = Number((normX * newWidth).toFixed(1));
      let newY = Number((normY * newHeight).toFixed(1));
      let newW = Number((normW * newWidth).toFixed(1));
      let newH = Number((normH * newHeight).toFixed(1));

      // Minimum and maximum bounding constraints
      newW = Math.max(5, Math.min(newW, newWidth - 4));
      newH = Math.max(3, Math.min(newH, newHeight - 4));
      newX = Math.max(1, Math.min(newX, newWidth - newW - 1));
      newY = Math.max(1, Math.min(newY, newHeight - newH - 1));

      return {
        ...el,
        x_mm: newX,
        y_mm: newY,
        width_mm: newW,
        height_mm: newH,
      };
    });
  }

  /**
   * Reset elements to safe default positions for the target orientation
   * (Option 2: Reset Posisi Elemen)
   */
  public static resetElementsForOrientation(
    templateId: string,
    orientation: CardOrientation
  ): StudentCardTemplateElement[] {
    if (orientation === 'portrait') {
      const portraitTmpl = DEFAULT_CARD_TEMPLATES.find((t) => t.orientation === 'portrait') || DEFAULT_CARD_TEMPLATES[2];
      return portraitTmpl.elements.map((el) => ({
        ...el,
        id: `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        template_id: templateId,
      }));
    } else {
      const landscapeTmpl = DEFAULT_CARD_TEMPLATES[0];
      return landscapeTmpl.elements.map((el) => ({
        ...el,
        id: `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        template_id: templateId,
      }));
    }
  }

  /**
   * Validate image file upload for custom template background
   */
  public static validateUploadedImage(
    file: File,
    orientation: CardOrientation = 'landscape'
  ): Promise<{
    valid: boolean;
    dataUrl?: string;
    widthPx?: number;
    heightPx?: number;
    aspectRatio?: number;
    ratioWarning?: boolean;
    ratioWarningMessage?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      // 1. MIME Validation (Strictly PNG, JPG, JPEG - DO NOT accept SVG without sanitizer)
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        return resolve({
          valid: false,
          error: 'Format file tidak didukung. Harap unggah berkas PNG atau JPG/JPEG (SVG tidak diizinkan).'
        });
      }

      // 2. File Size Limit (Max 10 MB)
      const maxBytes = 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        return resolve({
          valid: false,
          error: 'Ukuran file melebihi batas maksimum 10 MB.'
        });
      }

      // 3. Decode & Dimension Validation
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          const ratio = width / height;

          // Target ratio based on card orientation
          const targetRatio = orientation === 'landscape' 
            ? CR80_SPECS.LANDSCAPE.RATIO // 85.5 / 54 = ~1.5833
            : CR80_SPECS.PORTRAIT.RATIO; // 54 / 85.5 = ~0.6316

          const ratioDiff = Math.abs(ratio - targetRatio);
          const ratioWarning = ratioDiff > 0.08; // >5% deviation

          let ratioWarningMessage: string | undefined;
          if (ratioWarning) {
            ratioWarningMessage = orientation === 'landscape'
              ? `Rasio gambar (${ratio.toFixed(2)}) tidak sama dengan kartu Landscape. Ukuran target: 85.5 × 54 mm (rasio ~1.58). Desain akan ditampilkan dengan mode Cover.`
              : `Rasio gambar (${ratio.toFixed(2)}) tidak sama dengan kartu Portrait. Ukuran target: 54 × 85.5 mm (rasio ~0.63). Desain akan ditampilkan dengan mode Cover.`;
          }

          resolve({
            valid: true,
            dataUrl,
            widthPx: width,
            heightPx: height,
            aspectRatio: ratio,
            ratioWarning,
            ratioWarningMessage
          });
        };
        img.onerror = () => {
          resolve({
            valid: false,
            error: 'Berkas gambar rusak atau tidak dapat didekode oleh browser.'
          });
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        resolve({
          valid: false,
          error: 'Gagal membaca berkas gambar dari disk.'
        });
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Unit Conversion Helpers
   */
  public static mmToPx(mm: number, dpi: number = 300): number {
    return Math.round((mm / CR80_SPECS.MM_TO_INCH) * dpi);
  }

  public static pxToMm(px: number, dpi: number = 300): number {
    return Number(((px / dpi) * CR80_SPECS.MM_TO_INCH).toFixed(2));
  }

  public static ptToMm(pt: number): number {
    return Number(((pt / CR80_SPECS.PT_PER_INCH) * CR80_SPECS.MM_TO_INCH).toFixed(2));
  }

  public static mmToPt(mm: number): number {
    return Number(((mm / CR80_SPECS.MM_TO_INCH) * CR80_SPECS.PT_PER_INCH).toFixed(2));
  }
}
