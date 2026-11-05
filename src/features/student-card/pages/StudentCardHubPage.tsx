import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Layers, 
  Printer, 
  Sliders, 
  Sparkles, 
  Plus, 
  Eye, 
  LayoutTemplate,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  Student, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  StudentCardTemplate, 
  StudentCardTemplateElement, 
  CardOrientation 
} from '../../../types';
import { 
  StudentCardTemplateService, 
  DEFAULT_CARD_TEMPLATES, 
  CR80_SPECS 
} from '../../../services/studentCardTemplateService';
import { CardTemplateList } from '../components/CardTemplateList';
import { CardDesigner } from '../components/CardDesigner';
import { CardBulkGenerateView } from '../components/CardBulkGenerateView';
import { CardTemplateFormModal } from '../components/CardTemplateFormModal';
import { CardOrientationChangeModal } from '../components/CardOrientationChangeModal';
import { CardPreviewModal } from '../components/CardPreviewModal';

export interface StudentCardHubPageProps {
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
  initialSubTab?: 'templates' | 'designer' | 'generate';
  initialTemplateId?: string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentCardHubPage: React.FC<StudentCardHubPageProps> = ({
  students,
  classrooms,
  dormitories,
  dormitoryRooms,
  initialSubTab = 'templates',
  initialTemplateId,
  onShowToast
}) => {
  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'designer' | 'generate'>(initialSubTab);

  // Template Data State
  const [templates, setTemplates] = useState<StudentCardTemplate[]>([]);
  const [activeDesignerTemplate, setActiveDesignerTemplate] = useState<StudentCardTemplate | null>(null);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [templateToEdit, setTemplateToEdit] = useState<StudentCardTemplate | null>(null);

  // Orientation Change Modal
  const [isOrientationModalOpen, setIsOrientationModalOpen] = useState<boolean>(false);
  const [pendingOrientationTemplate, setPendingOrientationTemplate] = useState<StudentCardTemplate | null>(null);
  const [pendingTargetOrientation, setPendingTargetOrientation] = useState<CardOrientation>('landscape');

  // Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewModalTemplate, setPreviewModalTemplate] = useState<StudentCardTemplate | null>(null);
  const [previewInitialStudentId, setPreviewInitialStudentId] = useState<number | undefined>(undefined);

  // Load Templates from Service
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const data = StudentCardTemplateService.getTemplates();
    setTemplates(data);

    if (initialTemplateId) {
      const found = data.find((t) => t.id === initialTemplateId);
      if (found) setActiveDesignerTemplate(found);
    } else if (!activeDesignerTemplate && data.length > 0) {
      setActiveDesignerTemplate(data[0]);
    }
  };

  // Open Designer for specific template
  const handleSelectForDesign = (template: StudentCardTemplate) => {
    setActiveDesignerTemplate(template);
    setActiveSubTab('designer');
  };

