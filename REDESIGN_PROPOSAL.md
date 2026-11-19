# ROADASSIST — MAJOR ARCHITECTURAL REDESIGN PROPOSAL

**Status**: Architecture Discovery & Planning Phase — Source code modifications prohibited until proposal review and explicit approval.

**Priority**: Balanced (architecture quality = complete business workflows = professional UI/UX)
**Approach**: Major architectural redesign — not a superficial rename/move.

---
## 1. EXECUTIVE SUMMARY

This proposal reconsiders the entire ROADASSIST application architecture across 12 major dimensions (entry points/routing, portal boundaries, domain logic, booking lifecycle, backend services, Firebase integration, auth/authorization, ML/AI integration, maps/location, shared UI system, testing/observability, and environment configuration).

The redesign is **incremental and regression-tested**. Existing Firestore data, callable function contracts, authentication behavior, and business safeguards are preserved through adapters and compatibility layers. No features are destructively removed without a separately approved migration.

The proposal consists of:
- **Target architecture** — module responsibilities, dependency boundaries, service interfaces
- **Proposed folder structure** — reorganized for clarity and maintainability
- **Complete workflows** — customer → mechanic → admin journeys with failure handling
- **Migration sequence** — step-by-step compatibility strategy
- **Regression protection** — test coverage, data preservation, rollback strategy
- **Risks and rollback** — identified risks with mitigation
- **Implementation priorities** — phased execution plan

---
## 2. CURRENT FEATURE INVENTORY & REGRESSION BASELINE

Before proposing the target state, we establish the complete feature inventory from the existing codebase:

### 2.1 Public Portal (Marketing/Landing)
- Landing page, Features, Pricing, About, Contact, Onboarding
- Static marketing content

### 2.2 Auth Portal (Firebase Email/Password)
- Login, Signup (customer/mechanic/admin), Forgot password, Verify email
- Role-specific entry points at signup (customer/mechanic/admin)
- Signup writes `role: customer` only — no privileged role assignment from client

### 2.3 Customer Portal
- **Dashboard** (`/app`): Request help, see active request, resume prior
- **Request Help** (`/services`): Towing, battery, tire, fuel, lockout, winch-out
- **Mechanic Guide** (`/guide`): Problem description, safety triage, demo bot interaction
- **Mechanic Directory** (`/mechanics`): Vetted mechanics accepting jobs
- **Mechanic Detail** (`/mechanic/:id`): Ratings, specialties, service area
- **Live Map** (`/map`): Coverage area, start request
- **Track Request** (`/track`/`/track/:id`): Step-by-step rescue following
- **Service History** (`/history`/`/history/:id`): Completed rescues with receipts
- **My Vehicles** (`/vehicles`): Add/manage vehicles, set default
- **Emergency** (`/emergency`): SOS contacts, safety guidance while waiting
- **Notifications** (`/notifications`): Dispatch updates, account notices
- **Profile** (`/profile`): Name, contact, preferences
- **Settings** (`/settings`): Backend status, appearance, data controls

### 2.4 Mechanic Portal
- **Dashboard** (`/m`): Availability, incoming work, active job, earnings
- **Incoming Requests** (`/m/requests`): Offers waiting on decision
- **Active Job** (`/m/job`/`/m/job/:id`): Navigate, update status, complete rescue, billing
- **Job History** (`/m/history`): Completed jobs, newest first
- **Earnings** (`/m/earnings`): Derived from completed-job amounts, read-only
- **Workshop Profile** (`/m/profile`): Garage, coverage, specialties, verification
- **Apply** (`/m/apply`): Workshop application for operations review
- **Notifications** (`/m/notifications`): Assignment and account notices

### 2.5 Admin Portal
- **Operations** (`/admin`): Network health, pending work
- **Dispatch** (`/admin/dispatch`): Read-only operations view
- **Approvals** (`/admin/approvals`): Verify mechanics before first job
- **Mechanics** (`/admin/mechanics`): Applications, approvals, suspensions
- **Users** (`/admin/users`): Accounts on the network
- **Requests** (`/admin/requests`/`/admin/requests/:id`): Live service requests, details
- **Analytics** (`/admin/analytics`): Authoritative aggregates, UTC windows
- **Reports** (`/admin/reports`): CSV exports from live snapshots
- **Notifications** (`/admin/notifications`): Admin inbox
- **Logs** (`/admin/logs`): Operational request activity

### 2.6 Core Business Logic (Firestore-backed)
- **Request lifecycle**: requested → accepted → on-the-way → arrived → service → completed/cancelled
- **Offer system**: Pending offers addressed to mechanics, customer-constrained offers
- **Mechanic records**: Profile, approval status, verification status, specialties, availability, location
- **Vehicle management**: Add/update/delete vehicles, set default
- **Estimates**: Mechanic-submitted repair estimates, customer approve/reject
- **Payment recording**: Offline cash/UPI payment recording for completed jobs
- **Reassignments**: Authorized mechanic reassignment with estimate clearance
- **Staleness detection**: Location freshness thresholds
- **Earnings summarization**: Aggregated from completed jobs

### 2.7 Firebase Integration
- **Auth**: Firebase Auth with email/password, role-specific login flows
- **Firestore**: Documents for users, mechanics, vehicles, requests, offers, notifications, publicMechanics
- **Functions**: Cloud Functions callables (`acceptOffer`, `declineOffer`)
- **Emulators**: Local development with Auth (9099), Firestore (8080), Functions (5001)

### 2.8 ML/AI Integration
- **Rule-based classifier**: `classifyProblem()`, `inferCategory()`, `triageSafety()` — no ML model currently bundled
- **Demo bot**: Conversation flows for battery, flat-tyre, engine-overheating, etc.
- **ML model info**: Metrics held as static artifacts (logistic regression trained on synthetic data)
- **No production ML model integration** — rule-based only

