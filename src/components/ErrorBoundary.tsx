import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <Card className="p-8">
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-full border-2 border-red-300 dark:border-red-700 flex items-center justify-center bg-red-50 dark:bg-red-950">
                  <AlertCircle size={28} className="text-red-500" />
                </div>
              </div>

              <h1
                className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                Something went wrong
              </h1>
              <p className="text-sm text-red-500/80 dark:text-red-400/80 mb-6">
                The app ran into an unexpected error. You can try reloading or head back to the home page.
              </p>

              {this.state.error && (
                <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-left">
                  <p className="text-xs mono text-red-600 dark:text-red-400 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReload}
                  className="flex-1 py-3 text-sm"
                >
                  <RotateCcw size={14} /> Reload
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1 py-3 text-sm"
                >
                  <Home size={14} /> Home
                </Button>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}