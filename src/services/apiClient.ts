/**
 * SIUBA Centralized Standardized API Client (v2.0)
 * Standard HTTP Contract, Machine Error Codes, Correlation ID, and Offline Resilience
 */

import { ServerConnectivityService } from './serverConnectivityService';
import { OfflineStorageService } from './offlineStorageService';

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string | null;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  } | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: {
    fields?: Record<string, string[]>;
    [key: string]: any;
  } | null;
  request_id?: string | null;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiErrorResponse;

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Selisih jam perangkat vs server (ms), diukur dari header X-Server-Time di setiap respons.
 * Dipakai untuk mengoreksi waktu absensi yang dicatat offline (jam HP sering tidak tepat).
 */
const CLOCK_KEY = 'siuba_offline_metadata';
let lastClockSave = 0;
function recordServerClock(header: string | null, sentAt: number, receivedAt: number) {
  const serverMs = Number(header);
  if (!header || !Number.isFinite(serverMs) || serverMs <= 0) return;
  const rtt = receivedAt - sentAt;
  if (rtt > 3000) return; // jaringan lambat: ukuran tidak akurat
  if (receivedAt - lastClockSave < 5 * 60 * 1000) return;
  lastClockSave = receivedAt;
  const offset = Math.round(serverMs - (sentAt + rtt / 2));
  try {
    const meta = JSON.parse(localStorage.getItem(CLOCK_KEY) || '{}');
    localStorage.setItem(CLOCK_KEY, JSON.stringify({
      ...meta,
      clock_offset_ms: offset,
      clock_measured_at: new Date(receivedAt).toISOString(),
      server_time_reference: new Date(serverMs).toISOString(),
    }));
  } catch {
    /* penyimpanan penuh */
  }
}

export class ApiClientError extends Error {
  public status: number;
  public code: string;
  public fieldErrors: Record<string, string[]>;
  public requestId?: string;
  public details?: any;
  public isNetworkError: boolean;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
    details?: any;
    isNetworkError?: boolean;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors || {};
    this.requestId = params.requestId;
    this.details = params.details;
    this.isNetworkError = params.isNetworkError || false;
  }
}

/**
 * True jika error disebabkan server tidak terjangkau (offline / jaringan putus).
 * Hanya kondisi ini yang boleh memakai fallback data lokal (mode offline PWA).
 * Error dari server (403, 409, 422, 500, ...) harus ditampilkan, BUKAN diam-diam disimpan di browser.
 */
export function isOfflineError(err: unknown): boolean {
  if (err instanceof ApiClientError) return err.isNetworkError;
  return err instanceof TypeError; // fetch gagal total (misal DNS / server mati)
}

/** Ubah error server menjadi hasil gagal yang bisa ditampilkan UI absensi. */
export function resultFromApiError(err: unknown): { success: false; code: any; message: string } {
  const e = err as ApiClientError;
  const code = e?.status === 403 ? 'UNAUTHORIZED' : (e?.code && e.code !== 'HTTP_ERROR' ? e.code : 'SERVER_ERROR');
  return { success: false, code, message: e?.message || 'Terjadi kesalahan pada server.' };
}