### 2.9 Maps & Location
- **Geolocation**: `requestPosition()`, `useWatchPosition()` — browser geolocation with throttling
- **Distance**: Haversine formula, `kmBetween()`, `distanceKm()`
- **ETA**: Straight-line distance at assumed 30 km/h speed
- **Live tracking**: Throttled location pushes with minimum distance/interval
- **Coverage map**: Leaflet-based map display

### 2.10 Shared UI Component System
- **Button** (primary/secondary/ghost/danger, sm/md/lg)
- **Card**, **Badge**, **PageHeader**, **EmptyState**, **LoadingState**, **ErrorState**
- **DemoNotice**, **Stat**, **MetricCard**, **SectionHeading**
- **Form fields**: Input, Label with hint
- **Modal**, **LinkButton**, **PreviewNotice**
- **Navigation**: Customer nav groups, mechanic tabs, admin tabs, public links
- **Theme**: Light/dark/system preference with localStorage persistence

### 2.11 Testing & Observability
- **Vitest unit tests**: Lib functions (customer, mechanic, dispatch, analytics, etc.)
- **Emulator config**: `vitest.emulator.config.ts` for Firebase emulated environment
- **E2E tests**: Playwright booking journeys, negative journeys, experience
- **Type checking**: `tsc -b --noEmit`
- **Rules checking**: `node scripts/check-rules.mjs`

### 2.12 Configuration & Environment
- **Vite env variables**: `VITE_FIREBASE_*`, `VITE_USE_EMULATORS`
- **Firebase config**: `firebase.json` with emulator ports
- **Environment separation**: `.env.local`, `.env.example`, `.env.emulator`
- **Functions**: Node.js 20 runtime

---
## 3. TARGET ARCHITECTURE

### 3.1 Module Responsibilities & Dependency Boundaries

The application is reorganized into **six core modules** with clear dependency directions (dependencies point inward — toward core domain):

```
┌─────────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER (UI Portals)               │
│  • Customer portal (React components + Router)              │
│  • Mechanic portal (React components + Router)              │
│  • Admin portal (React components + Router)                 │
│  • Public portal (Marketing pages)                          │
└───────────────────────────────┬─────────────────────────────┘
                                │
                      well-defined API contracts
                                │
┌─────────────────────────────────────────────────────────────┐
│              APPLICATION LAYER (Use Cases / UCs)            │
│  • Booking workflow orchestration                           │
│  • Request lifecycle management                             │
│  • Mechanic assignment & coordination                       │
│  • Estimate & payment processing                            │
│  • Navigation & routing                                     │
│  • Notification rendering                                   │
└───────────────────────────────┬─────────────────────────────┘
                                │
                      domain-like interfaces
                                │
┌─────────────────────────────────────────────────────────────┐
│              DOMAIN LAYER (Pure Business Logic)             │
│  • Request status transitions (NEXT_STATUS, RELEASABLE, TERMINAL) │
│  • Billing validation (parseBillingInput, parseEstimateInput) │
│  • Safety triage (triageSafety, EMERGENCY_CAUTION_PATTERNS) │
│  • Category classification (classifyProblem, inferCategory) │
│  • Mechanic access control (accessForRecord)                │
│  • Earnings summarization (summarizeEarnings)               │
│  • Notification routing (isInternalNotificationPath, notificationHref) │
│  • Travel state derivation (travelState, etaMinutes)        │
│  • Geolocation math (kmBetween, shouldPush, distanceKm)     │
│  • Guide/draft validation (validateGuideDraft, buildFallbackReply) │
└───────────────────────────────┬─────────────────────────────┘
                                │
                      data transfer objects (DTOs)
                                │
┌─────────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE LAYER (Firebase adapters)       │
│  • Firestore data-access adapters                           │
│  • Auth state synchronization                               │
│  • Functions callable wrappers                              │
│  • Emulator setup & diagnostics                             │
│  • Firestore rules validation                               │
└─────────────────────────────────────────────────────────────┘
```

**Key principles**:
- **Dependency Rule**: Infrastructure → Domain → Application → Presentation. No circular dependencies.
- **Data Transfer Objects**: DTOs travel across layer boundaries as pure TypeScript interfaces — no framework types leak.
- **Service Interfaces**: Each infrastructure concern exposes a narrow, testable interface (e.g., `firebaseDb()`, `firebaseFunctions()`).
- **Compatibility Layer**: The existing Firebase singletons (`firebaseApp()`, `firebaseAuth()`, `firebaseDb()`, `firebaseFunctions()`) are retained and adapted — no breaking API changes.

### 3.2 Application Entry Points & Routing

**Current**: Single `main.tsx` → `App.tsx` → `BrowserRouter` → `Routes()` with `ROUTE_DEFS`.

**Target**: Retain the single-entry pattern but reorganize route definitions into **portal-scoped route modules** with lazy-loading boundaries.

**Proposed route map reorganization**:

| Portal | Key Changes |
|--------|-------------|
| **Public** | Consolidate under `pages/public/`; add route guards for onboarding completion |
| **Auth** | Split login/signup flows per role; add `/m/waiting` for mechanic application status |
| **Customer** | Reorganize under `pages/customer/`; add `/app/dashboard` as default; preserve all existing paths as aliases |
| **Mechanic** | Reorganize under `pages/mechanic/`; add `/m/capacity` for active-job count display |
| **Admin** | Reorganize under `pages/admin/`; add `/admin/health` for network health snapshot |

**Routing improvements**:
- **Redirect root** `/` → `/onboarding` (new user) or `/login` (returning user)
- **Role-based redirect** post-login: `resolveAuthHome()` logic integrated into route guards
- **Deep-link preservation**: All existing `/request/:id`, `/mechanic/:id`, `/admin/requests/:id` paths preserved exactly
- **Catch-all route** (`*`) → `/` with `replace` for SPA fallback

### 3.3 Portal Boundaries

Each portal gets its own **layout component** with portal-specific navigation, authentication gates, and theming.

