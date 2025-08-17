# Fulcrum CLI UI - Production Deployment Security Guide

## 🚀 Deployment Overview

This guide covers the security measures implemented for deploying Fulcrum CLI UI to production on Vercel (frontend) and Render (backend).

## 🔒 Security Features Implemented

### 1. Input Validation & Sanitization
- **Email Validation**: Strict email format validation
- **Command Validation**: Whitelist of allowed commands only
- **Instance Validation**: Restricted to US, EU, AU, CA only
- **Record ID Validation**: UUID v4 format validation
- **API Token Validation**: Alphanumeric format validation
- **Input Sanitization**: Removes dangerous characters and scripts

### 2. Rate Limiting
- **Login Attempts**: Max 3 attempts per 30 minutes (production)
- **API Requests**: 100 requests per 15 minutes
- **General Requests**: 1000 requests per hour
- **Automatic Reset**: Timeout-based reset mechanism

### 3. Session Security
- **Secure Sessions**: CSRF token protection
- **Session Expiry**: 4 hours in production, 24 hours in development
- **Secure Storage**: Encrypted localStorage with expiration
- **Automatic Logout**: Session timeout handling

### 4. Security Headers (Vercel)
- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **X-XSS-Protection**: 1; mode=block (XSS protection)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restricts geolocation, microphone, camera
- **Strict-Transport-Security**: Enforces HTTPS
- **Content-Security-Policy**: Restricts resource loading

### 5. Audit Logging
- **Security Events**: All security-related actions logged
- **User Actions**: Login attempts, command execution, access grants
- **IP Tracking**: Geolocation tracking for security monitoring
- **Timestamp Logging**: Precise timing of all events

## 🌐 Environment Configuration

### Frontend (Vercel) Environment Variables

Create a `.env.local` file in your Vercel project:

```bash
# API Endpoints
REACT_APP_API_BASE_URL=https://your-backend-domain.onrender.com
REACT_APP_ACTIVITY_LOG_URL=https://your-frontend-domain.vercel.app/activity-log.html
REACT_APP_COMMAND_OUTPUT_URL=https://your-frontend-domain.vercel.app/command-output.html

# Security Settings
REACT_APP_ENABLE_RATE_LIMITING=true
REACT_APP_MAX_LOGIN_ATTEMPTS=3
REACT_APP_LOGIN_TIMEOUT_MINUTES=30

# Feature Flags
REACT_APP_ENABLE_ACTIVITY_LOGGING=true
REACT_APP_ENABLE_IP_GEOLOCATION=true
REACT_APP_ENABLE_TEMPORARY_ACCESS=true
```

### Backend (Render) Environment Variables

Set these in your Render dashboard:

```bash
# Security
NODE_ENV=production
ENABLE_RATE_LIMITING=true
MAX_LOGIN_ATTEMPTS=3
LOGIN_TIMEOUT_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app

# Session
SESSION_SECRET=your-super-secret-session-key-here
SESSION_MAX_AGE=14400000
```

## 🚀 Vercel Deployment Steps

### 1. Build Configuration
```bash
# Build command
npm run build

# Output directory
build

# Install command
npm install
```

### 2. Environment Variables
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add all variables from `.env.local` above
- Set `NODE_ENV=production`

### 3. Security Headers
The `vercel.json` file automatically applies security headers to all routes.

### 4. Domain Configuration
- Enable HTTPS (automatic with Vercel)
- Configure custom domain if needed
- Set up redirects for HTTP to HTTPS

## 🔧 Render Backend Security

### 1. CORS Configuration
```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-frontend-domain.vercel.app'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 2. Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', loginLimiter);
```

### 3. Security Middleware
```javascript
import helmet from 'helmet';
import hpp from 'hpp';

app.use(helmet());
app.use(hpp());
app.use(express.json({ limit: '1mb' }));
```

## 🔍 Security Monitoring

### 1. Vercel Analytics
- Enable Vercel Analytics for traffic monitoring
- Monitor for unusual traffic patterns
- Set up alerts for security events

### 2. Render Monitoring
- Enable Render's built-in monitoring
- Monitor API response times and errors
- Set up alerts for failed deployments

### 3. Security Logs
All security events are logged to the browser console and can be integrated with:
- Sentry (error tracking)
- LogRocket (session replay)
- Custom security monitoring service

## 🚨 Security Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Session security configured

### Post-Deployment
- [ ] HTTPS redirects working
- [ ] Security headers present
- [ ] Rate limiting functional
- [ ] Input validation working
- [ ] Audit logging active
- [ ] Session management secure

### Ongoing Monitoring
- [ ] Regular security audits
- [ ] Monitor security logs
- [ ] Update dependencies regularly
- [ ] Review access logs
- [ ] Test security features

## 🆘 Security Incident Response

### 1. Immediate Actions
- Block suspicious IP addresses
- Review security logs
- Check for unauthorized access
- Notify security team

### 2. Investigation
- Analyze audit logs
- Review user sessions
- Check for data breaches
- Document incident details

### 3. Recovery
- Reset compromised accounts
- Update security measures
- Notify affected users
- Implement additional protections

## 📞 Security Contacts

- **Security Team**: security@yourcompany.com
- **DevOps Team**: devops@yourcompany.com
- **Emergency**: +1-XXX-XXX-XXXX

## 🔗 Additional Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Render Security Documentation](https://render.com/docs/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Remember**: Security is an ongoing process. Regularly review and update these measures based on new threats and best practices.
