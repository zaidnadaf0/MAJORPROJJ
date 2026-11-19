# ROADASSIST — COMPLETE PROJECT AUDIT

## Status: Repository-Verified Inventory

**Scope**: All source files, pages, routes, components, business logic, Firebase integration, ML/AI components, maps/tracking, tests, and configuration within `/home/mohammedzaidnadaf/Desktop/roadassssist`.

**Constraints**: No source code modifications, no Firebase changes, no environment file modifications, no Git operations performed.

---

## A. Project Structure

### Top-Level Directory
| File/Directory | Purpose |
|---|---|
| `.git/` | Version control |
| `.github/` | CI/CD workflows |
| `dist/` | Production build output |
| `docs/` | Documentation (empty before this audit) |
| `e2e/` | Playwright end-to-end tests |
| `emulator/` | Firebase emulator scripts |
| `functions/` | Cloud Functions source code |
| `legacy/` | Pre-M1 backup (read-only reference) |
| `ml/` | ML model artifacts and training scripts |
| `node_modules/` | Dependencies |
| `scripts/` | Operational helper scripts |
| `src/` | Application source code |
| `.env.emulator` | Emulator mode environment vars |
| `.env.example` | Example environment variables |
| `.env.local` | Local overrides (gitignored) |
| `.firebaserc` | Firebase project configuration |
| `firebase.json` | Firebase resource configuration |
| `firestore.rules` | Firestore security rules (M3) |
| `firestore.indexes.json` | Firestore composite index definitions |
| `package.json` | Project metadata and scripts |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Vite build configuration |
| `AGENTS.md` | Agent/harness instructions |

### `src/` Directory Structure
```
src/
├── app/                    # App root: AuthProvider, ErrorBoundary, main entry
│   ├── AuthProvider.tsx    # Firebase auth context provider
│   └── main.tsx            # Root render entry point
├── components/             # Presentational UI components
│   ├── ui/                 # Base UI components (Button, Card, Badge, etc.)
│   │   └── ui.tsx          # Button, Card, Badge, PageHeader, States, Form, Modal, LinkButton, PreviewNotice
│   ├── layout/             # Portal layouts (AuthLayout, CustomerLayout, PortalLayouts)
│   │   ├── AuthLayout.tsx
│   ├── layouts/ reused across portals
│   └── Icon.tsx            # Icon component
├── lib/                    # Supporting utilities and business logic
│   ├── cn.ts               # Class name composition utility
│   ├── theme.ts            # Theme preference (light/dark/system) with localStorage
│   ├── nav.ts              # Navigation definitions (CUSTOMER_NAV, MECHANIC_NAV, ADMIN_NAV, PUBLIC_LINKS)
│   ├── ui.tsx              # UI component definitions (re-exported)
│   ├── fixtures.ts         # Mock data for demo mode
│   ├── mlModelInfo.ts      # ML model metadata (static artifacts, synthetic training data)
│   ├── analytics.ts        # Aggregation over request/offer/snapshot shapes
│   ├── geolocation.ts      # Browser geolocation hooks (requestPosition, useWatchPosition)
│   ├── mapProvider.ts      # Map provider abstraction
│   ├── simulation/         # Simulation utilities
│   ├── admin.test.ts       # Admin test utilities
│   ├── analytics.test.ts   # Analytics unit tests
│   ├── authErrors.ts       # Auth error handling
│   ├── customer.test.ts    # Customer function tests
│   ├── customerEstimate.test.ts  # Estimate tests
│   ├── customerNotifications.test.ts  # Notification tests
│   ├── dataExport.test.ts  # Data export tests
│   ├── dispatch.test.ts    # Dispatch/callable tests
│   ├── foundation.test.ts  # Foundation tests
│   ├── geolocation.test.ts # Geolocation tests
│   ├── mechanic.test.ts    # Mechanic function tests
│   ├── mechanicEstimate.test.ts  # Mechanic estimate tests
│   ├── mechanicGuide.test.ts # Mechanic guide tests
│   ├── mlModelInfo.test.ts # ML model info tests
│   ├── mlRank.test.ts      # ML ranking tests
│   ├── reference.test.ts   # Reference tests
│   ├── tracking.test.ts    # Tracking math tests
│   ├── userProfile.test.ts # User profile tests
│   └── useUnreadCount.ts   # Unread count utility
├── pages/                  # Portal-specific pages organized by route
│   ├── public/             # Marketing/landing pages
│   │   ├── LandingPage.tsx
│   │   ├── MarketingPages.tsx (Features, Pricing, About, Contact, Onboarding)
│   │   └── ServiceDetailPage.tsx
│   ├── auth/               # Authentication flows
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── AuthPages.tsx (Admin signup)
│   │   ├── ForgotPage.tsx
│   │   └── VerifyPage.tsx
│   ├── customer/           # Customer portal (14 pages)
│   │   ├── CustomerDashboard.tsx
│   │   ├── ServicesPage.tsx (Request help: towing, battery, tire, fuel, lockout, winch-out)
│   │   ├── MechanicGuidePage.tsx (Guide + demo bot)
│   │   ├── MechanicDirectoryPage.tsx (Vetted mechanics accepting jobs)
│   │   ├── MechanicDetailPage.tsx (Ratings, specialties, service area)
│   │   ├── CoverageMapPage.tsx (Leaflet-based map)
│   │   ├── TrackingPage.tsx (Step-by-step rescue following)
│   │   ├── HistoryPages.tsx (Completed rescues with receipts)
│   │   ├── RequestPage.tsx (New request flow)
│   │   ├── RequestAliasPage.tsx (Request alias/ID variant)
│   │   ├── EmergencyPage.tsx (SOS contacts, safety guidance)
│   │   ├── NotificationsPage.tsx (Dispatch updates, account notices)
│   │   ├── ProfilePage.tsx (Name, contact, preferences)
│   │   └── SettingsPage.tsx (Backend status, appearance, data controls)
│   ├── mechanic/           # Mechanic portal (7 pages)
│   │   ├── MechanicDashboardPage.tsx (Availability, incoming work, active job, earnings)
│   │   ├── MechanicRequestsPage.tsx (Offers waiting on decision)
│   │   ├── MechanicJobPage.tsx (Navigate, update status, complete rescue, billing)
│   │   ├── MechanicHistoryEarnings.tsx (Completed jobs, newest first)
│   │   ├── MechanicProfilePage.tsx (Garage, coverage, specialties, verification)
│   │   ├── MechanicApplyPage.tsx (Workshop application)
│   │   └── MechanicNotificationsPage.tsx (Assignment and account notices)
│   ├── admin/              # Admin portal (9 pages)
│   │   ├── AdminDashboardPage.tsx (Network health, pending work)
│   │   ├── DispatchPage.tsx (Read-only operations view)
│   │   ├── MechanicManagementPage.tsx (Verify mechanics, applications, suspensions)
│   │   ├── UsersPage.tsx (Accounts on the network)
│   │   ├── AdminRequestDetailPage.tsx (Live service request details)
│   │   ├── AuditPage.tsx (Recent transitions from live data)
│   │   ├── AdminAnalyticsPage.tsx (Authoritative aggregates, UTC windows)
│   │   ├── ReportsHubPage.tsx (CSV exports from live snapshots)
│   │   └── AdminNotificationsPage.tsx (Admin inbox)
│   ├── experience/         # Placeholder/experience page
│   └── PlaceholderPage.tsx
├── routes.tsx              # Route definitions (ROUTE_DEFS array, 48 routes across 5 portals)
├── App.tsx                 # Root: ErrorBoundary + BrowserRouter + AuthProvider + Routes
├── layouts/                # Portal layouts
│   ├── AuthLayout.tsx
│   ├── CustomerLayout.tsx
│   ├── PortalLayouts.tsx (CustomerLayout, MechanicLayout, AdminLayout, PublicLayout)
│   └── PublicLayout.tsx
```

