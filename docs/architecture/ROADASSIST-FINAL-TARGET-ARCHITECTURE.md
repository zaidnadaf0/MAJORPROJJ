# ROADASSIST — TARGET ARCHITECTURE

## Status: Proposed Architecture for Major Redesign

**Dependency Rule**: Presentation ← Application ← Domain ← Infrastructure Adapters ← Infrastructure SDK

**Domain is completely independent**: Zero Firebase imports, Zero React imports (except pure types if absolutely needed), Zero TailwindCSS/css class dependencies. Pure TypeScript functions — testable in Vitest without emulators.

**Infrastructure implements interfaces required by inner layers**: Adapters translate between Domain DTOs and Firebase SDK types. SDK remains the single source of truth for Firestore operations.

**Environment Configuration is set at build time**: Mode: demo | emulator | live. Immutable after build initialization. Feature flags are runtime toggles independent of mode.

---

## 1. Seven-Layer Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│               1. PRESENTATION LAYER (UI Portals)              │
│  • Customer portal React components + React Router            │
│  • Mechanic portal React components + React Router           │
│  • Admin portal React components + React Router              │
│  • Public portal (marketing pages: Landing, Features, Pricing,  │
│    About, Contact, Onboarding)                               │
│  • Responsibility: Render UI, capture user input, delegate     │
│    to Application layer, display results. No business logic.   │
│  • Dependencies: Application layer only.                      │
│  • Framework: React 18 + React Router 7 + TailwindCSS         │
│  • Portal-specific NAV: CUSTOMER_NAV, MECHANIC_NAV, ADMIN_NAV, │
│    PUBLIC_LINKS (from nav.ts, re-exported from infra/)        │
└──────────────────────────────────────────────────────────────┘
                                │ depends on
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               2. APPLICATION LAYER (Use Cases / UCs)          │
│  • Booking workflow orchestration                            │
│  • Request lifecycle coordination                             │
│  • Mechanic assignment coordination                           │
│  • Estimate & payment processing orchestration               │
│  • Navigation & routing                                       │
│  • Notification rendering                                     │
│  • Responsibility: Coordinate between Domain and Infrastructure │
│    • No direct Firestore/Function calls                      │
│    • Pure use-case logic (no framework types)                 │
│    • Dependencies: Domain layer only                         │
└──────────────────────────────────────────────────────────────┘
                                │ depends on DTOs
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               3. DOMAIN LAYER (Pure Business Logic)           │
│  • 12 valid states + complete state machine (Section 5)       │
│  • Request status transitions (NEXT_STATUS, RELEASABLE, TERMINAL)│
│  • Billing validation (parseBillingInput, parseEstimateInput)   │
│  • Safety triage (triageSafety, EMERGENCY_CAUTION_PATTERNS)    │
│  • Category classification (classifyProblem, inferCategory)     │
│  • Mechanic access control (accessForRecord)                  │
│  • Earnings summarization (summarizeEarnings)                 │
│  • Notification routing (isInternalNotificationPath,           │
│    notificationHref)                                          │
│  • Travel state derivation (travelState, etaMinutes)          │
│  • Geolocation math (kmBetween, shouldPush, distanceKm)       │
│  • Guide/draft validation (validateGuideDraft, buildFallbackReply)│
│  • Complete state machine with all invariants (Section 5)      │
│  • Responsibility: Pure TypeScript functions, NO framework     │
│    types, NO Firebase imports, NO framework assumptions.       │
│  • Testable in Vitest without emulators.                      │
│  • Dependencies: Zero — completely independent.               │
└──────────────────────────────────────────────────────────────┘
                                │ depends on DTOs
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               4. INFRASTRUCTURE ADAPTERS                     │
│  • Firestore DTO-mapped data access                         │
│  • Auth state synchronization adapters                       │
│  • Functions callable wrappers with error classification       │
│  • Map provider abstraction                                  │
│  • Notification routing adaptation                           │
│  • Responsibility: Translate between Domain DTOs and           │
│    Firebase SDK types. Add emulator support, environment       │
│    configuration, and testability hooks.                     │
│  • Dependencies: Domain layer (DTOs only). Implements         │
│    interfaces required by Application layer.                  │
└──────────────────────────────────────────────────────────────┘
                                │ implements SDK
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               5. INFRASTRUCTURE SDK (Firebase)               │
│  • firebaseApp(), firebaseAuth(), firebaseDb(),              │
│    firebaseFunctions() singletons                           │
│  • Firestore SDK, Auth SDK, Functions SDK                    │
│  • Realtime listeners, transactions, callable contracts       │
│  • Responsibility: Raw Firebase operations only.             │
│  • Dependencies: None above — used by Adapters only.         │
└──────────────────────────────────────────────────────────────┘
                                │ environment
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               6. EMULATOR LAYER                              │
│  • Local Firebase emulators (Auth 9099, Firestore 8080,       │
│    Functions 5001)                                          │
│  • Controlled via VITE_USE_EMULATORS flag                   │
│  • Responsibility: Enable local development and testing       │
│    without production project access.                        │
│  • Dependencies: SDK (layer 5) activated when flag is true.   │
└──────────────────────────────────────────────────────────────┘
                                │ build profile
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               7. ENVIRONMENT CONFIGURATION                   │
│  • DEMO mode — no Firebase connection; mock data fixtures     │
│    (`src/lib/fixtures.ts`)                                  │
│  • EMULATOR mode — local Firebase emulators active           │
│  • LIVE mode — production Firebase project                 │
│  • Set at Vite build time: `vite build --mode demo/emulator/live` │
│  • Feature flags (runtime): DEMO_MODE, ML_ENHANCED, MAP_PROVIDER│
│    (leaflet | mapbox | google), ADMIN_RECOVERY              │
│  • Responsibility: Prevent accidental production access      │
│    during development. Environment config is                 │
│    immutable after build; feature flags are runtime toggles.  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Dependency Rules (Formal)

```
1. Presentation ← Application ← Domain ← Infrastructure Adapters
   ↑                                                                     |
   |                                                                     |
   +-------------------------------------------+------------------------+
                                           Infrastructure SDK (Firebase)
                                           - Used ONLY by Adapters
                                           - No direct import by Presentation/
                                             Application/Domain layers
                                           
2. Domain layer is completely independent:
   - No Firebase imports (verified: zero Firebase imports in `src/domains/`)
   - No React imports (except possibly pure type exports like `RoutePageProps`)
   - No TailwindCSS or CSS class dependencies
   - Functions are pure: output depends only on input
   - Testable in Vitest without emulators (verified: all domain tests run in node env)
   
3. Infrastructure Adapters depend on:
   - Domain DTOs (for request/response shape)
   - Infrastructure SDK (Firebase) — via configuration flag
   - Environment config (emulator vs. live)
   
4. Environment Configuration is set at build time:
   - Mode: demo | emulator | live
   - Immutable after build initialization
   - Feature flags are runtime toggles independent of mode
```

---

## 3. Target Folder Structure