| Portal | Layout | Auth Gate | Key Features |
|--------|--------|-----------|--------------|
| **Public** | `PublicLayout` | None | Full public access |
| **Auth** | `AuthLayout` | `RequireAuth` (redirect if already signed in) | Role-specific onboarding |
| **Customer** | `CustomerLayout` | `RequireAuth` + `RequireCustomer` | Dashboard, requests, map, tracking, history, vehicles, profile, settings |
| **Mechanic** | `MechanicLayout` | `RequireAuth` + `RequireMechanic` | Dashboard, jobs, earnings, profile, apply |
| **Admin** | `AdminLayout` | `RequireAuth` + `RequireAdmin` | Operations, dispatch, approvals, users, requests, analytics, reports, logs |

**Layout responsibilities**:
- **Top navigation bar** — portal-specific NAV items from `lib/nav.ts`
- **Sidebar** — where applicable (admin dashboard)
- **Breadcrumbs** — for deep-linked pages
- **Theme provider** — consistent theme across portals
- **Error boundary** — per-portal error handling

### 3.4 Shared Domain & Business Logic

The **domain layer** (currently spread across `src/lib/`) is consolidated with these modules:

1. **`domain/requests.ts`** — Request status lifecycle, transition guards, offer management
2. **`domain/mechanics.ts`** — Mechanic records, access control, application workflow
3. **`domain/estimates.ts`** — Estimate submission, approval/rejection, billing validation
4. **`domain/payments.ts`** — Payment recording, amount validation, payment method handling
5. **`domain/notifications.ts`** — Notification creation, routing, read tracking
6. **`domain/geolocation.ts`** — Distance, ETA, staleness detection, position tracking
7. **`domain/guide.ts`** — Mechanic guide classification, safety triage, demo bot flows
8. **`domain/earnings.ts`** — Earnings summarization, category breakdown, by-day aggregation

Each module exports **pure TypeScript functions** with no framework dependencies — testable in Vitest without Firebase emulators.

### 3.5 Booking Lifecycle & State Management

**Current**: Distributed across `customer.ts` (status types, createRequest, advanceJob), `mechanic.ts` (setAvailability, releaseJob, submitEstimate), `dispatch.ts` (acceptViaDispatch, declineViaDispatch).

**Target**: Single source of truth in the **application layer** with clear state transitions.

**Booking Lifecycle Diagram**:

```
requested
   │
   ├── accepted (mechanic offers acceptance via acceptOffer callable)
   │   │
   │   ├── on-the-way (mechanic en route)
   │   │   │
   │   │   ├── arrived (mechanic marks arrival)
   │   │   │   │
   │   │   │   └── service (estimate submitted & approved)
   │   │   │       │
   │   │   │       ├── completed (customer-approved final amount)
   │   │   │       │   │
   │   │   │       │   └── earnings recorded
   │   │   │       │
   │   │   │       └── cancelled (admin/mechanic/customer)
   │   │   │
   │   │   └── released (mechanic releases job) → requested
   │   │
   │   └── declined (mechanic declines offer)
   │
   └── cancelled (customer cancels while cancellable)
```

**State management improvements**:
- **Normalization**: All status transitions go through `canAdvance()` guard (mirrors firestore.rules)
- **Transaction boundaries**: Every mutation uses Firestore transactions (already true in current code)
- **Recovery hooks**: Staleness detection auto-flags stale locations; admin can recover from failed states
- **Concurrency**: Transaction-guarded all mutations — no race conditions at Firestore level

### 3.6 Backend Service Boundaries

**Current**: Firestore is the primary data store; Cloud Functions handle offer acceptance/decline.

**Target**: Extend service boundaries with explicit **service interfaces** that can be swapped/implemented independently.

| Service | Current | Target |
|---------|---------|--------|
| **Auth** | Firebase Auth direct usage | Adapter layer over firebaseAuth() — swapable for OIDC, magic links |
| **Firestore** | Direct firebaseDb() calls | Repository pattern with mapped DTOs — enables Firestore Lite, Memory DB for tests |
| **Functions** | httpsCallable direct usage |Callable wrapper with circuit breaker, fallback states |
| **Storage** | firebase.storage() usage | Adapter with URL-signing and metadata validation |
| **Emulators** | VITE_USE_EMULATORS flag | Structured emulator configuration per environment |

**Repository pattern example**:
```typescript
// Before (current)
const snap = await getDoc(doc(db, 'requests', id));

// After (proposed)
const request = await requestRepo.findById(id); // returns RequestDTO | null
```

### 3.7 Firebase Integration & Data-Access Architecture

**Current**: Global singletons (`firebaseApp()`, `firebaseAuth()`, `firebaseDb()`, `firebaseFunctions()`) with emulator support.

**Target**: Retain singletons but add **adapters** that normalize the API surface:

1. **`firebaseInit.ts`** — Initialization with config reading, emulator wiring, health checks
2. **`firebaseAuthAdapter.ts`** — `signIn()`, `signUp()`, `signOut()`, `onAuthStateChanged()` with role awareness
3. **`firebaseFirestoreAdapter.ts`** — `doc()`, `collection()`, `query()`, `onSnapshot()` with automatic emulator connection
4. **`firebaseFunctionsAdapter.ts`** — `httpsCallable()` with error classification and retry logic

**Data contract**: All Firestore reads go through **DTO mappers** that convert raw snapshots into domain types. This is the single point of adaptation if the database schema ever evolves.

### 3.8 Authentication & Authorization Boundaries

**Current**: 
- Firebase Auth with email/password
- Client-side role self-assignment at signup (`role: customer`)
- Profile hint read from Firestore (`users/{uid}`) — UI hint only
- Real authority from Firebase ID-token custom claims (not yet implemented) + Firestore rules

