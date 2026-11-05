import { 
  CachedPreparedSession, 
  CachedParticipant, 
  PendingAttendanceItem, 
  ClientInstallation,
  AttendanceStatus,
  AttendanceMethod
} from '../types';

const DB_NAME = 'siuba_offline_db';
const DB_VERSION = 1;

export class IndexedDbStorageService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Open and initialize IndexedDB database schema with all required stores and indexes
   */
  public static async getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. app_metadata
        if (!db.objectStoreNames.contains('app_metadata')) {
          db.createObjectStore('app_metadata', { keyPath: 'key' });
        }

        // 2. cached_sessions
        if (!db.objectStoreNames.contains('cached_sessions')) {
          const sessionStore = db.createObjectStore('cached_sessions', { keyPath: 'session_id' });
          sessionStore.createIndex('activity_id', 'activity_id', { unique: false });
          sessionStore.createIndex('start_at', 'start_at', { unique: false });
        }

        // 3. cached_participants
        if (!db.objectStoreNames.contains('cached_participants')) {
          const partStore = db.createObjectStore('cached_participants', { keyPath: 'composite_id' });
          partStore.createIndex('session_id', 'session_id', { unique: false });
          partStore.createIndex('student_id', 'student_id', { unique: false });
          partStore.createIndex('qr_token', 'qr_token', { unique: false });
          partStore.createIndex('rfid_uid', 'rfid_uid', { unique: false });
          partStore.createIndex('session_student', ['session_id', 'student_id'], { unique: true });
        }

        // 4. pending_attendance
        if (!db.objectStoreNames.contains('pending_attendance')) {
          const pendingStore = db.createObjectStore('pending_attendance', { keyPath: 'local_id' });
          pendingStore.createIndex('client_request_id', 'client_request_id', { unique: true });
          pendingStore.createIndex('session_id', 'session_id', { unique: false });
          pendingStore.createIndex('student_id', 'student_id', { unique: false });
          pendingStore.createIndex('sync_status', 'sync_status', { unique: false });
          pendingStore.createIndex('captured_at_client', 'captured_at_client', { unique: false });
          pendingStore.createIndex('session_student', ['session_id', 'student_id'], { unique: false });
        }

        // 5. sync_history
        if (!db.objectStoreNames.contains('sync_history')) {
          const histStore = db.createObjectStore('sync_history', { keyPath: 'id', autoIncrement: true });
          histStore.createIndex('synced_at', 'synced_at', { unique: false });
        }

        // 6. device_state
        if (!db.objectStoreNames.contains('device_state')) {
          db.createObjectStore('device_state', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        this.dbPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save session and its participant snapshot into IndexedDB
   */
  public static async savePreparedSession(
    session: CachedPreparedSession,
    participants: CachedParticipant[]
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['cached_sessions', 'cached_participants'], 'readwrite');
    const sessionStore = tx.objectStore('cached_sessions');
    const partStore = tx.objectStore('cached_participants');

    sessionStore.put(session);

    for (const p of participants) {
      const compositeId = `${p.session_id}_${p.student_id}`;
      partStore.put({
        ...p,
        composite_id: compositeId
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all cached sessions from IndexedDB
   */
  public static async getPreparedSessions(): Promise<CachedPreparedSession[]> {
    const db = await this.getDb();
    const tx = db.transaction('cached_sessions', 'readonly');
    const store = tx.objectStore('cached_sessions');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached participants for a session
   */
  public static async getParticipantsForSession(sessionId: number): Promise<CachedParticipant[]> {
    const db = await this.getDb();
    const tx = db.transaction('cached_participants', 'readonly');
    const store = tx.objectStore('cached_participants');
    const index = store.index('session_id');
    const request = index.getAll(IDBKeyRange.only(sessionId));

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Find participant in prepared session by QR Token
   */
  public static async findParticipantByQr(sessionId: number, qrToken: string): Promise<CachedParticipant | undefined> {
    const cleanToken = qrToken.trim();
    const participants = await this.getParticipantsForSession(sessionId);
    return participants.find(p => 
      p.qr_token === cleanToken || 
      p.student_number === cleanToken || 
      cleanToken.includes(p.student_number)
    );
  }

  /**
   * Add a pending offline capture item to IndexedDB queue
   */
  public static async addPendingAttendance(item: PendingAttendanceItem): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('pending_attendance', 'readwrite');
    const store = tx.objectStore('pending_attendance');

    store.put(item);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Check if student is already in local pending queue for this session
   */
  public static async isDuplicatePending(sessionId: number, studentId: number): Promise<boolean> {
    const allPending = await this.getAllPendingAttendance();
    return allPending.some(item => 
      item.session_id === sessionId && 
      item.student_id === studentId && 
      (item.sync_status === 'pending' || item.sync_status === 'syncing' || item.sync_status === 'synced')
    );
  }

  /**
   * Get all pending attendance items
   */
  public static async getAllPendingAttendance(): Promise<PendingAttendanceItem[]> {
    const db = await this.getDb();
    const tx = db.transaction('pending_attendance', 'readonly');
    const store = tx.objectStore('pending_attendance');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update pending attendance item
   */
  public static async updatePendingAttendance(localId: string, updates: Partial<PendingAttendanceItem>): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('pending_attendance', 'readwrite');
    const store = tx.objectStore('pending_attendance');
    const getReq = store.get(localId);

    return new Promise((resolve, reject) => {
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          const updated = { ...existing, ...updates, updated_at_local: new Date().toISOString() };
          store.put(updated);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Delete synced items from IndexedDB queue
   */
  public static async clearSyncedRecords(): Promise<number> {
    const items = await this.getAllPendingAttendance();
    const syncedItems = items.filter(i => i.sync_status === 'synced');

    if (syncedItems.length === 0) return 0;

    const db = await this.getDb();
    const tx = db.transaction('pending_attendance', 'readwrite');
    const store = tx.objectStore('pending_attendance');

    for (const item of syncedItems) {
      store.delete(item.local_id);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(syncedItems.length);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * App Metadata Key-Value store
   */
  public static async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('app_metadata', 'readwrite');
    const store = tx.objectStore('app_metadata');
    store.put({ key, value, updated_at: new Date().toISOString() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public static async getMetadata<T = any>(key: string): Promise<T | null> {
    const db = await this.getDb();
    const tx = db.transaction('app_metadata', 'readonly');
    const store = tx.objectStore('app_metadata');
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  }
}
