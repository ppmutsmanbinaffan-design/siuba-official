import { 
  Student, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  StudentCardTemplate, 
  StudentCardTemplateElement, 
  CardOrientation, 
  CardSide, 
  StudentCardElementType, 
  CardPhotoShape 
} from '../../types';

export type StudentCardSubTab = 'templates' | 'designer' | 'generate' | 'print';

export interface CardDesignerHistoryState {
  elements: StudentCardTemplateElement[];
  frontImage?: string | null;
  backImage?: string | null;
}

export interface CardExportOptions {
  dpi: number; // 300 default
  scale: number;
  format: 'png' | 'jpeg';
  includeBleed?: boolean;
}

export interface CardFilterOptions {
  classroomId?: number | 'all';
  dormitoryId?: number | 'all';
  dormitoryRoomId?: number | 'all';
  generationYear?: number | 'all';
  searchQuery?: string;
  status?: 'active' | 'all';
}

export interface PrintSheetOptions {
  sheetSize: 'A4' | 'CR80_SINGLE';
  orientation: CardOrientation;
  cardsPerPage: number;
  showCutMarks: boolean;
  showCardOutline: boolean;
  twoSided: boolean;
}