**Target**:
- **Preserve** existing signup flow (`role: customer` only)
- **Add** optional custom claim minting path for admin/mechanic elevation (server-side only)
- **Enhance** `RequireCustomer`/`RequireMechanic`/`RequireAdmin` guards to also check Firestore profile + ID-token claims (defense in depth)
- **New**: `authGuard()` factory that combines Firebase Auth state + Firestore profile hint + custom claim verification
- **Never** allow client to write privileged roles — server-side enforcement only

### 3.9 ML Recommendation & AI Mechanic Guide Integration

**Current**: Rule-based classifier (`classifyProblem`, `inferCategory`, `triageSafety`), demo bot conversation flows, static ML model info artifact. No production ML model.

**Target**:
- **Retain** rule-based classifier as **fallback** and **trust boundary** — model output never overrides deterministic triage
- **Add** ML provider abstraction layer (`mlProvider.ts`) with:
  - `classifyProblem(text)` — rule-based (current) + optional model enhancement
  - `getRecommendations(requestId)` — ML-suggested mechanics, ranked by model confidence
  - `parseModelResponse(raw)` — trusted boundary parser (like `parseUntrustedGuideResponse`)
- **Keep** demo bot flows intact — they serve as conversational UI while the ML provider is loading/falling back
- **ML model info** stays as static artifact with parity tests — no runtime model fetching dependency
- **New**: Admin dashboard shows model metrics alongside real-world performance indicators (acceptance rate, ETA accuracy)

### 3.10 Maps & Location Services

**Current**: Browser geolocation with throttling, haversine distance, straight-line ETA, Leaflet map.

**Target**:
- **Retain** existing geolocation primitives (`requestPosition`, `useWatchPosition`, `shouldPush`, `kmBetween`)
- **Add** **map provider abstraction** (`mapProvider.ts`):
  - `MapProvider` interface with `initMap`, `addMarker`, `updateMarker`, `fitBounds`, `polyline`, `getRoute`
  - **Leaflet** implementation (current) — can swap to Mapbox, Google Maps without affecting UI
  - **Coordinates** remain opaque — any provider that returns `{lat, lng}` works
- **ETA formula** remains: straight-line distance at 30 km/h with disclaimer
- **Staleness threshold** remains: 5 minutes (`LOCATION_STALE_MS`)
- **New**: **Spatial query** helper for "mechanics near request" — currently implicit in `watchPublicMechanics` query, made explicit

### 3.11 Shared UI Component System & Design Language

**Current**: TailwindCSS with custom theme tokens (safety-500, cream, steel-300, graphite-soft, grease-soft, danger). Component library in `src/components/ui.tsx` and `src/components/`.

**Target**:
- **Expand** design token system with a **`src/styles/`** configuration:
  - `tokens.css` — CSS custom properties for colors, spacing, typography, radius, shadows
  - `theme.ts` — extended to support `preset: 'safety' | 'graphite' | 'cream' | 'dark' | 'system'`
  - `responsive.ts` — breakpoints and container queries utilities
- **Component upgrades**:
  - All components use CSS custom properties from tokens — theming is dynamic, not hard-coded
  - **Accessibility** (a11y) audit: focus visible, ARIA labels, color contrast, keyboard navigation
  - **Responsive**: All layouts adapt mobile → tablet → desktop
  - **New components**: Alert banner, Status pill, Action stack, Progress stepper
- **Design system docs**: Markdown catalog of components, variants, and accessibility assertions

### 3.12 Testing & Observability Architecture

**Current**: Vitest unit tests for lib functions, Playwright E2E for journeys, rules checks, type checking.

**Target**:
- **Unit tests**: Expanded coverage for domain layer (100% pure functions — no Firebase deps)
- **Integration tests**: Vitest with Firebase emulators (`vitest.emulator.config.ts`)
- **E2E tests**: Playwright with separate test environments (demo mode → live mode)
- **Observability**:
  - **Structured logging**: `src/lib/logger.ts` — correlation IDs, request tracing
  - **Metrics**: Custom metrics exposed via `src/lib/metrics.ts` (request counts, success rates, latency)
  - **Health checks**: `/api/health` endpoint (if functions backend) or Firestore connectivity probe
- **CI/CD gates**:
  - `typecheck` → `test` (unit + emulator) → `test:e2e` → `lint:rules`
  - **Mutation testing** optional: `npm run test:mutation`
  - **Coverage threshold**: 80% for domain layer, 70% for application layer

### 3.13 Configuration & Demo/Live Environment Separation

**Current**: 
- Vite env variables (`VITE_FIREBASE_*`, `VITE_USE_EMULATORS`)
- `.env.local`, `.env.example`, `.env.emulator`
- Firebase emulators toggled via env flag

**Target**:
- **Three-environment model**:
  1. **demo** — No Firebase connection; uses mock data fixtures (`src/lib/fixtures.ts`)
  2. **emulator** — Local Firebase emulators (default for development: `VITE_USE_EMULATORS=true`)
  3. **live** — Production Firebase project (no emulator flag)
- **Environment config** (`src/env.ts`): Read-only, type-safe env variable validation at startup
- **Feature flags** per environment (feature flags as code, not just env vars):
  - `DEMO_MODE` — serves fixture data instead of Firestore
  - `ML_ENHANCED` — enables model-enhanced classification (offline model only)
  - `MAP_PROVIDER` — `leaflet` | `mapbox` | `google`
- **Build profiles** (`vite.config.ts`): `demo`, `emulator`, `live` — each with appropriate plugins and env defaults

---
## 4. PROPOSED FOLDER STRUCTURE