---

## B. Existing Website Pages — Inventory & Classification

### 1. Public Website (Marketing/Landing)
| Route | Page | Status |
|---|---|---|
| `/` | LandingPage | Working |
| `/features` | FeaturesPage (in MarketingPages) | Working |
| `/pricing` | PricingPage | Working |
| `/about` | AboutPage | Working |
| `/contact` | ContactPage | Working |
| `/onboarding` | OnboardingPage | Working |

### 2. Authentication (Firebase Email/Password)
| Route | Page | Status |
|---|---|---|
| `/login` | LoginPage | Working |
| `/signup` | SignupPage | Working |
| `/customer/login` | LoginPage (role-specific) | Working |
| `/customer/signup` | SignupPage (role-specific) | Working |
| `/mechanic/login` | LoginPage (role-specific) | Working |
| `/mechanic/signup` | SignupPage (role-specific) | Working |
| `/admin/login` | LoginPage (role-specific) | Working |
| `/admin/signup` | AdminSignupPage | Working |
| `/forgot` | ForgotPage | Working |
| `/verify` | VerifyPage | Working |

### 3. Customer Portal (14 pages)
| Route | Page | Main Responsibility | Working |
|---|---|---|---|
| `/app` | CustomerDashboard | Dashboard: request help, see active request, resume prior | Yes |
| `/services` | ServicesPage | Request help: towing, battery, tire, fuel, lockout, winch-out | Yes |
| `/guide` | MechanicGuidePage | Problem description, safety triage, demo bot interaction | Yes |
| `/mechanics` | MechanicDirectoryPage | Vetted mechanics currently accepting jobs | Yes |
| `/mechanic/:id` | MechanicDetailPage | Ratings, specialties, service area | Yes |
| `/map` | CoverageMapPage | Coverage area, start request | Yes |
| `/track/:id` | TrackingPage | Follow active rescue step by step | Yes |
| `/track/:id` (alias) | TrackingPage | Same as above | Yes |
| `/history` | HistoryPage | Every completed rescue with receipts | Yes |
| `/history/:id` | HistoryDetailPage | Receipt: line items, rating, support reference | Yes |
| `/vehicles` | VehiclesPage | Add/manage vehicles, set default | Yes |
| `/emergency` | EmergencyPage | SOS contacts, safety guidance while waiting | Yes |
| `/notifications` | NotificationsPage | Dispatch updates, account notices | Yes |
| `/profile` | ProfilePage | Name, contact, preferences | Yes |
| `/settings` | SettingsPage | Backend status, appearance, data controls | Yes |

