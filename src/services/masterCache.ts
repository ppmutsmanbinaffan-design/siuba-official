/**
 * Pembaca data master dari cache server (localStorage) untuk halaman yang tidak menerima data lewat props.
 * Diisi oleh serverHydrationService setelah login dan setiap sinkronisasi; aman dipakai saat offline.
 */
import type { Activity, ActivityCategory, Classroom } from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function getCachedClassrooms(): Classroom[] {
  return readList<Classroom>('siuba_master_classrooms');
}

export function getCachedActivities(): Activity[] {
  return readList<Activity>('siuba_master_activities');
}

/** Kategori kegiatan dari server; jika belum pernah sinkron, kategori bawaan (sama dengan seeder server). */
export function getCachedCategories(): ActivityCategory[] {
  const list = readList<ActivityCategory>('siuba_activity_categories');
  return list.length ? list : INITIAL_CATEGORIES;
}