```
src/
├── app/                    # App root: AuthProvider, ErrorBoundary, main entry
├── layouts/                # Portal layouts (PublicLayout, CustomerLayout, MechanicLayout, AdminLayout, AuthLayout)
├── pages/                  # Portal-specific pages (organized by portal)
│   ├── public/             # Marketing/landing pages
│   ├── auth/               # Login, Signup, Forgot, Verify
│   ├── customer/           # Customer portal pages
│   ├── mechanic/           # Mechanic portal pages
│   └── admin/              # Admin portal pages
├── domains/                # Pure business logic (no framework deps)
│   ├── requests.ts         # Request lifecycle, status transitions, offers
│   ├── mechanics.ts        # Mechanic records, access, application
│   ├── estimates.ts        # Estimate submission, approval, billing
│   ├── payments.ts         # Payment recording, validation
│   ├── notifications.ts    # Notification creation, routing, read tracking
│   ├── geolocation.ts      # Distance, ETA, staleness, position math
│   ├── guide.ts            # Mechanic guide classification, safety triage, demo bot
│   └── earnings.ts         # Earnings summarization, breakdowns
├── infra/                  # Firebase adapters & infrastructure
│   ├── firebase.ts         # Initialization, singletons, emulator wiring
│   ├── authAdapter.ts      # Auth sign-in/sign-up/sign-out adapters
│   ├── dbAdapter.ts        # Firestore DTO-mapped data access
│   ├── functionsAdapter.ts # Callable wrappers with error handling
│   └── mapProvider.ts      # Map provider abstraction
├── lib/                    # Supporting utilities (can overlap with domains)
│   ├── cn.ts               # Class name composition
│   ├── theme.ts            # Theme preference & application
│   ├── nav.ts              # Navigation definitions (portals)
│   ├── ui.tsx              # UI components (Button, Card, Badge, etc.)
│   ├── fixtures.ts         # Mock data for demo mode
│   ├── mlModelInfo.ts      # ML model metadata (static artifacts)
│   ├── analytics.ts        # Aggregation over request/offer snapshots
│   ├── geolocation.ts      # Browser geolocation hooks
│   ├── mapProvider.ts      # Map provider (moved from components?)
│   └── ... (other utilities)
├── components/             # Presentational UI (reorganized)
│   ├── ui/                 # Base components (Button, Input, Badge, etc.)
│   ├── layout/             # Layout components (Header, Sidebar, etc.)
│   ├── forms/              # Form components (Field, Input, Select, etc.)
│   ├── displays/           # Stat, MetricCard, EmptyState, etc.
│   ├── navigation/         # Portal nav components
│   └── modals/             # Modal, ConfirmationDialog, etc.
├── scripts/                # Operational scripts (unchanged)
├── styles/                 # Design tokens and global styles
│   ├── tokens.css          # CSS custom properties
│   ├── variables.css       # Theme variables
│   └── global.css          # Base styles, Tailwind directives
├── types/                  # Augmented types and re-exports
│   ├── firebase.ts         # Firebase singleton types
│   ├── domain.ts           # Domain DTO interfaces
│   ├── routes.ts           # Route type definitions
│   └── ml.ts               # ML model info types
├── env.ts                  # Env variable validation & defaults
└── observability/          # Logging, metrics, health checks
    ├── logger.ts
    ├── metrics.ts
    └── health.ts
```

**Key reorganization points**:
- `domains/` replaces `lib/` as the primary place for pure business logic
- `infra/` centralizes all Firebase adapter code
- `pages/` subdirectory per portal (preserving all existing route paths)
- `styles/` separates design tokens from component-level styles
- `observability/` adds structured logging/metrics infrastructure
- `types/` houses shared TypeScript interfaces

---
## 5. COMPLETE WORKFLOWS

### 5.1 Customer Journey: From Breakdown to Completed Rescue

**Step 1**: User lands on `/` (Landing) or `/onboarding` — new user flow.
- **New user**: Signup → email verification → role selection → home redirect
- **Returning user**: Login → `resolveAuthHome(role)` → `/app` (customer) or `/m` (mechanic) or `/admin`

**Step 2**: User describes problem — `/guide` (Mechanic Guide page).
- User fills form → `classifyProblem(text)` → category + safety triage
- Demo bot conversation optional (`startDemoBotScenario`, `answerDemoBotScenario`)
- `validateGuideDraft(draft, vehicles, safety)` validates before submission

**Step 3**: User confirms — `/request` (New Request page).
- Vehicle selection → location (manual or browser `requestPosition()`)
- `createRequest(customerId, buildRequestPayload(...))` → writes to Firestore
- `watchRequest(id, cb)` subscribes to real-time updates

**Step 4**: Mechanics see offer — `watchPublicMechanics(cb)` shows available mechanics.
- Customer sees mechanic directory — `/mechanics` → `watchPublicMechanics`
- Customer can select mechanic or let system assign first available

**Step 5**: Offer acceptance — Two paths:
- **Path A (Dispatch)**: Customer clicks "Request Help" → `acceptViaDispatch(requestId)` callable
- **Path B (Mechanic-initiated)**: Mechanic claims offer → server-side assignment

**Step 6**: Job lifecycle tracking.
- Request status advances: `requested` → `accepted` → `on-the-way` → `arrived` → `service` → `completed`/`cancelled`
- Live map updates via `useWatchPosition` throttled pushes
- ETA calculated via `etaMinutes(remainingKm)` with disclaimer
- Staleness: `isStale(updatedAtMs)` — stale locations shown with warning

**Step 7**: Estimate submission (mechanic only).
- Mechanic submits estimate via `/m/job` UI → `submitEstimate(id, mechanicId, diagnosis, amount, duration)`
- Customer approves/rejects via `approveRejectEstimate(id, customerId, decision)`
- Estimate lifecycle: `pending` → `approved` | `rejected`; rejected → can resubmit

**Step 8**: Completion & billing.
- When status → `completed`:
  - Estimate must be `approved` (enforced by `advanceJob` guard)
  - Amount/duration validated via `parseBillingInput(amount, duration)`
  - Payment recorded via `recordPayment(id, actorUid, method, amount)` (offline cash/UPI)
  - Earnings updated: `summarizeEarnings(items)`

