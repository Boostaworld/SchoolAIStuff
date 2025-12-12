import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default cyberpunk-themed error UI
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5" />
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239, 68, 68, 0.3) 2px, rgba(239, 68, 68, 0.3) 4px)'
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative max-w-2xl w-full"
          >
            <div className="bg-slate-900/80 backdrop-blur-sm border-2 border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-500/20">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                  <div className="relative bg-red-500/10 p-4 rounded-full border-2 border-red-500/30">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-red-400 font-mono tracking-wider">
                    SYSTEM ERROR
                  </h1>
                  <p className="text-red-500/60 text-sm font-mono mt-1">
                    Component Failed to Render
                  </p>
                </div>
              </div>

              {/* Error Message */}
              <div className="mb-6 p-4 bg-slate-950/50 border border-red-500/20 rounded-lg">
                <p className="text-red-300 font-mono text-sm mb-2 font-semibold">
                  Error Message:
                </p>
                <p className="text-slate-300 font-mono text-xs break-words">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
              </div>

              {/* Stack Trace (Collapsed by default) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-red-400 font-mono text-sm hover:text-red-300 transition-colors">
                    View Stack Trace
                  </summary>
                  <pre className="mt-3 p-4 bg-slate-950/50 border border-red-500/20 rounded-lg text-xs text-slate-400 font-mono overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-mono font-bold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold rounded-lg border border-cyan-500/30 hover:border-cyan-400/50 transition-all"
                >
                  <Home className="w-5 h-5" />
                  Go to Dashboard
                </motion.button>
              </div>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-red-500/20">
                <p className="text-xs text-slate-500 font-mono text-center">
                  If this error persists, please report it to the system administrator
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
