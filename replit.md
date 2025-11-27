# Flux Wallet - E-commerce Mobile App

## Overview

Flux Wallet is a high-fidelity mobile e-commerce application built as a progressive web app. It simulates a modern mobile shopping experience with a wallet interface, product browsing, cart management, and checkout flow. The application uses a mobile-first design approach with a simulated iPhone-style interface wrapper.

**Key Features:**
- Mobile-optimized shopping interface with product catalog and detailed product pages
- Product cards display availability status (متاح/غير متاح) next to price
- Click on any product to view full details including description, variants, and options
- Shopping cart and checkout with multiple payment options
- Firebase Firestore integration for all data (products, orders, discounts, store settings)
- Order history tracking
- User profile and settings management
- Responsive mobile wrapper simulating iPhone device
- Product variant selection (units, sizes, colors with hex codes)
- Complete discount/promotions system
- Push Notifications with Firebase Cloud Messaging
- Dynamic Firebase project switching (change Firebase credentials anytime)
- Bilingual support (Arabic/English)
- Interactive Leaflet.js maps with OSRM routing for delivery tracking
- Mobile-optimized design with Tailwind CSS

## Recent Changes (Nov 27, 2025)

### Email System - Deferred Implementation ⏳
- **Status:** Disabled for GitHub deployment compatibility
- **Setup in place:** 
  - Gmail settings fields in Settings page (Gmail User, Gmail Password, Admin Email)
  - `sendOrderEmail()` function in firebaseOps.ts
  - Backend endpoint `/api/send-email` configured in server/index.ts
  - Nodemailer package installed
- **Why disabled:** Backend server cannot run alongside frontend on GitHub
- **Future Solutions:**
  1. Use Firebase Cloud Functions (recommended)
  2. Use Resend/SendGrid API
  3. Deploy backend separately (Heroku, Railway, etc.)
  4. Use Zapier/Make webhooks

### Store Settings Cleanup (Nov 27, 2025)
- ✅ Removed duplicate Store Settings section from admin page (profile.tsx)
- ✅ Kept Store Settings only in Settings page (settings.tsx) to eliminate redundancy
- ✅ Removed associated state, functions, and UI from profile.tsx

### Previous Changes (Nov 24-25, 2025)

**Architecture:**
- 🎉 COMPLETE FIREBASE-ONLY TRANSITION
- ✅ **Removed:** Express.js server completely
- ✅ **Removed:** PostgreSQL + Drizzle ORM
- ✅ **Removed:** All server-side API endpoints (except notifications server on PORT 3001)
- ✅ **Added:** Direct Firebase Firestore operations from client
- ✅ **New File:** `client/src/lib/firebaseOps.ts` - All Firebase CRUD operations
- ✅ **Dynamic Firebase Config:** Settings page allows switching Firebase projects anytime

**Push Notifications (Working):**
- Express Server running on PORT 3001 with Firebase Admin SDK
- FCM Token Generation ready
- VAPID Key configured
- Notification API Endpoints:
  - `POST /api/notifications/send-to-admins` - Send to admins
  - `POST /api/notifications/send` - Send to specific users
- Orders automatically trigger admin notifications

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** 
  - React Context API for cart state
  - TanStack React Query for server state
  - Local Storage for cart persistence
- **UI Library:** Radix UI primitives with shadcn/ui components
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Animation:** Framer Motion for transitions
- **Maps:** Leaflet.js with react-leaflet for delivery tracking
- **Database:** Firebase Firestore (cloud-hosted)
- **Authentication:** Firebase Authentication

**Key Components:**
- `MobileWrapper`: Simulates iPhone device
- `BottomNav`: Fixed navigation bar
- `CartProvider`: Global cart state with localStorage
- `NotificationCenter`: Real-time notifications
- `Admin Panel (profile.tsx)`: Tab-based admin interface
- `Settings Page (settings.tsx)`: Firebase & store configuration
- `DeliveryDetails`: Map-based delivery tracking with OSRM routing

### Data Storage

**Firebase Firestore Collections:**
- `products` - Product catalog with images and variants
- `orders` - Customer orders with status tracking
- `discounts` - Product discounts with date ranges
- `shippingZones` - Shipping cost configuration
- `notifications` - Order and system notifications
- `fcmTokens` - Firebase Cloud Messaging tokens
- `settings/firebase` - Firebase project credentials
- `settings/store` - Store branding and configuration (includes Gmail settings)
- `users` - User profiles and roles

### Authentication

**Firebase Authentication:**
- Email/password signup and login
- User ID stored as Firebase UID
- Role-based access (admin/user)
- SN field (8094) gates Firebase Authentication settings visibility

## How to Switch Firebase Projects

1. Navigate to Settings page (`/settings`)
2. Locate "Firebase Configuration" section with 7 input fields
3. Get credentials from your Firebase project:
   - Firebase Console → Project Settings → General tab
   - Copy: API Key, Project ID, App ID, Auth Domain, Storage Bucket, Messaging Sender ID, Measurement ID
4. Update the fields in Settings page
5. Click "Save All Settings"
6. App automatically reloads and connects to new Firebase project ✅

## How to Configure Email System (Future)

Currently disabled for deployment. To enable:

1. **Option 1 - Firebase Cloud Function (Recommended):**
   - Create a Cloud Function that sends emails via Nodemailer or SendGrid
   - Triggered by Firestore document creation
   - Solves GitHub deployment limitation

2. **Option 2 - External Service (Quick):**
   - Connect to Resend or SendGrid
   - Use API keys in environment variables
   - Modify `sendOrderEmail()` function to use HTTP API instead of backend

3. **Option 3 - Separate Backend:**
   - Deploy backend server separately (Railway, Render, Heroku)
   - Update proxy configuration to point to backend URL

## User Preferences

- Communication style: Simple, everyday language, Arabic/English bilingual
- Design: Mobile-first, clean UI with emoji indicators
- Maps: Identical functionality for customers and admins
- File uploads: Prefer Firebase Storage over URL inputs

## Important Notes

- **Frontend-Only on GitHub:** No backend server runs alongside frontend
- **Firebase-Powered:** All data operations use Firestore
- **Dynamic Configuration:** Firebase credentials changeable via Settings
- **Workflow:** Uses `npm run dev` (Vite dev server)
- **Notifications Server:** Separate PORT 3001 process for push notifications (local development only)
- **Deployment:** Frontend-only ready for any static host or Replit Publishing
- **Future Work:** Email system, Cloud Functions integration

## Known Limitations

⏳ **Email System Disabled** - Requires backend server or external service
- Issue: Backend server (PORT 3001) cannot run with frontend on GitHub
- Workaround: Use Firebase Cloud Functions (not yet implemented)
- Impact: Order confirmation emails not sent automatically
