# 🚀 دليل النشر (Deployment Guide)

## الملفات المطلوبة

تحتاج فقط إلى مجلد **`client/`** بكامله:
```
client/
├── src/
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── ...
```

**لا تحتاج:**
- Server files (Express)
- Database (PostgreSQL)
- Backend code
- Docker files

---

## خطوات النشر على Vercel

### 1. تحضير الملفات
```bash
# انسخ مجلد client/ كاملاً
# أو احفظ كـ repo جديد على GitHub
```

### 2. على Vercel
1. اذهب إلى [vercel.com](https://vercel.com)
2. انقر **Import Project**
3. اختر مجلد `client/`
4. **Environment Variables** → أضف:
   ```
   VITE_FIREBASE_API_KEY=YOUR_KEY
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   VITE_FIREBASE_APP_ID=YOUR_APP_ID
   VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
   VITE_FIREBASE_STORAGE_BUCKET=YOUR_BUCKET (optional)
   VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_ID (optional)
   VITE_FIREBASE_MEASUREMENT_ID=YOUR_ID (optional)
   ```
5. انقر **Deploy**

---

## خطوات النشر على Netlify

### 1. تحضير `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. على Netlify
1. اذهب إلى [netlify.com](https://netlify.com)
2. **Add new site** → **Import existing project**
3. اختر مجلد `client/`
4. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Environment variables** → أضف نفس المتغيرات أعلاه
6. انقر **Deploy**

---

## خطوات النشر على GitHub Pages

### 1. أنشئ repo جديد

### 2. أضف workflow file (`.github/workflows/deploy.yml`):
```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 3. أضف Secrets على GitHub:
- **Settings** → **Secrets** → أضف كل متغير Firebase

---

## البيانات (Firebase)

**الأهم:** البيانات تبقى في Firebase - لا تحتاج نسخها!

- **Database**: Firestore (السحابة)
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication
- **Notifications**: Firebase Cloud Messaging

كل مستخدم جديد سيرى نفس البيانات من Firebase تلقائياً ✅

---

## نسخ Firebase Project (اختياري)

إذا أردت نقل البيانات إلى Firebase project جديد:

1. **في Firebase Console**
   - اذهب إلى Project Settings
   - انقر **Export / Import** (إن وجدت)
   - أو استخدم **Firestore Backup**

2. **أو يدويّاً:**
   - اجعل صديقك يدخل التطبيق من متصفح
   - أضف البيانات من الـ Admin Panel
   - كل تغيير يُحفظ مباشرة في Firestore ✅

---

## ملخص البيانات المطلوبة

```
┌─────────────────────────────┐
│  التطبيق (client folder)    │
│  ↓                          │
│  Firebase Credentials       │ (env vars)
│  ↓                          │
│  Firebase Project (online)  │
└─────────────────────────────┘
```

الملفات = المصدر (source)
Firebase = البيانات (data)

---

## أسئلة شائعة

**س: هل أحتاج Backend?**
لا! كل شيء في Firebase - بدون server ✅

**س: كيف أنقل البيانات?**
البيانات في Firestore (السحابة) - تلقائياً متاحة للجميع ✅

**س: هل يعمل بدون internet?**
لا - يحتاج internet لأن البيانات في السحابة

**س: كيف أحمي البيانات الحساسة?**
استخدم Firebase Security Rules (في Firestore Settings)

---

## خطوات سريعة للنشر

### Vercel
1. رفع `client/` على GitHub
2. فتح vercel.com وربط GitHub
3. أضف env vars
4. Deploy ✅

### Netlify
1. رفع `client/` على GitHub
2. فتح netlify.com وربط GitHub
3. أضف env vars
4. Deploy ✅

### محلياً (Local)
```bash
cd client
npm install
npm run build
# dist/ جاهزة للنشر على أي hosting
```

---

## التالي

1. ✅ **اختر Platform:** Vercel / Netlify / أخرى
2. ✅ **رفع مجلد client/** على GitHub
3. ✅ **أضف Firebase env vars**
4. ✅ **Deploy!** 🚀
