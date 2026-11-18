import { ServerConnectivityState } from '../types';

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



}
