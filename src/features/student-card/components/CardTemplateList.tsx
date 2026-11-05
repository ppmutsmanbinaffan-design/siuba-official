import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Eye, 
  Edit3, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  Filter, 
  Sliders, 
  Check, 
  ArrowRight,
  Printer
} from 'lucide-react';
import { StudentCardTemplate, CardOrientation, Student } from '../../../types';
import { CR80_SPECS } from '../../../services/studentCardTemplateService';
import { StudentCardRenderer } from './StudentCardRenderer';

export interface CardTemplateListProps {
  templates: StudentCardTemplate[];
  sampleStudent: Student;
  onSelectForDesign: (template: StudentCardTemplate) => void;
  onOpenCreateModal: () => void;
  onEditTemplateMeta: (template: StudentCardTemplate) => void;
  onDuplicateTemplate: (templateId: string) => void;
  onSetDefaultTemplate: (templateId: string) => void;
  onToggleActiveTemplate: (templateId: string, isActive: boolean) => void;
  onDeleteTemplate: (templateId: string) => void;
  onPreviewTemplate: (template: StudentCardTemplate) => void;
  onNavigateToBulkGenerate: (templateId: string) => void;
}

export const CardTemplateList: React.FC<CardTemplateListProps> = ({
  templates,
  sampleStudent,
  onSelectForDesign,
  onOpenCreateModal,
  onEditTemplateMeta,
  onDuplicateTemplate,
  onSetDefaultTemplate,
  onToggleActiveTemplate,
  onDeleteTemplate,
  onPreviewTemplate,
  onNavigateToBulkGenerate
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orientationFilter, setOrientationFilter] = useState<'all' | CardOrientation>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredTemplates = templates.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q) || false;
      if (!matchName && !matchDesc) return false;
    }
    if (orientationFilter !== 'all' && t.orientation !== orientationFilter) return false;
    if (activeStatusFilter === 'active' && !t.is_active) return false;
    if (activeStatusFilter === 'inactive' && t.is_active) return false;
    return true;
  });

  return (
    <div id="card-template-list-view" className="space-y-6">
      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari template berdasarkan nama / deskripsi..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {/* Orientation Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">Orientasi:</span>
          <div className="flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setOrientationFilter('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                orientationFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({templates.length})
            </button>
            <button
              onClick={() => setOrientationFilter('landscape')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                orientationFilter === 'landscape'
                  ? 'bg-[#1F5C45] text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Landscape ({templates.filter((t) => t.orientation === 'landscape').length})
            </button>
            <button
              onClick={() => setOrientationFilter('portrait')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                orientationFilter === 'portrait'
                  ? 'bg-[#1F5C45] text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Portrait ({templates.filter((t) => t.orientation === 'portrait').length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Templates (Modern Bento View) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => {
          const isLandscape = template.orientation === 'landscape';
          const hasBackSide = template.elements.some((e) => e.element_side === 'back') || !!template.back_image_path;

          return (
            <div
              key={template.id}
              id={`template-card-${template.id}`}
              className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col overflow-hidden shadow-sm hover:shadow-md ${
                template.is_default
                  ? 'border-[#1F5C45] ring-2 ring-[#1F5C45]/20'
                  : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              {/* Card Preview Thumbnail Header */}
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center gap-3">
                {/* Orientation & Dimension Badge (Positioned ABOVE the card design) */}
                <div className="w-full flex justify-center">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-2xs ${
                    isLandscape
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {isLandscape ? 'Landscape (85.5 × 54 mm)' : 'Portrait (54 × 85.5 mm)'}
                  </span>
                </div>

                {/* Scaled Mini Preview */}
                <div className="w-full max-w-[220px] transition-transform hover:scale-105 duration-200 cursor-pointer flex justify-center" onClick={() => onPreviewTemplate(template)}>
                  <StudentCardRenderer
                    template={template}
                    side="front"
                    student={sampleStudent}
                    showGuides={false}
                  />
                </div>
              </div>

              {/* Card Details Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                      {template.name}
                    </h3>
                    <button
                      onClick={() => onToggleActiveTemplate(template.id, !template.is_active)}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                        template.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {template.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {template.description || 'Template kartu identitas santri resmi.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-slate-500 font-semibold">
                    <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                      {template.elements.length} Elemen
                    </span>
                    <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                      Sisi Belakang: {hasBackSide ? 'Tersedia' : 'Polos'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="border-t border-slate-100 pt-3.5 flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelectForDesign(template)}
                      className="py-2.5 px-3 rounded-xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#EADAA2]" />
                      <span>Desain Kartu</span>
                    </button>
                    <button
                      onClick={() => onNavigateToBulkGenerate(template.id)}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 cursor-pointer active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#1F5C45]" />
                      <span>Cetak Massal</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onPreviewTemplate(template)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Live Preview Santri"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateTemplate(template.id)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Duplikasi Template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditTemplateMeta(template)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Edit Informasi Template"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      {!template.is_default && (
                        <button
                          onClick={() => onDeleteTemplate(template.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                          title="Hapus Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Bottom Right: Default Template Pill or Set as Default Button */}
                    {template.is_default ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1F5C45] text-white text-[10px] font-black uppercase shadow-2xs">
                        <Sparkles className="w-3 h-3 text-[#C9A227]" />
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => onSetDefaultTemplate(template.id)}
                        className="text-[11px] font-bold text-[#1F5C45] hover:underline flex items-center gap-1 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Jadikan Default</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