**Step 9**: Post-rescue.
- Customer sees receipt in `/history/:id` — rating, comment, final amount
- Mechanic sees earnings in `/m/earnings`
- Both receive notification; marks read via `markNotificationRead(uid, id)` / `markAllNotificationsRead(uid, ids)`

**Step 10**: Profile & settings management.
- Vehicle management: `listVehicles(ownerId)`, `addVehicle(...)`, `updateVehicle(...)`, `deleteVehicle(...)`, `setDefaultVehicle(id, previousDefaultId)`
- Profile update: `getProfile(uid)`, `updateProfile(uid, patch)`
- Settings: theme preference (`saveThemePreference(pref)`), backend status toggle

**Failure handling at each step**:
- Network error → UI shows `ErrorState` with retry action
- Firestore permission-denied → UI explains "Sign in again" or "Contact operations"
- Validation error → inline feedback via `ErrorState` or inline error messages
- Stale location → `WarningBanner` with "Update location" button
- Estimate rejected → customer can resubmit request or choose different mechanic

### 5.2 Mechanic Journey: From Available to Earnings

**Step 1**: Mechanic logs in → `/m` (Dashboard).
- Dashboard shows: Availability toggle, incoming offer count, active job status, earnings summary
- `watchMyMechanicRecord(uid, cb)` — profile + approval status
- `watchMyActiveJobs(mechanicId, cb)` — active jobs with status
- `watchMyOffers(mechanicId, cb)` — pending offers with countdowns

**Step 2**: Mechanic reviews incoming offers — `/m/requests`.
- `watchIncoming(cb, mechanicUid)` — offers awaiting decision
- Each offer shows: Request details, ETA, customer location, offer expiry countdown (`offerCountdown(expiresAtMs)`)
- Mechanic accepts via `acceptViaDispatch(requestId)` → callable handles offer ownership, expiry, eligibility
- Mechanic declines via `declineViaDispatch(requestId)` → callable marks offer declined

**Step 3**: Mechanic accepts offer → navigates to `/m/job`.
- Active job page shows: Customer details, problem description, live location tracking, navigation
- Mechanic updates status: `accepted` → `on-the-way` → `arrived` → `service`
- Each status update is a transaction-gated Firestore write via `advanceJob(id, to)` 
- Location push: `pushMechanicLocation(uid, lat, lng)` — throttled by `shouldPush()`

**Step 4**: Estimate submission.
- While job is `service` status, mechanic submits estimate via `submitEstimate(id, mechanicId, diagnosis, amount, duration)`
- Customer approves/rejects estimate
- If rejected, mechanic can revise and resubmit (estimateStatus returns to `pending`)

**Step 5**: Job completion.
- Mechanic marks `completed` → `advanceJob(id, 'completed', { amountCents, durationMin })`
- Transaction also decrements `mechanicCounters.activeJobCount`
- Customer approves final amount → `finalAmountStatus` set
- Payment recorded if not already done

**Step 6**: History & earnings.
- `/m/history` — `watchMyJobHistory(mechanicId, cb)` — completed jobs
- `/m/earnings` — `mechanicPerf(myJobs, myOffers)` — acceptance rate, completion rate, earnings summary
- Export earnings data or view CSV via admin reports

**Failure handling**:
- Offers expire → offer status → `expired`, removed from queue
- Mechanic goes offline → `isAvailable` flag toggles offer visibility
- Stuck in a status → Admin can recover via reassignment (`reassignMechanic(requestId, newMechanicId, reason, actorId)`)
- Location unavailable → UI shows manual coordinate entry fallback

### 5.3 Admin Journey: Operations Oversight

**Step 1**: Admin logs in → `/admin` (Dashboard).
- Network health snapshot: active requests, online mechanics, system status
- Quick stats: total requests today, completion rate, average earnings

**Step 2**: Monitor live requests — `/admin/requests`.
- List of all live requests with status, location, assigned mechanic
- Filter by status, category, priority
- Click `/admin/requests/:id` → detailed view

**Step 3**: Request detail & actions.
- View full request lifecycle
- **Reassign mechanic**: `reassignMechanic(requestId, newMechanicId, reason, actorId)` — releases old mechanic, clears estimate, assigns new
- **Override status**: Admin can force status transitions (bypass normal guards for recovery)
- **Add estimate/admin note** if needed

**Step 4**: Mechanic approvals — `/admin/approvals`.
- Pending mechanic applications awaiting verification
- Approve/reject with comments → writes `approvalStatus` on mechanic record
- Newly approved mechanic gains access to mechanic portal

**Step 5**: User & mechanic management — `/admin/users` / `/admin/mechanics`.
- Search, filter, suspend/activate users/mechanics
- Suspension writes `verificationStatus: 'suspended'` on mechanic record or custom claim on user
- View audit trail of all changes

**Step 6**: Analytics & reports — `/admin/analytics` / `/admin/reports`.
- `statusCounts(requestRows)` — completion rate, cancellation rate by day/category
- `earnings(requestRows)` — total revenue, by category, by day
- `demand(requestRows)` — request volume by hour UTC, by category
- `mechanicPerf(myJobs, myOffers)` — per-mechanic performance
- `estimatePaymentSummary(rows)` — estimate/payment financial summary
- CSV export: `toCsv(headers, rows)` / `downloadCsv(filename, csv)`

**Step 7**: System logs — `/admin/logs`.
- Operational activity: request status changes, mechanic assignments, approvals, recoveries
- Searchable, filterable, time-windowed

**Failure handling**:
- Admin actions logged audit trail — no "silent" changes
- Permission gated: All admin actions require `RequireAdmin` + custom claim verification
- Recovery actions have "reason" field for accountability
- Rollback: Admin can reverse most actions with documented reason

---
## 6. MIGRATION SEQUENCE & COMPATIBILITY STRATEGY

### 6.1 Preservation First

