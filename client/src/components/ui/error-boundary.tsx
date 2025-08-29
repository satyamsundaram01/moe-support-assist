import React, { Component, type ReactNode } from 'react';
import { logger } from '../../lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: React.ErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean; // If true, prevents error from bubbling up
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error
    logger.error('Error caught by ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // If not isolating, re-throw to let parent boundaries handle it
    if (!this.props.isolate) {
      throw error;
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.state.errorInfo!);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Default fallback component
interface ErrorFallbackProps {
  error: Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showDetails?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  showDetails = false,
}) => {
  return (
    <div className="flex items-center justify-center p-8 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
          {description}
        </p>

        {showDetails && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200">
              Show error details
            </summary>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex gap-2 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium"
            >
              Try Again
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

// Specific fallback components for different areas
export const ChatErrorFallback: React.FC<{ error: Error; onRetry?: () => void }> = ({ error, onRetry }) => (
  <ErrorFallback
    error={error}
    onRetry={onRetry}
    title="Chat Error"
    description="There was an error with the chat interface. Your conversation data is safe."
    showDetails={process.env.NODE_ENV === 'development'}
  />
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const SidebarErrorFallback: React.FC<{ error: Error; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
    <div className="text-center">
      <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
        Sidebar Error {error?.name || ''}
      </h4>
      <p className="text-xs text-red-600 dark:text-red-300 mb-3">
        The sidebar encountered an error but the main chat is still working.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

export const ComponentErrorFallback: React.FC<{ 
  error: Error; 
  onRetry?: () => void;
  componentName?: string;
}> = ({ error: _error, onRetry, componentName = "Component" }) => (
  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
    <div className="text-center">
      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
        {componentName} Error
      </h4>
      <p className="text-xs text-yellow-600 dark:text-yellow-300 mb-2">
        This component encountered an error but other parts of the app are working.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);
