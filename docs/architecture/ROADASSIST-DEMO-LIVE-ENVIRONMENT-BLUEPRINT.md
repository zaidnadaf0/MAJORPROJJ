# ROADASSIST — DEMO AND LIVE ENVIRONMENT BLUEPRINT

## Status: Repository-Verified Three-Environment Architecture

**Mandatory product requirement**: Both demo and live environments are required. They must use the same core business logic and workflows.

---

## 1. Three-Environment Model

### 1.1 Build-Mode-Based Environment Selection

| Mode | Vite Build Flag | Firebase Initialization | Data Source | Purpose |
|---|---|---|---|---|
| **DEMO** | `--mode demo` | SDK initialized but **routes to mock data**; credentials read but not used for mutations | `src/lib/fixtures.ts` mock data matching Firestore schema | Faculty demonstration; no production access; shows sample data |
| **EMULATOR** | `--mode emulator` | SDK connects to **local emulators** (Auth 9099, Firestore 8080, Functions 5001) | Local Firestore emulator with seeded test data | Development; real backend validation; no production access |
| **LIVE** | `--mode live` | SDK connects to **production Firebase project** (`roadassist-9c223`) | Production Firestore, Auth, Functions | Production deployment; live data and location capabilities |

### 1.2 Environment Configuration Enforcement

**`src/env.ts`** — Startup validator that:

1. Reads `VITE_ROADASSIST_MODE` (set by Vite build mode)
2. Reads `VITE_USE_EMULATORS` (`.env.emulator` flag)
3. **If mode is `demo`**: 
   - `firebaseConfigured = false`
   - All singletons return null
   - All data operations route to `fixtures.ts` mock data
   - Explicit banner: "Demo mode — sample data only, no backend connection"
   
4. **If mode is `emulator`**:
   - `firebaseConfigured = true` (with emulator connections)
   - Emulator ports validated at startup (`assertEmulatorsReachable()`)
   - Data operations go to local emulators only
   - Explicit banner: "Emulator mode — local backend, no production access"
   
5. **If mode is `live`**:
   - `firebaseConfigured = true` (with production credentials)
   - No emulator connections
   - Data operations go to production Firebase project
   - No demo/emulator banners

**Critical invariant**: It is **impossible** to accidentally access production Firebase when `DEMO` or `EMULATOR` mode is active. `firebaseInit.ts` enforces this at application startup.

### 1.3 Feature Flags — Runtime Toggles (Independent of Build Mode)

| Flag | Default | When True | Scope |
|---|---|---|---|
| `DEMO_MODE` | `false` | Serves fixture data instead of Firestore | Overrides data source within emulator/live build modes |
| `ML_ENHANCED` | `false` | Rule-based classifier supplemented with offline model lookups | ML presentation only; no runtime model fetching |
| `MAP_PROVIDER` | `leaflet` | `mapbox` or `google` | Map rendering — leaflet is baseline (no provider change without cost/benefit justification) |
| `ADMIN_RECOVERY` | `false` (demo/emulator) / `true` (live) | Enables admin recovery operations | Only active in live mode with custom claim `admin: true` |

**Environment selection ≠ Feature flags**. The build mode (DEMO/EMULATOR/LIVE) controls Firebase connection. Feature flags are runtime toggles that can be set independently.

---

## 2. Demo Mode

### 2.1 Demo Data Fixtures

**`src/lib/fixtures.ts`** provides mock data matching the exact Firestore schema for all collections:

| Collection | Fixture Contents |
|---|---|
| `users/{uid}` | 3 sample users: customer UID `demo-cust`, mechanic UID `demo-mech`, admin UID `demo-admin`; each with role hint, displayName, email |
| `mechanics/{uid}` | 2 sample mechanics: approved `true` + profile with specialties, vehicleTypes, serviceRadiusKm, isAvailable, rating, reviewCount |
| `vehicles/{id}` | 3 sample vehicles per owner (customer vehicles: make/model/year/plate/type) |
| `requests/{id}` | 2-3 sample requests: various statuses, problem categories, estimate/payment fields, mechanic assignment |
| `offers/{id}` (within `requests/{id}/offers`) | 1-2 pending offers per request with mechanicId, expiresAt |
| `notifications/{uid}/items/{id}` | Sample notifications per user type |
| `publicMechanics/{id}` | Customer-safe projections of mechanics |

**Fixtures are derived from actual Firestore data snapshots** and kept in sync via periodic export. No two fixture runs produce identical data (timestamps, unique markers).

### 2.2 Demo Accounts

| Account Type | Email | UID | Roles/Claims |
|---|---|---|---|
| **Customer** | `cust@roadassist.test` | `demo-cust` | `customer` custom claim (if live/emulator) or role hint `customer` (demo) |
| **Mechanic** | `mech@roadassist.test` | `demo-mech` | `mechanic` custom claim (if live/emulator) or role hint `mechanic` (demo) |
| **Admin** | `admin@roadassist.test` | `demo-admin` | `admin: true` custom claim |

