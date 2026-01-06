// Enhanced error handling utility with Android-specific optimizations and comprehensive error categorization
interface ErrorWithMessage {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface ErrorCategories {
  PERMISSION: string[];
  NETWORK: string[];
  VALIDATION: string[];
  AUTHENTICATION: string[];
  DATABASE: string[];
  RATE_LIMIT: string[];
}

// Common error patterns
const ERROR_PATTERNS: ErrorCategories = {
  PERMISSION: ['permission', 'unauthorized', 'forbidden', 'PGRST301', 'RLS', 'policy'],
  NETWORK: ['network', 'fetch', 'timeout', 'PGRST000', 'connection', 'offline'],
  VALIDATION: ['invalid', 'required', 'format', 'PGRST116', 'not found', 'constraint'],
  AUTHENTICATION: ['auth', 'login', 'token', 'session', 'expired', 'PGRST302'],
  DATABASE: ['database', 'sql', 'query', 'relation', 'PGRST', 'duplicate'],
  RATE_LIMIT: ['rate', 'limit', 'throttle', 'too many', 'PGRST109']
};

// Android-specific error enhancements
const ANDROID_ERROR_ENHANCEMENTS = {
  NETWORK: ' Try switching between WiFi and mobile data.',
  PERMISSION: ' Please check your app permissions in Settings.',
  VALIDATION: ' Please check your input and try again.',
  AUTHENTICATION: ' Please log out and log back in.',
  DATABASE: ' Please try again in a moment.',
  RATE_LIMIT: ' Please wait a moment before trying again.'
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function detectAndroidDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('android');
}

function categorizeError(errorMessage: string, errorCode?: string): keyof ErrorCategories | null {
  const message = errorMessage.toLowerCase();
  const code = errorCode?.toLowerCase() || '';
  
  for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some((pattern: string) => message.includes(pattern) || code.includes(pattern))) {
      return category as keyof ErrorCategories;
    }
  }
  
  return null;
}

function enhanceErrorForAndroid(message: string, category: keyof ErrorCategories | null): string {
  if (!detectAndroidDevice() || !category) {
    return message;
  }
  
  const enhancement = ANDROID_ERROR_ENHANCEMENTS[category];
  return enhancement ? `${message}${enhancement}` : message;
}

function sanitizeErrorMessage(message: string): string {
  // Remove technical jargon that might confuse users
  return message
    .replace(/PGRST\d+/g, '')
    .replace(/PostgreSQL/gi, 'Database')
    .replace(/RLS/gi, 'Security')
    .replace(/JWT/gi, 'Authentication')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getErrorMessage(error: unknown, context?: string): string {
  console.error('[getErrorMessage] Processing error:', { error, context, timestamp: new Date().toISOString() });
  
  let message = 'An unexpected error occurred.';
  let code: string | undefined;
  let details: string | undefined;
  
  if (isErrorWithMessage(error)) {
    message = error.message;
    code = error.code;
    details = error.details;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
    code = (error as unknown as { code?: string }).code;
  }
  
  // Log enhanced error information for debugging
  console.error('[getErrorMessage] Enhanced error info:', {
    originalMessage: message,
    code,
    details,
    context,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Categorize the error
  const category = categorizeError(message, code);
  
  // Sanitize the message
  const sanitizedMessage = sanitizeErrorMessage(message);
  
  // Create context-specific error messages
  let contextualMessage = sanitizedMessage;
  
  if (context) {
    switch (context) {
      case 'task-completion':
        if (category === 'PERMISSION') {
          contextualMessage = 'You do not have permission to complete this task.';
        } else if (category === 'NETWORK') {
          contextualMessage = 'Network error while updating task status.';
        } else if (category === 'VALIDATION') {
          contextualMessage = 'Task completion validation failed.';
        } else if (category === 'AUTHENTICATION') {
          contextualMessage = 'Authentication error. Please log in again.';
        } else {
          contextualMessage = 'Failed to complete task.';
        }
        break;
        
      case 'proof-upload':
        if (category === 'PERMISSION') {
          contextualMessage = 'You do not have permission to upload proof for this task.';
        } else if (category === 'NETWORK') {
          contextualMessage = 'Network error while uploading proof.';
        } else if (category === 'VALIDATION') {
          contextualMessage = 'Proof upload validation failed.';
        } else {
          contextualMessage = 'Failed to upload proof.';
        }
        break;
        
      case 'task-update':
        if (category === 'PERMISSION') {
          contextualMessage = 'You do not have permission to update this task.';
        } else if (category === 'NETWORK') {
          contextualMessage = 'Network error while updating task.';
        } else if (category === 'VALIDATION') {
          contextualMessage = 'Task update validation failed.';
        } else {
          contextualMessage = 'Failed to update task.';
        }
        break;
        
      default:
        contextualMessage = sanitizedMessage;
    }
  }
  
  // Enhance for Android devices
  const finalMessage = enhanceErrorForAndroid(contextualMessage, category);
  
  // Log final processed message
  console.log('[getErrorMessage] Final processed message:', {
    originalMessage: message,
    category,
    contextualMessage,
    finalMessage,
    isAndroid: detectAndroidDevice()
  });
  
  return finalMessage;
}

// Specific error handlers for common scenarios
export function getTaskCompletionError(error: unknown): string {
  return getErrorMessage(error, 'task-completion');
}

export function getProofUploadError(error: unknown): string {
  return getErrorMessage(error, 'proof-upload');
}

export function getTaskUpdateError(error: unknown): string {
  return getErrorMessage(error, 'task-update');
}

// Error reporting function for debugging
export function reportError(error: unknown, context?: string, additionalInfo?: Record<string, unknown>): void {
  const errorReport = {
    timestamp: new Date().toISOString(),
    error: error,
    context,
    additionalInfo,
    userAgent: navigator.userAgent,
    url: window.location.href,
    isAndroid: detectAndroidDevice()
  };
  
  console.error('[Error Report]', errorReport);
  
  // In production, this could be sent to an error tracking service
  // Example: errorTrackingService.report(errorReport);
}

export default getErrorMessage;
