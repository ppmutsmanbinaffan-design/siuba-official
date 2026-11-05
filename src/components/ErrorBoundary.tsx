import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SIUBA Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToSafeState = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                  SIUBA Guardian Protection
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {this.props.fallbackTitle || 'Terjadi Kendala pada Tampilan'}
                </h2>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed">
              Sistem berhasil mengamankan aplikasi dari penghentian mendadak (*crash*). Anda dapat memuat ulang aplikasi atau kembali ke beranda untuk melanjutkan aktivitas.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-rose-300 space-y-2 max-h-48 overflow-y-auto">
                <p className="font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{this.state.error.name}: {this.state.error.message}</span>
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 300)}...
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                onClick={this.handleResetToSafeState}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold border border-slate-600 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
              >
                <Home className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
