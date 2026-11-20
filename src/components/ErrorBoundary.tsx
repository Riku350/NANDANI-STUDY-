import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let friendly = 'Something went wrong. Please try again.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error) {
        if (String(parsed.error).includes('Quota exceeded')) {
          friendly = 'Daily database quota exceeded. Quota resets tomorrow.';
        } else if (String(parsed.error).includes('permission')) {
          friendly = 'Access denied for this operation. Please sign in again.';
        }
      }
    } catch {
      if (error.message && error.message.length < 160) {
        friendly = error.message;
      }
    }
    return { hasError: true, message: friendly };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Unable to load view</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
