import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