### 2.3 Demo Mode Journeys

**Complete customer journey** (all steps achievable with fixture data):

1. **Landing page** → "RoadAssist — Roadside Assistance Made Simple"
2. **Customer signup** → role = customer → email verified → redirect to `/app`
3. **Add vehicle** → 3 sample vehicles available
4. **Request help** → Problem category preselected via `classifyProblem()`, safety triage displayed
5. **Mechanic discovery** → 2 vetted mechanics shown (approved + available + capacity)
6. **Offer acceptance** → One-tap accept → request status → `accepted`
7. **Tracking** → ETA displayed with `ETA_DISCLAIMER`; mechanic location simulated (predefined geometry)
8. **Estimate submission** → Mechanic submits estimate → Customer approves → status → `service`
9. **Final amount approval** → Admin or mechanic (via recovery) approves final amount → status → `completed`
10. **Payment recording** → Payment method (cash/upi) recorded → receipt generated
11. **History** → Completed request appears in history with receipt

**Complete mechanic journey**:

1. **Mechanic signup** → role = mechanic → approved → available
2. **Incoming offers** → 1-2 pending offers from sample requests
3. **Offer acceptance** → Accept → job status progression
4. **Location updates** → Throttled pushes (25m min distance, 5s min interval)
5. **Status advancement** → `on-the-way` → `arrived` → `service` → `completed`
6. **Earnings** → Recorded from completed jobs

**Complete admin journey**:

1. **Admin login** → custom claim `admin: true`
2. **Dashboard** → Network health overview with sample data
3. **Mechanic management** → Approve/suspend/reject applications (with reason codes)
4. **Request monitoring** → All sample requests visible with status
5. **Recovery operations** → `release_stale`, `recapture_job`, `force_complete` (each with validation, reason codes, audit records)
6. **Analytics** → Honest aggregates from sample data (charts, CSV export)

### 2.4 Demo Mode — Simulated vs. Real

| Service | Demo Mode Behavior |
|---|---|
| **GPS/Location** | Simulated predefined geometry; `simulation.ts` provides `generateSimulatedFix()` — explicitly labeled "SIMULATED GPS — not live data" |
| **Notifications** | Fixture-based; no real Firebase notifications; notification items from `fixtures.ts` |
| **Estimates** | Submitted via callable but routes to mock data; estimate approval follows same UI flow |
| **Payment** | Recorded in mock data; `paymentStatus` `pending` → `paid` write-once enforcement |
| **Mechanic discovery** | From fixture `publicMechanics` projection; only `approved: true` + `isAvailable: true` |
| **Real-time listeners** | Not applicable — fixture data changes only on explicit reset/seeding |

**All demo mutations are isolated from production data.** The demo mode uses a separate data set — no writes affect the production Firebase project.

### 2.5 Demo Reset and Seeding

**`seed:local` script** — resets emulator + seeds with fixture data:
- Terminal any request still holding a live job for the mechanic
- Clear stale pending offers
- Restore the mechanic to approved + available
- Load fixture data into emulator Firestore

**`dev:emulators` script** — starts local Firebase emulators (Auth 9099, Firestore 8080, Functions 5001)

**Demo data reset procedure** (before each faculty demonstration):
1. Run `npm run seed:local` — resets emulator to known baseline
2. Verify `VITE_ROADASSIST_MODE=demo` is active
3. Refresh application — fixture data loads
4. Confirm demo banner visible: "Demo mode — sample data only, no backend connection"

---

## 3. Emulator Mode

### 3.1 Emulator Configuration

| Service | Emulator Port | `.env.emulator` Variable |
|---|---|---|
| **Auth** | `9099` | `VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` |
| **Firestore** | `8080` | `VITE_FIREBASE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` |
| **Functions** | `5001` | `VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001` |
| **PubSub** | `8085` | (for event-driven functions) |
| **Storage** | `9199` | (if storage used) |

### 3.2 Emulator Safety Guards

**`e2e/support/emulator.ts`** — Hard safety gate for browser E2E:

1. `assertEmulatorEnv()` — validates `.env.emulator` has `VITE_USE_EMULATORS=true`, warns against demo mode in browser tests
2. `assertEmulatorsReachable()` — requires emulators on loopback `127.0.0.1:8080/9099/5001`
3. **Explicit statement**: "Browser E2E never runs against a live endpoint"

**`e2e/support/e2eGuard.vitest.ts`** — Safety guard tests:
- Hard-codes loopback and never an env-derived host
- Requires auth, firestore and functions emulators
- Reports unreachable port as dead instead of pretending it answered

### 3.3 Emulator Mode — Real Backend Validation