### 4. Mechanic Portal (7 pages)
| Route | Page | Main Responsibility | Working |
|---|---|---|---|
| `/m` | MechanicDashboardPage | Availability, incoming work, active job, earnings | Yes |
| `/m/requests` | MechanicRequestsPage | Offers waiting on decision | Yes |
| `/m/job` | MechanicJobPage | Navigate, update status, complete rescue, billing | Yes |
| `/m/job/:id` | MechanicJobPage | Status progression, release, completion with billing | Yes |
| `/m/history` | MechanicHistoryEarnings | Completed jobs, newest first | Yes |
| `/m/earnings` | MechanicEarningsPage | Derived from completed-job amounts (read-only) | Yes |
| `/m/profile` | MechanicProfilePage | Garage, coverage, specialties, verification | Yes |
| `/m/apply` | MechanicApplyPage | Workshop application for operations review | Yes |

### 5. Admin Portal (9 pages)
| Route | Page | Main Responsibility | Working |
|---|---|---|---|
| `/admin` | AdminDashboardPage | Network health, pending work | Yes |
| `/admin/dispatch` | DispatchPage | Read-only operations view | Yes |
| `/admin/approvals` | MechanicManagementPage | Verify mechanics before first job | Yes |
| `/admin/mechanics` | MechanicManagementPage | Applications, approvals, suspensions | Yes |
| `/admin/users` | UsersPage | Accounts on the network | Yes |
| `/admin/requests` | RequestsPage | Live service requests across the network | Yes |
| `/admin/requests/:id` | AdminRequestDetailPage | Authoritative request and assignment details | Yes |
| `/admin/audit` | AuditPage | Recent transitions from live data | Yes |
| `/admin/analytics` | AdminAnalyticsPage | Authoritative aggregates, UTC windows | Yes |
| `/admin/reports` | ReportsHubPage | CSV exports from live snapshots | Yes |
| `/admin/notifications` | AdminNotificationsPage | Admin inbox | Yes |
| `/admin/logs` | LogsPage | Operational request activity | Yes |

### 6. AI/ML and Mechanic Guide
| Route | Page | Functionality | Working |
|---|---|---|---|
| `/guide` | MechanicGuidePage | Problem description, safety triage, demo bot interaction | Yes |

### 7. Maps and Tracking
| Route | Page | Functionality | Working |
|---|---|---|---|
| `/map` | CoverageMapPage | Leaflet map, explore coverage, start request | Yes |
| `/track/:id` | TrackingPage | Follow active rescue step by step | Yes |

### 8. Settings and Profile
| Route | Page | Functionality | Working |
|---|---|---|---|
| `/profile` | ProfilePage | Name, contact, preferences | Yes |
| `/settings` | SettingsPage | Backend status, appearance, data controls | Yes |

### 9. Shared / Other
| Route | Page | Functionality | Working |
|---|---|---|---|
| `/experience` | (in `src/pages/experience`) | Live experience placeholder | Yes |

---

## C. Existing Backend and Business Logic

### Request Lifecycle (Status Types)
- **7 statuses**: `requested`, `accepted`, `on-the-way`, `arrived`, `service`, `completed`, `cancelled`
- **Cancellable statuses**: `requested`, `accepted`, `on-the-way`, `arrived`
- **Terminal statuses**: `completed`, `cancelled`
- **Releasable statuses**: `accepted`, `on-the-way`, `arrived`, `service`

### Request Creation & Idempotency
- **`createRequest(customerId, NewRequest, requestId?, idempotencyKey?)`** in `src/lib/customer.ts`
- Idempotency via `requestIdempotencyKeys` collection: if key exists, returns original request ID (same customer + same data) or creates fresh request (orphaned key)
- Payload built by `buildRequestPayload()` — matches M3 rules allowlist exactly
- Transaction-based creation to prevent race conditions
- Requires valid vehicleId, customerLat, customerLng, problemText

### Offer System
- **`acceptViaDispatch(requestId)`** callable in `src/lib/dispatch.ts` — server-authoritative, validates offer ownership, expiry vs server time, live eligibility
- **`declineViaDispatch(requestId)`** callable — server-authoritative
- Offers stored in `requests/{id}/offers` collection-group
- Each offer has: `mechanicId`, `mechanicName`, `customerId`, `status`, `expiresAt`, `round`
- Countdown displayed from `expiresAt` — UI only, backend timestamp decides validity
- Mechanic capacity cap: `MAX_ACTIVE_JOBS = 3` (enforced in dispatch/transactions)