  // Save Designer updates
  const handleSaveDesignerTemplate = (updated: StudentCardTemplate) => {
    StudentCardTemplateService.saveTemplate(updated);
    loadTemplates();
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setTemplateToEdit(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Metadata Modal
  const handleEditTemplateMeta = (template: StudentCardTemplate) => {
    setTemplateToEdit(template);
    setIsFormModalOpen(true);
  };

  // Handle Save Template from Modal
  const handleSaveTemplateForm = (
    data: Partial<StudentCardTemplate>,
    orientationChanged?: boolean
  ) => {
    if (orientationChanged && templateToEdit) {
      // Prompt orientation change strategy
      const pending: StudentCardTemplate = {
        ...templateToEdit,
        ...data,
      } as StudentCardTemplate;
      setPendingOrientationTemplate(pending);
      setPendingTargetOrientation(data.orientation || 'landscape');
      setIsOrientationModalOpen(true);
      setIsFormModalOpen(false);
      return;
    }

    if (templateToEdit) {
      // Update existing
      const updated: StudentCardTemplate = {
        ...templateToEdit,
        ...data,
        updated_at: new Date().toISOString()
      };
      StudentCardTemplateService.saveTemplate(updated);
      if (onShowToast) onShowToast(`Template "${updated.name}" berhasil diperbarui`, 'success');
    } else {
      // Create new template
      const newId = `tmpl-${Date.now().toString(36)}`;
      const orientation = data.orientation || 'landscape';
      const defaultElements = StudentCardTemplateService.resetElementsForOrientation(newId, orientation);

      const created: StudentCardTemplate = {
        id: newId,
        name: data.name || 'Template Baru',
        description: data.description || '',
        category: data.category || 'custom',
        orientation,
        width_mm: orientation === 'landscape' ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM,
        height_mm: orientation === 'landscape' ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM,
        bleed_mm: 0,
        front_image_path: data.front_image_path || null,
        back_image_path: data.back_image_path || null,
        is_default: data.is_default || false,
        is_active: data.is_active ?? true,
        created_by: 'Staff Madrasah',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        elements: defaultElements
      };

      StudentCardTemplateService.saveTemplate(created);
      if (onShowToast) onShowToast(`Template "${created.name}" berhasil dibuat`, 'success');
    }

    setIsFormModalOpen(false);
    loadTemplates();
  };

  // Confirm Orientation Strategy
  const handleConfirmOrientationStrategy = (strategy: 'relative' | 'reset') => {
    if (!pendingOrientationTemplate) return;

    let nextElements: StudentCardTemplateElement[];
    if (strategy === 'relative') {
      nextElements = StudentCardTemplateService.transformElementsForOrientation(
        pendingOrientationTemplate.elements,
        pendingOrientationTemplate.orientation === 'landscape' ? 'portrait' : 'landscape', // old orientation
        pendingTargetOrientation // new orientation
      );
    } else {
      nextElements = StudentCardTemplateService.resetElementsForOrientation(
        pendingOrientationTemplate.id,
        pendingTargetOrientation
      );
    }

    const updated: StudentCardTemplate = {
      ...pendingOrientationTemplate,
      orientation: pendingTargetOrientation,
      width_mm: pendingTargetOrientation === 'landscape' ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM,
      height_mm: pendingTargetOrientation === 'landscape' ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM,
      elements: nextElements,
      updated_at: new Date().toISOString()
    };

    StudentCardTemplateService.saveTemplate(updated);
    setIsOrientationModalOpen(false);
    setPendingOrientationTemplate(null);
    loadTemplates();
    if (onShowToast) onShowToast(`Orientasi template berhasil diubah ke ${pendingTargetOrientation} (${strategy === 'relative' ? 'Posisi Relatif' : 'Reset Posisi'})`, 'success');
  };

  // Duplicate Template
  const handleDuplicateTemplate = (id: string) => {
    const dup = StudentCardTemplateService.duplicateTemplate(id);
    if (dup) {
      loadTemplates();
      if (onShowToast) onShowToast(`Template "${dup.name}" berhasil diduplikasi`, 'success');
    }
  };

  // Set Default Template
  const handleSetDefaultTemplate = (id: string) => {
    StudentCardTemplateService.setDefaultTemplate(id);
    loadTemplates();
    if (onShowToast) onShowToast('Template default berhasil diubah', 'success');
  };

  // Toggle Active
  const handleToggleActiveTemplate = (id: string, isActive: boolean) => {
    StudentCardTemplateService.toggleActive(id, isActive);
    loadTemplates();
    if (onShowToast) onShowToast(`Status template diubah ke ${isActive ? 'Aktif' : 'Nonaktif'}`, 'info');
  };

  // Delete Template
  const handleDeleteTemplate = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus template kartu ini?')) {
      const res = StudentCardTemplateService.deleteTemplate(id);
      if (res.success) {
        loadTemplates();
        if (onShowToast) onShowToast('Template berhasil dihapus', 'success');
      } else {
        if (onShowToast) onShowToast(res.error || 'Gagal menghapus template', 'error');
      }
    }
  };

  // Open Preview Modal
  const handlePreviewTemplate = (template: StudentCardTemplate, studentId?: number) => {
    setPreviewModalTemplate(template);
    setPreviewInitialStudentId(studentId);
    setIsPreviewModalOpen(true);
  };

  // Sample student for thumbnails
  const sampleStudent: Student = students[0] || {
    id: 999999,
    student_number: 'UBA260001',
    nisn: '0089123456',
    name: 'Muhammad Fatih Al-Faruq',
    gender: 'male',
    classroom_id: 1,
    classroom_name: 'Kelas 7-A (Madrasah Tsanawiyah)',
    dormitory_room_id: 1,
    dormitory_room_name: 'Asrama Abu Bakar - Kamar 101',
    generation_year: 2026,
    qr_token: 'STU-UBA260001-TOKEN-VERIFIED-2026',
    status: 'active',
    is_active: true,
    photo_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face'
  };