```
src/
├── app/                    # App root: AuthProvider, ErrorBoundary, main entry
│   ├── AuthProvider.tsx
│   └── main.tsx
├── domains/                # Pure business logic (NO framework deps)
│   ├── stateMachine.ts     # 12-state booking state machine + invariants
│   ├── requests.ts         # Request lifecycle, transition guards, offer management
│   ├── mechanics.ts        # Mechanic records, access control, application flow
│   ├── estimates.ts        # Estimate submission, approval, billing validation
│   ├── payments.ts         # Payment recording, validation, write-once enforcement
│   ├── geolocation.ts      # Distance, ETA, staleness, position math (pure)
│   ├── guide.ts            # Mechanic guide classification, safety triage, demo bot
│   ├── notifications.ts    # Notification creation, routing, read tracking
│   ├── analytics.ts        # Aggregation over request/offer snapshots (pure)
│   └── mlProvider.ts       # ML provider abstraction (rule-based fallback)
├── infra/                  # Firebase adapters & infrastructure
│   ├── firebase.ts         # Initialization, singletons, mode detection (DEMO/EMULATOR/LIVE)
│   ├── authAdapter.ts      # Auth sign-in/sign-up/sign-out with mode awareness
│   ├── dbAdapter.ts        # Firestore DTO-mapped CRUD (thin layer over SDK)
│   ├── functionsAdapter.ts # Callable wrappers with error classification
│   ├── mapProvider.ts      # Map provider abstraction (leaflet default)
│   └── adminRecovery.ts    # Three authorized recovery operations + audit
├── lib/                    # Supporting utilities (can overlap with domains)
│   ├── cn.ts               # Class name composition
│   ├── theme.ts            # Theme preference & application (expanded with CSS vars)
│   ├── nav.ts              # Navigation definitions (portals) — re-export from infra/
│   ├── ui.tsx              # UI components (Button, Card, Badge, etc.) — expanded
│   ├── fixtures.ts         # Mock data for demo mode (matching Firestore schema)
│   ├── mlModelInfo.ts      # ML model metadata (static artifacts) — re-exported
│   ├── analytics.ts        # Aggregation over request/offer snapshots — re-exported
│   ├── geolocation.ts      # Browser geolocation hooks — adapted for emulator
│   ├── featureFlags.ts     # Feature flag system (runtime toggles)
│   └── env.ts              # Env variable validation & defaults (build-mode profile)
├── components/             # Presentational UI (reorganized)
│   ├── ui/                 # Base components (Button, Input, Badge, etc.)
│   ├── layout/             # Layout components (Header, Sidebar, Breadcrumb, etc.)
│   ├── forms/              # Form components (Field, Input, Select, etc.)
│   ├── displays/           # Stat, MetricCard, EmptyState, ErrorState, AlertBanner
│   ├── navigation/         # Portal nav components (Breadcrumb, PortalNav)
│   ├── modals/             # Modal, ConfirmationDialog, etc.
│   └── index.ts            # Barrel re-exports for backward compatibility
├── pages/                  # Portal-specific pages (organized by portal)
│   ├── public/             # Marketing/landing pages (Landing, Features, Pricing, About, Contact, Onboarding)
│   ├── auth/               # Login, Signup, Forgot, Verify
│   ├── customer/           # Customer portal pages (14 pages, all route paths unchanged)
│   ├── mechanic/           # Mechanic portal pages (7 pages, all route paths unchanged)
│   ├── admin/              # Admin portal pages (9 pages, all route paths unchanged)
│   └── experience/         # Demo/prepared experience page
├── styles/                 # Design tokens and global styles
│   ├── tokens.css          # CSS custom properties for colors, spacing, typography, radius, shadows
│   ├── variables.css       # Theme variables (light/dark/system)
│   └── global.css          # Base styles, Tailwind directives
├── types/                  # Augmented types and re-exports
│   ├── domain.ts           # Domain DTO interfaces
│   ├── routes.ts           # Route type definitions (ROUTE_DEFS)
│   ├── firebase.ts         # Firebase singleton types (re-exported from infra)
│   ├── ml.ts               # ML model info types
│   └── featureflags.ts     # Feature flag types
├── env.ts                  # Env variable validation & defaults (build-mode profile)
├── observability/          # Logging, metrics, health checks
│   ├── logger.ts
│   ├── metrics.ts
│   └── health.ts
└── scripts/                # Operational scripts (unchanged)
```

**Key Reorganization Points**:
- `domains/` replaces `lib/` as primary place for pure business logic (new folder, contains extracted pure functions)
- `infra/` centralizes all Firebase adapter code (new folder, contains adapter implementations)
- `pages/` subdirectory per portal (preserving all existing route paths — path strings unchanged in `ROUTE_DEFS`)
- `styles/` separates design tokens from component-level styles (new folder, CSS custom properties)
- `observability/` adds structured logging/metrics infrastructure (new folder)
- `types/` houses shared TypeScript interfaces (new folder, re-exports)
- `env.ts` — environment configuration validator (new file, startup validation)
- `featureFlags.ts` — feature flag system (new file, runtime toggles)
- `components/ui/` — components reorganized into subfolders with barrel `index.ts` re-exports
- All existing route paths (`/app`, `/m`, `/admin`, `/mechanic/:id`, etc.) remain **identical** — only internal file moves

---

## 4. Portal Responsibilities

### 4.1 Public Portal (Marketing/Landing)
- **Responsibility**: Product marketing and onboarding
- **Pages**: Landing, Features, Pricing, About, Contact, Onboarding
- **Auth Gate**: None — full public access
- **Layout**: `PublicLayout` — minimal chrome, no authentication required
- **Navigation**: `PUBLIC_LINKS` — `/features`, `/pricing`, `/about`, `/experience`, `/contact`
- **Design**: Brand-first; clear value proposition; easy onboarding path
- **Key Metrics**: Page views, onboarding completion rate

### 4.2 Auth Portal (Firebase Email/Password)
- **Responsibility**: Authentication flows and role-specific entry points
- **Pages**: Login, Signup (customer/mechanic/admin), Forgot password, Verify email
- **Auth Gate**: `RequireAuth` (redirect if already signed in); role-specific flows at signup
- **Layout**: `AuthLayout` — centered auth form, no portal NAV
- **Navigation**: None portal-internal; external links only
- **Key Flows**: 
  - New user → signup with role selection (customer/mechanic/admin) → email verification → `resolveAuthHome(role)` redirect
  - Returning user → login → home redirect per role
- **Authorization**: Firebase Custom Claims (not yet minted for mechanic/admin; role hint only at signup)

### 4.3 Customer Portal
- **Responsibility**: End-user roadside assistance experience
- **Default Home**: `/app` (Dashboard)
- **Auth Gate**: `RequireAuth` + `RequireCustomer` (checks custom claims + Firestore profile hint as defense-in-depth, but Firestore rules are authoritative)
- **Layout**: `CustomerLayout` — top NAV (`CUSTOMER_NAV`), breadcrumb, themed chrome
- **Navigation**: 
  - `CUSTOMER_TABS` (top): `/app`, `/map`, `/services`, `/notifications`, `/profile`
  - `CUSTOMER_NAV` (sidebar): Assistance group + My Account group
- **Portal Pages** (all 14 routes preserved exactly):
  - Dashboard, Request Help, Mechanic Guide, Mechanic Directory, Mechanic Detail, Live Map, Track Request, Service History, Vehicles, Emergency, Notifications, Profile, Settings
- **Key Flows**:
  - Breakdown → Guide → Request → Offer → Accept → Job → Estimate → Approval → Completion → Payment → History
  - Safety triage before booking (EMERGENCY/CAUTION patterns win over model)
- **Authorization**: Custom Claims → Firestore Rules → Profile Hint → Frontend Guard (UX only, never enforcement)

