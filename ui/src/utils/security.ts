// Security utilities for Fulcrum CLI UI

// Input validation and sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validateCommand = (command: string): boolean => {
  const allowedCommands = [
    'records show', 'records delete', 'records duplicate', 'records restore', 'records update',
    'forms delete', 'forms duplicate', 'forms restore', 'forms upload-reference-file',
    'changesets revert', 'changesets show', 'query run'
  ];
  return allowedCommands.includes(command);
};

export const validateInstance = (instance: string): boolean => {
  const allowedInstances = ['US', 'EU', 'AU', 'CA'];
  return allowedInstances.includes(instance);
};

export const validateRecordId = (recordId: string): boolean => {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(recordId);
};

export const validateApiToken = (token: string): boolean => {
  // Basic token validation - should be alphanumeric and reasonable length
  return /^[a-zA-Z0-9_-]{20,100}$/.test(token);
};

// Rate limiting for login attempts
class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private maxAttempts: number;
  private timeoutMinutes: number;

  constructor(maxAttempts: number = 5, timeoutMinutes: number = 15) {
    this.maxAttempts = maxAttempts;
    this.timeoutMinutes = timeoutMinutes;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if timeout period has passed
    const timeDiff = now - attempt.lastAttempt;
    const timeoutMs = this.timeoutMinutes * 60 * 1000;

    if (timeDiff > timeoutMs) {
      // Reset after timeout
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if max attempts reached
    if (attempt.count >= this.maxAttempts) {
      return false;
    }

    // Increment attempt count
    attempt.count++;
    attempt.lastAttempt = now;
    return true;
  }

  getRemainingAttempts(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return this.maxAttempts;

    const now = Date.now();
    const timeDiff = now - attempt.lastAttempt;
    const timeoutMs = this.timeoutMinutes * 60 * 1000;

    if (timeDiff > timeoutMs) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - attempt.count);
  }

  getTimeUntilReset(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return 0;

    const now = Date.now();
    const timeDiff = now - attempt.lastAttempt;
    const timeoutMs = this.timeoutMinutes * 60 * 1000;

    return Math.max(0, timeoutMs - timeDiff);
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const loginRateLimiter = new RateLimiter(
  parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS || '5'),
  parseInt(process.env.REACT_APP_LOGIN_TIMEOUT_MINUTES || '15')
);

// CSRF protection
export const generateCSRFToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken && token.length > 0;
};

// Secure storage utilities
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      // Add timestamp for expiration
      const data = {
        value,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing data securely:', error);
    }
  },

  getItem: (key: string): string | null => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;

      const parsed = JSON.parse(data);

      // Check if data has expired
      if (parsed.expires && Date.now() > parsed.expires) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.error('Error retrieving data securely:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data securely:', error);
    }
  }
};

// Session management
export const sessionManager = {
  createSession: (userData: any): void => {
    const sessionId = generateCSRFToken();
    const sessionData = {
      id: sessionId,
      user: userData,
      created: Date.now(),
      expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };

    secureStorage.setItem('fulcrum_session', JSON.stringify(sessionData));
    secureStorage.setItem('fulcrum_csrf_token', sessionId);
  },

  getSession: (): any => {
    const sessionData = secureStorage.getItem('fulcrum_session');
    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      if (Date.now() > session.expires) {
        sessionManager.destroySession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  destroySession: (): void => {
    secureStorage.removeItem('fulcrum_session');
    secureStorage.removeItem('fulcrum_csrf_token');
    secureStorage.removeItem('fulcrum_auth_status');
    secureStorage.removeItem('fulcrum_current_user');
  },

  isSessionValid: (): boolean => {
    return sessionManager.getSession() !== null;
  },

  extendSession: (minutes: number): void => {
    const sessionData = secureStorage.getItem('fulcrum_session');
    if (!sessionData) return;

    try {
      const session = JSON.parse(sessionData);
      if (Date.now() > session.expires) {
        sessionManager.destroySession();
        return;
      }

      // Extend session by specified minutes
      session.expires = Date.now() + (minutes * 60 * 1000);
      secureStorage.setItem('fulcrum_session', JSON.stringify(session));
    } catch {
      // If parsing fails, destroy the corrupted session
      sessionManager.destroySession();
    }
  }
};

// Content Security Policy helper
export const getCSPNonce = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Audit logging for security events
export const logSecurityEvent = (event: string, details: any): void => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.warn('Security Event:', securityLog);

  // In production, you might want to send this to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to security monitoring service
    // This is where you'd integrate with services like Sentry, LogRocket, etc.
  }
};
