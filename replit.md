# Flux Wallet - E-commerce Mobile App

## Overview

Flux Wallet is a high-fidelity mobile e-commerce application built as a progressive web app. It simulates a modern mobile shopping experience with a wallet interface, product browsing, cart management, and checkout flow. The application uses a mobile-first design approach with a simulated iPhone-style interface wrapper.

**Key Features:**
- Mobile-optimized shopping interface with product catalog
- Shopping cart and checkout with multiple payment options
- Firebase integration for product data management
- Order history tracking
- User profile and settings management
- Responsive mobile wrapper simulating iPhone device

## User Preferences

Preferred communication style: Simple, everyday language.

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

**Design Decisions:**
- **Mobile-First Approach:** The entire UI is wrapped in a `MobileWrapper` component that simulates an iPhone device (390x844px) with notch, status bar, and home indicator
- **Component Architecture:** Atomic design pattern with reusable UI components in `components/ui/`
- **Path Aliases:** Uses TypeScript path mapping (`@/`, `@shared/`, `@assets/`) for clean imports

**Key Components:**
- `MobileWrapper`: Simulates iPhone device chrome and constraints
- `BottomNav`: Fixed navigation bar with active state animations
- `CartProvider`: Global cart state with localStorage persistence
- Product display components with lazy loading and animations

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js
- **Development Server:** Vite dev server with HMR in development
- **Production Build:** ESBuild for server-side bundling
- **Database ORM:** Drizzle ORM configured for PostgreSQL
- **Session Storage:** In-memory storage (MemStorage) with interface for future database integration

**Design Decisions:**
- **Dual Server Setup:** 
  - Development (`index-dev.ts`): Vite middleware for HMR and instant updates
  - Production (`index-prod.ts`): Serves static built assets
- **Storage Abstraction:** `IStorage` interface allows switching between in-memory and database storage without changing business logic
- **API Structure:** RESTful endpoints under `/api/*` namespace
- **Request Logging:** Custom middleware logs API requests with response details and timing

**Server Configuration:**
- Raw body capture for webhook verification (Stripe integration ready)
- JSON body parsing with size limits
- CORS and security headers configured
- Static file serving in production mode

### Data Storage

**Database Schema (Drizzle ORM):**
- `users` table with UUID primary keys, username, and password fields
- Schema validation using Zod for type-safe inserts
- Migration support via `drizzle-kit`

**Current Implementation:**
- In-memory storage for development/testing
- PostgreSQL ready via Drizzle configuration
- LocalStorage for client-side cart persistence

**Storage Strategy:**
- Server-side: Pluggable storage interface (currently MemStorage)
- Client-side: Browser localStorage for cart state
- Future: Database-backed storage with session management

### Authentication

**Firebase Authentication:**
- **Method:** Firebase Auth (client-side authentication)
- **Features:** Email/password signup and login
- **User ID:** Firebase UID stored as `user.id`
- **Session:** Managed by Firebase Auth service
- **Persistence:** User data cached in localStorage
- **Status:** Primary authentication method (Nov 22, 2025)
- **Previous System:** Server-side database authentication (deprecated)

### External Dependencies

**Firebase Integration:**
- **Purpose:** Product catalog management (Firestore) + Authentication (Firebase Auth)
- **Authentication:** Email/password via Firebase Auth service
- **Product Data:** Firestore collections for products and orders
- **Configuration:** Runtime configuration via settings page
- **Credentials:** Project ID, private key, and client email stored in environment
- **Status:** Required for full functionality
- **API Endpoints:** 
  - `/api/firebase/config` - Get/update Firebase config
  - `/api/firebase/status` - Check if Firebase is configured
  - `/api/products` - Get product catalog from Firestore
  - `/api/orders` - Save/retrieve user orders from Firestore

**Third-Party Services:**
- **Stripe:** Payment processing infrastructure (partially integrated)
  - React Stripe.js components available
  - Webhook endpoint structure in place
- **Neon Database:** Serverless PostgreSQL provider (configured but not actively used)

**UI Component Libraries:**
- Radix UI: Accessible, unstyled component primitives
- Lucide React: Icon library
- shadcn/ui: Pre-built component patterns

**Development Tools:**
- Replit plugins for development banner and error overlay
- Vite plugins for cartographer and runtime error handling
- TypeScript for type safety across full stack

**Key Design Patterns:**
- Progressive enhancement: Works without Firebase, falls back to static data
- Graceful degradation: Error states with user-friendly messages
- Configuration-driven: Firebase and external services configurable at runtime
- Type-safe API contracts: Shared types between client and server via `@shared` package