// Security configuration for Fulcrum CLI UI

export const securityConfig = {
  // Production security settings
  production: {
    // HTTPS enforcement
    enforceHTTPS: true,
    
    // Content Security Policy
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:"],
      'connect-src': ["'self'", "https://api.fulcrumapp.com", "https://api.fulcrumapp-eu.com", "https://api.fulcrumapp-au.com", "https://api.fulcrumapp-ca.com"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    },
    
    // Security headers
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    },
    
    // Rate limiting
    rateLimit: {
      login: { maxAttempts: 3, timeoutMinutes: 30 },
      api: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
      general: { maxRequests: 1000, windowMs: 60 * 60 * 1000 } // 1000 requests per hour
    },
    
    // Session security
    session: {
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    },
    
    // Input validation
    validation: {
      maxInputLength: 1000,
      allowedFileTypes: ['.txt', '.csv', '.json'],
      maxFileSize: 5 * 1024 * 1024 // 5MB
    }
  },
  
  // Development security settings (less restrictive)
  development: {
    enforceHTTPS: false,
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:"],
      'connect-src': ["'self'", "http://localhost:*", "https://*"],
      'frame-ancestors': ["'self'"]
    },
    headers: {
      'X-Content-Type-Options': 'nosniff'
    },
    rateLimit: {
      login: { maxAttempts: 10, timeoutMinutes: 5 },
      api: { maxRequests: 1000, windowMs: 15 * 60 * 1000 },
      general: { maxRequests: 10000, windowMs: 60 * 60 * 1000 }
    },
    session: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false,
      httpOnly: false,
      sameSite: 'lax'
    },
    validation: {
      maxInputLength: 5000,
      allowedFileTypes: ['.txt', '.csv', '.json', '.js', '.ts'],
      maxFileSize: 50 * 1024 * 1024 // 50MB
    }
  }
};

// Get current environment
export const getCurrentEnvironment = (): 'production' | 'development' => {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
};

// Get security config for current environment
export const getSecurityConfig = () => {
  const env = getCurrentEnvironment();
  return securityConfig[env];
};

// Environment-specific API endpoints
export const getApiEndpoints = () => {
  const env = getCurrentEnvironment();
  
  if (env === 'production') {
    return {
      baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://your-backend-domain.onrender.com',
      activityLog: process.env.REACT_APP_ACTIVITY_LOG_URL || 'https://your-frontend-domain.vercel.app/activity-log.html',
      commandOutput: process.env.REACT_APP_COMMAND_OUTPUT_URL || 'https://your-frontend-domain.vercel.app/command-output.html'
    };
  }
  
  return {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
    activityLog: process.env.REACT_APP_ACTIVITY_LOG_URL || 'http://localhost:3000/activity-log.html',
    commandOutput: process.env.REACT_APP_COMMAND_OUTPUT_URL || 'http://localhost:3000/command-output.html'
  };
};

// Feature flags based on environment
export const getFeatureFlags = () => {
  const env = getCurrentEnvironment();
  
  return {
    enableActivityLogging: process.env.REACT_APP_ENABLE_ACTIVITY_LOGGING !== 'false',
    enableIPGeolocation: process.env.REACT_APP_ENABLE_IP_GEOLOCATION !== 'false',
    enableTemporaryAccess: process.env.REACT_APP_ENABLE_TEMPORARY_ACCESS !== 'false',
    enableRateLimiting: process.env.REACT_APP_ENABLE_RATE_LIMITING !== 'false',
    enableSecurityLogging: env === 'production'
  };
};
