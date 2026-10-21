import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { authApi, deleteCookie } from '../lib/api-client';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('[AegisLedger ErrorBoundary caught an unhandled render exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors
    }
    deleteCookie('aegis_access_token');
    deleteCookie('aegis_refresh_token');
    deleteCookie('aegis_session_active');
    deleteCookie('aegis_user_persona');
    localStorage.removeItem('aegis_auth_session');
    useAuthStore.getState().logout();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-6 font-sans">
          <div className="max-w-lg w-full bg-slate-900 border border-red-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Application Render Error</h2>
                <p className="text-xs text-red-300">An unexpected exception occurred while rendering the portal.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-red-300 overflow-x-auto max-h-40">
              {this.state.error?.message || 'Unknown render exception'}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                Retry Render
              </button>
              <button
                onClick={this.handleReset}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Session & Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