### 4.4 Mechanic Portal
- **Responsibility**: Operational workspace for assigned jobs
- **Default Home**: `/m` (Dashboard)
- **Auth Gate**: `RequireAuth` + `RequireMechanic` (custom claims + `mechanics.{uid}.approved === true` + `isAvailable`)
- **Layout**: `MechanicLayout` — top NAV (`MECHANIC_NAV`), possibly sidebar, themed chrome
- **Navigation**: 
  - `MECHANIC_TABS` (top): `/m`, `/m/requests`, `/m/job`, `/m/earnings`, `/m/profile`
  - `MECHANIC_NAV` (sidebar): Workshop group
- **Portal Pages** (all 7 routes preserved exactly):
  - Dashboard, Incoming Requests, Active Job, Job History, Earnings, Workshop Profile, Apply
- **Key Flows**:
  - Available → Offers → Accept → Job (status progression) → Estimate → Customer Approval → Completion → Payment → Earnings
  - Capacity cap: max 3 live jobs (`mechanicCounters.activeJobCount`)
  - Location throttling: 25m min distance, 5s min interval (`shouldPush`)
  - Staleness: 5-minute threshold (`isStale`, `LOCATION_STALE_MS`)
- **Authorization**: Custom Claims → `mechanics.{uid}.approved` + `isAvailable` → Firestore Rules (mechanicId-scoped writes) → Profile Hint → Frontend Guard (UX only)

### 4.5 Admin Portal
- **Responsibility**: Network operations and oversight
- **Default Home**: `/admin` (Dashboard)
- **Auth Gate**: `RequireAuth` + `RequireAdmin` (Firebase custom claim `admin: true` — the *only* authorized admin boundary; profile hint `role` never used for admin enforcement)
- **Layout**: `AdminLayout` — top NAV (`ADMIN_NAV` + `ADMIN_TABS`), sidebar, themed chrome
- **Navigation**: 
  - `ADMIN_NAV` (top): `/admin`, `/admin/dispatch`, `/admin/approvals`, `/admin/mechanics`, `/admin/users`, `/admin/requests`, `/admin/notifications`
  - `ADMIN_TABS` (top-right): `/admin`, `/admin/dispatch`, `/admin/requests`, `/admin/mechanics`, `/admin/notifications`
  - `ADMIN_Insight` group: `/admin/analytics`, `/admin/reports`, `/admin/audit`, `/admin/logs`
- **Portal Pages** (all 12 routes preserved exactly):
  - Dashboard, Dispatch, Approvals, Mechanics, Users, Requests/:id, Audit, Analytics, Reports, Notifications, Logs
- **Key Authorized Operations** (Correction 5 — exactly three, no blanket overrides):
  - `release_stale` — release mechanic from stale job, reset request to `requested`
  - `recapture_job` — reassign to new mechanic with full validation
  - `force_complete` — complete job with admin-approved final amount (cannot bypass estimate approval)
- **Authorization**: Custom Claims (`admin: true`) are the *sole* admin boundary. No other role combination grants admin access. Firestore rules have `allow update: if isClaimAdmin()`. Profile hint `role` is explicitly NOT checked for admin enforcement.

---

## 5. Complete Booking State Machine

### 5.1 Valid States (12 total)

| ID | State Name | Description |
|----|------------|-------------|
| S1 | `requested` | Request created, awaiting mechanic offer |
| S2 | `accepted` | Mechanic has accepted the offer |
| S3 | `on-the-way` | Mechanic en route to customer |
| S4 | `arrived` | Mechanic has arrived on-site |
| S5 | `service` | Mechanic performing repair; estimate submitted & approved |
| S6 | `completed` | Job finished; customer has approved final amount |
| S7 | `cancelled` | Customer cancelled while cancellable |
| S8 | `released` | Mechanic released job; request returns to `requested` |
| S9 | `stale` | Location update threshold exceeded (internal flag) |
| S10 | `recovered` | Admin-recovered from error state (internal) |
| S11 | `estimating` | Mechanic submitting estimate (transitional) |
| S12 | `payment_pending` | Payment recorded, awaiting confirmation (internal) |

### 5.2 State Transitions (with Actor, Validation, Backend Operation)

| From → To | Actor | Validation | Backend Operation | Failure State |
|---|---|---|---|---|
| `requested` → `accepted` | Mechanic | Offer not expired (`expiresAt > now`), offer still `pending` | `acceptOffer` callable; write `mechanicId`, `mechanicName`, `mechanicPhone`, `status: accepted`, `updatedAt`; increment `mechanicCounters.activeJobCount` | `offer-expired`, `already-taken`, `ineligible` |
| `requested` → `cancelled` | Customer | Status in `CANCELLABLE_STATUSES` (`requested`, `accepted`, `on-the-way`, `arrived`) | `updateDoc` with `status: cancelled`, `cancelledAt`, `cancelledBy: 'customer'`; if mechanic assigned, increment their `activeJobCount` | `too-late` |
| `requested` → `released` | Mechanic | Job not in terminal state | `runTransaction`: `status: requested`, `mechanicId: null`, `mechanicName: null`, `mechanicLat: null`, `mechanicLng: null`, `mechanicLocationUpdatedAt: null`, `offerExpiresAt: Timestamp.now() + OFFER_WINDOW_MS`, `releaseReason`, `releasedAt`, `updatedAt`; decrement `mechanicCounters.activeJobCount` by 1 | `invalid-state`, `not-assigned`, `forbidden`, `error` |
| `requested` → `stale` | System | `locationUpdatedAt < now - LOCATION_STALE_MS` (internal) | Flag only — no Firestore write; UI shows warning | N/A (internal flag) |
| `accepted` → `on-the-way` | Mechanic | `canAdvance(status, 'on-the-way')` true | `advanceJob(requestId, 'on-the-way')` transaction | `invalid-transaction`, `forbidden` |
| `on-the-way` → `arrived` | Mechanic | `canAdvance(status, 'arrived')` true | `advanceJob(requestId, 'arrived')` transaction | `invalid-transaction`, `forbidden` |
| `arrived` → `service` | Mechanic | `canAdvance(status, 'service')` true **AND** `estimateStatus === 'approved'` **HARD GATE** | `advanceJob(requestId, 'service')` transaction; if estimate not approved, return `estimate-required` | `estimate-required`, `invalid-transaction`, `forbidden` |
| `service` → `completed` | Mechanic | **INVARIANT**: `finalAmountStatus === 'approved'` **MUST be true** before this transition. Mechanic cannot bypass. Also requires `estimateStatus === 'approved'`. | `advanceJob(requestId, 'completed', { amountCents, durationMin })` transaction; decrement `mechanicCounters.activeJobCount` by 1 | `estimate-required`, `amount-mismatch`, `forbidden`, `error` |
| `service` → `cancelled` | Admin / Mechanic | Admin: valid recovery reason. Mechanic: only via `reassignMechanic` recovery path, not normal flow | Transaction: `status: cancelled`, `cancelledBy: 'admin'|'mechanic'`, `cancellationReason`, `updatedAt`; mechanic capacity incremented | `forbidden`, `invalid-state` |
| `requested` → `estimating` | Mechanic | Request is `requested` status | Transition flag only — no Firestore write until estimate submitted | N/A (transitional) |
| `estimating` → `service` | Mechanic | Estimate submitted via `submitEstimate` callable; `estimateStatus: 'pending'` → `'approved'` or `'rejected'` | Transaction: `estimateStatus`, `estimatedAmountCents`, `estimatedDurationMin`, `estimateDiagnosis`, `estimateApprovedAt` (if approved) | `invalid-state`, `forbidden`, `error` |
| `service` → `payment_pending` | System | Job `completed`, `paymentStatus !== 'paid'` | `recordPayment` transaction or manual admin recording | `amount-mismatch`, `forbidden`, `error` |
| `payment_pending` → (none) | — | Internal state; payment recorded once | — | N/A |