class ApiClientService {
  private baseUrl: string = '/api/v1';
  private token: string | null = null;

  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem('siuba_auth_token') : null;
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('siuba_auth_token', token);
      } else {
        localStorage.removeItem('siuba_auth_token');
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public getHeaders(customHeaders: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...customHeaders,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiSuccess<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = this.getHeaders((options.headers as Record<string, string>) || {});

    // Check client-side connectivity first
    if (!navigator.onLine || ServerConnectivityService.getState() === 'SERVER_OFFLINE') {
      // Catatan: dulu SEMUA permintaan ubah data (simpan pengaturan, tambah kelas, dll.) saat offline diubah menjadi
      // "absensi tertunda" palsu (santri #0, sesi #1). Kini hanya pencatatan absensi yang diantre (lihat attendanceApi).
      throw new ApiClientError({
        status: 0,
        code: 'NETWORK_OFFLINE',
        message: 'Koneksi ke server terputus. Absensi santri tetap bisa dicatat dan akan dikirim otomatis saat server kembali terhubung; perubahan lain perlu diulang saat online.',
        isNetworkError: true,
      });
    }

    try {
      const sentAt = Date.now();
      const response = await fetch(url, {
        ...options,
        headers,
      });
      recordServerClock(response.headers.get('X-Server-Time'), sentAt, Date.now());

      const responseRequestId = response.headers.get('X-Request-ID') || undefined;

      let json: any = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      // Handle 401 Unauthorized
      if (response.status === 401) {
        const hadToken = Boolean(this.getToken());
        this.setToken(null);
        // Sesi yang sedang berjalan ditolak server (berakhir/dicabut): beri tahu authService agar kembali ke login
        if (hadToken && typeof window !== 'undefined' && !String(url).includes('/auth/login')) {
          window.dispatchEvent(new CustomEvent('siuba:session-expired', {
            detail: { message: json?.error?.message || json?.message || 'Sesi Anda telah berakhir. Silakan login kembali.' },
          }));
        }
        throw new ApiClientError({
          status: 401,
          code: json?.error?.code || 'UNAUTHENTICATED',
          message: json?.error?.message || json?.message || 'Sesi autentikasi telah berakhir. Silakan login kembali.',
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        throw new ApiClientError({
          status: 403,
          code: json?.error?.code || 'FORBIDDEN',
          message: json?.error?.message || json?.message || 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
          details: json?.error?.details,
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      // Handle 404 Not Found
      if (response.status === 404) {
        throw new ApiClientError({
          status: 404,
          code: json?.error?.code || 'RESOURCE_NOT_FOUND',
          message: json?.error?.message || json?.message || 'Resource atau data yang diminta tidak ditemukan.',
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      // Handle 409 Conflict (e.g. Duplicate Attendance, Session Closed)
      if (response.status === 409) {
        throw new ApiClientError({
          status: 409,
          code: json?.error?.code || 'CONFLICT',
          message: json?.error?.message || json?.message || 'Terjadi konflik data pada server.',
          details: json?.error?.details,
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      // Handle 422 Unprocessable Entity (Validation Errors)
      if (response.status === 422) {
        const fieldErrors = json?.error?.details?.fields || json?.errors || {};
        throw new ApiClientError({
          status: 422,
          code: json?.error?.code || 'VALIDATION_ERROR',
          message: json?.error?.message || json?.message || 'Data yang dikirim tidak valid.',
          fieldErrors,
          details: json?.error?.details,
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      // Handle 429 Rate Limiting
      if (response.status === 429) {
        throw new ApiClientError({
          status: 429,
          code: json?.error?.code || 'RATE_LIMITED',
          message: json?.error?.message || json?.message || 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat.',
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      // Handle 500+ Server Errors
      if (response.status >= 500) {
        throw new ApiClientError({
          status: response.status,
          code: json?.error?.code || 'INTERNAL_ERROR',
          message: json?.error?.message || 'Terjadi kesalahan pada server pesantren. Silakan hubungi administrator dengan menyertakan Request ID.',
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      if (!response.ok) {
        throw new ApiClientError({
          status: response.status,
          code: json?.error?.code || 'HTTP_ERROR',
          message: json?.error?.message || json?.message || `Permintaan gagal dengan status ${response.status}.`,
          requestId: responseRequestId || json?.error?.request_id,
        });
      }

      // Normalize standard response format
      if (json && typeof json === 'object') {
        if ('success' in json && json.success === true) {
          return json as ApiSuccess<T>;
        }
        // If server returned plain object without wrapper, wrap it
        return {
          success: true,
          data: json.data !== undefined ? json.data : (json as T),
          message: json.message || null,
          meta: json.meta || null,
        };
      }

      return {
        success: true,
        data: json as T,
        message: null,
        meta: null,
      };
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      throw new ApiClientError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Gagal terhubung ke Server LAN Pesantren. Periksa koneksi WiFi / kabel jaringan.',
        isNetworkError: true,
      });
    }
  }

  // Convenience methods
  public async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiSuccess<T>> {
    let url = endpoint;
    if (params && Object.keys(params).length > 0) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          query.append(key, String(val));
        }
      });
      url += (url.includes('?') ? '&' : '?') + query.toString();
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public async post<T = any>(endpoint: string, body?: any): Promise<ApiSuccess<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T = any>(endpoint: string, body?: any): Promise<ApiSuccess<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T = any>(endpoint: string, body?: any): Promise<ApiSuccess<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T = any>(endpoint: string): Promise<ApiSuccess<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClientService();