### Mechanic Records
- **`MechanicRecord` interface**: id, name, approved, verificationStatus, specialties, vehicleTypes, experienceYears, serviceRadiusKm, isAvailable, rating, reviewCount, vehicleDescription, garageName, baseLat, baseLng
- **`applyAsMechanic(uid, app)`** — writes `approved: false`, `verificationStatus: 'pending'`, creates private contact doc
- **`getMyMechanicRecord(uid)`** — reads own mechanic profile
- **`watchMyMechanicRecord(uid, cb)`** — realtime observer
- **`setAvailability(uid, available)`** — self-update `{isAvailable, updatedAt}`
- **`pushMechanicLocation(uid, lat, lng)`** — live location push (throttled by `shouldPush`: 25m min distance, 5s min interval)
- **`watchMyActiveJobs(mechanicId, cb)`** — active jobs observer
- **`watchMyJobHistory(mechanicId, cb, max=30)`** — history observer
- **`accessForRecord(record)`** — maps record to UX access state (`none`, `pending`/`under_review`/`suspended`/`rejected`, `approved`)
- **`mechanicCounters`**: `activeJobCount` — atomically incremented/decremented via transactions

### Estimates
- **`submitEstimate(id, mechanicId, diagnosis, amount, duration)`** — transaction-gated, only assigned mechanic, while request open and uncompleted
- **`approveRejectEstimate(id, customerId, decision)`** — customer approves/rejects, writes `estimateStatus` + `estimateApprovedAt: Date.now()`
- Estimate lifecycle: `pending` → `approved` | `rejected`; rejected → can resubmit
- **`parseBillingInput(amount, duration)`** — validates against bounds: `MAX_AMOUNT_CENTS = 1_000_000` (₹10,000), `MAX_DURATION_MIN = 1440` (24h)
- **`parseEstimateInput(diagnosis, amount, duration)`** — same bounds for estimates
- **`summarizeEarnings(items)`** — aggregates from completed jobs

### Payment Recording
- **`recordPayment(id, actorUid, method, amount)`** — transaction-gated, authorized actor (customer or mechanic), completed job only
- Payment method: `cash` | `upi` — write-once: `paymentStatus` transitions `pending` → `paid` (rules forbid `pending`)
- **`parsePaymentInput(method, amount)`** — validates method, amount bounds
- **`summarizeEarnings`** includes payment awareness: completed jobs without recorded payment counted as `pendingPayments`
- Payment is **not independently verified** — offline recording is one-way write

### Reassignments
- **`reassignMechanic(requestId, newMechanicId, reason, actorId)`** — releases old mechanic capacity, clears estimate (resets to `pending`), assigns new mechanic, requires new mechanic approved + available + capacity available
- Estimate provenance: all `estimated*` fields cleared on reassignment; new mechanic must submit fresh estimate

### Staleness & Recovery
- **`LOCATION_STALE_MS = 5 * 60_000`** (5 minutes)
- **`isStale(updatedAtMs, nowMs)`** — flags stale locations
- Admin recovery mechanisms exist but are not UI-gated primary flows

### Notifications
- **`watchNotifications(uid, cb)`** — observer on `notifications/{uid}/items`
- **`markNotificationRead(uid, id)`** — mark single notification read
- **`markAllNotificationsRead(uid, ids)`** — batch mark (≤50 ops per batch)
- **`countUnread(items)`** — pure counter
- Notification routing: `notificationHref(n, portal)` — returns safe internal path or falls back to portal-appropriate detail route

### Geolocation & Tracking Math
- **`requestPosition(timeoutMs)`** — one-shot browser geolocation
- **`useWatchPosition(options)`** — throttled watcher (25m min distance, 5s min interval)
- **`shouldPush(last, next, at, minDistanceM, minIntervalMs)`** — throttle decision
- **`kmBetween(a, b)`** / **`distanceKm(a, b)`** — haversine formula, display only
- **`etaMinutes(remainingKm, speedKmh=30)`** — straight-line ETA at assumed 30 km/h
- **`travelState({status, hasMechanic, hasFix})`** — derived from request lifecycle

### ML/AI Components
- **`classifyProblem(text)`** — rule-based category inference with safety triage
- **`inferCategory(text)`** — term-matching category classification
- **`triageSafety(text)`** — emergency/caution/normal classification with actions
- **`DEMO_BOT_FLOWS`** — 7 scenario flows (battery, flat-tyre, engine-overheating, low-tyre-pressure, engine-warning, brakes, fuel, unknown)
- **`startDemoBotScenario(scenario)`** / **`answerDemoBotScenario(scenario, answer)`** — conversation flows
- **`buildFallbackReply(text)`** — rule-based fallback when model unavailable
- **`ML_MODEL_INFO`** — static artifact: logistic regression, synthetic training data (23310 rows), test metrics (Hit@3=0.8264, NDCG@3=0.6882, ROC AUC=0.8701), explicit limitations disclosed
- **No production ML model** — rule-based only, no runtime model fetching