### 5.3 Critical Invariants (Enforced by State Machine)

1. **Final Amount Prerequisite**: `service → completed` transition requires `finalAmountStatus === 'approved'` as a **guard condition** in the transaction. If `finalAmountStatus` is not `approved`, the transition returns `estimate-required` and does NOT change the status.

2. **Estimate Before Completion**: `service → completed` also requires `estimateStatus === 'approved'`. Both conditions must be met.

3. **Mechanic Capacity Conservation**: Every `advanceJob` transaction that transitions away from a non-terminal state **must** atomically increment `mechanicCounters.{mechanicId}.activeJobCount`. Every transition that assigns a mechanic increments the new mechanic's counter and decrements the old mechanic's counter (via `reassignMechanic` or `releaseJob`).

4. **Estimate Provenance Integrity**: When a request is reassigned to a new mechanic, all estimate fields (`estimatedAmountCents`, `estimatedDurationMin`, `estimateDiagnosis`, `estimateStatus`, `estimateApprovedAt`) are **cleared** (set to `null`/`'pending'`). The new mechanic must submit a fresh estimate before `service → completed` is possible.

5. **Staleness → Recovery**: When location is flagged `stale`, the admin can trigger `recoverJob` which resets the location flag and, if the job has been stale too long, releases the mechanic's capacity and resets the request to `requested` state.

6. **Payment Write-Once**: `paymentStatus` field can only transition: `pending` → `paid`. Once `paid`, it cannot be changed. Admins can view but not overwrite. The `recordPayment` callable enforces this by checking `data.paymentStatus !== 'paid'` before writing.

### 5.4 Transition Diagram (Text Representation)

```
requested ──accepted──► accepted ──on-the-way──► on-the-way ──arrived──► arrived
   │                │                │                │
   │                │                │                └──service──► service
   │                │                │                  (requires estimate approved
   │                │                │                   AND final amount approved)
   │                │                │
   │                │                └──cancelled──► (terminal, by customer/admin)
   │                │
   │                └──released──► requested (mechanic releases)
   │
   └──cancelled──► (terminal, by customer while cancellable)
                             
service ──completed──► (terminal, requires final amount approved + estimate approved)
service ──cancelled──► (recovery, admin only, with reason code)
 
completed and cancelled are TERMINAL states — no outgoing transitions.
```

---

## 6. Data & API Compatibility Strategy

### 6.1 Firestore Data Contract Preservation

**All existing Firestore document shapes are preserved unchanged**:

| Collection | Key Fields (preserved exactly) |
|---|---|
| `users/{uid}` | `uid`, `email`, `displayName`, `role` (hint only), `createdAt`, `updatedAt` |
| `mechanics/{uid}` | All fields from `MechanicRecord` interface + `private.contact.{phone, email}`, `currentLat`, `currentLng`, `locationUpdatedAt`, `activeJobCount`, `verificationStatus`, `approved`, `createdAt`, `updatedAt` |
| `vehicles/{id}` | All fields from `Vehicle` interface + `ownerId`, `isDefault`, `createdAt`, `updatedAt` |
| `requests/{id}` | All fields from `ServiceRequest` interface + `id`, `customerId`, `vehicleId`, `status`, `createdAt`, `updatedAt`, plus estimate/payment fields |
| `offers/{id}` (within `requests/{id}/offers`) | `mechanicId`, `mechanicName`, `customerId`, `status`, `expiresAt`, `round`, `createdAt` |
| `notifications/{uid}/items/{id}` | `id`, `type`, `title`, `body`, `requestId`, `path`, `createdAt`, `read` |
| `publicMechanics/{id}` | `id`, `name`, `approved`, `isAvailable`, `specialties`, `vehicleTypes`, `experienceYears`, `serviceRadiusKm`, `rating`, `reviewCount`, `vehicleDescription`, `garageName`, `baseLat`, `baseLng` |

**DTO Mapping**: Adapters convert between these exact shapes and **Domain DTOs** (which have different field names/shapes for internal use). The conversion is the single point of adaptation — the raw Firestore shape never changes.

### 6.2 Callable Function Contract Preservation

**`acceptOffer` callable**: 
- Input: `{ requestId: string }`
- Output: `{ success: boolean }`
- Preconditions (enforced server-side): offer exists, offer status is `pending`, offer not expired (`expiresAt > serverTime`), request is in `requested` status, customerId matches request owner
- Postconditions: offer status → `accepted`, request status → `accepted`, mechanic's `activeJobCount` incremented, realtime notifications sent to customer and mechanic

**`declineOffer` callable**:
- Input: `{ requestId: string }`
- Output: `{ success: boolean }`
- Preconditions: offer exists, offer status is `pending`
- Postconditions: offer status → `declined`

**Error handling**: All callables return specific error codes (`offer-expired`, `already-taken`, `ineligible`, `permission-denied`, `not-found`, `forbidden`, `error`) that adapters classify for UI display. No silent failures.

### 6.3 Realtime Listener Preservation

**All existing `onSnapshot` listeners are preserved exactly**. The adapter layer does not replace `onSnapshot` — it wraps it with:
- Automatic emulator connection (`connectFirestoreEmulator`)
- DTO mapping of snapshot data (conversion layer, not replacement)
- Error classification (translate `permission-denied` into application-level events)
- Presence of the **exact same callback signature** — consumers do not need to change

### 6.4 Transaction Semantics Preservation

**All Firestore transactions preserve exact semantics**:
- `runTransaction` with `setOption: 'merge'` remains the mutation path
- All business logic that currently uses `runTransaction` (createRequest, advanceJob, releaseJob, submitEstimate, recordPayment, reassignMechanic) continues to use it
- Adapters add DTO mapping **around** the transaction, not inside it — the transaction body uses raw Firestore types as before

### 6.5 Environment Configuration Separation (Correction 9)

**Three build-mode profiles**, set at Vite build time:

| Mode | Vite Flag | Firebase Config | Feature Flags | Purpose |
|------|-----------|-----------------|---------------|---------|
| `demo` | `--mode demo` | `apiKey` etc. are **read but not used**; SDK initialized but all operations route to mock data fixtures | `DEMO_MODE=true` (automatic) | Development, no production access; shows sample data |
| `emulator` | `--mode emulator` | SDK connects to local emulators (Auth 9099, Firestore 8080, Functions 5001) | `DEMO_MODE=false`, `EMULATOR_MODE=true` | Local development with emulated backend |
| `live` | `--mode live` | SDK connects to production Firebase project | `DEMO_MODE=false`, `EMULATOR_MODE=false` | Production deployment |

**Feature flags** (runtime toggles, independent of build mode):
- `DEMO_MODE` — serves fixture data instead of Firestore (default: `false` in emulator/live modes)
- `ML_ENHANCED` — enables model-enhanced classification (default: `false`; when `true`, rule-based classifier is supplemented with offline model lookups only)
- `MAP_PROVIDER` — `leaflet` | `mapbox` | `google` (default: `leaflet`)
- `ADMIN_RECOVERY` — enables admin recovery operations (default: `false` in demo/emulator; `true` only in live mode with custom claim)