**What MUST be preserved** (no changes without separately approved migration):
1. **Firestore data**: All existing documents in `users`, `mechanics`, `vehicles`, `requests`, `offers`, `notifications`, `publicMechanics` collections
2. **Callable function contracts**: `acceptOffer` and `declineOffer` callable signatures and behavior
3. **Authentication behavior**: Firebase Auth sign-in/sign-up flows, email verification, password reset
4. **Business safeguards**: Status transition guards, billing bounds (`MAX_AMOUNT_CENTS`, `MAX_DURATION_MIN`, `MAX_ESTIMATE_AMOUNT_CENTS`), role restrictions at signup
5. **Firestore security rules**: Existing rules must not break — any schema changes must maintain backward compatibility
6. **Type exports**: All public type exports from `src/lib/` must remain importable at same paths

### 6.2 Adapter-Layer Migration Approach

**Phase 1 — Foundation (Week 1-2)**
- [ ] Add `src/env.ts` with env variable validation
- [ ] Create `src/infra/firebase.ts` — retained singletons with enhanced emulator wiring
- [ ] Create `src/domains/` directory with pure function extracts from `src/lib/`
- [ ] Move existing lib functions into domains with no Firebase imports
- [ ] Update all internal imports to go through adapter layers

**Phase 2 — API Stabilization (Week 3-4)**
- [ ] Create `src/infra/authAdapter.ts` — wrap `firebaseAuth()` with signIn/signOut/signUp adapters
- [ ] Create `src/infra/dbAdapter.ts` — DTO-mapped Firestore access (thin layer over `firebaseDb()`)
- [ ] Create `src/infra/functionsAdapter.ts` — callable wrappers with error classification
- [ ] Update all page components to use adapters instead of direct Firebase calls
- [ ] Run full test suite — confirm 100% parity with baseline

**Phase 3 — Portal Reorganization (Week 5-8)**
- [ ] Reorganize `src/pages/` into portal subdirectories (public, auth, customer, mechanic, admin)
- [ ] Update `src/routes.tsx` — route definitions remain import-path-identical; internal paths unchanged
- [ ] Update layout components — add portal-specific NAV, authentication gates
- [ ] Preserve all existing route paths (`/app`, `/m`, `/admin`, `/mechanic/:id`, etc.)
- [ ] Add new layout chrome (breadcrumbs, themed footers) without altering page content

**Phase 4 — UI/UX Enhancement (Week 9-12)**
- [ ] Expand design tokens in `src/styles/tokens.css`
- [ ] Update UI components for accessibility (a11y) and responsiveness
- [ ] Add new components (Alert, StatusPill, Stepper) alongside existing ones
- [ ] Theme system: add `preset` support, CSS custom properties for dynamic theming
- [ ] Add ML provider abstraction (`src/infra/mlProvider.ts`) — rule-based fallback first

**Phase 5 — Observability & Testing (Week 13-16)**
- [ ] Add `src/observability/logger.ts` and `src/observability/metrics.ts`
- [ ] Expand Vitest coverage to domain layer (100% pure functions)
- [ ] Add integration tests with Firebase emulators
- [ ] Update Playwright E2E tests for new portal navigation
- [ ] Run full CI/CD gate: typecheck → test → test:e2e → lint:rules

**Phase 6 — Demo/Live Separation (Week 17-20)**
- [ ] Implement `DEMO_MODE` feature flag
- [ ] Create mock data fixtures in `src/lib/fixtures.ts` matching current Firestore schema
- [ ] Add `src/env.ts` environment profile (`demo`/`emulator`/`live`)
- [ ] Configure Vite build profiles for each environment
- [ ] Document environment setup for new developers

### 6.3 Compatibility Matrix

| Feature | Current Import | Migration Target | Compatibility |
|---------|---------------|------------------|---------------|
| `firebaseApp()` | `src/lib/firebase` | `src/infra/firebase.ts` → re-export | 100% — same API |
| `firebaseAuth()` | `src/lib/firebase` | Same — wrapped by authAdapter | 100% — same API |
| `firebaseDb()` | `src/lib/firebase` | Same — wrapped by dbAdapter | 100% — same API |
| `firebaseFunctions()` | `src/lib/firebase` | Same — wrapped by functionsAdapter | 100% — same API |
| `createRequest()` | `src/lib/customer` | Same — internal impl unchanged | 100% |
| `acceptViaDispatch()` | `src/lib/dispatch` | Same — callable wrapper unchanged | 100% |
| `classifyProblem()` | `src/lib/mlModelInfo` → actually `src/lib/mechanicGuide` | Moved to `src/domains/requests.ts` re-export | 100% — same export path |
| `Button` component | `src/components/ui.tsx` | Same — expanded with tokens | 100% — same component API |
| `ROUTE_DEFS` | `src/routes.tsx` | Same structure, reorganized pages | 100% — all path strings unchanged |
| `CUSTOMER_NAV` | `src/lib/nav.ts` | Same — expanded with admin nav groups | 100% — same export shape |

### 6.4 Rollback Strategy

**If any phase introduces regressions**:

1. **Feature flag gate**: All new code behind `DEMO_MODE` flag — toggle off to revert
2. **Git revert**: Each phase is a bounded branch — `git revert <phase-commit>` undoes changes
3. **Snapshot restore**: Firestore data snapshots taken before each phase — can restore via Firebase console
4. **Build rollout**: Vite build artifacts preserved — `npm run preview` on prior build if needed
5. **Database rules**: Firestore rules can be restored from `firestore.rules` backup if schema migration fails

**Rollback test**: Before each phase deployment, run full test suite against emulator. If any test fails, halt and revert.

---
## 7. RISKS & MITIGATIONS

