# 📦 FLUX WALLET - شجرة الملفات الكاملة

## 🎯 للنشر: انسخ مجلد `client/` فقط

```
client/
├── src/                      ← Source code
│   ├── pages/
│   │   ├── home.tsx          ← قائمة المنتجات
│   │   ├── product-details.tsx
│   │   ├── cart.tsx
│   │   ├── checkout.tsx      ← الدفع
│   │   ├── login.tsx         ← تسجيل الدخول
│   │   ├── profile.tsx       ← البروفايل + Admin
│   │   ├── settings.tsx      ← الإعدادات
│   │   ├── orders.tsx        ← الطلبات
│   │   ├── order-details.tsx
│   │   ├── discounts.tsx     ← الخصومات
│   │   ├── setup.tsx         ← 🔧 Firebase Credentials
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/               ← 60+ Radix UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── card.tsx
│   │   │   └── ... (50+ more)
│   │   │
│   │   ├── MobileWrapper.tsx   ← iPhone wrapper
│   │   ├── BottomNav.tsx       ← Navigation
│   │   ├── NotificationCenter.tsx
│   │   └── CartProvider.tsx
│   │
│   ├── lib/                  ← Utilities & Services
│   │   ├── firebaseConfigStorage.ts  🔑 Firebase config (env vars)
│   │   ├── firebaseOps.ts            ← All Firebase CRUD
│   │   ├── notificationUtils.ts      ← FCM & Push
│   │   ├── cartContext.ts            ← Cart state
│   │   ├── userContext.ts            ← User state
│   │   ├── languageContext.ts        ← Arabic/English
│   │   └── queryClient.ts            ← React Query
│   │
│   ├── App.tsx               ← Main router
│   ├── main.tsx              ← Entry point
│   └── index.css             ← Tailwind styles
│
├── public/                   ← Static assets
│   ├── favicon.png
│   ├── firebase-messaging-sw.js
│   └── ...
│
├── index.html                ← Main HTML
├── package.json              ⭐ npm dependencies
├── vite.config.ts            ⭐ Build config
├── tsconfig.json             ← TypeScript
├── tailwind.config.ts        ← Tailwind config
└── postcss.config.js         ← PostCSS config
```

---

## ⭐ الملفات الضرورية للنشر

```
MUST COPY:
✅ client/src/              (كل ملفات TypeScript/React)
✅ client/public/           (Favicon + Service Worker)
✅ client/index.html        (HTML template)
✅ client/package.json      (npm dependencies)
✅ client/vite.config.ts    (Build configuration)
✅ client/tsconfig.json     (TypeScript config)
✅ client/tailwind.config.ts
✅ client/postcss.config.js

DON'T NEED:
❌ Server code (Express)
❌ Database files (PostgreSQL)
❌ Backend API routes
❌ node_modules/            (npm install ينشئها)
❌ dist/                    (npm run build ينشئها)
❌ .env files              (استخدم env vars من hosting)
```

---

## 🔑 Firebase Configuration

**ملف: `client/src/lib/firebaseConfigStorage.ts`**

```typescript
// يقرأ من البيئة variables فقط:
import.meta.env.VITE_FIREBASE_API_KEY
import.meta.env.VITE_FIREBASE_PROJECT_ID
import.meta.env.VITE_FIREBASE_APP_ID
import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
```

**Functions:**
- `isFirebaseConfigured()` → boolean
- `initializeFirebase()` → void
- `getConfigFromEnv()` → FirebaseConfigData

---

## 📱 الصفحات الرئيسية

| الصفحة | الملف | الوصف |
|--------|------|-------|
| الرئيسية | `home.tsx` | قائمة المنتجات |
| تفاصيل | `product-details.tsx` | معلومات المنتج |
| السلة | `cart.tsx` | عرض السلة |
| الدفع | `checkout.tsx` | الدفع (Stripe/COD) |
| تسجيل | `login.tsx` | Sign in/up |
| البروفايل | `profile.tsx` | البروفايل + Admin Panel |
| الإعدادات | `settings.tsx` | إعدادات التطبيق |
| الطلبات | `orders.tsx` | تاريخ الطلبات |
| الخصومات | `discounts.tsx` | العروض |
| الإعدادات 🔧 | `setup.tsx` | إدخال Firebase Credentials |

---

## 🎨 مكونات الواجهة

**في `client/src/components/ui/`:**
- `button.tsx`, `input.tsx`, `dialog.tsx`
- `select.tsx`, `tabs.tsx`, `card.tsx`
- `badge.tsx`, `alert.tsx`, `checkbox.tsx`
- وأكثر من 50 مكون Radix UI

**مكونات مخصصة:**
- `MobileWrapper.tsx` - محاكاة iPhone
- `BottomNav.tsx` - قائمة التنقل
- `NotificationCenter.tsx` - جرس الإشعارات
- `CartProvider.tsx` - إدارة السلة

---

## 💾 إدارة الحالة (State Management)

| الملف | الوصف |
|------|-------|
| `cartContext.ts` | حالة السلة (Context API) |
| `userContext.ts` | بيانات المستخدم والمصادقة |
| `languageContext.ts` | اللغة (عربي/إنجليزي) |
| `queryClient.ts` | React Query setup |

---

## 🔥 Firebase Operations

**الملف: `client/src/lib/firebaseOps.ts`**

جميع عمليات Firestore:
```typescript
getProducts()           // جلب المنتجات
getOrders()            // جلب الطلبات
getOrderById()         // طلب معين
saveOrder()            // حفظ طلب جديد
updateUser()           // تحديث البروفايل
getNotifications()     // الإخطارات
getStoreSettings()     // إعدادات المتجر
getDiscounts()         // الخصومات
getShippingZones()     // مناطق الشحن
```

---

## 🚀 للنشر على Vercel/Netlify

**الخطوات:**

1. **نسخ مجلد `client/`**
   ```bash
   # على GitHub
   git clone https://github.com/yourname/flux-wallet
   cd flux-wallet/client
   ```

2. **على Vercel/Netlify**
   - Connect GitHub repo
   - Select `client/` folder as root
   - Add Environment Variables:
     ```
     VITE_FIREBASE_API_KEY
     VITE_FIREBASE_PROJECT_ID
     VITE_FIREBASE_APP_ID
     VITE_FIREBASE_AUTH_DOMAIN
     VITE_FIREBASE_STORAGE_BUCKET (optional)
     VITE_FIREBASE_MESSAGING_SENDER_ID (optional)
     VITE_FIREBASE_MEASUREMENT_ID (optional)
     ```
   - Deploy ✅

3. **locally:**
   ```bash
   cd client
   npm install
   npm run build
   # dist/ جاهزة للنشر
   ```

---

## 📊 Flow البيانات

```
User Opens App
        ↓
App.tsx checks Firebase config
        ↓
❌ No config? → Setup page (setup.tsx)
        ↓
✅ Has config? → Initialize Firebase
        ↓
Home page loads
        ↓
firebaseOps.ts → getProducts()
        ↓
Firebase Firestore (Cloud)
        ↓
Display products in UI
```

---

## ✅ Summary

**للنشر:**
1. ✅ Folder: `client/`
2. ✅ Firebase env vars (7 متغيرات)
3. ✅ Firebase project (Database)

**بدون:**
- ❌ Backend server
- ❌ PostgreSQL
- ❌ Server code
- ❌ Node.js runtime

**النتيجة:** Pure frontend + Firebase ☁️