**Critical**: It is **impossible** to accidentally access production Firebase when `DEMO` or `EMULATOR` mode is active. `firebaseInit.ts` explicitly checks the build mode at startup and, if not `live`, refuses to initialize Firebase credentials, routing all data operations to the appropriate mock/emulated layer.

---

## 7. Security Model

### 7.1 Authorization Chain (Correction 6)

```
Firebase Custom Claims (server-issued, immutable)
        │
        ├──► Firestore Rules (server-enforced data access)
        │     │
        │     ├──► Role Profile Hints (users/{uid}.client-side UI only, NEVER trusted)
        │     │
        │     └──► Frontend Guards (purely UX/navigation; NO authorization enforcement)
        │
        └──► Direct data access (bypassing frontend entirely)
```

**Key principles**:
1. **Firebase Custom Claims** — The *only* true authorization boundary. Claims are `admin: true`, `mechanic: true`, or `customer: true`, minted server-side in the backend phase. Client cannot set these.
2. **Firestore Rules** — Server-enforced. Scoped by `request.path`, `resource.data`, `request.auth`. The existing rules files (`firestore.rules`) are preserved unchanged.
3. **Role Profile Hints** — `users/{uid}.role` field is a **client-side UI hint only**. Code that uses `role` for authorization checks is a security vulnerability. All such checks are removed from the redesign; authorization goes through claims + rules.
4. **Frontend Guards** — `RequireAuth`, `RequireCustomer`, `RequireMechanic`, `RequireAdmin` are **navigation guards only**. They check `firebaseAuth().currentUser?.emailVerified` and redirect. They **do not** check role hints for security decisions. A mechanic with `role: customer` in their profile hint can still access mechanic routes if their Firebase custom claim is `mechanic: true`, and vice versa.

**Authorization decision flow for any operation**:
```
1. Check Firebase Custom Claims for actor UID
2. If claim missing/insufficient → reject with 'forbidden'
3. Check Firestore Rules for read/write path
4. If rules deny → reject with 'permission-denied'
5. If both pass → operation proceeds
6. Frontend guard may show navigation hint — but cannot authorize or deny
```

### 7.2 Admin Recovery Operations (Correction 5)

**Admin has exactly three authorized recovery operations**, each funneled through `adminRecovery(requestId, operation, reason, actorId)` callable:

| Operation | Parameters | Validation | Audit Record |
|---|---|---|---|
| `release_stale` | `requestId`, `reason`, `actorId` | Request has mechanic assigned, status is `service` or `on-the-way`, location is stale (`now - locationUpdatedAt > 30 min`), mechanic is unavailable or unresponsive | Creates `/admin/audit/{id}` doc with: `operation: 'release_stale'`, `requestId`, `actorId`, `reason`, `timestamp`, `mechanicId` released, `requestId` reset to `requested` |
| `recapture_job` | `requestId`, `newMechanicId`, `reason`, `actorId` | Request is `stale` or `released`, new mechanic approved + available + capacity, old mechanic capacity already decremented | Creates audit doc; request reassigned to new mechanic (full `reassignMechanic` flow), old mechanic notified |
| `force_complete` | `requestId`, `approvedAmountCents`, `reason`, `actorId` | Request status is `service`, estimate is `approved`, admin has `admin` custom claim | Creates audit doc; sets `finalAmountStatus: approved`, `amountCents: approvedAmountCents`, `paymentStatus: 'paid'`, `paidAt: now`, `paidBy: actorId`, status → `completed`. **Does NOT bypass** the estimate approval requirement — both `estimateStatus === 'approved'` AND `finalAmountStatus === 'approved'` must be true. |

**No other admin status overrides exist**. Attempting any other Firestore write to a request's `status` field without going through this callable is rejected by Firestore rules (rules restrict `status` writes to specific allowed paths).

### 7.3 Frontend Guard Hardening (Correction 6)

**All frontend guards are updated to**:

```typescript
// Hardened: only checks auth state for navigation
if (!user?.emailVerified) navigate('/login');

// Authorization is handled by Firestore rules + custom claims,
// never by frontend role comparison.
```

**`RequireCustomer`**, **`RequireMechanic`**, **`RequireAdmin`** components now only:
1. Check `firebaseAuth().currentUser !== null`
2. Check `firebaseAuth().currentUser.emailVerified`
3. Optionally check `firebaseAuth().currentUser.customClaims` for the required role (as a **hint**, not enforcement)
4. Firestore rules are the authoritative boundary

---

## 8. Firebase Adapter & Repository Boundaries

### 8.1 Adapter Layer Design (Correction 7)

**The adapter layer preserves — does not replace — the Firebase SDK**:

- **Realtime listeners**: `onSnapshot` preserved exactly; adapter wraps with emulator connection + DTO mapping on top, never replaces the callback signature
- **Transaction semantics**: `runTransaction` used by all business logic; adapter adds DTO mapping around the transaction body, not inside it
- **Callable contracts**: `acceptOffer`/`declineOffer` exact signatures preserved; adapter wraps `httpsCallable` with error classification (offer-expired, already-taken, ineligible, permission-denied, not-found, forbidden, error) but the underlying callable contract is identical
- **Firestore SDK**: remains the single source of truth for Firestore operations; adapters add DTO mapping, emulator support, and environment configuration on top

**Repository pattern** (thin abstraction, not a replacement):
- `dbAdapter.findById(id)` → `getDoc(doc(db, 'requests', id))` → returns raw Firestore doc + DTO mapping
- `dbAdapter.subscribe(id, cb)` → `onSnapshot(doc(db, 'requests', id), cb)` → same callback signature
- `dbAdapter.transaction(fn)` → `runTransaction(db, fn)` → same transaction semantics

**No duplicate SDK functionality**: Adapters do not recreate query, doc, collection, writeBatch, deleteDoc, etc. They merely translate between Domain DTOs and Firebase SDK types.

---

## 9. Feature Preservation Matrix (Condensed from Keep Matrix)

| Feature | Preserved | Adapter Required | Regression Test |
|---|---|---|---|
| Request idempotency | ✅ | `dbAdapter.createRequest()` | `vitest test:createRequest_idempotent` |
| Offer acceptance concurrency | ✅ | `functionsAdapter.acceptOffer()` + transaction | `vitest test:acceptViaDispatch_success`; `playwright test:booking-journey` |
| Mechanic capacity counters | ✅ | `dbAdapter` atomic increment/decrement in transactions | `vitest test:mechanicCounters_atomic` |
| Counter reconciliation | ✅ | `releaseJob` + `reassignMechanic` always restore capacity | `vitest test:releaseJob_capacity_restore` |
| Estimate provenance | ✅ | `estimateStatus` + `finalAmountStatus` tracking through reassignment | `vitest test:estimate_provenance` + reassignment clearance |
| Reassignment safety | ✅ | `reassignMechanic()` releases old, clears estimate, assigns new | `vitest test:reassignMechanic_safety` + audit record |
| Stale-job recovery | ✅ | `isStale()` flag + admin `release_stale` recovery | `vitest test:stale_job_recovery` |
| Final amount approval | ✅ | State machine gate: `service → completed` requires both approvals | `vitest test:finalAmount_prerequisite` — mechanic cannot complete without approved final amount |
| Payment write-once | ✅ | `recordPayment()` `paymentStatus` invariant; rules forbid `pending` | `vitest test:payment_write_once` — cannot re-record payment |
| Customer/mechanic/admin authorization | ✅ | Auth chain: custom claims → Firestore rules → profile hints (hint only) → frontend guards (UX only) | `vitest test:auth_authorization_chain`; all three role chains |

