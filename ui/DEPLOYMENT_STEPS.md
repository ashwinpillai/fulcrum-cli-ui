# 🚀 Vercel Deployment Guide

## Quick Deploy to Vercel

### 1. **Connect GitHub Repository**
- Go to [vercel.com](https://vercel.com)
- Sign in with GitHub
- Click "New Project"
- Import your `fulcrum-cli-ui` repository

### 2. **Project Configuration**
- **Framework Preset:** Create React App
- **Root Directory:** `ui`
- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Install Command:** `npm install`

### 3. **Environment Variables**
Add these in Vercel dashboard:
```bash
REACT_APP_API_BASE_URL=https://your-backend-domain.onrender.com
REACT_APP_ACTIVITY_LOG_URL=https://your-vercel-domain.vercel.app/activity-log.html
REACT_APP_COMMAND_OUTPUT_URL=https://your-vercel-domain.vercel.app/command-output.html
REACT_APP_ENABLE_RATE_LIMITING=true
REACT_APP_MAX_LOGIN_ATTEMPTS=3
REACT_APP_LOGIN_TIMEOUT_MINUTES=30
REACT_APP_ENABLE_ACTIVITY_LOGGING=true
REACT_APP_ENABLE_IP_GEOLOCATION=true
REACT_APP_ENABLE_TEMPORARY_ACCESS=true
```

### 4. **Deploy**
- Click "Deploy"
- Vercel will automatically build and deploy your app
- Your app will be available at `https://your-project.vercel.app`

### 5. **Custom Domain (Optional)**
- Go to Project Settings → Domains
- Add your custom domain
- Configure DNS as instructed

## ✅ What's Already Configured

- **Security Headers** - Automatically applied via `vercel.json`
- **Clean URLs** - `/activity-log` and `/command-output` routes
- **HTTPS** - Automatically enabled by Vercel
- **CDN** - Global edge network for fast loading

## 🔒 Security Features Active

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content Security Policy
- Strict Transport Security
- Referrer Policy

## 🚨 Important Notes

1. **Backend Required** - You need to deploy your backend to Render first
2. **Environment Variables** - Must be set in Vercel dashboard
3. **API Endpoints** - Update with your actual backend URLs
4. **CORS** - Ensure your backend allows your Vercel domain

## 🔗 Next Steps

1. Deploy backend to Render
2. Set environment variables in Vercel
3. Test authentication and functionality
4. Monitor security logs

Your app is now ready for production deployment! 🎉
