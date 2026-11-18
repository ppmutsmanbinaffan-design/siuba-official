import { useEffect, useState } from 'react';
import { apiClient } from './apiClient';

/**
 * Identitas lembaga (nama, yayasan, alamat, dst.) dari server — dipakai halaman login, menu, kop laporan,
 * dan kartu. Disimpan juga di browser agar tetap tampil saat offline.
 */
export interface InstitutionProfile {
  foundation_name: string;
  name: string;
  short_name: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  leader_name: string;
  leader_title: string;
}

const CACHE_KEY = 'siuba_institution_cache';
const EVENT = 'siuba:institution-updated';

export const DEFAULT_INSTITUTION: InstitutionProfile = {
  foundation_name: 'Yayasan Pendidikan Islam Utsman Bin Affan',
  name: 'Pondok Pesantren Utsman Bin Affan',
  short_name: 'Utsman Bin Affan',
  slogan: 'Sistem Informasi Manajemen Presensi & Disiplin Santri',
  address: '',
  phone: '',
  email: '',
  website: '',
  city: '',
  leader_name: '',
  leader_title: 'Pimpinan Pondok',
};

export function getInstitution(): InstitutionProfile {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_INSTITUTION, ...JSON.parse(raw) };
  } catch {
    /* abaikan cache rusak */
  }
  return DEFAULT_INSTITUTION;
}

export function setInstitutionCache(profile: Partial<InstitutionProfile>): void {
  const merged = { ...getInstitution(), ...profile };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
  } catch {
    /* penyimpanan penuh */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

let loading: Promise<void> | null = null;
export function loadInstitution(force = false): Promise<void> {
  if (loading && !force) return loading;
  loading = (async () => {
    try {
      const res: any = await apiClient.get('/cms/institution');
      if (res?.data) setInstitutionCache(res.data);
    } catch {
      /* offline: pakai cache */
    }
  })();
  return loading;
}

/** Baris kontak untuk kop surat: "Alamat • Telp • Email" (bagian kosong dilewati). */
export function institutionContactLine(i: InstitutionProfile = getInstitution()): string {
  return [i.address, i.phone && `Telp. ${i.phone}`, i.email, i.website].filter(Boolean).join(' • ');
}

export function useInstitution(): InstitutionProfile {
  const [profile, setProfile] = useState<InstitutionProfile>(getInstitution);
  useEffect(() => {
    const onUpdate = () => setProfile(getInstitution());
    window.addEventListener(EVENT, onUpdate);
    void loadInstitution();
    return () => window.removeEventListener(EVENT, onUpdate);
  }, []);
  return profile;
}
