import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

// Configuration constants
const MAX_ERROR_LOGS = 20;

// Enhanced toast utility with better UX
export const toast = {
  success: (message, description) => {
    sonnerToast.success(message, {
      description,
      icon: <CheckCircle className="w-5 h-5" />,
      duration: 4000,
      className: 'bg-green-50 border-green-200 text-green-900',
    });
  },

  error: (message, description) => {
    sonnerToast.error(message, {
      description,
      icon: <XCircle className="w-5 h-5" />,
      duration: 6000,
      className: 'bg-red-50 border-red-200 text-red-900',
    });
  },

  warning: (message, description) => {
    sonnerToast.warning(message, {
      description,
      icon: <AlertCircle className="w-5 h-5" />,
      duration: 5000,
      className: 'bg-orange-50 border-orange-200 text-orange-900',
    });
  },

  info: (message, description) => {
    sonnerToast.info(message, {
      description,
      icon: <Info className="w-5 h-5" />,
      duration: 4000,
      className: 'bg-blue-50 border-blue-200 text-blue-900',
    });
  },

  loading: (message, description) => {
    return sonnerToast.loading(message, {
      description,
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
    });
  },

  promise: (promise, { loading, success, error }) => {
    return sonnerToast.promise(promise, {
      loading: loading || 'Loading...',
      success: (data) => {
        return success || 'Success!';
      },
      error: (err) => {
        return error || 'Something went wrong';
      },
    });
  },

  dismiss: (toastId) => {
    sonnerToast.dismiss(toastId);
  },
};

// Retry utility for failed operations
export async function retryOperation(
  operation,
  maxRetries = 3,
  delay = 1000,
  onRetry
) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        if (onRetry) {
          onRetry(attempt + 1, maxRetries);
        }
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}

// Safe async operation wrapper
export async function safeAsync(operation, errorMessage = 'Operation failed') {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    toast.error(errorMessage, error.message);
    throw error;
  }
}

  // Error logger
export function logError(error, context = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: error.toString(),
    message: error.message,
    stack: error.stack,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Log to console
  console.error('Error logged:', errorLog);

  // Store in localStorage
  try {
    const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
    logs.push(errorLog);
    
    // Keep only last MAX_ERROR_LOGS errors
    if (logs.length > MAX_ERROR_LOGS) {
      logs.shift();
    }
    
    localStorage.setItem('errorLogs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to store error log:', e);
  }

  // Could send to external monitoring service here
  // sendToMonitoring(errorLog);
}
