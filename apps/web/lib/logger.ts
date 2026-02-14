/**
 * Production-safe logging utility
 * 
 * In development: logs everything to console
 * In production: only logs errors and can integrate with external services (Sentry, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: any, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, ...args);
      
      // In production, send to error tracking service
      if (!isDevelopment && typeof window !== 'undefined') {
        // Example: Sentry integration (if configured)
        // Sentry.captureException(error, { extra: { message, args } });
      }
    }
  }

  // API-specific logging
  apiRequest(method: string, url: string, data?: any) {
    this.debug(`API ${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any) {
    if (status >= 400) {
      this.error(`API ${method} ${url} failed with status ${status}`, data);
    } else {
      this.debug(`API ${method} ${url} succeeded with status ${status}`, data);
    }
  }

  apiError(method: string, url: string, error: any) {
    this.error(`API ${method} ${url} error`, error);
  }
}

export const logger = new Logger();

// Convenience exports
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