---

## 10. Migration Sequence

### 10.1 Phased Migration Plan (20 Weeks)

**Week 0 — Pre-Migration Preparation**
- [ ] Take Firestore snapshots of all data (backup)
- [ ] Create git branch `redesign/architecture-planning`
- [ ] Set up Vite build modes: `demo`, `emulator`, `live`
- [ ] Initialize `src/env.ts` with environment validation
- [ ] Define feature flag defaults in `src/featureFlags.ts`

**Phase 1 — Foundation & Domain Extraction (Weeks 1–4)**
- [ ] **Week 1**: Extract pure functions from `src/lib/` into `src/domains/` (all business logic)
- [ ] **Week 1**: Create `src/infra/firebase.ts` — singleton init with mode detection (DEMO/EMULATOR/LIVE)
- [ ] **Week 2**: Create `src/infra/authAdapter.ts` — wrap `firebaseAuth()` with mode-aware signIn/signOut/signUp
- [ ] **Week 2**: Create `src/infra/dbAdapter.ts` — DTO-mapped Firestore access (thin layer, preserves `onSnapshot`, transactions)
- [ ] **Week 3**: Create `src/infra/functionsAdapter.ts` — callable wrappers with error classification (offer-expired, already-taken, ineligible, permission-denied, not-found, forbidden, error)
- [ ] **Week 3**: Run full test suite against emulator — confirm 100% parity (all F1–F35 regression tests pass)
- [ ] **Week 4**: Update all internal imports to go through adapter layers; fix any breakage; re-run typecheck

**Phase 2 — API Stabilization (Weeks 5–6)**
- [ ] **Week 5**: Verify adapter layer preserves all callable contracts (acceptOffer, declineOffer, reassignMechanic)
- [ ] **Week 5**: Verify adapter layer preserves all realtime listener semantics (compare old vs. new listener output for identical data)
- [ ] **Week 5**: Verify adapter layer preserves transaction semantics (run identical transactions through old and new code, compare results)
- [ ] **Week 6**: Update all page components to use adapters instead of direct Firebase calls; run full test suite

**Phase 3 — Portal Reorganization (Weeks 7–8)**
- [ ] **Week 7**: Reorganize `src/pages/` into subdirectories (public/, auth/, customer/, mechanic/, admin/)
- [ ] **Week 7**: Update `src/routes.tsx` — route defs remain import-path-identical; all path strings unchanged
- [ ] **Week 7**: Create portal layouts with NAV and auth gates (hardened as per Correction 6)
- [ ] **Week 8**: Run e2E tests — confirm all journeys still work with exact same URL paths

**Phase 4 — UI/UX Enhancement (Weeks 9–11)**
- [ ] **Week 9**: Expand design tokens in `src/styles/tokens.css`; add CSS custom properties
- [ ] **Week 9**: Update UI components for accessibility (focus visible, color contrast, ARIA) — no breaking API changes
- [ ] **Week 10**: Add responsive improvements (mobile-first); add new components (Alert, StatusPill) alongside existing
- [ ] **Week 11**: Theme system: `preset` support, CSS custom properties for dynamic theming; verify `DEMO_MODE` serves fixture data correctly

**Phase 5 — ML & Guide Enhancement (Weeks 12–13)**
- [ ] **Week 12**: Create `src/infra/mlProvider.ts` with rule-based fallback (preserve existing `classifyProblem`, `inferCategory`, `triageSafety`)
- [ ] **Week 12**: Integrate ML model info display in admin dashboard (static artifact only — no runtime model fetching)
- [ ] **Week 13**: Add demo bot flows preserved; ML enhancement opt-in via `ML_ENHANCED` feature flag (default: false)

**Phase 6 — Observability & Testing (Weeks 14–16)**
- [ ] **Week 14**: Add `src/observability/logger.ts` and `src/observability/metrics.ts` — structured logging, correlation IDs
- [ ] **Week 15**: Expand Vitest coverage to domain layer (100% pure functions); add emulator-integration test suite
- [ ] **Week 16**: Update Playwright E2E tests for new portal navigation; run full CI/CD gate: typecheck → test → test:e2e → lint:rules

**Phase 7 — Demo/Live Separation (Weeks 17–18)**
- [ ] **Week 17**: Implement explicit environment configuration separation (Correction 9)
- [ ] **Week 17**: Verify impossible to access production Firebase in DEMO or EMULATOR mode
- [ ] **Week 18**: Configure Vite build profiles (`demo`, `emulator`, `live`); document environment setup for new developers

**Phase 8 — Final Review & Launch (Weeks 19–20)**
- [ ] **Week 19**: Full regression test suite against emulator (all F1–F35 tests)
- [ ] **Week 19**: Performance benchmarking (query latencies, bundle size)
- [ ] **Week 19**: Accessibility audit (a11y tools)
- [ ] **Week 20**: Final typecheck + lint rules; merge to main with feature flags OFF by default; deploy to demo environment first, then emulator, then live

**Total: 20 weeks** (not 8 weeks as originally proposed — the 8-week estimate was unrealistic given the scope of dependency reconciliation, adapter layer development, and comprehensive verification).

### 10.2 Migration Success Criteria

Before each phase merge, all of the following must pass:
1. **Typecheck**: `npm run typecheck` — zero errors
2. **Unit tests**: `npm test` — all F1–F35 regression tests passing
3. **Emulator parity**: Same tests pass with `VITE_USE_EMULATORS=true`
4. **E2E critical paths**: Key booking journeys pass Playwright test suite
5. **Security audit**: Frontend guards verified as UX-only; no role-hint authorization; auth chain validated
6. **Environment validation**: DEMO mode cannot access production Firebase; EMULATOR mode isolated to local; LIVE mode connects to prod

---

## 11. Testing Strategy

### 10.1 Test Pyramid

```
                    ┌─────────────────────┐
                    │   E2E Playwright     │
                    │   (3 modes: demo/emul│
                    │    live)             │
                    └─────────────────────┘
                              ▲
                              │  Critical journeys only
                    ┌─────────────────────┐
                    │   Integration       │
                    │   (Vitest + emulators)│
                    └─────────────────────┘
                              ▲
                              │  Adapter + Firestore interaction
                    ┌─────────────────────┐
                    │   Unit Tests        │
                    │   (Vitest, no deps) │
                    └─────────────────────┘
```

### 10.2 Test Levels

**Level 1: Pure Unit Tests (Vitest, no Firebase)**
- Target: All domain layer functions (state machine, validation, math, classification)
- Count: ~80 tests
- Firebase: None — run without emulators
- CI gate: Must pass on every commit
- Example: `vitest test:domain:stateMachine_transitions`; `vitest test:domain:finalAmountGate`; `vitest test:classifyProblem`

**Level 2: Integration Tests (Vitest + Firebase Emulators)**
- Target: Adapter layers, callable wrappers, DTO mapping, realtime listeners
- Count: ~50 tests
- Firebase: Emulators (Auth 9099, Firestore 8080, Functions 5001)
- CI gate: Must pass on every commit
- Example: `vitest test:adapter:callable_acceptOffer`; `vitest test:adapter:dto_mapping`; `vitest test:listener:realtime_updates`