### 7.1 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|-----------|
| R1 | **Firestore rules breakage** — schema changes inadvertently conflict with existing rules | Medium | High | Rules changes in separate PR; rules unit tests run on every commit; backward-compatible field additions only |
| R2 | **Authentication regression** — sign-in/sign-up flows break due to adapter layer | Low | High | Auth adapter preserves exact `firebaseAuth()` API; emulator tests cover full flow; gradual rollout |
| R3 | **Offer/expiry logic drift** — `acceptViaDispatch` behavior changes | Low | High | Contract-test the callable function; emulator tests with edge cases (expired, alreadyTaken, permission-denied) |
| R4 | **ML model misclassification** — new classifier changes category assignments | Low | Medium | Rule-based classifier retained as fallback; A/B test with live data; model enhancements opt-in via feature flag |
| R5 | **Performance degradation** — additional query layers slow down Firestore reads | Medium | Medium | DTO mapping is in-memory only; queries still go direct to Firestore; profile before/after benchmarks |
| R6 | **UI regression** — component changes break existing layouts | Medium | Medium | Visual regression testing with Playwright; component tests preserve API surface; Tailwind config unchanged |
| R7 | **Data loss during migration** — Firestore documents corrupted | Low | Critical | Pre-migration snapshots; migration scripts are idempotent; rollback from snapshots |
| R8 | **Environment confusion** — developers running against production by mistake | Medium | Medium | `VITE_USE_EMULATORS` default off; `src/env.ts` validates config at startup; warning banner if misconfigured |

### 7.2 Mitigation Summary

- **All Firestore mutations go through transactions** — already true in codebase
- **Every new function is pure-tested first** — Vitest without emulators, then emulator tests
- **Adapters are transparent** — same exported signatures, internal implementation changed
- **Feature flags gate all new behavior** — can disable if issues arise
- **Full test suite must pass before any merge** — CI gate enforced
- **Rollback snapshots before each phase** — database backup strategy documented

---
## 8. IMPLEMENTATION PRIORITIES (Phased Roadmap)

### Phase 0 — Preparation (2 days)
- [ ] Approve this proposal
- [ ] Set up feature branch: `git checkout -b redesign/planning`
- [ ] Create feature flag scaffold in `src/env.ts`
- [ ] Take Firestore snapshots for backup

### Phase 1 — Domain Extraction (1 week)
- [ ] Extract pure functions from `src/lib/` into `src/domains/`
- [ ] Create adapter layer stubs in `src/infra/`
- [ ] Update all internal imports; run `npm run typecheck` — fix any breakage
- [ ] Run `npm test` — confirm 100% function parity

### Phase 2 — Adapter Stabilization (2 weeks)
- [ ] Implement `firebaseAuthAdapter.ts` with signIn/signUp/signOut
- [ ] Implement `dbAdapter.ts` with DTO-mapped CRUD
- [ ] Implement `functionsAdapter.ts` with callable wrappers
- [ ] Update all page components to use adapters
- [ ] Run full test suite — fix any integration issues

### Phase 3 — Portal Reorganization (2 weeks)
- [ ] Reorganize `src/pages/` into subdirectories
- [ ] Update `src/routes.tsx` — route defs remain path-identical
- [ ] Create portal layouts with NAV and auth gates
- [ ] Preserve all existing URL paths exactly
- [ ] Run e2E tests — confirm journeys still work

### Phase 4 — UI/UX Enhancement (2 weeks)
- [ ] Expand design tokens in `src/styles/tokens.css`
- [ ] Update components for accessibility (focus visible, color contrast, ARIA)
- [ ] Add responsive improvements (mobile-first media queries)
- [ ] Add new components alongside existing (no breaking changes)
- [ ] Theme system: `preset` support, CSS custom properties

### Phase 5 — ML & Guide Enhancement (1 week)
- [ ] Create `src/infra/mlProvider.ts` with rule-based fallback
- [ ] Integrate ML model info display in admin dashboard
- [ ] Add demo bot flows preserved, ML enhancement opt-in via flag

### Phase 6 — Observability & Testing (2 weeks)
- [ ] Add `src/observability/` with logger and metrics
- [ ] Expand Vitest coverage to domain layer
- [ ] Add emulator-integration test suite
- [ ] Update Playwright E2E tests for new navigation
- [ ] CI/CD gate: typecheck → test → test:e2e → lint:rules

### Phase 7 — Demo/Live Separation (1 week)
- [ ] Implement `DEMO_MODE` feature flag
- [ ] Create mock fixtures matching Firestore schema
- [ ] Configure Vite build profiles (`demo`, `emulator`, `live`)
- [ ] Documentation for developers on environment setup

### Phase 8 — Final Review & Launch (1 week)
- [ ] Full regression test suite against emulator
- [ ] Performance benchmarking (query latencies, bundle size)
- [ ] Accessibility audit (a11y tools)
- [ ] Final typecheck + lint rules
- [ ] Merge to main with feature flag OFF by default
- [ ] Deploy to demo environment first, then emulator, then live

**Total estimated timeline**: 8 weeks from approval to production-ready redesign.

---
## 9. CONCLUSION

This proposal delivers a **balanced major architectural redesign** that addresses all 12 dimensions requested — from entry points and routing through to testing and environment separation — without sacrificing existing functionality.

**Key guarantees**:
1. **Zero feature loss** — every existing page, route, and workflow is preserved with exact path compatibility
2. **Incremental implementation** — 8-phase plan with rollback at each step
3. **Regression-tested** — full test suite must pass before each phase merge
4. **Architecture quality** — clear module boundaries, dependency inversion, service interfaces
5. **Professional UI/UX** — expanded design system, accessibility, responsive layouts
6. **Complete workflows** — customer, mechanic, and admin journeys addressed with failure handling

The redesign uses **adapter layers** to preserve all existing APIs, callable contracts, Firestore data, and authentication behavior. No destructive rewrites are performed. The target architecture is designed for maintainability, testability, and future extensibility (ML providers, map provider swaps, additional portals).

**Next step**: This proposal must be reviewed and explicitly approved before any source code modifications begin. Upon approval, Phase 0 begins immediately.

---
*Document generated during architecture discovery phase. No source code was modified during proposal creation.*