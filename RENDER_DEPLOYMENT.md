# 🚀 Render Backend Deployment Guide

## 📋 Prerequisites

- [Render Account](https://render.com) (Free tier available)
- GitHub repository connected
- Node.js 18+ support

## 🔧 Deployment Steps

### 1. **Connect GitHub Repository**
- Go to [Render Dashboard](https://dashboard.render.com)
- Click "New +" → "Web Service"
- Connect your GitHub account
- Select `fulcrum-cli-ui` repository

### 2. **Configure Service**
- **Name:** `fulcrum-cli-backend`
- **Environment:** `Node`
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** Leave empty (root of repo)

### 3. **Build & Start Commands**
```bash
# Build Command
npm install && npm run build

# Start Command  
npm start
```

### 4. **Environment Variables**
```bash
NODE_ENV=production
PORT=10000
```

### 5. **Advanced Settings**
- **Health Check Path:** `/run-command`
- **Auto-Deploy:** ✅ Enabled
- **Plan:** Free (or upgrade as needed)

## 🚀 Deploy

Click "Create Web Service" and wait for deployment.

## 🔗 After Deployment

### **Get Your Backend URL**
Your service will be available at:
```
https://fulcrum-cli-backend.onrender.com
```

### **Update Frontend Environment Variables**
In Vercel dashboard, set:
```bash
REACT_APP_API_BASE_URL=https://fulcrum-cli-backend.onrender.com
```

## ✅ Verification

### **Test Backend Health**
```bash
curl -I https://fulcrum-cli-backend.onrender.com/run-command
```

### **Test Command Execution**
```bash
curl -X POST https://fulcrum-cli-backend.onrender.com/run-command \
  -H "Content-Type: application/json" \
  -d '{"command":"fulcrum records","args":["--help"]}'
```

## 🔧 Troubleshooting

### **Build Failures**
- Check Node.js version (18+ required)
- Verify all dependencies in package.json
- Check build logs in Render dashboard

### **Runtime Errors**
- Check application logs in Render dashboard
- Verify environment variables
- Test locally first

### **CORS Issues**
- Backend includes CORS middleware
- Should work with Vercel frontend
- Check browser console for errors

## 📊 Monitoring

- **Logs:** Available in Render dashboard
- **Metrics:** Response times, error rates
- **Health Checks:** Automatic monitoring

## 🔒 Security

- **HTTPS:** Automatically enabled by Render
- **CORS:** Configured for frontend access
- **Environment Variables:** Secure storage

## 💰 Costs

- **Free Tier:** 750 hours/month
- **Upgrade:** $7/month for unlimited usage
- **Bandwidth:** Included in plan

Your backend will be automatically deployed and updated whenever you push to GitHub! 🎉