**Level 3: Critical E2E Journeys (Playwright, 3 modes)**
- Target: Complete customer booking journey, mechanic job flow, admin recovery
- Count: ~15 test files, ~60 test cases
- Firebase: demo mode (fixtures), emulator mode, live mode (if configured)
- CI gate: Run on PR merge; block merge on failure
- Example: `playwright test e2e/booking-journey.e2e.ts --mode demo`; `playwright test e2e/booking-journey.e2e.ts --mode emulator`; `playwright test e2e/booking-journey.e2e.ts --mode live` (if credentials present)

**Level 4: Security & Compliance Tests**
- Target: Authorization chain, frontend guard hardening, Firestore rules validation
- Count: ~10 tests
- Firebase: Emulator mode
- CI gate: Run on every commit
- Example: Verify frontend guards do NOT check role hints for authorization; verify Firestore rules enforce correct boundaries; verify custom claims are the authorization boundary

### 10.3 Parity Verification Strategy (Correction 13)

**Behavior parity is proven through three independent methods**:

1. **Delta Testing**: For each feature F1–F35, run identical inputs through both old and new implementations, compare outputs. Example:
   ```typescript
   // Delta test for classifyProblem
   const oldResult = classifyProblem(oldInput); // old code path
   const newResult = classifyProblem(newInput); // new domain function, same logic
   expect(oldResult).toEqual(newResult);
   ```

2. **Emulator Parity Testing**: Same delta tests run with `VITE_USE_EMULATORS=true`. Old code path goes through direct Firebase SDK; new code path goes through adapters + emulators. Outputs must match.

3. **E2E Regression Testing**: Critical journeys (booking from breakdown to completion, mechanic acceptance → completion, admin recovery) tested in all three modes (demo, emulator, live). Behavior must be consistent across modes for the same user actions.

**No claim of "100% parity" is made without passing all three test levels**. The proposal explicitly states: "Behavior parity is proven when all three test levels pass for a given feature."

### 10.4 Test Data Fixtures

**`src/lib/fixtures.ts`** provides mock data matching the exact Firestore schema for all collections, used in DEMO mode and integration tests. Fixtures are derived from actual Firestore data snapshots and kept in sync via periodic export.

---

## 12. Rollback Strategy (Correction 10)

### 11.1 Four Independent Rollback Strategies

**Rollback Strategy A: Application Code Rollback**
- **Trigger**: Any phase introduces critical bugs; feature flags not sufficient
- **Action**: `git revert <phase-commit>`; restore prior tagged version; `npm run preview` on prior build
- **Scope**: Frontend code, adapter layers, route definitions, component changes
- **Time**: 15 minutes (git revert + rebuild)
- **Data impact**: None — Firestore data untouched

**Rollback Strategy B: Configuration Rollback**
- **Trigger**: Environment misconfiguration; wrong build mode active; feature flags in wrong state
- **Action**: Switch Vite build mode (`vite build --mode live` instead of `--mode emulator`); reset feature flags to defaults in `src/featureFlags.ts`
- **Scope**: Build mode, feature flag states (`DEMO_MODE`, `ML_ENHANCED`, `MAP_PROVIDER`, `ADMIN_RECOVERY`)
- **Time**: 5 minutes (rebuild with correct mode)
- **Data impact**: None — config only

**Rollback Strategy C: Database Schema Rollback**
- **Trigger**: Firestore rules change breaks data access; migration script introduces incompatible field
- **Action**: Firestore point-in-time restore (web console or `firebase firestore:backups:restore`); or revert `firestore.rules` to prior revision; or run idempotent migration script in reverse
- **Scope**: Firestore document shapes, index definitions, rules allow/deny patterns
- **Time**: 15–30 minutes (depends on backup availability)
- **Data impact**: Potential temporary data loss if no backup; mitigated by Strategy A

**Rollback Strategy D: Data Rollback**
- **Trigger**: Firestore documents corrupted or accidentally modified during migration
- **Action**: Restore from pre-migration snapshots (taken before each phase); use Firebase Console or `firebase firestore:backups:restore`; or run data repair scripts
- **Scope**: All collections (`users`, `mechanics`, `vehicles`, `requests`, `offers`, `notifications`, `publicMechanics`)
- **Time**: 30–60 minutes (depends on data volume and backup state)
- **Data impact**: Minimal — snapshots are point-in-time; data since snapshot loss is recovered from user activity logs or admin reporting

**Feature Flags Are NOT Sufficient Alone**:
- Feature flags can toggle behavior on/off, but cannot recover from:
  - Corrupted Firestore data
  - Broken Firestore rules
  - Missing database schema fields
  - Incorrect environment configuration
- Feature flags are a **supplement** to rollback strategies A–D, not a replacement.

### 11.2 Rollback Execution Order

If rollback is needed during a phased migration:

1. **First**: Try Rollback Strategy B (configuration) — quickest, often sufficient
2. **Second**: Try Rollback Strategy A (code revert) — if config change doesn't fix the issue
3. **Third**: Try Rollback Strategy C (schema/restore) — if code revert doesn't fix the issue
4. **Fourth**: Try Rollback Strategy D (data restore) — last resort; most time-consuming

**After any rollback**, halt the current phase, document the issue, and resume from the last successfully completed phase.

---

## 13. Risk Register (Updated)

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|---|---|---|
| R1 | Firestore rules breakage | Medium | Critical | Rules changes in separate PR; rules unit tests on every commit; backward-compatible field additions only; **all rules preserved unchanged** (verified in audit) |
| R2 | Auth regression — sign-in/sign-up flows break | Medium | Critical | Auth adapter preserves exact `firebaseAuth()` API; emulator tests cover full flow; **custom claims + rules preserved** (Correction 6) |
| R3 | Offer/expiry logic drift | Medium | Critical | Contract-test the callable function; emulator tests with edge cases; **callable contract preserved exactly** (Correction 7) |
| R4 | ML model misclassification | Low | Low (removed as prod feature) | Rule-based classifier retained as fallback; `ML_ENHANCED` flag default `false`; **ML is FUTURE, not implemented** (Correction 14) |
| R5 | Performance degradation | Medium | Medium | DTO mapping in-memory only; queries still go direct to Firestore; profile before/after; **adapters don't add query layers** (Correction 7) |
| R6 | UI regression — layouts break | Medium | Medium | Visual regression testing with Playwright; component tests preserve API surface; **Tailwind config unchanged**; UI components expanded, not rewritten (Correction 14) |
| R7 | Data loss during migration | Medium | Critical | Pre-migration snapshots; migration scripts are idempotent; **four rollback strategies** (Correction 10); **snapshots before each phase** |
| R8 | Environment confusion — prod access during dev | High | Critical | **Three-environment model** (Correction 9) + **feature flag independence**; impossible to access production in DEMO/EMULATOR mode; `firebaseInit.ts` enforces at startup |
| R9 | Unrestricted admin overrides | High | Critical | **Narrowly authorized recovery operations only** (Correction 5); exactly three operations with validation, reason codes, audit records; no blanket overrides |
| R10 | Frontend guards used for authorization | High | Critical | **Authorization chain reconciled** (Correction 6): custom claims → Firestore rules → profile hints (hint only) → frontend guards (UX only); all frontend security checks removed |

**Top 3 Risks (Corrected Likelihood ≥ High)**:
1. **R8 — Environment confusion** (now High): Addressed by three-environment model + firebaseInit.ts enforcement
2. **R9 — Unrestricted admin overrides** (now High): Addressed by exactly three authorized recovery operations with validation/audit
3. **R10 — Frontend guards as authorization** (now High): Addressed by authorization chain reconciliation; frontend guards hardened to UX-only