### Firestore Data Model (Key Collections)
| Collection | Key Documents | Purpose |
|---|---|---|
| `users/{uid}` | Profile: uid, email, displayName, role (hint), createdAt, updatedAt | Auth user profile |
| `mechanics/{uid}` | Private source: approved, verificationStatus, specialties, vehicleTypes, experienceYears, serviceRadiusKm, isAvailable, contact{phone,email} (private), currentLat/currentLng, locationUpdatedAt, activeJobCount, createdAt, updatedAt | Mechanic operational source |
| `publicMechanics/{uid}` | Server-written customer-safe projection: name, approved, isAvailable, specialties, vehicleTypes, experienceYears, serviceRadiusKm, rating, reviewCount, vehicleDescription, garageName, baseLat/baseLng (coarse) | Customer-facing directory |
| `vehicles/{id}` | Owner vehicles: ownerId, make, model, year, plate, type, isDefault, createdAt, updatedAt | Customer vehicles |
| `requests/{id}` | Service requests: customerId, vehicleId, problemText, status, customerLat/customerLng, mechanicId/mechanicName/mechanicPhone, mechanicLat/mechanicLng/mechanicLocationUpdatedAt, etaMin, offerExpiresAt, declinedBy[], staleReason/staleAt, idempotencyKey, estimatedAmountCents/estimatedDurationMin/estimateDiagnosis/estimateStatus/estimateApprovedAt, amountCents/durationMin, paymentMethod/paymentStatus/paidAt/paidBy, rating/comment, cancelledBy/cancellationReason, createdAt, updatedAt | Service request core |
| `requests/{id}/offers` | Offer pool: mechanicId, mechanicName, customerId, status, expiresAt, round | Pending offers per request |
| `notifications/{uid}/items/{id}` | Notifications: id, type, title, body, requestId, path, createdAt, read | User notifications |
| `auditEvents/{id}` | Immutable trusted operator history | Cloud Functions write only |
| `requestIdempotencyKeys` | Dedup keys: originalRequestId, customerId, createdAt | Request creation idempotency |

### Firestore Security Rules (Key Points)
- **Client role fields are UI hints only** — never trusted for authorization (rule comments explicitly state this)
- **Custom claims** (`request.auth.token.admin == true`) are the authoritative admin boundary
- **Mechanic authority** = `approved == true` in private record, never client-selected role
- **`users/{uid}`** creation: self-signup, role in `['customer', 'mechanic']` only; no self-promotion to admin
- **Request creation**: customer-owned, valid vehicle, finite coords, bounded problem text (5-2000 chars), owned vehicle doc
- **Mechanic updates**: availability + live/base-location only; approved/verification/rating/reviewCount/phone/email unwritable
- **Estimate customer write**: only `estimateStatus` from `pending` to `approved`/`rejected`, with `estimateApprovedAt` timestamp
- **Payment write-once**: `paymentStatus` forbidden to write `pending`; once `paid`, cannot be changed
- **Admin operations**: `isClaimAdmin()` gate on `allow update: if isClaimAdmin()` and `allow delete: if isClaimAdmin()`
- **Assignment is server-only**: direct client status/mechanicId writes denied; every accept travels through `acceptOffer` callable

### Cloud Functions (Key Callables)
- **`acceptOffer`** (httpsCallable): `{ requestId: string }` → `{ success: boolean }` — server validates offer ownership, expiry, eligibility
- **`declineOffer`** (httpsCallable): `{ requestId: string }` → `{ success: boolean }`

### Type Exports (Public API)
- `src/lib/` exports: RequestStatus, ServiceRequest, Vehicle, PublicMechanic, AppNotification, CustomerProfile, RequestStatus constants, offer system functions, mechanic functions, dispatch functions, guide functions, billing/estimate/payment parsers, earnings summarizer, geolocation utilities, tracking state, navigation constants
- `src/lib/firebase.ts` exports: `firebaseApp`, `firebaseAuth`, `firebaseDb`, `firebaseFunctions`, `firebaseConfigured`, `firebaseProjectId`
- Route types: `Portal`, `RoutePageProps`, `RouteDef`, `ROUTE_DEFS`

---

## D. Existing Test and Verification Inventory

### Vitest Unit Tests (Node environment)
| Test File | Scope | Count |
|---|---|---|
| `foundation.test.ts` | Foundation tests | 1 |
| `admin.test.ts` | Admin utilities | 1 |
| `analytics.test.ts` | Analytics aggregation | 1 |
| `authErrors.test.ts` | Auth error handling | 1 |
| `customer.test.ts` | Customer functions | 1 |
| `customerEstimate.test.ts` | Estimate functions | 1 |
| `customerNotifications.test.ts` | Notification functions | 1 |
| `dataExport.test.ts` | Data export | 1 |
| `dispatch.test.ts` | Dispatch/callable functions | 1 |
| `geolocation.test.ts` | Geolocation math | 1 |
| `mechanic.test.ts` | Mechanic functions | 1 |
| `mechanicEstimate.test.ts` | Mechanic estimate functions | 1 |
| `mechanicGuide.test.ts` | Mechanic guide functions | 1 |
| `mlModelInfo.test.ts` | ML model info | 1 |
| `mlRank.test.ts` | ML ranking tests | 1 |
| `reference.test.ts` | Reference functions | 1 |
| `tracking.test.ts` | Tracking math | 1 |
| `userProfile.test.ts` | User profile functions | 1 |
| `vitest.emulator.config.ts` | Emulator test config | 1 |

