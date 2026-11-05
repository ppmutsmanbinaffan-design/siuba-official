import React from 'react';
import { Users, Calendar, ArrowRight, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import { AcademicSubstitution, TrainerSubstitution } from '../../../types';
import { formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface TeacherSubstitutionCardProps {
  substitution: AcademicSubstitution;
  originalTeacherName?: string;
  substituteTeacherName?: string;
  subjectName?: string;
  classroomName?: string;
}

export const TeacherSubstitutionCard: React.FC<TeacherSubstitutionCardProps> = ({
  substitution,
  originalTeacherName,
  substituteTeacherName,
  subjectName,
  classroomName,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#1F5C45] dark:text-[#2F7D5A] font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{subjectName || `Jadwal #${substitution.academic_schedule_id}`} — {classroomName || 'Kelas'}</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">{formatDateIndonesian(substitution.date)}</p>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          Guru Pengganti
        </span>
      </div>

      {/* Flow: Original -> Substitute */}
      <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Guru Utama:</span>
          <span className="font-semibold text-zinc-300">{originalTeacherName || `Staf #${substitution.original_teacher_id}`}</span>
        </div>

        <div className="flex items-center justify-center my-1">
          <ArrowRight className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-cyan-400 font-bold">Guru Pengganti:</span>
          <span className="font-bold text-cyan-300">{substituteTeacherName || `Staf #${substitution.substitute_teacher_id}`}</span>
        </div>
      </div>

      <div className="text-xs text-zinc-400">
        <span className="text-zinc-500">Alasan: </span>
        <span>{substitution.reason}</span>
      </div>

      <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/40">
        Ditugaskan oleh: <span className="text-zinc-400 font-medium">{substitution.assigned_by}</span>
      </div>
    </div>
  );
};

interface TrainerSubstitutionCardProps {
  substitution: TrainerSubstitution;
}

export const TrainerSubstitutionCard: React.FC<TrainerSubstitutionCardProps> = ({
  substitution,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>{substitution.extracurricular_name}</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">{formatDateIndonesian(substitution.date)}</p>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          Pelatih Pengganti
        </span>
      </div>

      {/* Flow: Original -> Substitute */}
      <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Pelatih Asli:</span>
          <span className="font-semibold text-zinc-300">{substitution.original_staff_name}</span>
        </div>

        <div className="flex items-center justify-center my-1">
          <ArrowRight className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-cyan-400 font-bold">Pelatih Pengganti:</span>
          <span className="font-bold text-cyan-300">{substitution.substitute_staff_name}</span>
        </div>
      </div>

      <div className="text-xs text-zinc-400">
        <span className="text-zinc-500">Alasan: </span>
        <span>{substitution.reason}</span>
      </div>

      <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/40">
        Ditugaskan oleh: <span className="text-zinc-400 font-medium">{substitution.assigned_by}</span>
      </div>
    </div>
  );
};
