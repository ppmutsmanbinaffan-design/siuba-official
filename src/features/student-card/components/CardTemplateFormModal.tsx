import React, { useState, useRef } from 'react';
import { 
  X, 
  CreditCard, 
  Upload, 
  Check, 
  AlertTriangle, 
  Sparkles,
  LayoutTemplate
} from 'lucide-react';
import { 
  StudentCardTemplate, 
  CardOrientation 
} from '../../../types';
import { 
  StudentCardTemplateService, 
  CR80_SPECS 
} from '../../../services/studentCardTemplateService';

export interface CardTemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit?: StudentCardTemplate | null;
  onSave: (templateData: Partial<StudentCardTemplate>, orientationChanged?: boolean, transformStrategy?: 'relative' | 'reset') => void;
}

export const CardTemplateFormModal: React.FC<CardTemplateFormModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = !!templateToEdit;
  const [name, setName] = useState<string>(templateToEdit?.name || '');
  const [description, setDescription] = useState<string>(templateToEdit?.description || '');
  const [category, setCategory] = useState<string>(templateToEdit?.category || 'reguler');
  const [orientation, setOrientation] = useState<CardOrientation>(templateToEdit?.orientation || 'landscape');
  const [isDefault, setIsDefault] = useState<boolean>(templateToEdit?.is_default || false);
  const [isActive, setIsActive] = useState<boolean>(templateToEdit?.is_active ?? true);

  const [frontImage, setFrontImage] = useState<string | null>(templateToEdit?.front_image_path || null);
  const [backImage, setBackImage] = useState<string | null>(templateToEdit?.back_image_path || null);
  const [frontWarning, setFrontWarning] = useState<string | null>(null);
  const [backWarning, setBackWarning] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Check if orientation changed on existing template
  const orientationChanged = isEditing && templateToEdit?.orientation !== orientation;

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await StudentCardTemplateService.validateUploadedImage(file, orientation);
    if (!res.valid) {
      alert(res.error || 'Format berkas tidak didukung.');
      return;
    }

    if (side === 'front') {
      setFrontImage(res.dataUrl || null);
      setFrontWarning(res.ratioWarningMessage || null);
    } else {
      setBackImage(res.dataUrl || null);
      setBackWarning(res.ratioWarningMessage || null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Harap isi nama template kartu.');
      return;
    }

    const payload: Partial<StudentCardTemplate> = {
      name: name.trim(),
      description: description.trim(),
      category,
      orientation,
      width_mm: orientation === 'landscape' ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM,
      height_mm: orientation === 'landscape' ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM,
      bleed_mm: 0,
      front_image_path: frontImage,
      back_image_path: backImage,
      is_default: isDefault,
      is_active: isActive
    };

    onSave(payload, orientationChanged);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1F5C45]/10 dark:bg-[#2F7D5A]/20 border border-[#1F5C45]/20 flex items-center justify-center text-[#1F5C45] dark:text-[#2F7D5A]">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white">
                {isEditing ? 'Ubah Informasi Template' : 'Tambah Template Kartu Baru'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Standar ISO/IEC 7810 ID-1 (CR80)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Template Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nama Template <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kartu Santri Reguler (Emerald 2026)"
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan peruntukan template kartu (opsional)..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
            />
          </div>

          {/* Orientation Selector with Physical Dimensions */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Orientasi & Dimensi Fisik Kartu <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Landscape Option */}
              <div
                onClick={() => setOrientation('landscape')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  orientation === 'landscape'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-[#1F5C45] dark:border-[#2F7D5A] shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Landscape</span>
                  {orientation === 'landscape' && (
                    <span className="w-4 h-4 rounded-full bg-[#1F5C45] text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>

                {/* Mini Visual Landscape Card */}
                <div className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center mb-2 shadow-inner">
                  <div className="w-3/4 h-2/3 border border-dashed border-emerald-500/60 rounded flex items-center justify-center text-[9px] font-mono text-emerald-700 dark:text-emerald-300">
                    85.5 × 54 mm
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center font-mono">
                  85.5 mm × 54.0 mm
                </p>
              </div>

              {/* Portrait Option */}
              <div
                onClick={() => setOrientation('portrait')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  orientation === 'portrait'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-[#C9A227] shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Portrait</span>
                  {orientation === 'portrait' && (
                    <span className="w-4 h-4 rounded-full bg-[#C9A227] text-zinc-950 flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>

                {/* Mini Visual Portrait Card */}
                <div className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center mb-2 shadow-inner">
                  <div className="h-full w-1/2 border border-dashed border-amber-500/60 rounded flex items-center justify-center text-[9px] font-mono text-amber-700 dark:text-amber-300">
                    54×85.5
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center font-mono">
                  54.0 mm × 85.5 mm
                </p>
              </div>
            </div>

            {orientationChanged && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  Perubahan orientasi akan membuka dialog penyesuaian posisi elemen kartu saat disimpan.
                </span>
              </div>
            )}
          </div>

          {/* Background Images Upload (Front & Back) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            {/* Sisi Depan */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Latar Belakang Sisi Depan
              </label>
              <input
                type="file"
                ref={frontInputRef}
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => handleUploadImage(e, 'front')}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" />
                  {frontImage ? 'Ganti Gambar' : 'Pilih Gambar'}
                </button>
                {frontImage && (
                  <button
                    type="button"
                    onClick={() => { setFrontImage(null); setFrontWarning(null); }}
                    className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs"
                    title="Hapus"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {frontWarning && (
                <p className="text-[10px] text-amber-600 dark:text-amber-300 mt-1">{frontWarning}</p>
              )}
            </div>

            {/* Sisi Belakang */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Latar Belakang Sisi Belakang
              </label>
              <input
                type="file"
                ref={backInputRef}
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => handleUploadImage(e, 'back')}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => backInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" />
                  {backImage ? 'Ganti Gambar' : 'Pilih Gambar'}
                </button>
                {backImage && (
                  <button
                    type="button"
                    onClick={() => { setBackImage(null); setBackWarning(null); }}
                    className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs"
                    title="Hapus"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {backWarning && (
                <p className="text-[10px] text-amber-600 dark:text-amber-300 mt-1">{backWarning}</p>
              )}
            </div>
          </div>

          {/* Options: Default & Active */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-[#1F5C45] focus:ring-[#1F5C45]"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300">Jadikan Template Default</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-[#1F5C45] focus:ring-[#1F5C45]"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300">Status Aktif</span>
            </label>
          </div>

          {/* Submit Actions */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold transition-all shadow-sm"
            >
              {isEditing ? 'Simpan Perubahan' : 'Buat Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