  return (
    <div id="student-card-hub-page" className="space-y-6 pb-12">
      {/* SIUBA Emerald Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Desain & Cetak Kartu Santri
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Desain & Cetak Kartu Santri
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Kelola template kartu identitas santri, kustomisasi visual drag-and-drop di Designer Studio, dan cetak massal ID card berstandar CR80.
            </p>
          </div>

          {activeSubTab === 'templates' && (
            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-[#1F5C45]" />
                <span>Tambah Template Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* Sub-Tab Navigation inside Banner */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-white/15 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('templates')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[38px] active:scale-95 whitespace-nowrap ${
              activeSubTab === 'templates'
                ? 'bg-white text-[#12372A] shadow-md font-black'
                : 'bg-black/25 text-emerald-100/80 border border-white/15 hover:bg-black/35 hover:text-white'
            }`}
          >
            <LayoutTemplate className="w-4 h-4 text-[#1F5C45]" />
            <span>Katalog Template ({templates.length})</span>
          </button>

          <button
            onClick={() => {
              if (!activeDesignerTemplate && templates.length > 0) {
                setActiveDesignerTemplate(templates[0]);
              }
              setActiveSubTab('designer');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[38px] active:scale-95 whitespace-nowrap ${
              activeSubTab === 'designer'
                ? 'bg-white text-[#12372A] shadow-md font-black'
                : 'bg-black/25 text-emerald-100/80 border border-white/15 hover:bg-black/35 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#1F5C45]" />
            <span>Designer Studio</span>
          </button>

          <button
            onClick={() => setActiveSubTab('generate')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[38px] active:scale-95 whitespace-nowrap ${
              activeSubTab === 'generate'
                ? 'bg-white text-[#12372A] shadow-md font-black'
                : 'bg-black/25 text-emerald-100/80 border border-white/15 hover:bg-black/35 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4 text-[#1F5C45]" />
            <span>Cetak Massal</span>
          </button>
        </div>
      </div>

      {/* Sub-View Content Switching */}
      {activeSubTab === 'templates' && (
        <CardTemplateList
          templates={templates}
          sampleStudent={sampleStudent}
          onSelectForDesign={handleSelectForDesign}
          onOpenCreateModal={handleOpenCreateModal}
          onEditTemplateMeta={handleEditTemplateMeta}
          onDuplicateTemplate={handleDuplicateTemplate}
          onSetDefaultTemplate={handleSetDefaultTemplate}
          onToggleActiveTemplate={handleToggleActiveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onPreviewTemplate={(tmpl) => handlePreviewTemplate(tmpl)}
          onNavigateToBulkGenerate={(tmplId) => {
            setActiveDesignerTemplate(templates.find((t) => t.id === tmplId) || null);
            setActiveSubTab('generate');
          }}
        />
      )}

      {activeSubTab === 'designer' && activeDesignerTemplate && (
        <CardDesigner
          key={activeDesignerTemplate.id}
          initialTemplate={activeDesignerTemplate}
          students={students}
          onSaveTemplate={handleSaveDesignerTemplate}
          onPreviewStudent={(tmpl, student) => handlePreviewTemplate(tmpl, student.id)}
          onShowToast={onShowToast}
          onBackToList={() => setActiveSubTab('templates')}
        />
      )}

      {activeSubTab === 'generate' && (
        <CardBulkGenerateView
          students={students}
          classrooms={classrooms}
          dormitories={dormitories}
          dormitoryRooms={dormitoryRooms}
          templates={templates}
          activeTemplateId={activeDesignerTemplate?.id}
          onShowToast={onShowToast}
          onOpenDesigner={(tmpl) => handleSelectForDesign(tmpl)}
        />
      )}

      {/* Template Create / Edit Meta Modal */}
      <CardTemplateFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        templateToEdit={templateToEdit}
        onSave={handleSaveTemplateForm}
      />

      {/* Orientation Change Confirmation Modal */}
      {pendingOrientationTemplate && (
        <CardOrientationChangeModal
          isOpen={isOrientationModalOpen}
          onClose={() => {
            setIsOrientationModalOpen(false);
            setPendingOrientationTemplate(null);
          }}
          oldOrientation={pendingOrientationTemplate.orientation === 'landscape' ? 'portrait' : 'landscape'}
          newOrientation={pendingTargetOrientation}
          onConfirm={handleConfirmOrientationStrategy}
        />
      )}

      {/* Live Preview Modal */}
      {previewModalTemplate && (
        <CardPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          template={previewModalTemplate}
          students={students}
          initialStudentId={previewInitialStudentId}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
