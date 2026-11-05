import { ServerConnectivityState } from '../types';
import { OfflineStorageService } from './offlineStorageService';

type ConnectivityListener = (state: ServerConnectivityState, isSimulatedOffline: boolean) => void;

export class ServerConnectivityService {
  private static currentState: ServerConnectivityState = 'SERVER_ONLINE';
  private static simulatedOffline: boolean = false;
  private static listeners: Set<ConnectivityListener> = new Set();
  private static pingInterval: any = null;
  private static lastSuccessfulPing: string = new Date().toISOString();

  public static getState(): ServerConnectivityState {
    if (this.simulatedOffline) {
      return 'SERVER_OFFLINE';
    }
    return this.currentState;
  }

  public static isSimulated(): boolean {
    return this.simulatedOffline;
  }

  public static setSimulatedOffline(offline: boolean): void {
    this.simulatedOffline = offline;
    this.notifyListeners();
  }

  public static subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.getState(), this.simulatedOffline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state, this.simulatedOffline));
  }

  public static startHeartbeat(intervalMs = 15000): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    
    // Initial ping
    this.checkServerHealth();

    this.pingInterval = setInterval(() => {
      this.checkServerHealth();
    }, intervalMs);
  }

  public static async checkServerHealth(): Promise<{
    online: boolean;
    serverTime: string;
    clockOffsetMs: number;
  }> {
    if (this.simulatedOffline) {
      this.notifyListeners();
      return {
        online: false,
        serverTime: new Date().toISOString(),
        clockOffsetMs: 0
      };
    }

    try {
      const clientBefore = Date.now();
      const response = await fetch('/api/v1/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        const serverTime = data.server_time || new Date().toISOString();
        const offset = OfflineStorageService.saveClockOffset(serverTime);
        this.lastSuccessfulPing = serverTime;
        this.currentState = 'SERVER_ONLINE';
        this.notifyListeners();

        return {
          online: true,
          serverTime,
          clockOffsetMs: offset
        };
      }

      // Fallback for standalone/demo container
      const serverNow = new Date().toISOString();
      const offset = OfflineStorageService.saveClockOffset(serverNow);
      this.lastSuccessfulPing = serverNow;
      this.currentState = 'SERVER_ONLINE';
      this.notifyListeners();

      return {
        online: true,
        serverTime: serverNow,
        clockOffsetMs: offset
      };
    } catch {
      this.currentState = 'SERVER_OFFLINE';
      this.notifyListeners();
      return {
        online: false,
        serverTime: new Date().toISOString(),
        clockOffsetMs: 0
      };
    }
  }

  public static getLastPingTime(): string {
    return this.lastSuccessfulPing;
  }
}