All risks have mitigations that are implementable within the planning-only constraint (no source code changes required at this stage; all corrections are architectural/design).

---

## 14. Realistic Roadmap (Correction 11)

### 14.1 Twenty-Week Phased Sequence (Corrected from Original 8-Week)

| Phase | Weeks | Primary Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Phase 0: Preparation** | 0 | Feature branch; snapshots; build modes; env config | None | Snapshot taken; branch created |
| **Phase 1: Foundation & Domain Extraction** | 1–4 | Pure functions in `src/domains/`; adapter stubs; `src/env.ts` | None (greenfield within app) | `npm test` all domain functions; `npm run typecheck` |
| **Phase 2: Adapter Stabilization** | 5–6 | `authAdapter`, `dbAdapter`, `functionsAdapter`; all page components migrated | Phase 1 complete (domains + env) | Adapter parity: unit + emulator tests; callable contract preserved; realtime listener semantics preserved |
| **Phase 3: Portal Reorganization** | 7–8 | Portal subdirectories; route defs path-identical; layout gates | Phase 2 complete (adapters stable) | e2E all journeys with exact same URL paths; visual regression |
| **Phase 4: UI/UX Enhancement** | 9–11 | Design tokens; accessible components; responsive layouts; theme system | Phase 3 complete (portals reorganized) | a11y automated scan; visual regression; theme toggle works in all modes |
| **Phase 5: ML & Guide Enhancement** | 12–13 | `mlProvider.ts` with rule-based fallback; demo bot preserved; `ML_ENHANCED` flag (default off) | Phase 1 complete (domain functions) | `vitest test:mlModelInfo`; classifier outputs unchanged; demo bot flows intact |
| **Phase 6: Observability & Testing** | 14–16 | Logger + metrics; expanded Vitest coverage; E2E test suite updated | Phase 2 complete (adapters stable); Phase 4 complete (UI) | CI/CD gate: typecheck → test → test:e2e → lint:rules passes |
| **Phase 7: Demo/Live Separation** | 17–18 | Three build modes; environment config separation; feature flag independence | Phase 1 (env config); Phase 6 (observability) | Verify DEMO mode cannot access production; EMULATOR mode isolated; LIVE mode connects to prod |
| **Phase 8: Final Review & Launch** | 19–20 | Full regression suite; performance benchmarks; a11y audit; final typecheck/lint; merge; deploy | All prior phases complete | All F1–F35 regression tests pass in all three modes; security audit passes; no unresolved risks |

**Total Duration: 20 weeks** (not 8 weeks). The original 8-week estimate lacked:
- Dependency resolution time (adapters, env config, auth reconciliation)
- Comprehensive verification effort (three test levels per feature)
- Realistic adapter development time (transparent adapters that preserve all semantics)
- Rollout and environment separation time

### 14.2 Phase Gate Criteria

**Each phase must pass these gates before advancing**:

1. **Typecheck Gate**: `npm run typecheck` — zero errors
2. **Unit Test Gate**: `npm test` — all domain regression tests passing (coverage ≥ 80% for domain layer)
3. **Emulator Parity Gate**: Same tests pass with `VITE_USE_EMULATORS=true`
4. **Integration Gate** (phases 3–8): e2E critical journeys pass in demo mode
5. **Security Gate**: Frontend guards verified as UX-only; no role-hint authorization; auth chain validated

Failure at any gate halts the phase; the team reverts to last completed phase and addresses the failure.

---

## 15. Acceptance Criteria

### 15.1 Final Acceptance Criteria (All Must Pass)

**Architecture Criteria**:
1. [ ] Seven-layer architecture diagram is consistent with dependency rules (Presentation → Application → Domain → Infrastructure Adapters → Infrastructure SDK → Emulator Layer → Environment Config)
2. [ ] Dependency direction is explicit: Presentation depends on Application; Application depends on Domain; Domain is independent; Infrastructure implements inner-layer interfaces
3. [ ] No circular dependencies exist (verified by `npm run typecheck` and dependency graph analysis)
4. [ ] Domain layer functions have zero Firebase/React imports (verified by scanning all `src/domains/*.ts` files)

**State Machine Criteria**:
5. [ ] All 12 valid states defined and documented
6. [ ] All transitions defined with actor, validation, backend operation, and failure state
7. [ ] Critical invariant: `service → completed` requires BOTH `estimateStatus === 'approved'` AND `finalAmountStatus === 'approved'` — mechanic cannot bypass
8. [ ] Admin has exactly three authorized recovery operations (release_stale, recapture_job, force_complete), each with validation, reason codes, and audit records

**Data & API Compatibility Criteria**:
9. [ ] All 35 features F1–F35 have exact API preservation (same function signatures, same return types)
10. [ ] All Firestore document shapes preserved unchanged (verified by comparing schema before/after)
11. [ ] All callable function contracts preserved (acceptOffer, declineOffer, reassignMechanic have identical input/output shapes)
12. [ ] All realtime listener semantics preserved (identical output for identical inputs)
13. [ ] All transaction semantics preserved (identical results for identical transactions)

**Security Criteria**:
14. [ ] Authorization chain reconciled: custom claims → Firestore rules → profile hints (hint only) → frontend guards (UX only)
15. [ ] Frontend guards hardened: check only `emailVerified` and `customClaims` for navigation; never for authorization decisions
16. [ ] Admin has exactly three authorized recovery operations; no blanket status overrides possible
17. [ ] Three-environment model enforced: DEMO cannot access production; EMULATOR isolated to live; LIVE connects to prod

**Migration Criteria**:
18. [ ] Feature-by-feature migration matrix completed (all F1–F35 mapped to new module + adapter + regression test)
19. [ ] Behavior parity proven through delta testing + emulator parity + E2E across three modes
20. [ ] Four rollback strategies defined and documented (application code, configuration, database schema, data)
21. [ ] Twenty-week phased sequence with gate criteria defined and estimated resources allocated

**UI/UX Criteria**:
22. [ ] Design tokens expanded (CSS custom properties); theme system supports dynamic theming
23. [ ] All components accessible (focus visible, color contrast ≥ 4.5:1, ARIA labels where appropriate)
24. [ ] All layouts responsive (mobile → tablet → desktop)
25. [ ] New components added alongside existing (no breaking changes; same API surface)

**Feature Preservation Criteria**:
26. [ ] All 35 features F1–F35 are preserved with no functionality loss
27. [ ] Idempotency preserved (request creation dedup)
28. [ ] Offer acceptance concurrency protection preserved (callable + transaction guard)
29. [ ] Mechanic capacity counters preserved (atomic increments/decrements)
30. [ ] Counter reconciliation preserved (release restores capacity)
31. [ ] Estimate provenance preserved (tracking through reassignment)
32. [ ] Reassignment safety preserved (estimate clearance + old mechanic release)
33. [ ] Stale-job recovery mechanism preserved (admin recover + capacity restoration)
34. [ ] Final amount approval preserved (prerequisite gate in state machine)
35. [ ] Payment write-once behavior preserved (cannot re-record payment)
36. [ ] Customer/mechanic/admin authorization preserved (via claims + rules, not frontend guards)

**Upon all 36 acceptance criteria passing**, the proposal is approved and Phase 0 of implementation may begin.

---