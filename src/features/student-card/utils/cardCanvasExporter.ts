import { Student, StudentCardTemplate, CardSide } from '../../../types';
import { CR80_SPECS } from '../../../services/studentCardTemplateService';

interface ExportCardParams {
  template: StudentCardTemplate;
  student: Student;
  side: CardSide;
  qrDataUrl?: string;
  dpi?: number;
}

/**
 * High-Resolution (300 DPI) Canvas Exporter for Student ID Cards
 */
export async function exportStudentCardToCanvas({
  template,
  student,
  side,
  qrDataUrl,
  dpi = 300
}: ExportCardParams): Promise<HTMLCanvasElement> {
  const isLandscape = template.orientation === 'landscape';
  const widthMm = isLandscape ? CR80_SPECS.LANDSCAPE.WIDTH_MM : CR80_SPECS.PORTRAIT.WIDTH_MM;
  const heightMm = isLandscape ? CR80_SPECS.LANDSCAPE.HEIGHT_MM : CR80_SPECS.PORTRAIT.HEIGHT_MM;

  // Exact 300 DPI Pixel Dimensions: Landscape: 1010 x 638 px; Portrait: 638 x 1010 px
  const widthPx = Math.round((widthMm / CR80_SPECS.MM_TO_INCH) * dpi);
  const heightPx = Math.round((heightMm / CR80_SPECS.MM_TO_INCH) * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  // Scale factor: mm -> pixels
  const mmToPx = (mm: number) => (mm / CR80_SPECS.MM_TO_INCH) * dpi;
  const ptToPx = (pt: number) => (pt / CR80_SPECS.PT_PER_INCH) * dpi;

  // 1. Draw Default Background (Pesantren Theme Default)
  const isDark = template.category !== 'custom' || !template.front_image_path;
  ctx.fillStyle = template.category === 'asrama' ? '#0f172a' : template.category === 'santriwati' ? '#042f2e' : '#064e3b';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // 2. Draw Custom Background Image if present
  const bgImgSrc = side === 'front' ? template.front_image_path : template.back_image_path;
  if (bgImgSrc) {
    try {
      const bgImg = await loadImage(bgImgSrc);
      const bgFit = template.bg_fit || 'cover';
      if (bgFit === 'cover') {
        const hRatio = widthPx / bgImg.width;
        const vRatio = heightPx / bgImg.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (widthPx - bgImg.width * ratio) / 2;
        const centerShiftY = (heightPx - bgImg.height * ratio) / 2;
        ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, centerShiftX, centerShiftY, bgImg.width * ratio, bgImg.height * ratio);
      } else {
        ctx.drawImage(bgImg, 0, 0, widthPx, heightPx);
      }
    } catch (e) {
      console.warn('Could not render background image onto canvas', e);
    }
  }

  // 3. Render Elements for the given side
  const elements = template.elements
    .filter((el) => el.element_side === side && el.is_visible)
    .sort((a, b) => a.z_index - b.z_index);

  for (const el of elements) {
    const x = mmToPx(el.x_mm);
    const y = mmToPx(el.y_mm);
    const w = mmToPx(el.width_mm);
    const h = mmToPx(el.height_mm);

    ctx.save();

    // Background color if defined
    if (el.background_color) {
      ctx.fillStyle = el.background_color;
      const radius = el.border_radius_mm ? mmToPx(el.border_radius_mm) : 0;
      if (radius > 0) {
        drawRoundedRect(ctx, x, y, w, h, radius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, w, h);
      }
    }

    switch (el.element_type) {
      case 'student_photo': {
        const photoUrl = student.photo_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face';
        try {
          const photoImg = await loadImage(photoUrl);
          ctx.save();
          if (el.photo_shape === 'circle') {
            const radius = Math.min(w, h) / 2;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
          } else if (el.photo_shape === 'rounded') {
            drawRoundedRect(ctx, x, y, w, h, mmToPx(2.5));
            ctx.clip();
          } else {
            drawRoundedRect(ctx, x, y, w, h, mmToPx(1));
            ctx.clip();
          }
          ctx.drawImage(photoImg, x, y, w, h);
          ctx.restore();

          // Border outline around photo
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = mmToPx(0.5);
          if (el.photo_shape === 'circle') {
            const radius = Math.min(w, h) / 2;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, radius, 0, Math.PI * 2);
            ctx.stroke();
          } else if (el.photo_shape === 'rounded') {
            drawRoundedRect(ctx, x, y, w, h, mmToPx(2.5));
            ctx.stroke();
          } else {
            drawRoundedRect(ctx, x, y, w, h, mmToPx(1));
            ctx.stroke();
          }
          ctx.restore();
        } catch {
          // Photo placeholder
          ctx.fillStyle = '#374151';
          drawRoundedRect(ctx, x, y, w, h, mmToPx(2));
          ctx.fill();
        }
        break;
      }

      case 'qr_code': {
        if (qrDataUrl) {
          try {
            const qrImg = await loadImage(qrDataUrl);
            // White quiet zone card background for QR scannability
            ctx.fillStyle = '#ffffff';
            drawRoundedRect(ctx, x - mmToPx(0.8), y - mmToPx(0.8), w + mmToPx(1.6), h + mmToPx(1.6), mmToPx(1.2));
            ctx.fill();
            ctx.drawImage(qrImg, x, y, w, h);
          } catch (err) {
            console.error('Failed to draw QR image onto canvas', err);
          }
        }
        break;
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
        let text = '';
        if (el.element_type === 'student_name') text = student.name || 'Nama Santri';
        else if (el.element_type === 'school_name') text = el.static_text_value || 'PESANTREN UTSMAN BIN AFFAN';
        else if (el.element_type === 'student_number') text = `NIS: ${student.student_number || 'UBA260001'}`;
        else if (el.element_type === 'nisn') text = `NISN: ${student.nisn || '-'}`;
        else if (el.element_type === 'classroom') text = `Kelas: ${student.classroom_name || 'Kelas 7-A'}`;
        else if (el.element_type === 'dormitory') text = `Asrama: ${student.dormitory_room_name || 'Asrama Abu Bakar'}`;
        else if (el.element_type === 'room') text = `Kamar: ${student.dormitory_room_name || 'Kamar 101'}`;
        else if (el.element_type === 'valid_thru') text = `Berlaku s.d: ${student.generation_year ? student.generation_year + 3 : '2029'}`;
        else if (el.element_type === 'static_text') text = el.static_text_value || el.label || '';

        const fontSizePx = el.font_size_pt ? ptToPx(el.font_size_pt) : ptToPx(8);
        const weight = el.font_weight || 'normal';
        ctx.font = `${weight} ${fontSizePx}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = el.color || '#ffffff';
        ctx.textBaseline = 'top';

        let drawX = x;
        if (el.text_align === 'center') {
          ctx.textAlign = 'center';
          drawX = x + w / 2;
        } else if (el.text_align === 'right') {
          ctx.textAlign = 'right';
          drawX = x + w;
        } else {
          ctx.textAlign = 'left';
        }

        // Support multiline text for rules / long strings
        const lines = text.split('\n');
        const lineHeight = fontSizePx * 1.35;
        lines.forEach((line, idx) => {
          ctx.fillText(line, drawX, y + idx * lineHeight, w);
        });
        break;
      }
    }

    ctx.restore();
  }

  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Helper to download canvas directly as high-res PNG
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
