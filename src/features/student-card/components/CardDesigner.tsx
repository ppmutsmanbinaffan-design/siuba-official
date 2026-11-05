import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  CreditCard, 
  Upload, 
  RotateCcw, 
  RotateCw, 
  Save, 
  Eye, 
  Layers, 
  Type, 
  QrCode, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Copy, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sparkles, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignVerticalJustifyCenter, 
  AlignHorizontalJustifyCenter, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertTriangle,
  Move,
  Sliders,
  X
} from 'lucide-react';
import { 
  Student, 
  StudentCardTemplate, 
  StudentCardTemplateElement, 
  CardSide, 
  StudentCardElementType, 
  CardPhotoShape 
} from '../../../types';
import { 
  StudentCardTemplateService, 
  CR80_SPECS 
} from '../../../services/studentCardTemplateService';
import { StudentCardRenderer } from './StudentCardRenderer';

export interface CardDesignerProps {
  initialTemplate: StudentCardTemplate;
  students: Student[];
  onSaveTemplate: (updatedTemplate: StudentCardTemplate) => void;
  onPreviewStudent?: (template: StudentCardTemplate, student: Student) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onBackToList?: () => void;
}

export const CardDesigner: React.FC<CardDesignerProps> = ({
  initialTemplate,
  students,
  onSaveTemplate,
  onPreviewStudent,
  onShowToast,
  onBackToList
}) => {
  const [template, setTemplate] = useState<StudentCardTemplate>(initialTemplate);
  const [activeSide, setActiveSide] = useState<CardSide>('front');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Undo / Redo Stacks
  const [history, setHistory] = useState<StudentCardTemplateElement[][]>([initialTemplate.elements]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active Preview Student & QR
  const [previewStudent, setPreviewStudent] = useState<Student>(students[0] || {
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
  });
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  // Mobile Active Panel ('toolbox' | 'canvas' | 'properties')
  const [mobileTab, setMobileTab] = useState<'toolbox' | 'canvas' | 'properties'>('canvas');

  // File Upload State
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Physical Card Size based on Orientation
  const isLandscape = template.orientation === 'landscape';
  const cardWidthMm = isLandscape ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM;
  const cardHeightMm = isLandscape ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM;

  // Selected Element
  const selectedElement = template.elements.find((el) => el.id === selectedElementId && el.element_side === activeSide);

  // Card Canvas Reference for accurate coordinate tracking
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Magnetic Snap Guides State
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [snapGuideY, setSnapGuideY] = useState<number | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);

  // Pre-generate QR on mount / student change
  useEffect(() => {
    let isMounted = true;
    const token = previewStudent.qr_token || `STU-${previewStudent.student_number}-TOKEN`;
    QRCode.toDataURL(token, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'H'
    }).then((url) => {
      if (isMounted) setPreviewQrUrl(url);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [previewStudent.qr_token, previewStudent.id]);

  // Push new state to undo/redo history
  const pushHistory = (newElements: StudentCardTemplateElement[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newElements);
    if (nextHistory.length > 30) nextHistory.shift();
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setIsDirty(true);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setTemplate((prev) => ({ ...prev, elements: history[prevIdx] }));
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setTemplate((prev) => ({ ...prev, elements: history[nextIdx] }));
      setIsDirty(true);
    }
  };

  // Keyboard Nudge Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement) return;
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      const step = e.shiftKey ? 2.0 : 0.5;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'Escape') {
        setSelectedElementId(null);
        return;
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteElement(selectedElement.id);
        e.preventDefault();
        return;
      } else return;

      e.preventDefault();
      const newX = Math.max(0, Math.min(cardWidthMm - selectedElement.width_mm, Number((selectedElement.x_mm + dx).toFixed(1))));
      const newY = Math.max(0, Math.min(cardHeightMm - selectedElement.height_mm, Number((selectedElement.y_mm + dy).toFixed(1))));

      updateElement(selectedElement.id, { x_mm: newX, y_mm: newY });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, cardWidthMm, cardHeightMm]);

  // Update specific element
  const updateElement = (elementId: string, updates: Partial<StudentCardTemplateElement>) => {
    const updatedElements = template.elements.map((el) => {
      if (el.id === elementId) {
        return { ...el, ...updates };
      }
      return el;
    });

    const updatedTemplate = { ...template, elements: updatedElements };
    setTemplate(updatedTemplate);
    pushHistory(updatedElements);
  };

  // Interactive Real-Time Canvas Drag Handlers (Smooth Pointer Drag)
  const handleElementPointerDown = (e: React.PointerEvent, element: StudentCardTemplateElement) => {
    e.stopPropagation();
    setSelectedElementId(element.id);
    setMobileTab('properties');
    if (!cardRef.current) return;

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const initialX_mm = element.x_mm;
    const initialY_mm = element.y_mm;
    const initialWidth_mm = element.width_mm;
    const initialHeight_mm = element.height_mm;

    const rect = cardRef.current.getBoundingClientRect();
    const pxPerMmX = rect.width / cardWidthMm;
    const pxPerMmY = rect.height / cardHeightMm;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaPxX = moveEvent.clientX - startPointerX;
      const deltaPxY = moveEvent.clientY - startPointerY;

      let newX_mm = initialX_mm + (deltaPxX / pxPerMmX);
      let newY_mm = initialY_mm + (deltaPxY / pxPerMmY);

      // Magnetic Snapping
      let activeSnapX: number | null = null;
      let activeSnapY: number | null = null;

      // Center Horizontal Snap
      const centerH_X = (cardWidthMm - initialWidth_mm) / 2;
      if (Math.abs(newX_mm - centerH_X) < 1.2) {
        newX_mm = centerH_X;
        activeSnapX = cardWidthMm / 2;
      }

      // Center Vertical Snap
      const centerV_Y = (cardHeightMm - initialHeight_mm) / 2;
      if (Math.abs(newY_mm - centerV_Y) < 1.2) {
        newY_mm = centerV_Y;
        activeSnapY = cardHeightMm / 2;
      }

      // Safe Margin Snaps
      if (Math.abs(newX_mm - CR80_SPECS.SAFE_MARGIN_MM) < 0.8) {
        newX_mm = CR80_SPECS.SAFE_MARGIN_MM;
        activeSnapX = CR80_SPECS.SAFE_MARGIN_MM;
      }
      if (Math.abs(newY_mm - CR80_SPECS.SAFE_MARGIN_MM) < 0.8) {
        newY_mm = CR80_SPECS.SAFE_MARGIN_MM;
        activeSnapY = CR80_SPECS.SAFE_MARGIN_MM;
      }

      // Boundary Clamping
      newX_mm = Math.max(0, Math.min(cardWidthMm - initialWidth_mm, Number(newX_mm.toFixed(1))));
      newY_mm = Math.max(0, Math.min(cardHeightMm - initialHeight_mm, Number(newY_mm.toFixed(1))));

      setSnapGuideX(activeSnapX);
      setSnapGuideY(activeSnapY);

      setTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => el.id === element.id ? { ...el, x_mm: newX_mm, y_mm: newY_mm } : el)
      }));
      setIsDirty(true);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setSnapGuideX(null);
      setSnapGuideY(null);
      setTemplate((currentTmpl) => {
        pushHistory(currentTmpl.elements);
        return currentTmpl;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Interactive 4-Corner & Edge Resize Handle Handlers
  const handleResizeHandlePointerDown = (
    e: React.PointerEvent,
    element: StudentCardTemplateElement,
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.stopPropagation();
    if (!cardRef.current) return;

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const initX = element.x_mm;
    const initY = element.y_mm;
    const initW = element.width_mm;
    const initH = element.height_mm;

    const rect = cardRef.current.getBoundingClientRect();
    const pxPerMmX = rect.width / cardWidthMm;
    const pxPerMmY = rect.height / cardHeightMm;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaMmX = (moveEvent.clientX - startPointerX) / pxPerMmX;
      const deltaMmY = (moveEvent.clientY - startPointerY) / pxPerMmY;

      let newX = initX;
      let newY = initY;
      let newW = initW;
      let newH = initH;

      if (handle.includes('e')) newW = Math.max(4, initW + deltaMmX);
      if (handle.includes('s')) newH = Math.max(3, initH + deltaMmY);
      if (handle.includes('w')) {
        const proposedW = Math.max(4, initW - deltaMmX);
        newX = initX + (initW - proposedW);
        newW = proposedW;
      }
      if (handle.includes('n')) {
        const proposedH = Math.max(3, initH - deltaMmY);
        newY = initY + (initH - proposedH);
        newH = proposedH;
      }

      // Clamp to card bounds
      newX = Math.max(0, Number(newX.toFixed(1)));
      newY = Math.max(0, Number(newY.toFixed(1)));
      newW = Math.min(cardWidthMm - newX, Number(newW.toFixed(1)));
      newH = Math.min(cardHeightMm - newY, Number(newH.toFixed(1)));

      setTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => el.id === element.id ? { ...el, x_mm: newX, y_mm: newY, width_mm: newW, height_mm: newH } : el)
      }));
      setIsDirty(true);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setTemplate((currentTmpl) => {
        pushHistory(currentTmpl.elements);
        return currentTmpl;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Add new element to template (supports optional drop coordinates)
  const handleAddElement = (type: StudentCardElementType, customX_mm?: number, customY_mm?: number) => {
    const newId = `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    let defaultWidth = 35.0;
    let defaultHeight = 6.0;
    let label = 'Elemen Baru';
    let defaultText: string | undefined = undefined;

    switch (type) {
      case 'student_photo':
        defaultWidth = isLandscape ? 22.0 : 25.0;
        defaultHeight = isLandscape ? 28.0 : 31.0;
        label = 'Foto Santri';
        break;
      case 'student_name':
        defaultWidth = isLandscape ? 50.0 : 46.0;
        defaultHeight = 6.5;
        label = 'Nama Santri';
        break;
      case 'student_number':
        defaultWidth = 30.0;
        defaultHeight = 4.5;
        label = 'Nomor Induk Santri (NIS)';
        break;
      case 'nisn':
        defaultWidth = 30.0;
        defaultHeight = 4.5;
        label = 'NISN';
        break;
      case 'classroom':
        defaultWidth = 30.0;
        defaultHeight = 4.5;
        label = 'Kelas / Tingkat';
        break;
      case 'dormitory':
        defaultWidth = 30.0;
        defaultHeight = 4.5;
        label = 'Asrama & Kamar';
        break;
      case 'qr_code':
        defaultWidth = isLandscape ? 20.0 : 19.0;
        defaultHeight = isLandscape ? 20.0 : 19.0;
        label = 'QR Code Absensi';
        break;
      case 'barcode':
        defaultWidth = 35.0;
        defaultHeight = 8.0;
        label = 'Barcode Santri';
        break;
      case 'school_name':
        defaultWidth = isLandscape ? 60.0 : 46.0;
        defaultHeight = 7.0;
        label = 'Header Instansi';
        defaultText = 'PESANTREN UTSMAN BIN AFFAN';
        break;
      case 'valid_thru':
        defaultWidth = 30.0;
        defaultHeight = 4.0;
        label = 'Masa Berlaku';
        break;
      case 'static_text':
        defaultWidth = 40.0;
        defaultHeight = 6.0;
        label = 'Teks Bebas / Tata Tertib';
        defaultText = 'TEKS KUSTOM';
        break;
    }

    const posX = customX_mm !== undefined
      ? Math.max(0, Math.min(cardWidthMm - defaultWidth, customX_mm - defaultWidth / 2))
      : Number((cardWidthMm / 2 - defaultWidth / 2).toFixed(1));

    const posY = customY_mm !== undefined
      ? Math.max(0, Math.min(cardHeightMm - defaultHeight, customY_mm - defaultHeight / 2))
      : Number((cardHeightMm / 2 - defaultHeight / 2).toFixed(1));

    const newElement: StudentCardTemplateElement = {
      id: newId,
      template_id: template.id,
      element_side: activeSide,
      element_type: type,
      label,
      x_mm: Number(posX.toFixed(1)),
      y_mm: Number(posY.toFixed(1)),
      width_mm: defaultWidth,
      height_mm: defaultHeight,
      font_size_pt: 7.5,
      font_weight: type === 'student_name' || type === 'school_name' ? 'bold' : 'normal',
      text_align: isLandscape ? 'left' : 'center',
      color: '#ffffff',
      is_visible: true,
      z_index: 20,
      photo_shape: 'rounded',
      static_text_value: defaultText
    };

    const nextElements = [...template.elements, newElement];
    setTemplate({ ...template, elements: nextElements });
    setSelectedElementId(newId);
    setMobileTab('properties');
    pushHistory(nextElements);
    if (onShowToast) onShowToast(`Elemen "${label}" ditambahkan`, 'info');
  };

  // HTML5 Drag and Drop Handlers from Toolbox into Canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    const type = e.dataTransfer.getData('application/siuba-element') as StudentCardElementType;
    if (!type || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const pxPerMmX = rect.width / cardWidthMm;
    const pxPerMmY = rect.height / cardHeightMm;

    const dropClientX = e.clientX - rect.left;
    const dropClientY = e.clientY - rect.top;

    const dropX_mm = Number((dropClientX / pxPerMmX).toFixed(1));
    const dropY_mm = Number((dropClientY / pxPerMmY).toFixed(1));

    handleAddElement(type, dropX_mm, dropY_mm);
  };

  // Duplicate Element
  const handleDuplicateElement = (elementId: string) => {
    const target = template.elements.find((el) => el.id === elementId);
    if (!target) return;

    const newId = `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: StudentCardTemplateElement = {
      ...target,
      id: newId,
      label: `${target.label} (Salinan)`,
      x_mm: Math.min(cardWidthMm - target.width_mm, target.x_mm + 2.0),
      y_mm: Math.min(cardHeightMm - target.height_mm, target.y_mm + 2.0),
      z_index: (target.z_index || 10) + 1
    };

    const nextElements = [...template.elements, duplicated];
    setTemplate({ ...template, elements: nextElements });
    setSelectedElementId(newId);
    pushHistory(nextElements);
    if (onShowToast) onShowToast('Elemen berhasil diduplikasi', 'success');
  };

  // Delete Element
  const handleDeleteElement = (elementId: string) => {
    const nextElements = template.elements.filter((el) => el.id !== elementId);
    setTemplate({ ...template, elements: nextElements });
    if (selectedElementId === elementId) setSelectedElementId(null);
    pushHistory(nextElements);
    if (onShowToast) onShowToast('Elemen dihapus', 'info');
  };

  // Alignment Tools
  const handleAlign = (type: 'left' | 'center_h' | 'right' | 'top' | 'center_v' | 'bottom') => {
    if (!selectedElement) return;

    let newX = selectedElement.x_mm;
    let newY = selectedElement.y_mm;

    if (type === 'left') newX = CR80_SPECS.SAFE_MARGIN_MM;
    else if (type === 'center_h') newX = Number(((cardWidthMm - selectedElement.width_mm) / 2).toFixed(1));
    else if (type === 'right') newX = Number((cardWidthMm - selectedElement.width_mm - CR80_SPECS.SAFE_MARGIN_MM).toFixed(1));
    else if (type === 'top') newY = CR80_SPECS.SAFE_MARGIN_MM;
    else if (type === 'center_v') newY = Number(((cardHeightMm - selectedElement.height_mm) / 2).toFixed(1));
    else if (type === 'bottom') newY = Number((cardHeightMm - selectedElement.height_mm - CR80_SPECS.SAFE_MARGIN_MM).toFixed(1));

    updateElement(selectedElement.id, { x_mm: newX, y_mm: newY });
  };

  // Layer Ordering
  const handleLayerOrder = (action: 'front' | 'back' | 'forward' | 'backward') => {
    if (!selectedElement) return;

    const currentZ = selectedElement.z_index || 10;
    let newZ = currentZ;

    if (action === 'front') newZ = 50;
    else if (action === 'back') newZ = 1;
    else if (action === 'forward') newZ = Math.min(50, currentZ + 1);
    else if (action === 'backward') newZ = Math.max(1, currentZ - 1);

    updateElement(selectedElement.id, { z_index: newZ });
  };

  // Background Image Upload with Aspect Ratio Check
  const handleUploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await StudentCardTemplateService.validateUploadedImage(file, template.orientation);
    if (!validation.valid) {
      if (onShowToast) onShowToast(validation.error || 'Gagal mengunggah gambar', 'error');
      return;
    }

    if (validation.ratioWarning) {
      setUploadWarning(validation.ratioWarningMessage || null);
    } else {
      setUploadWarning(null);
    }

    const updatedTemplate: StudentCardTemplate = {
      ...template,
      [activeSide === 'front' ? 'front_image_path' : 'back_image_path']: validation.dataUrl,
      bg_fit: 'cover'
    };

    setTemplate(updatedTemplate);
    setIsDirty(true);
    if (onShowToast) onShowToast(`Latar belakang sisi ${activeSide === 'front' ? 'Depan' : 'Belakang'} diperbarui!`, 'success');
  };

  // Remove Background Image
  const handleRemoveBgImage = () => {
    const updatedTemplate: StudentCardTemplate = {
      ...template,
      [activeSide === 'front' ? 'front_image_path' : 'back_image_path']: null
    };
    setTemplate(updatedTemplate);
    setIsDirty(true);
    if (onShowToast) onShowToast(`Latar belakang sisi ${activeSide === 'front' ? 'Depan' : 'Belakang'} dihapus`, 'info');
  };

  // Save All Changes
  const handleSave = () => {
    const res = StudentCardTemplateService.saveTemplate(template);
    if (res.success && res.template) {
      setIsDirty(false);
      onSaveTemplate(res.template);
      if (onShowToast) onShowToast(`Template "${template.name}" berhasil disimpan!`, 'success');
    } else {
      if (onShowToast) onShowToast(res.error || 'Gagal menyimpan template', 'error');
    }
  };

  return (
    <div id="card-designer-engine" className="flex flex-col h-full bg-[#09090b] text-zinc-100 min-h-[calc(100vh-140px)]">
      {/* Top Designer Header Toolbar */}
      <div id="designer-top-toolbar" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#18181b] border-b border-zinc-800">
        {/* Left Title & Status */}
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Kembali ke Daftar Template"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#C9A227]" />
                {template.name}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLandscape
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800/80'
              }`}>
                {isLandscape ? 'Landscape (85.5 × 54 mm)' : 'Portrait (54 × 85.5 mm)'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Ukuran fisik standar ISO/IEC 7810 ID-1 • {template.elements.length} elemen aktif
            </p>
          </div>
        </div>

        {/* Center Canvas Switches & Controls */}
        <div className="flex items-center gap-2">
          {/* Front / Back Switch */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-700">
            <button
              onClick={() => { setActiveSide('front'); setSelectedElementId(null); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeSide === 'front'
                  ? 'bg-[#1F5C45] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sisi Depan
            </button>
            <button
              onClick={() => { setActiveSide('back'); setSelectedElementId(null); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeSide === 'back'
                  ? 'bg-[#1F5C45] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sisi Belakang
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-1 border-l border-zinc-700 pl-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 border-l border-zinc-700 pl-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Perkecil Kanvas"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-zinc-300 w-10 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 25))}
              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Perbesar Kanvas"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Guide Toggles */}
          <div className="hidden lg:flex items-center gap-1 border-l border-zinc-700 pl-2">
            <button
              onClick={() => setShowGuides((g) => !g)}
              className={`px-2 py-1 text-xs rounded-md border font-medium transition-colors ${
                showGuides
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              Safe Margin
            </button>
            <button
              onClick={() => setShowGrid((g) => !g)}
              className={`px-2 py-1 text-xs rounded-md border font-medium transition-colors ${
                showGrid
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              Grid 5mm
            </button>
          </div>
        </div>

        {/* Right Actions: Save, Live Preview */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="hidden sm:inline-flex text-[11px] text-amber-400 font-medium items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Ada Perubahan
            </span>
          )}
          {onPreviewStudent && (
            <button
              onClick={() => onPreviewStudent(template, previewStudent)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Preview Santri</span>
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-lg bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Desain
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-zinc-800 bg-zinc-900">
        <button
          onClick={() => setMobileTab('toolbox')}
          className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 ${
            mobileTab === 'toolbox' ? 'border-[#1F5C45] text-[#1F5C45]' : 'border-transparent text-zinc-400'
          }`}
        >
          Toolbox Elemen
        </button>
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 ${
            mobileTab === 'canvas' ? 'border-[#1F5C45] text-[#1F5C45]' : 'border-transparent text-zinc-400'
          }`}
        >
          Kanvas Kartu
        </button>
        <button
          onClick={() => setMobileTab('properties')}
          className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 ${
            mobileTab === 'properties' ? 'border-[#1F5C45] text-[#1F5C45]' : 'border-transparent text-zinc-400'
          }`}
        >
          Properti ({selectedElement ? selectedElement.label : 'Pilih Elemen'})
        </button>
      </div>

      {/* Main 3-Column Designer Workspace */}
      <div id="designer-workspace-grid" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Element Toolbox (lg:col-span-3) */}
        <div
          id="designer-toolbox"
          className={`lg:col-span-3 bg-[#121214] border-r border-zinc-800/80 p-4 overflow-y-auto flex flex-col gap-4 ${
            mobileTab === 'toolbox' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Header & Quick Add */}
          <div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2 mb-1">
              <Layers className="w-3.5 h-3.5 text-[#1F5C45]" />
              Toolbox Elemen Kartu
            </h3>
            <p className="text-[11px] text-zinc-400">
              Klik elemen di bawah untuk menyisipkan ke sisi <span className="text-[#C9A227] font-semibold">{activeSide === 'front' ? 'Depan' : 'Belakang'}</span>.
            </p>
          </div>

          {/* Core Elements Palette */}
          <div className="grid grid-cols-2 gap-2">
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'student_photo');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('student_photo')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-emerald-400">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                Foto Santri
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Pas foto rasio 3x4 / 2x3</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'student_name');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('student_name')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-emerald-400">
                <Type className="w-4 h-4 text-emerald-400" />
                Nama Santri
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Nama lengkap otomatis</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'qr_code');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('qr_code')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-[#C9A227]">
                <QrCode className="w-4 h-4 text-amber-400" />
                QR Absensi
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Token QR SIUBA</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'student_number');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('student_number')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-cyan-400">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                Nomor NIS
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Nomor Induk Santri</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'classroom');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('classroom')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-blue-400">
                <Type className="w-4 h-4 text-blue-400" />
                Kelas / Tingkat
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Kelas madrasah</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'dormitory');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('dormitory')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-purple-400">
                <Type className="w-4 h-4 text-purple-400" />
                Asrama / Kamar
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Gedung & kamar</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'school_name');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('school_name')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-yellow-400">
                <Type className="w-4 h-4 text-yellow-400" />
                KOP Instansi
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Nama Yayasan/Pondok</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'valid_thru');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('valid_thru')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-pink-400">
                <Type className="w-4 h-4 text-pink-400" />
                Masa Berlaku
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Tahun kelulusan</p>
            </button>

            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/siuba-element', 'static_text');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleAddElement('static_text')}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1F5C45] text-left transition-all group col-span-2 cursor-grab active:cursor-grabbing"
              title="Klik atau Tarik (Drag) ke Kanvas"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-orange-400">
                <Type className="w-4 h-4 text-orange-400" />
                Teks Bebas / Tata Tertib
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Dapat diformat multi-baris untuk tata tertib belakang</p>
            </button>
          </div>

          {/* Background Image Upload Section */}
          <div className="border-t border-zinc-800 pt-3">
            <h4 className="text-xs font-bold text-zinc-300 mb-2 flex items-center justify-between">
              <span>Latar Belakang ({activeSide === 'front' ? 'Depan' : 'Belakang'})</span>
              <span className="text-[10px] text-zinc-400 font-normal">PNG / JPG</span>
            </h4>

            {uploadWarning && (
              <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/80 text-[11px] text-amber-200 mb-2 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{uploadWarning}</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleUploadBgImage}
              className="hidden"
            />

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                Upload Background
              </button>
              {(activeSide === 'front' ? template.front_image_path : template.back_image_path) && (
                <button
                  onClick={handleRemoveBgImage}
                  className="p-2 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 transition-colors cursor-pointer"
                  title="Hapus gambar background"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Elements on this side */}
          <div className="border-t border-zinc-800 pt-3 flex-1">
            <h4 className="text-xs font-bold text-zinc-300 mb-2 flex items-center justify-between">
              <span>Daftar Layer Sisi {activeSide === 'front' ? 'Depan' : 'Belakang'}</span>
              <span className="text-[10px] text-zinc-400">
                {template.elements.filter((e) => e.element_side === activeSide).length} item
              </span>
            </h4>

            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {template.elements
                .filter((el) => el.element_side === activeSide)
                .sort((a, b) => (b.z_index || 10) - (a.z_index || 10))
                .map((el) => {
                  const isSelected = selectedElementId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={() => {
                        setSelectedElementId(el.id);
                        setMobileTab('properties');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#1F5C45] text-white font-bold'
                          : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="truncate">{el.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] opacity-75 font-mono">
                          {el.x_mm}×{el.y_mm}mm
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(el.id);
                          }}
                          className={`p-1 rounded hover:text-red-400 ${isSelected ? 'text-white' : 'text-zinc-500'}`}
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Center Column: Interactive Canvas Stage (lg:col-span-6) */}
        <div
          id="designer-canvas-stage"
          className={`lg:col-span-6 bg-[#0c0c0e] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden ${
            mobileTab === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
          onClick={() => setSelectedElementId(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setIsDragOverCanvas(true);
          }}
          onDragLeave={() => setIsDragOverCanvas(false)}
          onDrop={handleCanvasDrop}
        >
          {/* Card Dimensions & Aspect Ratio Indicator */}
          <div className="mb-3 flex items-center gap-2 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800 text-[11px] text-zinc-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dimensi Fisik: <strong>{cardWidthMm} mm × {cardHeightMm} mm</strong></span>
            <span className="text-zinc-500">•</span>
            <span>CR80 / ID-1 Standard</span>
          </div>

          {/* Quick Floating Action Bar for Selected Element */}
          {selectedElement && (
            <div
              className="mb-3 flex items-center gap-1 bg-zinc-900/95 border border-zinc-700/80 px-2.5 py-1 rounded-2xl shadow-xl backdrop-blur-xs z-30 flex-wrap justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-bold text-amber-300 px-1 border-r border-zinc-700 mr-1">
                {selectedElement.label}
              </span>
              <button
                onClick={() => handleAlign('center_h')}
                className="px-2 py-1 bg-zinc-800 hover:bg-[#1F5C45] text-zinc-200 hover:text-white rounded-lg text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Ratakan Tengah Horizontal"
              >
                <AlignCenter className="w-3 h-3 text-[#C9A227]" />
                Tengah H
              </button>
              <button
                onClick={() => handleAlign('center_v')}
                className="px-2 py-1 bg-zinc-800 hover:bg-[#1F5C45] text-zinc-200 hover:text-white rounded-lg text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Ratakan Tengah Vertikal"
              >
                <AlignCenter className="w-3 h-3 text-[#C9A227] rotate-90" />
                Tengah V
              </button>
              <button
                onClick={() => handleDuplicateElement(selectedElement.id)}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition cursor-pointer"
                title="Duplikasi (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteElement(selectedElement.id)}
                className="p-1 bg-zinc-800 hover:bg-rose-900 text-rose-300 rounded-lg text-xs transition cursor-pointer"
                title="Hapus Elemen (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Interactive Card Stage Container */}
          <div
            className="w-full flex items-center justify-center transition-all duration-150"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center'
            }}
          >
            <StudentCardRenderer
              cardRef={cardRef}
              template={template}
              side={activeSide}
              student={previewStudent}
              qrDataUrl={previewQrUrl}
              isDesignerMode={true}
              selectedElementId={selectedElementId}
              onSelectElement={(id) => {
                setSelectedElementId(id);
                setMobileTab('properties');
              }}
              onElementPointerDown={handleElementPointerDown}
              onResizeHandlePointerDown={handleResizeHandlePointerDown}
              snapGuideX={snapGuideX}
              snapGuideY={snapGuideY}
              isDragOver={isDragOverCanvas}
              showGuides={showGuides}
              showGrid={showGrid}
            />
          </div>

          {/* Bottom Interactive Hints */}
          <div className="mt-4 text-[11px] text-zinc-400 flex items-center gap-2 flex-wrap justify-center">
            <span className="flex items-center gap-1 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800">
              <Move className="w-3 h-3 text-[#C9A227]" />
              <strong>Geser (Drag)</strong> elemen langsung di kanvas atau tarik dari Toolbox kiri
            </span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-zinc-500">Gunakan panah keyboard (0.5mm) / Shift+Panah (2mm)</span>
          </div>
        </div>

        {/* Right Column: Millimeter Property Inspector (lg:col-span-3) */}
        <div
          id="designer-property-inspector"
          className={`lg:col-span-3 bg-[#121214] border-l border-zinc-800/80 p-4 overflow-y-auto flex flex-col gap-4 ${
            mobileTab === 'properties' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#1F5C45]" />
                Inspektur Properti
              </span>
              {selectedElement && (
                <span className="text-[10px] text-[#C9A227] font-mono font-bold">
                  {selectedElement.element_type}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {selectedElement ? `Mengatur elemen: ${selectedElement.label}` : 'Pilih elemen pada kanvas untuk mengedit parameter.'}
            </p>
          </div>

          {selectedElement ? (
            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Label Elemen</label>
                <input
                  type="text"
                  value={selectedElement.label}
                  onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-[#1F5C45]"
                />
              </div>

              {/* Static Text Value (If Static Text / School Name) */}
              {(selectedElement.element_type === 'static_text' || selectedElement.element_type === 'school_name') && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Isi Teks Kustom</label>
                  <textarea
                    rows={selectedElement.element_type === 'static_text' ? 4 : 2}
                    value={selectedElement.static_text_value || ''}
                    onChange={(e) => updateElement(selectedElement.id, { static_text_value: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-[#1F5C45]"
                    placeholder="Masukkan teks kartu..."
                  />
                </div>
              )}

              {/* Coordinates & Dimensions (mm) */}
              <div className="border-t border-zinc-800 pt-3">
                <h4 className="text-[11px] font-bold text-zinc-300 mb-2 flex items-center justify-between">
                  <span>Posisi & Ukuran (Milimeter)</span>
                  <span className="text-[10px] text-[#C9A227] font-mono">mm</span>
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-0.5">X (Jarak Kiri)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={cardWidthMm}
                        value={selectedElement.x_mm}
                        onChange={(e) => updateElement(selectedElement.id, { x_mm: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-l text-xs font-mono text-zinc-100"
                      />
                      <span className="px-1.5 py-1 bg-zinc-800 border-y border-r border-zinc-700 text-[10px] text-zinc-400 rounded-r">mm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-0.5">Y (Jarak Atas)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={cardHeightMm}
                        value={selectedElement.y_mm}
                        onChange={(e) => updateElement(selectedElement.id, { y_mm: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-l text-xs font-mono text-zinc-100"
                      />
                      <span className="px-1.5 py-1 bg-zinc-800 border-y border-r border-zinc-700 text-[10px] text-zinc-400 rounded-r">mm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-0.5">Lebar (W)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.5"
                        min="2"
                        max={cardWidthMm}
                        value={selectedElement.width_mm}
                        onChange={(e) => updateElement(selectedElement.id, { width_mm: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-l text-xs font-mono text-zinc-100"
                      />
                      <span className="px-1.5 py-1 bg-zinc-800 border-y border-r border-zinc-700 text-[10px] text-zinc-400 rounded-r">mm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-0.5">Tinggi (H)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.5"
                        min="2"
                        max={cardHeightMm}
                        value={selectedElement.height_mm}
                        onChange={(e) => updateElement(selectedElement.id, { height_mm: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-l text-xs font-mono text-zinc-100"
                      />
                      <span className="px-1.5 py-1 bg-zinc-800 border-y border-r border-zinc-700 text-[10px] text-zinc-400 rounded-r">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Shape (If Student Photo) */}
              {selectedElement.element_type === 'student_photo' && (
                <div className="border-t border-zinc-800 pt-3">
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5">Bentuk Foto</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['rounded', 'rectangle', 'circle'] as CardPhotoShape[]).map((shape) => (
                      <button
                        key={shape}
                        onClick={() => updateElement(selectedElement.id, { photo_shape: shape })}
                        className={`py-1.5 text-xs font-semibold rounded-lg border capitalize transition-colors ${
                          selectedElement.photo_shape === shape || (!selectedElement.photo_shape && shape === 'rounded')
                            ? 'bg-[#1F5C45] text-white border-[#1F5C45]'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {shape === 'rounded' ? 'Melengkung' : shape === 'rectangle' ? 'Persegi' : 'Lingkaran'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typography Styling (If Text Element) */}
              {selectedElement.element_type !== 'student_photo' && selectedElement.element_type !== 'qr_code' && (
                <div className="border-t border-zinc-800 pt-3 space-y-3">
                  <h4 className="text-[11px] font-bold text-zinc-300">Tipografi & Warna</h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Ukuran Font (pt)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="4"
                        max="24"
                        value={selectedElement.font_size_pt || 8}
                        onChange={(e) => updateElement(selectedElement.id, { font_size_pt: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Ketebalan</label>
                      <select
                        value={selectedElement.font_weight || 'normal'}
                        onChange={(e) => updateElement(selectedElement.id, { font_weight: e.target.value as any })}
                        className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                      >
                        <option value="normal">Normal</option>
                        <option value="medium">Medium</option>
                        <option value="semibold">Semibold</option>
                        <option value="bold">Bold</option>
                        <option value="black">Extra Bold</option>
                      </select>
                    </div>
                  </div>

                  {/* Text Align */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Perataan Teks</label>
                    <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                      <button
                        onClick={() => updateElement(selectedElement.id, { text_align: 'left' })}
                        className={`flex-1 py-1 flex items-center justify-center ${selectedElement.text_align === 'left' ? 'bg-[#1F5C45] text-white' : 'bg-zinc-800 text-zinc-300'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateElement(selectedElement.id, { text_align: 'center' })}
                        className={`flex-1 py-1 flex items-center justify-center ${selectedElement.text_align === 'center' ? 'bg-[#1F5C45] text-white' : 'bg-zinc-800 text-zinc-300'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateElement(selectedElement.id, { text_align: 'right' })}
                        className={`flex-1 py-1 flex items-center justify-center ${selectedElement.text_align === 'right' ? 'bg-[#1F5C45] text-white' : 'bg-zinc-800 text-zinc-300'}`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Warna Teks</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.color || '#ffffff'}
                        onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedElement.color || '#ffffff'}
                        onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Alignment & Ordering Tools */}
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <h4 className="text-[11px] font-bold text-zinc-300">Ratakan Elemen</h4>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => handleAlign('left')}
                    className="p-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center gap-1"
                  >
                    Rata Kiri
                  </button>
                  <button
                    onClick={() => handleAlign('center_h')}
                    className="p-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-[#C9A227] font-semibold flex items-center justify-center gap-1"
                  >
                    Tengah H
                  </button>
                  <button
                    onClick={() => handleAlign('right')}
                    className="p-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center gap-1"
                  >
                    Rata Kanan
                  </button>
                  <button
                    onClick={() => handleAlign('top')}
                    className="p-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center gap-1"
                  >
                    Rata Atas
                  </button>
                  <button
                    onClick={() => handleAlign('center_v')}
                    className="p-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-[#C9A227] font-semibold flex items-center justify-center gap-1"
                  >
                    Tengah V
                  </button>
                  <button
                    onClick={() => handleAlign('bottom')}
                    className="p-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center gap-1"
                  >
                    Rata Bawah
                  </button>
                </div>
              </div>

              {/* Layer Ordering & Actions */}
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <h4 className="text-[11px] font-bold text-zinc-300">Urutan Layer</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleLayerOrder('forward')}
                    className="py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    Naik 1 Layer
                  </button>
                  <button
                    onClick={() => handleLayerOrder('backward')}
                    className="py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    Turun 1 Layer
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleDuplicateElement(selectedElement.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplikasi
                  </button>
                  <button
                    onClick={() => handleDeleteElement(selectedElement.id)}
                    className="py-1.5 px-3 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800 text-zinc-500">
              <Move className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-xs font-medium text-zinc-400">Belum ada elemen dipilih</p>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-xs">
                Klik salah satu elemen di kanvas atau pada daftar layer untuk mengatur koordinat milimeter dan styling.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