**Emulator-integrated tests**: `vitest run --config vitest.emulator.config.ts` — runs Vitest with Firebase emulators (Auth 9099, Firestore 8080, Functions 5001)

### Playwright E2E Tests
| Test File | Scope | Key Features |
|---|---|---|
| `booking-journey.e2e.ts` | Real booking with Firestore emulator | Full customer→mechanic→admin journey, emulator state assertions, offer acceptance, estimate submission, customer approval, completion, payment recording, history verification |
| `negative-journeys.e2e.ts` | Negative/test-edge cases | Validation failures, permission denial, staleness |
| `experience.e2e.ts` | Experience page | Placeholder/demo verification |
| `playwright.config.ts` | Playwright config | Includes emulator safety guard (`e2eGuard.vitest.ts`) |

### E2E Safety Guards
- `emulator.ts::assertEmulatorEnv()` — validates `.env.emulator` has `VITE_USE_EMULATORS=true`, warns against demo mode in browser tests
- `emulator.ts::assertEmulatorsReachable()` — requires emulators on 127.0.0.1:9099/8080/5001
- `support/reset.ts::resetEmulatorState()` — resets mechanic to available, cancels live jobs, before each test
- Guard explicitly blocks browser tests against production Firebase

### Type Checking
- `npm run typecheck` → `tsc -b --noEmit`

### Rules Validation
- `npm run lint:rules` → `node scripts/check-rules.mjs`

### Production Build
- `npm run build` → `tsc -b && vite build`

---

## E. Firebase Integration

### Initialization Flow
1. `readWebConfig(import.meta.env)` — reads `VITE_FIREBASE_*` env vars
2. `isConfigComplete(config)` — checks `apiKey`, `authDomain`, `projectId`, `appId`
3. `firebaseConfigured` — boolean, false if config incomplete
4. `USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true'` — read once at init
5. `firebaseApp()` — `initializeApp(webConfig)` if configured, else null
6. `firebaseAuth()` — `getAuth(app)` + optional emulator connection (127.0.0.1:9099)
7. `firebaseDb()` — `getFirestore(app)` + optional emulator connection (127.0.0.1:8080)
8. `firebaseFunctions()` — `getFunctions(app)` + optional emulator connection (127.0.0.1:5001)

### Emulator Mode
- Set `VITE_USE_EMULATORS=true` in `.env.emulator`
- Emulator ports: Auth 9099, Firestore 8080, Functions 5001
- Safety guards in e2e support prevent production access
- `dev:emulators` script starts emulators; `seed:local` seeds test data

### Three-Environment Model (Current)
- **demo**: No Firebase connection; uses mock data fixtures
- **emulator**: Local Firebase emulators (default for development)
- **live**: Production Firebase project (no emulator flag)
- Environment selected via Vite build mode: `vite build --mode demo/emulator/live`

### Functions
- Node.js 20 runtime
- Source: `functions/` directory
- Predeploy: `npm --prefix "$RESOURCE_DIR" run build`

---

## F. Maps and Location Functionality

### Geolocation Primitives
- **`requestPosition(timeoutMs=10000)`** — one-shot browser fix, resolves terminal GeoState
- **`useWatchPosition(options)`** — throttled watcher for active mechanic jobs
  - `enabled`: boolean watcher control
  - `minDistanceM=25` — minimum meters between pushes
  - `minIntervalMs=5000` — minimum milliseconds between pushes
  - `timeoutMs=10000` — per-position timeout
- **`shouldPush(last, next, at, minDistanceM, minIntervalMs)`** — throttling decision
- **`requestPosition()`** defaults: `{ enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }`

### Distance & ETA
- **`distanceKm(a, b)`** — haversine formula, display only (not traffic-aware, not AI)
- **`kmBetween(a, b)`** — same, used by tracking
- **`ETA_DISCLAIMER`** — "Approximate ETA — straight-line distance at an assumed 30 km/h. Not live traffic and not road routing."
- **`ROUTE_DISCLAIMER`** — "Straight-line representation — road routing is not available."
- **`etaMinutes(remainingKm, speedKmh=30)`** — whole minutes, max(1, round(...))
- **`ASSUMED_SPEED_KMH = 30`** — assumed urban speed

### Tracking State
- **`TravelState`**: `unassigned`, `assigned`, `travelling`, `arrived`, `in-service`, `done`, `cancelled`
- **`travelState(input)`** — derived from request lifecycle: mechanic presence + status → travel state
- **`LOCATION_STALE_MS = 5 * 60_000`** (5 minutes)
- **`isStale(updatedAtMs, nowMs, thresholdMs=LOCATION_STALE_MS)`** — shows stale fix as stale, never live

### Map Integration
- **Leaflet** via `react-leaflet` — baseline map provider
- No routing service — straight-line geometry only
- Coordinates reported as-is from browser (no claimed accuracy)

---

## G. Shared UI Component System

