import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Configuration constants
const MAX_ERROR_LOGS = 20;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Store error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to external service (could be integrated with monitoring service)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Store error in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorLog);
      
      // Keep only last MAX_ERROR_LOGS errors
      if (existingLogs.length > MAX_ERROR_LOGS) {
        existingLogs.shift();
      }
      
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-red-100 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Oops! Something went wrong</h1>
                <p className="text-slate-600 mt-1">We encountered an unexpected error</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-medium mb-2">
                {this.state.error?.toString() || 'An unknown error occurred'}
              </p>
              {isDevelopment && this.state.errorInfo && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-red-700 font-medium hover:text-red-900">
                    Show technical details
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-64 bg-red-100 p-3 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-slate-600">
                Don't worry! You can try the following:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                <li>Refresh the page to try again</li>
                <li>Go back to the home page</li>
                <li>Clear your browser cache if the problem persists</li>
                {this.state.errorCount > 2 && (
                  <li className="text-orange-600 font-medium">
                    Multiple errors detected. Consider restarting your browser.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                onClick={this.handleReset}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 border-slate-300 hover:bg-slate-50"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {isDevelopment && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center">
                  Development Mode: Check console for detailed error information
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
