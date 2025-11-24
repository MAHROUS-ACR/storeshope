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

## Architecture Changes (Nov 24, 2025)

**🎉 COMPLETE FIREBASE-ONLY TRANSITION:**
- ✅ **Removed:** Express.js server completely
- ✅ **Removed:** PostgreSQL + Drizzle ORM
- ✅ **Removed:** All server-side API endpoints
- ✅ **Removed:** Node.js dependencies (express, drizzle-kit, passport, etc.)
- ✅ **Added:** Direct Firebase Firestore operations from client
- ✅ **New File:** `client/src/lib/firebaseOps.ts` - All Firebase CRUD operations
- ✅ **Updated:** All pages to use `firebaseOps` instead of REST API calls

**Key Benefits:**
- No server maintenance needed
- Direct client-to-Firestore operations
- Simpler deployment (frontend-only on Replit)
- Real-time data sync with Firestore listeners
- Reduced latency and complexity

## Recent Changes (Nov 24, 2025)

### Firebase-Only Migration Complete
- **Removed Express Server:** All `/api/*` endpoints replaced with direct Firestore calls
- **firebaseOps.ts Module:** Central module for all Firebase operations:
  - `getProducts()` - Fetch products from Firestore
  - `getOrders()` - Fetch orders by user or all orders
  - `getStoreSettings()` - Load store configuration
  - `getShippingZones()` - Fetch shipping zones
  - `getDiscounts()` - Fetch active discounts
  - `saveOrder()` - Create new orders
  - `updateUser()` - Update user profiles
  - And more...
- **Updated Pages:** home.tsx, checkout.tsx now use firebaseOps
- **Workflow:** Now runs `vite dev` only (no Express server)

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** 
  - React Context API for cart state
  - TanStack React Query for server state and data fetching
  - Local Storage for cart persistence
- **UI Library:** Radix UI primitives with shadcn/ui components
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Animation:** Framer Motion for transitions and micro-interactions
- **Database:** Firebase Firestore (cloud-hosted, no backend server)

**Key Components:**
- `MobileWrapper`: Simulates iPhone device chrome and constraints
- `BottomNav`: Fixed navigation bar with active state animations
- `CartProvider`: Global cart state with localStorage persistence
- `NotificationCenter`: Real-time notification bell with dropdown
- **Admin Panel (profile.tsx)**: Tab-based interface for all admin functions

### Data Storage

**Firebase Firestore Collections:**
- `products` - Product catalog with images and variants
- `orders` - Customer orders with status tracking
- `discounts` - Product discounts with date ranges
- `shippingZones` - Shipping cost configuration
- `notifications` - Order and system notifications
- `fcmTokens` - Firebase Cloud Messaging tokens for push notifications
- `settings/store` - Store branding and configuration
- `users` - User profiles and roles

### Authentication

**Firebase Authentication:**
- Email/password signup and login
- User ID stored as Firebase UID
- Role-based access (admin/user)
- No server-side session management needed

### External Services

**Firebase Integration:**
- **Firestore:** Primary database for all data
- **Firebase Auth:** User authentication
- **Firebase Cloud Messaging:** Push notifications
- **Firebase Admin SDK:** (for future backend services if needed)

**Development Stack:**
- **Runtime:** Browser (no Node.js server)
- **Dev Server:** Vite with HMR
- **Build:** Vite ESBuild
- **Port:** 5000

## User Preferences

Preferred communication style: Simple, everyday language.

## Important Notes

- **No Backend Server:** Application runs entirely on Firebase and client-side
- **Direct Firestore Calls:** All data operations are in `firebaseOps.ts`
- **Workflow:** Uses `npm run dev` (Vite dev server) only
- **Deployment:** Frontend-only, can be deployed to any static host or Replit Publishing
- **Future Enhancement:** Can add Cloud Functions for complex operations