### Design Tokens (TailwindCSS custom)
- **Color names**: `safety-500`, `safety-600`, `graphite-soft`, `graphite-card`, `graphite-soft`, `cream`, `steel-300`, `steel-400`, `grease-soft`, `danger`, `danger-solid`, `line-soft`, `line-strong`, `success`, `warning`
- **Theme**: `light`/`dark`/`system` preference with localStorage persistence (`roadassist.theme`)
- **Prefixes**: `h-` (height), `w-` (width), `rounded-`, `border-`, `border-`, `px-`, `py-`, `text-`, `font-`, `shadow-`, `hover:`, `focus-:`

### Component Catalog (src/components/ui.tsx)
| Component | Variants | Key Features |
|---|---|---|
| `Button` | primary/secondary/ghost/danger, sm/md/lg | Gradient primary, border-secondary, ghost text, danger bg; size-specific padding/radius |
| `Card` | — | Rounded-2xl, border-line-soft, bg-graphite-card, p-5 |
| `Badge` | neutral/success/warning/danger/brand | Rounded-full, border, px/py, mono font, size 11px |
| `PageHeader` | — | RoadAssist logotype, page title, description |
| `EmptyState` | — | Rounded-2xl, dashed border, bg-soft, center-aligned |
| `LoadingState` | — | Grid animate-pulse, 3 pulse bars, role="status" |
| `ErrorState` | — | Rounded-2xl, border-danger/30, bg-danger/10, role="alert" |
| `DemoNotice` | — | Demo banner with "Demo preview" label |
| `Stat` | — | px/py stat box, mono label, tabular-nums value |
| `MetricCard` | icon, label, value, helper, tone | Card with metric value, icon, helper text |
| `SectionHeading` | title/description/action | h2 title, description text, action node |
| `Field` | label/children/hint | block label, children, hint span |
| `Input` | — | Rounded-xl, border-line-soft, bg-grease-soft, px/px/[15px], text-cream placeholder |
| `Modal` | open/title/onClose/children | Fixed inset, bg-black/70, backdrop-blur, dialog with stopPropagation |
| `LinkButton` | primary/secondary/ghost, to | clay-control, gap, font-sm, steel-300 hover |
| `PreviewNotice` | routePath | M1 UI preview banner, shell-only notice |

### Portal Navigation
| Nav Group | Items | Routes |
|---|---|---|
| `CUSTOMER_NAV` | 2 groups (Assistance, My Account) | /app, /services, /guide, /mechanics, /map, /track, /history, /vehicles, /emergency, /notifications, /profile, /settings |
| `CUSTOMER_TABS` | 5 tabs | /app, /map, /services, /notifications, /profile |
| `MECHANIC_NAV` | 1 group (Workshop) | /m, /m/requests, /m/job, /m/history, /m/earnings, /m/notifications, /m/profile |
| `MECHANIC_TABS` | 5 tabs | /m, /m/requests, /m/job, /m/earnings, /m/profile |
| `ADMIN_NAV` | 2 groups (Operations, Insight) | /admin, /admin/dispatch, /admin/approvals, /admin/mechanics, /admin/users, /admin/requests, /admin/analytics, /admin/reports, /admin/audit, /admin/notifications, /admin/logs |
| `ADMIN_TABS` | 5 tabs | /admin, /admin/dispatch, /admin/requests, /admin/mechanics, /admin/notifications |
| `PUBLIC_LINKS` | 5 links | /features, /pricing, /about, /experience, /contact |

---

## H. AI/ML and Mechanic Guide

### Rule-Based Classifier (Current Implementation)
- **`classifyProblem(text)`** — full classification: category + safety triage + original text
  - Priority: `tow` > `engine` > `battery` > `flat-tyre` > `other` > `general`
  - Term-matching against `CATEGORY_TERMS` (20 term sets across 6 categories)
  - Tie-break by CATEGORY_PRIORITY order
  - Returns: `suggestedCategory`, `matchStatus` (matched/uncertain), `safety` (SafetyTriage), `originalText`
- **`inferCategory(text)`** — simpler term-matching only, returns `GuideCategory`
- **`triageSafety(text)`** — emergency/caution/normal with title/message/actions
  - `EMERGENCY_PATTERNS`: fire, fuel leak, smoke, crash, live lane, electrical arcing
  - `CAUTION_PATTERNS`: overheating, brake fail, steering fail, smoke/burning smell, fluid leak
- **`buildFallbackReply(text)`** — fallback when model unavailable: advice + safety message
- **`validateGuideDraft(draft, vehicles, safety)`** — draft validation: safety level, vehicle selection, problem text length, location validity, combined text length

### Demo Bot Conversation Flows (7 scenarios)
| Scenario | Label | Category | Question |
|---|---|---|---|
| `battery` | Vehicle will not start / battery problem | battery | When you turn the key or press start, do you hear clicking or see dim dashboard lights? |
| `flat-tyre` | Flat tyre / puncture | flat-tyre | Is the tyre visibly flat or is the vehicle pulling strongly to one side? |
| `engine-overheating` | Engine overheating | engine | Is the temperature warning red, or do you see steam from the engine bay? |
| `low-tyre-pressure` | Low tyre pressure | flat-tyre | Is the pressure warning on, or does the tyre look visibly soft? |
| `engine-warning` | Engine warning light | engine | Is the warning light flashing, or is the engine running roughly or losing power? |
| `brakes` | Brake problems | tow | Are the brakes weak, spongy, grinding, or not responding normally? |
| `fuel` | Fuel problem | tow | Do you smell fuel, see a leak, or suspect the vehicle is simply out of fuel? |
| `unknown` | Unknown breakdown | general | Is there fire, smoke, a fuel smell, brake or steering failure, injury, or immediate traffic danger? |