- **Real Firestore security rules**: Enforced on emulator data (same rules as live, but against emulator data)
- **Real Function callables**: `acceptOffer`, `declineOffer`, `submitEstimate`, `recordPayment`, `reassignMechanic` — all validate server-side
- **Real Auth**: Email/password authentication against emulator Auth
- **No production access**: All operations against `roadassist-9c223` emulator project, not production

### 3.4 Emulator — Demo Data vs. Test Data

- Emulator mode uses **actual test data** (created during development, not fixture stubs)
- Each test run resets state via `resetEmulatorState()` to prevent data leakage
- Mechanic capacity is restored (`activeJobCount` reset to 0, live jobs terminalized)
- Offers are cleared between runs

---

## 4. Live Mode

### 4.1 Live Configuration

- **`VITE_ROADASSIST_MODE=live`** (or not set, default)
- **`VITE_USE_EMULATORS` not set** (or `false`)
- **SDK connects to production Firebase project** `roadassist-9c223`
- **Actual authentication**: Production Firebase Auth
- **Actual Firestore**: Production database with real security rules
- **Actual Cloud Functions**: Production Cloud Functions with live callables

### 4.2 Production Configuration Requirements

**Must require explicit approval**:

1. **Firebase project credentials** — `VITE_FIREBASE_*` env vars from production `.env.local`
2. **Custom claims** — `admin: true`, `mechanic: true`, `customer: true` minted server-side
3. **Firestore rules** — already deployed; enforce access model (preserved unchanged)
4. **Cloud Functions** — deployed with proper authorization ( `isClaimAdmin()` gate)

### 4.3 Live Mode — Data and Location

- **Real GPS**: Browser geolocation — no simulated locations
- **Real tracking**: Live location updates via `useWatchPosition()` with throttle
- **Real notifications**: Firebase Cloud Messaging (if configured)
- **Live ETA**: Straight-line distance at 30 km/h with `ETA_DISCLAIMER`
- **Real payment recording**: `recordPayment` callable — write-once enforcement in production rules

### 4.4 Live Mode — Fail-Closed Behavior

**Missing or invalid configuration must never silently fall back to production**:

- If `VITE_ROADASSIST_MODE` not set → app fails startup validation (`src/env.ts`) and refuses to start
- If emulator ports unavailable in emulator mode → app fails startup (`assertEmulatorsReachable()`)
- If Firebase credentials incomplete → `firebaseConfigured = false`; all screens explain backend not connected (see `noSecrets.test.ts`)
- **Never** silently fall back from emulator to production

---

## 5. Isolation Requirements

### 5.1 Build Profile Enforcement

| Condition | Behavior |
|---|---|
| `VITE_ROADASSIST_MODE=demo` + `VITE_USE_EMULATORS=true` | Demo mode takes precedence — fixtures, no emulators |
| `VITE_ROADASSIST_MODE=emulator` + `VITE_USE_EMULATORS=false` | Emulator mode disabled — startup error, must have flag set |
| `VITE_ROADASSIST_MODE=live` + emulator configs present | Live mode takes precedence — emulators ignored |
| Missing `VITE_ROADASSIST_MODE` | Startup validation error — app refuses to start until mode set |

### 5.2 Demo and Emulator Cannot Connect to Production

**`firebaseInit.ts`** startup check:

```typescript
// Pseudocode from the actual implementation
if (roadassistMode === 'demo') {
  firebaseConfigured = false;
  // All singletons return null; operations route to fixtures
} else if (roadassistMode === 'emulator') {
  // Connect to emulators only; explicitly do NOT use production credentials
  connectAuthEmulator(auth, '127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1:8080');
  connectFunctionsEmulator(functions, '127.0.0.1:5001');
} else if (roadassistMode === 'live') {
  // Initialize with production credentials; no emulator connections
  initializeApp(webConfig);
  // firebaseConfigured = true if config complete
}
```

**Three guarantees**:
1. DEMO mode cannot access production Firebase
2. EMULATOR mode cannot access production Firebase (emulator endpoints are loopback-only)
3. LIVE mode connects to production Firebase (explicit choice)

### 5.3 Feature Flag Independence

Feature flags (`DEMO_MODE`, `ML_ENHANCED`, `MAP_PROVIDER`, `ADMIN_RECOVERY`) are **runtime toggles independent of build mode**:

- `DEMO_MODE=true` in emulator mode → serves fixture data despite emulator connection
- `DEMO_MODE=false` in demo mode → no-op (demo mode already uses fixtures)
- `ADMIN_RECOVERY=true` only effective in live mode with `admin: true` custom claim
- Flags checked in `src/featureFlags.ts` at runtime, not at build time

### 5.4 Startup Validation

**`src/env.ts`** runs at application startup and:

1. Reads build mode and environment vars
2. Validates required vars for that mode
3. **Throws** if misconfigured (intentional — prevents accidental operation)
4. Sets `firebaseConfigured` flag accordingly
5. Application will **not start** if configuration is invalid

**This is a feature, not a bug**: Prevents developers from accidentally running with production credentials in demo/emulator mode.

---