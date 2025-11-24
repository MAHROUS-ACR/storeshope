# Flux Wallet - Deployment Guide

## Overview
Flux Wallet is a **100% frontend application** (Firebase-only, no backend server). This makes it easy to deploy anywhere!

## What You Have

After running `npm run build`, you get the **`dist/public/`** folder containing:
```
dist/public/
├── index.html              ← Main entry point
├── firebase-messaging-sw.js ← Service Worker for notifications
├── favicon.png             ← App icon
└── assets/
    ├── index-*.css         ← Compiled styles
    ├── index-*.js          ← Compiled app code
    └── *.png               ← Product images
```

## Deployment Options

### 1. Replit Publishing (Recommended - Easiest)
**Best for:** Quick deployment with zero configuration

1. Click the **"Publish"** button in Replit
2. Replit automatically builds and serves your app
3. Get a live URL: `your-app.replit.dev`
4. Supports custom domains

**Advantages:**
- ✅ One-click deployment
- ✅ Automatic HTTPS
- ✅ Automatic updates
- ✅ Free tier available

---

### 2. Vercel
**Best for:** Best performance + free tier

1. Push your code to GitHub
2. Connect GitHub to Vercel
3. Select this repository
4. Vercel auto-deploys on push
5. Get a live URL: `your-app.vercel.app`

**Setup:**
```bash
# Push to GitHub
git add .
git commit -m "Deploy Flux Wallet"
git push origin main

# Then link at: https://vercel.com
```

---

### 3. Netlify
**Best for:** Drag & drop deployment

1. Build locally:
   ```bash
   npm run build
   ```

2. Go to https://app.netlify.com/drop
3. Drag & drop the `dist/public/` folder
4. Netlify publishes it instantly!

**Or connect GitHub:**
1. Push code to GitHub
2. Link at https://app.netlify.com
3. Netlify auto-deploys

---

### 4. GitHub Pages
**Best for:** Free, GitHub-integrated

1. Build the app:
   ```bash
   npm run build
   ```

2. The `dist/public/` folder is ready to deploy

3. Push `dist/public/` contents to `gh-pages` branch:
   ```bash
   git subtree push --prefix dist/public origin gh-pages
   ```

4. Enable GitHub Pages in repository settings
5. Your site is live at: `https://username.github.io/repo-name`

---

### 5. Traditional Web Hosting (Bluehost, GoDaddy, etc.)
**Best for:** Custom domain + full control

1. Build the app:
   ```bash
   npm run build
   ```

2. Upload contents of `dist/public/` via FTP:
   - Connect via FTP client (Filezilla, etc.)
   - Upload all files from `dist/public/`
   - Ensure `index.html` is in root directory

3. Access via your domain

---

### 6. AWS S3 + CloudFront
**Best for:** High traffic + global CDN

1. Create S3 bucket (enable static website hosting)
2. Upload `dist/public/` contents
3. Set up CloudFront distribution
4. Configure custom domain

---

### 7. Docker (Advanced)
**Best for:** Custom deployment infrastructure

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM caddy:latest
COPY --from=build /app/dist/public /usr/share/caddy
```

Build & Deploy:
```bash
docker build -t flux-wallet .
docker run -p 80:80 flux-wallet
```

---

## Important: Configure Firebase Credentials

Before deploying, ensure your Firebase credentials are set:

### Option 1: Environment Variables (Recommended)
Create a `.env` file in your project root:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Option 2: Change via Settings Page
After deployment, you can change Firebase project without redeployment:
1. Go to `/settings` page
2. Update all 7 Firebase credentials
3. Click "Save All Settings"
4. App reconnects to new Firebase project

---

## Step-by-Step: Build & Upload

### For Most Hosting Services:

```bash
# 1. Build the app
npm run build

# 2. Navigate to dist folder
cd dist/public

# 3. All contents here are ready to upload
# Upload all these files to your hosting:
# - index.html
# - firebase-messaging-sw.js
# - favicon.png
# - assets/ folder
```

### File Structure After Upload:
```
your-domain.com/
├── index.html
├── firebase-messaging-sw.js
├── favicon.png
└── assets/
    ├── index-*.css
    ├── index-*.js
    └── *.png
```

---

## Troubleshooting

### ❌ "Cannot find index.html"
- Ensure `index.html` is in the root, not in a subfolder
- Most hosting requires root path to index.html

### ❌ "Styles not loading"
- Check that CSS file paths are correct
- Ensure all files from `assets/` folder are uploaded

### ❌ "Firebase errors"
- Verify your Firebase credentials in `.env` or Settings page
- Check Firebase project allows your domain
- Add your domain to Firebase Console → Authentication → Authorized domains

### ❌ "Images not showing"
- Ensure all `.png` files from `assets/` are uploaded
- Check image paths in browser console

---

## Recommended: Replit Publishing

For simplicity, we recommend using **Replit Publishing**:

1. Click **"Publish"** button in Replit
2. Replit handles:
   - ✅ Building your app
   - ✅ Serving files
   - ✅ HTTPS certificate
   - ✅ Updates on code changes
   - ✅ Custom domain support (premium)

3. Your app is live instantly!

---

## Summary

| Platform | Ease | Speed | Cost | Best For |
|----------|------|-------|------|----------|
| **Replit** | ⭐⭐⭐⭐⭐ | Instant | Free | Quick start |
| **Vercel** | ⭐⭐⭐⭐ | Auto | Free | Best performance |
| **Netlify** | ⭐⭐⭐⭐ | Auto | Free | Easy drag & drop |
| **GitHub Pages** | ⭐⭐⭐ | Manual | Free | Simple GitHub integration |
| **Traditional Host** | ⭐⭐⭐ | Manual | Paid | Custom domain |
| **AWS** | ⭐⭐ | Manual | Paid | High traffic |

---

**Choose your platform and deploy!** 🚀