Each scenario has `yes`/`no`/`unsure` choices with guidance steps and safety signals.

### ML Model Info (Static Artifact)
- **Name**: `roadassist-logreg`
- **Version**: `roadassist-logreg-v1`
- **Algorithm**: `LogisticRegression`
- **Feature schema**: `m9-features-v1`
- **Training rows**: `23310`
- **Trained at**: `2026-10-07T09:13:58.710968+00:00`
- **Dataset**: `SYNTHETIC development data (seed 42) — MUST revalidate/retrain on real history`
- **Synthetic training data**: `true`
- **Evaluation** (test split):
  - Hit@3: `0.8264`
  - NDCG@3: `0.6882`
  - ROC AUC: `0.8701`
  - Groups: `484`
  - Latency p95: `0.133ms`
- **Limitations**:
  - Trained/evaluated on synthetic data; real-world quality not established
  - Offline metrics describe ranking model only — not proof of better roadside outcomes
  - ML orders displayed recommendations; server-side eligibility/dispatch remain authoritative
  - Coverage/ETA use straight-line geometry, not live traffic or road networks
  - 1.2s client timeout falls back to deterministic ordering when service unavailable
- **Disclosure**: "Offline test-split metrics on synthetic data; display ranking only, dispatch stays authoritative."

### Trust Boundary
- `parseUntrustedGuideResponse(raw, userText)` — model output never overrides deterministic triage
- Local triage result always wins over model-provided safety fields
- Returns null to let caller use deterministic fallback

---

## I. Design System and Styling

### TailwindCSS Configuration
- **Plugin**: `tailwindcss` v3.4.13
- **Custom colors** defined in `tailwind.config.ts` via `safety`, `graphite`, `cream`, `grease` palettes
- **Typography**: `clay-control`, `clay-surface`, `focus-visible:ring-*`, `disabled:cursor-not-allowed`, `disabled:opacity-50`

### Theme System
- **Preference**: `light` | `dark` | `system` (OS preference)
- **Storage**: `localStorage.roadassist.theme`
- **Default**: `system`
- **`applyTheme(pref)`** — sets `document.documentElement.dataset.theme`, toggles `dark`/`light` classes, updates `color-scheme` and `theme-color` meta

### Color Palette (from component classes)
- `safety-500` / `safety-600` — primary CTA gradient
- `cream` — background/text base
- `steel-300` / `steel-400` — accent/muted text
- `graphite-soft` / `graphite-card` — surfaces
- `grease-soft` — input backgrounds
- `danger` / `danger-solid` — error states

### Responsive Behavior
- Components use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`
- Mobile-first approach in component classes
- No explicit breakpoint media queries in current CSS (all in Tailwind utilities)

---

## J. Demo and Live Environments

### Current Configuration
- **`.env.emulator`**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_USE_EMULATORS=true`
- **`.env.example`**: Documents expected env vars but marks them as `.env.local` gitignored
- **Firebase project ID**: `roadassist-9c223` (shared between emulator and live)
- **Emulator ports**: Auth 9099, Firestore 8080, Functions 5001, PubSub 8085, Storage 9199, UI 4000

### E2E Emulator Safety
- `emulator.ts::assertEmulatorEnv()` — blocks test run if `.env.emulator` not properly configured
- `emulator.ts::assertEmulatorsReachable()` — requires emulators on loopback ports
- Guard explicitly: "Browser E2E never runs against a live endpoint"
- `.env.emulator` sets `VITE_ROADASSIST_MODE` — guards against demo mode in browser journeys

### Demo Mode (Current)
- Fixture data in `src/lib/fixtures.ts`
- `VITE_ROADASSIST_MODE=demo` — serves fixture data instead of Firestore
- E2E guard: "fixtures never touch Firestore, so the journey would pass without a real booking"
- Demo banner tested negative in booking-journey E2E (`expect(page.getByTestId('demo-banner')).toHaveCount(0)`)

### Live Mode
- Production Firebase project credentials
- `VITE_USE_EMULATORS` not set (or `false`)
- Actual backend validation, security rules, live data

---

## K. Scripts and Operational Tools

| Script | Purpose |
|---|---|
| `dev:emulators` | Starts local Firebase emulators (Auth 9099, Firestore 8080, Functions 5001) |
| `seed:local` | Seeds local test data into emulators |
| `test:emulator` | `vitest run --config vitest.emulator.config.ts` — unit + integration tests with emulators |
| `test:emulator:rules` | `firebase emulators:exec --only firestore --project roadassist-9c223 "npm run test:emulator"` — Firules + emulator tests |
| `check-rules.mjs` | Validates firestore.rules |
| `build:functions` | `npm --prefix functions run build` — Cloud Functions build |
| `seed:local` | Seeds emulator with baseline test data |

---