import React from 'react';
import { 
  Student, 
  StudentCardTemplate, 
  StudentCardTemplateElement, 
  CardSide 
} from '../../../types';
import { CR80_SPECS } from '../../../services/studentCardTemplateService';
import { User, QrCode as QrIcon, Move } from 'lucide-react';

export interface StudentCardRendererProps {
  template: StudentCardTemplate;
  side: CardSide;
  student?: Student | null;
  qrDataUrl?: string | null;
  scale?: number; // CSS scale factor or 1.0
  isDesignerMode?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (elementId: string) => void;
  showGuides?: boolean; // Bleed & Safe Margin
  showGrid?: boolean;
  gridSizeMm?: number;
  className?: string;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  onElementPointerDown?: (e: React.PointerEvent, element: StudentCardTemplateElement) => void;
  onResizeHandlePointerDown?: (
    e: React.PointerEvent,
    element: StudentCardTemplateElement,
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => void;
  snapGuideX?: number | null;
  snapGuideY?: number | null;
  isDragOver?: boolean;
}

export const StudentCardRenderer: React.FC<StudentCardRendererProps> = ({
  template,
  side,
  student,
  qrDataUrl,
  scale = 1.0,
  isDesignerMode = false,
  selectedElementId = null,
  onSelectElement,
  showGuides = false,
  showGrid = false,
  gridSizeMm = 5,
  className = '',
  cardRef,
  onElementPointerDown,
  onResizeHandlePointerDown,
  snapGuideX = null,
  snapGuideY = null,
  isDragOver = false,
}) => {
  const isLandscape = template.orientation === 'landscape';
  const cardWidthMm = isLandscape ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM;
  const cardHeightMm = isLandscape ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM;
  const aspectRatio = isLandscape ? `${CR80_SPECS.LANDSCAPE.WIDTH_MM} / ${CR80_SPECS.LANDSCAPE.HEIGHT_MM}` : `${CR80_SPECS.PORTRAIT.WIDTH_MM} / ${CR80_SPECS.PORTRAIT.HEIGHT_MM}`;

  const bgImage = side === 'front' ? template.front_image_path : template.back_image_path;
  const elements = template.elements.filter((el) => el.element_side === side && el.is_visible);

  // Fallback demo student if none provided
  const targetStudent: Student = student || {
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

  // Convert mm to percentage of card
  const mmToPercentX = (mm: number) => `${(mm / cardWidthMm) * 100}%`;
  const mmToPercentY = (mm: number) => `${(mm / cardHeightMm) * 100}%`;

  return (
    <div
      ref={cardRef}
      id={`student-card-${template.id}-${side}`}
      className={`relative overflow-hidden select-none rounded-[3.5mm] shadow-xl transition-all duration-150 ${
        isDragOver ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-black/50 scale-[1.02]' : ''
      } ${className}`}
      style={{
        aspectRatio,
        width: '100%',
        maxWidth: isLandscape ? '440px' : '300px',
        backgroundColor: template.category === 'asrama' ? '#0f172a' : template.category === 'santriwati' ? '#042f2e' : '#064e3b',
        boxSizing: 'border-box',
        touchAction: isDesignerMode ? 'none' : 'auto',
      }}
    >
      {/* Background Image Layer */}
      {bgImage ? (
        <img
          src={bgImage}
          alt={`Background ${side}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: template.bg_fit || 'cover',
            objectPosition: 'center'
          }}
        />
      ) : (
        /* Default Pesantren Texture Pattern */
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-950 to-zinc-950 opacity-95 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-lime-500/15 rounded-full blur-2xl pointer-events-none" />
        </div>
      )}

      {/* Grid Overlay (Designer Mode) */}
      {isDesignerMode && showGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-30 opacity-25"
          style={{
            backgroundImage: `linear-gradient(to right, #C9A227 1px, transparent 1px), linear-gradient(to bottom, #C9A227 1px, transparent 1px)`,
            backgroundSize: `${(gridSizeMm / cardWidthMm) * 100}% ${(gridSizeMm / cardHeightMm) * 100}%`
          }}
        />
      )}

      {/* Safe Area & Bleed Guidelines (Designer Mode) */}
      {isDesignerMode && showGuides && (
        <div
          className="absolute border border-dashed border-emerald-400/80 pointer-events-none z-35"
          style={{
            top: mmToPercentY(CR80_SPECS.SAFE_MARGIN_MM),
            left: mmToPercentX(CR80_SPECS.SAFE_MARGIN_MM),
            right: mmToPercentX(CR80_SPECS.SAFE_MARGIN_MM),
            bottom: mmToPercentY(CR80_SPECS.SAFE_MARGIN_MM),
            borderRadius: '2mm'
          }}
        >
          <span className="absolute top-1 left-1 text-[8px] font-mono text-emerald-300 bg-black/60 px-1 rounded">
            Safe Area (2.5mm)
          </span>
        </div>
      )}

      {/* Dynamic Magnetic Snap Guide Lines */}
      {isDesignerMode && snapGuideX !== null && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-40 border-l-2 border-dashed border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          style={{ left: mmToPercentX(snapGuideX) }}
        >
          <span className="absolute top-1 -left-4 bg-amber-400 text-slate-950 font-mono text-[8px] font-black px-1 rounded shadow-xs">
            {snapGuideX.toFixed(1)}mm
          </span>
        </div>
      )}
      {isDesignerMode && snapGuideY !== null && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-40 border-t-2 border-dashed border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          style={{ top: mmToPercentY(snapGuideY) }}
        >
          <span className="absolute -top-3 left-1 bg-amber-400 text-slate-950 font-mono text-[8px] font-black px-1 rounded shadow-xs">
            {snapGuideY.toFixed(1)}mm
          </span>
        </div>
      )}

      {/* Dynamic Card Elements */}
      {elements.map((el) => {
        const isSelected = isDesignerMode && selectedElementId === el.id;

        return (
          <div
            key={el.id}
            id={`card-element-${el.id}`}
            onClick={(e) => {
              if (isDesignerMode) {
                e.stopPropagation();
                onSelectElement?.(el.id);
              }
            }}
            onPointerDown={(e) => {
              if (isDesignerMode && onElementPointerDown) {
                onElementPointerDown(e, el);
              }
            }}
            style={{
              position: 'absolute',
              left: mmToPercentX(el.x_mm),
              top: mmToPercentY(el.y_mm),
              width: mmToPercentX(el.width_mm),
              height: mmToPercentY(el.height_mm),
              zIndex: isSelected ? 45 : el.z_index || 10,
              cursor: isDesignerMode ? 'grab' : 'default',
              backgroundColor: el.background_color || 'transparent',
              borderRadius: el.border_radius_mm ? `${(el.border_radius_mm / cardWidthMm) * 100}%` : undefined,
              touchAction: 'none',
            }}
            className={`flex items-center group transition-shadow ${
              isSelected
                ? 'ring-2 ring-[#C9A227] ring-offset-1 ring-offset-black/50 shadow-lg shadow-amber-500/20 active:cursor-grabbing'
                : isDesignerMode
                ? 'hover:ring-1 hover:ring-white/60'
                : ''
            }`}
          >
            {/* Render Element Payload */}
            <div className="w-full h-full relative flex items-center overflow-hidden pointer-events-none">
              {renderElementContent(el, targetStudent, qrDataUrl, isDesignerMode)}
            </div>

            {/* Designer Selection Controls & Drag Tag */}
            {isSelected && isDesignerMode && (
              <>
                {/* Floating Tag */}
                <div className="absolute -top-6 left-0 bg-[#1F5C45] text-white text-[8.5px] font-black uppercase px-2 py-0.5 rounded shadow-md flex items-center gap-1.5 pointer-events-none z-50 whitespace-nowrap border border-[#C9A227]">
                  <Move className="w-2.5 h-2.5 text-[#C9A227]" />
                  <span>{el.label}</span>
                  <span className="text-amber-300 font-mono">
                    ({el.x_mm}mm, {el.y_mm}mm • {el.width_mm}×{el.height_mm}mm)
                  </span>
                </div>

                {/* 4 Interactive Corner Resize Handles */}
                {onResizeHandlePointerDown && (
                  <>
                    {/* Top-Left */}
                    <div
                      onPointerDown={(e) => onResizeHandlePointerDown(e, el, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#1F5C45] rounded-xs shadow-md cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                      title="Resize Sudut Kiri Atas"
                    />
                    {/* Top-Right */}
                    <div
                      onPointerDown={(e) => onResizeHandlePointerDown(e, el, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#1F5C45] rounded-xs shadow-md cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                      title="Resize Sudut Kanan Atas"
                    />
                    {/* Bottom-Right */}
                    <div
                      onPointerDown={(e) => onResizeHandlePointerDown(e, el, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#1F5C45] rounded-xs shadow-md cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                      title="Resize Sudut Kanan Bawah"
                    />
                    {/* Bottom-Left */}
                    <div
                      onPointerDown={(e) => onResizeHandlePointerDown(e, el, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#1F5C45] rounded-xs shadow-md cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                      title="Resize Sudut Kiri Bawah"
                    />
                    {/* Edge Handles */}
                    <div
                      onPointerDown={(e) => onResizeHandlePointerDown(e, el, 'e')}
                      className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2.5 h-3.5 bg-amber-300 border border-[#1F5C45] rounded-xs shadow-xs cursor-ew-resize z-50 hover:scale-125 transition-transform"
                      title="Ubah Lebar (Kanan)"
                    />
                    <div
                      onPointerDown={(e) => onResizeHandlePointerDown(e, el, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-2.5 bg-amber-300 border border-[#1F5C45] rounded-xs shadow-xs cursor-ns-resize z-50 hover:scale-125 transition-transform"
                      title="Ubah Tinggi (Bawah)"
                    />
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Helper: Render each type of element
function renderElementContent(
  el: StudentCardTemplateElement,
  student: Student,
  qrDataUrl?: string | null,
  isDesignerMode?: boolean
) {
  switch (el.element_type) {
    case 'student_photo': {
      const photoSrc = student.photo_path;
      const isCircle = el.photo_shape === 'circle';
      const isRounded = el.photo_shape === 'rounded' || !el.photo_shape;

      return (
        <div
          className={`w-full h-full overflow-hidden bg-zinc-800 border border-white/60 shadow-sm flex items-center justify-center ${
            isCircle ? 'rounded-full' : isRounded ? 'rounded-[2mm]' : 'rounded-none'
          }`}
        >
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={student.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-400">
              <User className="w-1/2 h-1/2" />
            </div>
          )}
        </div>
      );
    }

    case 'qr_code': {
      return (
        <div className="w-full h-full p-[1.5%] bg-white rounded-[1.5mm] shadow-sm flex items-center justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 text-zinc-700">
              <QrIcon className="w-4/5 h-4/5 text-zinc-900" />
            </div>
          )}
        </div>
      );
    }

    case 'barcode': {
      return (
        <div className="w-full h-full bg-white px-1 py-0.5 rounded flex flex-col items-center justify-center">
          <div className="w-full h-2/3 flex items-center justify-center gap-[1px]">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="bg-black h-full"
                style={{ width: i % 3 === 0 ? '2px' : '1px' }}
              />
            ))}
          </div>
          <span className="text-[7px] font-mono text-black leading-none mt-0.5">
            {student.student_number || 'UBA260001'}
          </span>
        </div>
      );
    }

    case 'student_name':
    case 'school_name':
    case 'student_number':
    case 'nisn':
    case 'classroom':
    case 'dormitory':
    case 'room':
    case 'valid_thru':
    case 'static_text': {
      let displayText = '';
      if (el.element_type === 'student_name') displayText = student.name || 'Nama Lengkap Santri';
      else if (el.element_type === 'school_name') displayText = el.static_text_value || 'PESANTREN UTSMAN BIN AFFAN';
      else if (el.element_type === 'student_number') displayText = `NIS: ${student.student_number || 'UBA260001'}`;
      else if (el.element_type === 'nisn') displayText = `NISN: ${student.nisn || '-'}`;
      else if (el.element_type === 'classroom') displayText = student.classroom_name ? `Kelas: ${student.classroom_name}` : 'Kelas 7-A MTs';
      else if (el.element_type === 'dormitory') displayText = student.dormitory_room_name ? `Asrama: ${student.dormitory_room_name}` : 'Asrama Abu Bakar';
      else if (el.element_type === 'room') displayText = student.dormitory_room_name ? `Kamar: ${student.dormitory_room_name}` : 'Kamar 101';
      else if (el.element_type === 'valid_thru') displayText = `Berlaku s.d: ${student.generation_year ? student.generation_year + 3 : '2029'}`;
      else if (el.element_type === 'static_text') displayText = el.static_text_value || el.label || '';

      const textAlignClass = 
        el.text_align === 'center' ? 'text-center' : el.text_align === 'right' ? 'text-right' : 'text-left';

      const fontWeightClass = 
        el.font_weight === 'bold' ? 'font-bold' : el.font_weight === 'semibold' ? 'font-semibold' : el.font_weight === 'medium' ? 'font-medium' : 'font-normal';

      // Base scaling style for text
      const fontSizePt = el.font_size_pt || 7;

      return (
        <div
          className={`w-full leading-tight select-none ${textAlignClass} ${fontWeightClass}`}
          style={{
            color: el.color || '#ffffff',
            fontSize: `calc(${fontSizePt}pt * 0.95)`,
            whiteSpace: el.element_type === 'static_text' ? 'pre-line' : 'normal',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: el.max_lines || (el.element_type === 'student_name' ? 2 : 1),
            WebkitBoxOrient: 'vertical'
          }}
        >
          {displayText}
        </div>
      );
    }

    default:
      return null;
  }
}
