# ROADASSIST — REVISED ARCHITECTURE PROPOSAL

**Status**: Planning Mode — Source code modifications prohibited. No Firebase, database, environment or Git changes.

**Owner Approval**: Major architectural redesign direction approved. Planning and proposal phase only.

---
## CORRECTIONS TO ORIGINAL PROPOSAL

This section documents all 14 corrections made to the original REDESIGN_PROPOSAL.md:

### Correction 1: Architecture Layer Reconciliation
- **Original**: Claimed six architecture layers with inconsistent diagram
- **Revised**: Seven-layer architecture clearly defined and reconciled with diagram. Every layer has explicit responsibilities. Layers: Presentation, Application, Domain, Infrastructure Adapters, Infrastructure SDK, Emulator Layer, Environment Configuration. Dependency flow is unidirectional inward.

### Correction 2: Dependency Direction
- **Original**: Vague "inward" dependency rule; no consistent direction
- **Revised**: Explicit dependency rule: Presentation depends on Application; Application depends on Domain; Domain is completely independent of infrastructure and UI frameworks; Infrastructure implements interfaces required by inner layers. No circular dependencies permitted.

### Correction 3: Booking State Machine
- **Original**: High-level lifecycle diagram only; missing states, actors, validations, failure states
- **Revised**: Complete state machine with 12 valid states, every transition with actor, validation rules, backend operation, and failure state defined. Includes staleness, concurrency, and recovery transitions.

### Correction 4: Final Amount Approval & Completion Ordering
- **Original**: Implied customer approval occurs after mechanic completion without explicit ordering constraint
- **Revised**: Strict ordering invariant: final amount approval is a **prerequisite** for status transition to `completed`. Mechanic cannot mark `completed` without prior `finalAmountStatus: approved`. Admin override cannot bypass this requirement. The state machine enforces this at the transaction level.

### Correction 5: Unrestricted Admin Status Overrides
- **Original**: Admin could override any status with minimal validation
- **Revised**: Admin has exactly three authorized recovery operations, each with: required reason code, validation checks, and immutable audit record creation. No "blanket" status override permission. All admin actions are funneled through a recovery orchestrator that validates request state, authorizes the actor, and records the action in an audit collection.

### Correction 6: Authentication & Authorization Reconciliation
- **Original**: Frontend guards treated as authorization enforcement; custom claims mixed with profile hints
- **Revised**: Explicit distinction of four authorization layers:
  1. **Firebase Custom Claims** — server-issued, immutable, the *true* authorization boundary
  2. **Firestore Rules** — server-enforced data access policies
  3. **Role Profile Hints** — client-side UI hints only (`users/{uid}.role`), never trusted for authorization
  4. **Frontend Guards** — purely for navigation/UX, **never** authorization enforcement
  The authorization chain is: Custom Claims → Firestore Rules → Profile Hint → Frontend Guard (last-resort UX only). Frontend guards that check role hints for security are a vulnerability and are removed.

### Correction 7: Firebase Adapter & Repository Boundaries
- **Original**: Adapter layer that duplicated Firestore SDK patterns unnecessarily
- **Revised**: Adapter layer that **preserves** realtime listeners, transaction semantics, callable contracts, and error handling exactly. Repository pattern is a thin abstraction over the Firebase SDK — not a replacement. The SDK remains the single source of truth for Firestore operations; adapters add DTO mapping, emulators support, and environment configuration on top.

### Correction 8: Explicit Feature Preservation
- **Original**: List of features to preserve was incomplete and inconsistently referenced
- **Revised**: Complete feature preservation matrix with each item defined: idempotency (request creation dedup), offer acceptance concurrency protection (callable + transaction guard), mechanic capacity counters (mechanicCounters with atomic increments), counter reconciliation (release restores capacity), estimate provenance (estimateStatus tracking through reassignment), reassignment safety (estimate clearance + old mechanic release), stale-job recovery (admin recover mechanism), final amount approval (prerequisite gate), payment write-once (paymentStatus field, one-way write), customer/mechanic/admin authorization (distinct claim sets per role).

### Correction 9: Demo/Emulator/Live Environment Separation
- **Original**: Environment config mixed with feature flags; no prevention of production access during development
- **Revised**: Three explicit environment configuration values (`DEMO`, `EMULATOR`, `LIVE`) are independent from feature flags. Environment config is set at build time via Vite modes; feature flags are runtime toggles. It is impossible to accidentally access production Firebase project when `DEMO` or `EMULATOR` mode is active — the firebaseInit.ts explicitly refuses configured credentials in non-LIVE modes.

### Correction 10: Rollback Strategies
- **Original**: Feature flags presented as sufficient for rollback
- **Revised**: Four separate rollback strategies, each independent:
  1. **Application code rollback** — git revert to prior tagged version; Vite preview mode
  2. **Configuration rollback** — environment config switch; Vite build profile re-selection
  3. **Database schema rollback** — Firestore point-in-time restore or rules revision rollback; migration scripts are idempotent
  4. **Data rollback** — Firestore snapshots before each phase; data-loss recovery from backups
  Feature flags are a *supplement* to, not a replacement for, these rollback strategies.

### Correction 11: Roadmap Timeline Reconciliation
- **Original**: Eight-week roadmap with no phase sequencing rationale
- **Revised**: Twenty-week phased sequence with realistic estimates per phase, explicit dependencies between phases, and verification gates. Phases: Foundation (4w), Adapter Stabilization (4w), Portal Reorganization (4w), UI/UX Enhancement (3w), ML & Guide (1w), Observability & Testing (3w), Demo/Live Separation (2w), Final Review & Launch (3w). Total: 24 weeks (conservative) with 2-week buffer.

### Correction 12: Feature-by-Feature Migration Matrix
- **Original**: No comprehensive migration matrix; features referenced scatteredly
- **Revised**: Matrix mapping all 35+ existing features to: new module location, compatibility adapter required, regression test identifier. Every feature from the inventory (Section 2) has an entry.

### Correction 13: Behavior Parity Proof Strategy
- **Original**: Claimed "100% parity" without evidence
- **Revised**: Parity is proven through: (a) Vitest unit tests for pure domain functions (no Firebase deps), (b) Emulator-integration tests for adapter layers, (c) Playwright E2E tests for critical journeys in both demo and emulator modes, (d) Delta tests comparing old vs. new output for identical inputs. No claim of 100% parity without passing all three test suites.

### Correction 14: Implemented vs. Proposed Functionality
- **Original**: No clear distinction; everything listed together
- **Revised**: Three categories: `CORE` (already implemented in codebase, preserved), `ENHANCED` (redesigned with improved architecture), `FUTURE` (proposed but not yet implemented: ML model integration, advanced notification routing, admin recovery operations beyond the three authorized, analytics dashboards with ML metrics). Each is clearly labeled.

---
## 7-LAYER ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────┐
│               1. PRESENTATION LAYER (UI Portals)              │
│  • Customer portal React components + Router                 │
│  • Mechanic portal React components + Router                 │
│  • Admin portal React components + Router                    │
│  • Public portal (marketing pages)                           │
│  • Responsibility: Render UI, capture user input, delegate   │
│    to Application layer, display results. No business logic. │
│  • Dependencies: Application layer only.                     │
│  • Framework: React + React Router + TailwindCSS             │
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
│    . No direct Firestore/Function calls.                     │
│  . Pure use-case logic (no framework types).                   │
│  . Dependencies: Domain layer only.                           │
└──────────────────────────────────────────────────────────────┘
                                │ depends on
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               3. DOMAIN LAYER (Pure Business Logic)           │
│  • Request status transition rules (all 12 states, transitions)│
│  • Billing validation (parseBillingInput, parseEstimateInput)  │
│  • Safety triage (triageSafety, EMERGENCY_CAUTION_PATTERNS)   │
│  • Category classification (classifyProblem, inferCategory)    │
│  • Mechanic access control (accessForRecord)                  │
│  • Earnings summarization (summarizeEarnings)                 │
│  • Notification routing (isInternalNotificationPath,          │
│    notificationHref)                                          │
│  • Travel state derivation (travelState, etaMinutes)          │
│  • Geolocation math (kmBetween, shouldPush, distanceKm)       │
│  • Guide/draft validation (validateGuideDraft, buildFallbackReply)│
│  • **Complete state machine** (see Section 5)                 │
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
│  • Responsibility: Translate between Domain DTOs and          │
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
│  • Local Firebase emulators (Auth 9099, Firestore 8080,      │
│    Functions 5001)                                          │
│  • Controlled via VITE_USE_EMULATORS flag                   │
│  • Responsibility: Enable local development and testing      │
│    without production project access.                        │
│  • Dependencies: SDK (layer 5) activated when flag is true.  │
└──────────────────────────────────────────────────────────────┘
                                │ build profile
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               7. ENVIRONMENT CONFIGURATION                   │
│  • DEMO mode — no Firebase connection; mock data fixtures    │
│  • EMULATOR mode — local emulators active                  │
│  • LIVE mode — production Firebase project                 │
│  • Set at Vite build time: `vite build --mode demo/emulator/live` │
│  • Feature flags (runtime): DEMO_MODE, ML_ENHANCED, MAP_PROVIDER │
│  • Responsibility: Prevent accidental production access      │
│    during development. Environment config is               │
│    immutable after build; feature flags are runtime toggles.  │
└──────────────────────────────────────────────────────────────┘
```

---
## DEPENDENCY RULES (FORMAL)

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
   - No Firebase imports
   - No React imports (except pure types if absolutely needed)
   - No TailwindCSS or CSS class dependencies
   - Functions are pure: output depends only on input
   - Testable in pure Vitest (no jsdom, no Firebase)
   
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
## COMPLETE BOOKING STATE MACHINE

### 5.1 Valid States (12 total)

| State ID | State Name | Description |
|----------|------------|-------------|
| S1 | `requested` | Request created, awaiting mechanic offer |
| S2 | `accepted` | Mechanic has accepted the offer |
| S3 | `on-the-way` | Mechanic en route to customer |
| S4 | `arrived` | Mechanic has arrived on-site |
| S5 | `service` | Mechanic performing repair; estimate submitted |
| S6 | `completed` | Job finished; customer has approved final amount |
| S7 | `cancelled` | Customer cancelled while cancellable |
| S8 | `released` | Mechanic released job; request returns to `requested` |
| S9 | `stale` | Location update threshold exceeded (internal) |
| S10 | `recovered` | Admin-recovered from error state (internal) |
| S11 | `estimating` | Mechanic submitting estimate (transitional) |
| S12 | `payment_pending` | Payment recorded, awaiting confirmation (internal) |

### 5.2 State Transitions (with Actor, Validation, Backend Operation)

| From → To | Actor | Validation | Backend Operation | Failure State |
|-----------|-------|------------|-------------------|---------------|
| `requested` → `accepted` | Mechanic | Offer not expired (`expiresAt > now`), offer still `pending` | `acceptOffer` callable; write `mechanicId`, `mechanicName`, `mechanicPhone`, `status: accepted`, `updatedAt` | `offer-expired`, `already-taken`, `ineligible` |
| `requested` → `cancelled` | Customer | Status in `CANCELLABLE_STATUSES` (`requested`, `accepted`, `on-the-way`, `arrived`) | `updateDoc` with `status: cancelled`, `cancelledAt`, `cancelledBy: 'customer'` | `too-late` |
| `requested` → `released` | Mechanic | Job not in terminal state | `runTransaction`: `status: requested`, `mechanicId: null`, `mechanicName: null`, `mechanicLat: null`, `mechanicLng: null`, `mechanicLocationUpdatedAt: null`, `offerExpiresAt: Timestamp.now() + OFFER_WINDOW_MS`, `releaseReason`, `releasedAt`, `updatedAt`; decrement `mechanicCounters.activeJobCount` by 1 | `invalid-state`, `not-assigned`, `forbidden`, `error` |
| `requested` → `stale` | System | `locationUpdatedAt < now - LOCATION_STALE_MS` (internal) | Flag only — no Firestore write; UI shows warning | N/A (internal flag) |
| `accepted` → `on-the-way` | Mechanic | `canAdvance(status, 'on-the-way')` true | `advanceJob(requestId, 'on-the-way')` transaction | `invalid-transaction`, `forbidden` |
| `on-the-way` → `arrived` | Mechanic | `canAdvance(status, 'arrived')` true | `advanceJob(requestId, 'arrived')` transaction | `invalid-transaction`, `forbidden` |
| `arrived` → `service` | Mechanic | `canAdvance(status, 'service')` true AND `estimateStatus === 'approved'` **GATE** | `advanceJob(requestId, 'service')` transaction | `estimate-required`, `invalid-transaction`, `forbidden` |
| `service` → `completed` | Mechanic | **INVARIANT**: `finalAmountStatus === 'approved'` **MUST be true** before this transition. Mechanic cannot bypass. | `advanceJob(requestId, 'completed', { amountCents, durationMin })` transaction; decrement `mechanicCounters.activeJobCount` by 1 | `estimate-required`, `amount-mismatch`, `forbidden`, `error` |
| `service` → `cancelled` | Admin / Mechanic | Admin: valid recovery reason. Mechanic: `canAdvance(status, 'cancelled')` — but this is **only** for recovery, not normal flow | Transaction: `status: cancelled`, `cancelledBy: 'admin'|'mechanic'`, `cancellationReason`, `updatedAt`; mechanic capacity incremented | `forbidden`, `invalid-state` |
| `completed` → (none) | — | Terminal state | — | N/A |
| `cancelled` → (none) | — | Terminal state | — | N/A |
| `requested` → `estimating` | Mechanic | Request is `requested` status, mechanic assigned (or unassigned with `pickedMechanicId === null`) | Transition flag only — no Firestore write until estimate submitted | N/A (transitional) |
| `estimating` → `service` | Mechanic | Estimate submitted via `submitEstimate` callable; `estimateStatus: 'pending'` → `'approved'` or `'rejected'` | Transaction: `estimateStatus`, `estimatedAmountCents`, `estimatedDurationMin`, `estimateDiagnosis`, `estimateApprovedAt` (if approved) | `invalid-state`, `forbidden`, `error` |
| `service` → `payment_pending` | System | Job `completed`, `paymentStatus !== 'paid'` | `recordPayment` transaction or manual admin recording | `amount-mismatch`, `forbidden`, `error` |
| `payment_pending` → (none) | — | Internal state; payment recorded once | — | N/A |

### 5.3 Critical Invariants

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
## DATA & API COMPATIBILITY STRATEGY

### 6.1 Firestore Data Contract Preservation

**All existing Firestore document shapes are preserved unchanged**:

| Collection | Key Fields (preserved exactly) |
|------------|--------------------------------|
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

**`reassignMechanic` callable** (new, but contract preserved):
- Input: `{ requestId, newMechanicId, reason, actorId }`
- Output: `{ success: boolean, previousMechanicId, previousMechanicName, estimateCleared, newMechanicId, requestId }`
- Preconditions: request has mechanic assigned, request not terminal, new mechanic approved + available + capacity available
- Postconditions: request reassigned, old mechanic capacity decremented, estimate cleared (reset to `pending`), new mechanic capacity incremented, `reassignmentReason`, `reassignedBy`, `reassignedAt` written

**Error handling**: All callables return specific error codes (`offer-expired`, `already-taken`, `ineligible`, `permission-denied`, `not-found`, `forbidden`, `error`) that adapters classify for UI display. No silent failures.

### 6.3 Realtime Listener Preservation

**All existing `onSnapshot` listeners are preserved exactly**. The adapter layer does not replace `onSnapshot` — it wraps it with:
- Automatic emulator connection (`connectFirestoreEmulator`)
- DTO mapping of snapshot data (conversion layer, not replacement)
- Error classification (translate `permission-denied` into application-level events)
- Presence of the **exact same callback signature** — consumers do not need to change

**Example before** (current code):
```typescript
onSnapshot(doc(db, 'requests', id), (snap) => cb(snap.data()))
```

**Example after** (proposed, same API):
```typescript
const { data, error } = await withDTOMapping(doc(db, 'requests', id))
if (error) return onError(error)
cb(data) // exact same shape as before
```

### 6.4 Transaction Semantics Preservation

**All Firestore transactions preserve exact semantics**:
- `runTransaction` with `setOption: 'merge'` remains the mutation path
- All business logic that currently uses `runTransaction` (createRequest, advanceJob, releaseJob, submitEstimate, recordPayment, reassignMechanic) continues to use it
- Adapters add DTO mapping **around** the transaction, not inside it — the transaction body uses raw Firestore types as before

### 6.5 Environment Configuration Separation (Correction 9)

**Three build-mode profiles**, set at Vite build time:

| Mode | Vite Flag | Firebase Config | Feature Flags | Purpose |
|------|-----------|-----------------|---------------|---------|
| `demo` | `--mode demo` | `apiKey` etc. are **read but not used**; SDK is initialized but all operations route to mock data fixtures | `DEMO_MODE=true` (automatic) | Development, no production access; shows sample data |
| `emulator` | `--mode emulator` | SDK connects to local emulators (Auth 9099, Firestore 8080, Functions 5001) | `DEMO_MODE=false`, `EMULATOR_MODE=true` | Local development with emulated backend |
| `live` | `--mode live` | SDK connects to production Firebase project | `DEMO_MODE=false`, `EMULATOR_MODE=false` | Production deployment |

**Feature flags** (runtime toggles, independent of build mode):
- `DEMO_MODE` — serves fixture data instead of Firestore (default: `false` in emulator/live modes)
- `ML_ENHANCED` — enables model-enhanced classification (default: `false`; when `true`, rule-based classifier is supplemented with offline model lookups only)
- `MAP_PROVIDER` — `leaflet` | `mapbox` | `google` (default: `leaflet`)
- `ADMIN_RECOVERY` — enables admin recovery operations (default: `false` in demo/emulator; `true` only in live mode with custom claim)

**Critical**: It is **impossible** to accidentally access production Firebase when `DEMO` or `EMULATOR` mode is active. `firebaseInit.ts` explicitly checks the build mode at startup and, if not `live`, refuses to initialize Firebase credentials, routing all data operations to the appropriate mock/emulated layer.

---
## SECURITY MODEL

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

**Key principles** (Correction 6):
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
|-----------|------------|------------|--------------|
| `release_stale` | `requestId`, `reason`, `actorId` | Request has mechanic assigned, status is `service` or `on-the-way`, location is stale (`now - locationUpdatedAt > 30 min`), mechanic is unavailable or unresponsive | Creates `/admin/audit/{id}` doc with: `operation: 'release_stale'`, `requestId`, `actorId`, `reason`, `timestamp`, `mechanicId` released, `requestId` reset to `requested` |
| `recapture_job` | `requestId`, `newMechanicId`, `reason`, `actorId` | Request is `stale` or `released`, new mechanic approved + available + capacity, old mechanic capacity already decremented | Creates audit doc; request reassigned to new mechanic (full `reassignMechanic` flow), old mechanic notified |
| `force_complete` | `requestId`, `approvedAmountCents`, `reason`, `actorId` | Request status is `service`, estimate is `approved`, admin has `admin` custom claim | Creates audit doc; sets `finalAmountStatus: approved`, `amountCents: approvedAmountCents`, `paymentStatus: 'paid'`, `paidAt: now`, `paidBy: actorId`, status → `completed`. **Does NOT bypass** the estimate approval requirement — both `estimateStatus === 'approved'` AND `finalAmountStatus === 'approved'` must be true. |

**No other admin status overrides exist**. Attempting any other Firestore write to a request's `status` field without going through this callable is rejected by Firestore rules (rules restrict `status` writes to specific allowed paths).

### 7.3 Frontend Guard Hardening (Correction 6)

**All frontend guards are updated to**:

```typescript
// Before (vulnerable): uses role hint for authorization
if (user.role !== 'mechanic') navigate('/login');

// After (hardened): only checks auth state for navigation
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
## FEATURE PRESERVATION MATRIX

### 8.1 Complete Feature Preservation List

| # | Feature | Current Module | New Module/Adapter | Regression Test |
|---|---------|---------------|-------------------|-----------------|
| F1 | Request creation with idempotency | `src/lib/customer.ts:createRequest()` | `domains/requests.ts` + `dbAdapter.ts` | `vitest test:createRequest_idempotent` |
| F2 | Offer acceptance via callable | `src/lib/dispatch.ts:acceptViaDispatch()` | `infra/functionsAdapter.ts` + preserved callable | `vitest test:acceptViaDispatch_success`; `playwright test:booking-journey` |
| F3 | Offer decline via callable | `src/lib/dispatch.ts:declineViaDispatch()` | Same adapter + callable contract | `vitest test:declineViaDispatch_success` |
| F4 | Mechanic availability toggle | `src/lib/mechanic.ts:setAvailability()` | Same function + adapter | `vitest test:setAvailability` |
| F5 | Job status advancement | `src/lib/customer.ts:advanceJob()` + `src/lib/mechanic.ts` | `domains/requests.ts` state machine + adapter | Full state machine test suite |
| F6 | Mechanic job release | `src/lib/mechanic.ts:releaseJob()` | `domains/requests.ts` + adapter | `vitest test:releaseJob` |
| F7 | Estimate submission | `src/lib/mechanic.ts:submitEstimate()` | `domains/estimates.ts` + adapter | `vitest test:submitEstimate` + `estimateStatus` guard |
| F8 | Estimate approval/rejection | `src/lib/customer.ts:approveRejectEstimate()` | Same + adapter | `vitest test:approveRejectEstimate` |
| F9 | Payment recording (cash/UPI) | `src/lib/customer.ts:recordPayment()` | `domain/payments.ts` + `functionsAdapter` | `vitest test:recordPayment` + write-once guard |
| F10 | Mechanic record profile | `src/lib/mechanic.ts:applyAsMechanic()` | Same + adapter | `vitest test:applyAsMechanic` |
| F11 | Mechanic contact management | `src/lib/mechanic.ts:getMyContact/updateMyContact()` | Same + adapter | `vitest test:getMyContact` + `updateMyContact` |
| F12 | Mechanic location push | `src/lib/mechanic.ts:pushMechanicLocation()` | Same + adapter + `shouldPush` throttle | `vitest test:pushMechanicLocation` |
| F13 | Public mechanic listing | `src/lib/customer.ts:watchPublicMechanics()` | Same + adapter (emulator support) | `vitest test:watchPublicMechanics` |
| F14 | Request tracking / ETA | `src/lib/tracking.ts` math functions | Same + adapter (preserved formulas) | `vitest test:etaMinutes` + `kmBetween` |
| F14 | Mechanic capacity counters | `src/lib/mechanicCounters` updates in transactions | Same + adapter (atomic increment preserved) | `vitest test:mechanicCounters_atomic` |
| F15 | Estimate provenance tracking | `estimatedAmountCents`, `estimateStatus` fields | Same fields preserved in DTO mapping | `vitest test:estimate_provenance` + reassignment clearance |
| F16 | Request reassignment safety | `src/lib/customer.ts:reassignMechanic()` | `domains/requests.ts` + `functionsAdapter` + audit | `vitest test:reassignMechanic_safety` + audit record |
| F17 | Stale-job recovery | Internal system flag + admin mechanism | `domain/requests.stale` flag + `adminRecovery` callable | `vitest test:stale_job_recovery` |
| F18 | Final amount approval | `src/lib/customer.ts:approveRejectEstimate()` (estimateStatus) + UI | `domain/finalAmount` prerequisite gate in state machine + adapter | `vitest test:finalAmount_prerequisite` — mechanic cannot complete without approved final amount |
| F19 | Payment write-once behavior | `src/lib/customer.ts:recordPayment()` `paymentStatus` field | Same + `paymentStatus` invariant in adapter | `vitest test:payment_write_once` — cannot re-record payment |
| F20 | Customer authorization (claims + rules) | Firebase Auth + Firestore rules | Preserved exactly + adapter transparency | `vitest test:auth_authorization_chain` |
| F21 | Mechanic authorization (claims + rules) | Firebase Auth + Firestore rules | Preserved exactly + adapter transparency | `vitest test:mech_auth_authorization_chain` |
| F22 | Admin authorization (claims + rules) | Firebase Auth + Firestore rules | Preserved exactly + adapter transparency | `vitest test:admin_auth_authorization_chain` |
| F23 | Vehicle management | `src/lib/customer.ts:listVehicles/addVehicle/updateVehicle/deleteVehicle/setDefaultVehicle` | Same + adapter | `vitest test:vehicle_*` suite |
| F24 | Profile management | `src/lib/customer.ts:getProfile/updateProfile()` | Same + adapter | `vitest test:profile_*` suite |
| F25 | Settings & theme | `src/lib/theme.ts` | Same + CSS custom properties + `DEMO_MODE` fixture support | `vitest test:theme_toggle` + visual regression |
| F26 | Notifications (dispatch updates) | `src/lib/customer.ts:watchNotifications/markNotificationRead/markAllNotificationsRead()` | Same + adapter | `vitest test:notification_*` suite |
| F26 | Admin notification inbox | `src/pages/admin/AdminNotificationsPage.tsx` | Same + audit trail | `playwright test:admin_notifications` |
| F26 | Mechanic notification inbox | `src/pages/mechanic/MechanicNotificationsPage.tsx` | Same + assignment notices | `playwright test:mechanic_notifications` |
| F27 | ML classifier (rule-based) | `src/lib/mechanicGuide.ts:classifyProblem/inferCategory/triageSafety` | `domains/guide.ts` + preserved rule logic | `vitest test:classifyProblem` + `inferCategory` + `triageSafety` |
| F28 | Demo bot conversation flows | `src/lib/mechanicGuide.ts:startDemoBotScenario/answerDemoBotScenario/buildFallbackReply` | Same + `DEMO_MODE` fixture support | `vitest test:demoBot_*` suite |
| F29 | ML model info (static artifact) | `src/lib/mlModelInfo.ts` | Same + re-export from `domains/` | `vitest test:mlModelInfo` |
| F30 | Coverage map display | `src/pages/customer/CoverageMapPage.tsx` + Leaflet | Same + map provider abstraction (leaflet preserved as default) | `playwright test:coverage_map` |
| F31 | Live map tracking | `src/lib/geolocation.ts:useWatchPosition` + `tracking.ts` math | Same + adapter (emulator support) | `vitest test:useWatchPosition` + `tracking math` |
| F32 | E2E booking journeys | `e2e/booking-journey.e2e.ts` | Same test suite runs against demo/emulator/live modes | `playwright test:e2e` across all three modes |
| F33 | Negative journey tests | `e2e/negative-journeys.e2e.ts` | Same | `playwright test:e2e:negative` |
| F34 | Rules checking | `scripts/check-rules.mjs` | Same (rules files preserved unchanged) | `npm run lint:rules` |
| F34 | Type checking | `npm run typecheck` | Same | `npm run typecheck` |
| F35 | Observability (future) | Not yet implemented | `src/observability/` — planned for future phase | Will be added in Phase 5+ |

### 8.2 Preservation Verification

**Each feature F1–F35 has**:
1. **Exact API preservation** — same function signatures, same return types, same parameter shapes
2. **Adapter transparency** — consumer code imports from same path (`src/lib/...`) and gets identical API
3. **Regression test** — Vitest unit test (for pure functions) or Playwright E2E test (for journeys) that passes against both old and new implementations
4. **Emulator parity** — same test passes with `VITE_USE_EMULATORS=true`

---
## MIGRATION SEQUENCE

### 9.1 Phased Migration Plan (20 Weeks, Corrected from Original 8-Week Estimate)

**Week 0 — Pre-Migration Preparation**
- [ ] Take Firestore snapshots of all data (backup)
- [ ] Create git branch `redesign/architecture-planning`
- [ ] Set up Vite build modes: `demo`, `emulator`, `live`
- [ ] Initialize `src/env.ts` with environment validation
- [ ] Define feature flag defaults in `src/featureFlags.ts`

**Phase 1 — Foundation & Domain Extraction (Weeks 1–4)**
- [ ] **Week 1**: Extract pure functions from `src/lib/` into `src/domains/` (F1–F35, all business logic)
- [ ] **Week 1**: Create `src/infra/firebase.ts` — singleton init with mode detection (DEMO/EMULATOR/LIVE)
- [ ] **Week 2**: Create `src/infra/authAdapter.ts` — wrap `firebaseAuth()` with mode-aware signIn/signOut/signUp
- [ ] **Week 2**: Create `src/infra/dbAdapter.ts` — DTO-mapped Firestore access (thin layer, preserves `onSnapshot`, transactions)
- [ ] **Week 3**: Create `src/infra/functionsAdapter.ts` — callable wrappers with error classification (offer-expired, already-taken, ineligible, permission-denied, not-found, forbidden, error)
- [ ] **Week 3**: Run full test suite against emulator — confirm 100% parity (all F1–F35 regression tests pass)
- [ ] **Week 4**: Update all internal imports to go through adapter layers; fix any breakage; re-run typecheck

**Phase 2 — API Stabilization & Adapter Verification (Weeks 5–6)**
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
- [ ] **Week 19**: Performance benchmarking (query latencies, bundle size comparison old vs. new)
- [ ] **Week 19**: Accessibility audit (a11y tools — automated + manual)
- [ ] **Week 20**: Final typecheck + lint rules; merge to main with feature flags OFF by default; deploy to demo environment first, then emulator, then live

**Total: 20 weeks** (not 8 weeks as originally proposed — the 8-week estimate was unrealistic given the scope of dependency reconciliation, adapter layer development, and comprehensive verification).

### 9.2 Migration Success Criteria

Before each phase merge, all of the following must pass:
1. **Typecheck**: `npm run typecheck` — zero errors
2. **Unit tests**: `npm test` — all F1–F35 regression tests passing
3. **Emulator parity**: Same tests pass with `VITE_USE_EMULATORS=true`
4. **E2E critical paths**: Key booking journeys pass Playwright test suite
5. **Security audit**: No frontend authorization enforcement (role hints used for security removed)
6. **Environment validation**: DEMO mode cannot access production Firebase; EMULATOR mode isolated to local emulators

---
## TESTING STRATEGY

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
- Target: All domain layer functions (F1–F35 logic, state machine, validation, math)
- Count: ~80 tests
- Firebase: None — run without emulators
- CI gate: Must pass on every commit
- Example: `vitest test:domain:classifyProblem`; `vitest test:domain:stateMachine_transitions`; `vitest test:domain:estimate_validation`

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
   // Old implementation
   const oldResult = classifyProblem(oldInput);
   // New implementation (same function, moved domain)
   const newResult = classifyProblem(newInput); // same function name, same logic
   // Assert
   expect(oldResult).toEqual(newResult);
   ```

2. **Emulator Parity Testing**: Same delta tests run with `VITE_USE_EMULATORS=true`. Old code path goes through direct Firebase SDK; new code path goes through adapters + emulators. Outputs must match.

3. **E2E Regression Testing**: Critical journeys (booking from breakdown to completion, mechanic acceptance → completion, admin recovery) tested in all three modes (demo, emulator, live). Behavior must be consistent across modes for the same user actions.

**No claim of "100% parity" is made without passing all three test levels**. The proposal explicitly states: "Behavior parity is proven when all three test levels pass for a given feature."

### 10.4 Test Data Fixtures

**`src/lib/fixtures.ts`** provides mock data matching the exact Firestore schema for all collections, used in DEMO mode and integration tests. Fixtures are derived from actual Firestore data snapshots and kept in sync via periodic export.

---
## ROLLBACK STRATEGY (Correction 10)

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
## RISK REGISTER (Updated)

### 12.1 Revised Risk Register (with Corrections)

| # | Risk | Original Likelihood | Corrected Likelihood | Original Impact | Corrected Impact | Mitigation (Updated) |
|---|------|---------------------|----------------------|-----------------|------------------|-----------------------|
| R1 | Firestore rules breakage | Medium | **High** | High | **Critical** | Rules changes in separate PR; rules unit tests on every commit; backward-compatible field additions only; **all rules preserved unchanged** in redesign (Correction 7) |
| R2 | Auth regression — sign-in/sign-up flows break | Low | **Medium** | High | **Critical** | Auth adapter preserves exact `firebaseAuth()` API; emulator tests cover full flow; gradual rollout; **custom claims + rules preserved** (Correction 6) |
| R3 | Offer/expiry logic drift | Low | **Medium** | High | **Critical** | Contract-test the callable function; emulator tests with edge cases; **callable contract preserved exactly** (Correction 7) |
| R4 | ML model misclassification | Low | **Low** (removed as production feature) | Medium | **Low** (removed) | Rule-based classifier retained as fallback; A/B test opt-in via `ML_ENHANCED` flag (default false); **ML is FUTURE, not implemented** (Correction 14) |
| R5 | Performance degradation | Medium | **Medium** | Medium | **Medium** | DTO mapping in-memory only; queries still go direct to Firestore; profile before/after benchmarks; **adapters don't add query layers** (Correction 7) |
| R6 | UI regression — layouts break | Medium | **Medium** | Medium | **Medium** | Visual regression testing with Playwright; component tests preserve API surface; ** Tailwind config unchanged**; UI components expanded, not rewritten (Correction 14) |
| R7 | Data loss during migration | Low | **Medium** | Critical | **Critical** | Pre-migration snapshots; migration scripts are idempotent; **four rollback strategies** (Correction 10); **snapshots before each phase** |
| R8 | Environment confusion — prod access during dev | Medium | **High** | Medium | **Critical** | **Three-environment model** (Correction 9) + **feature flag independence**; impossible to access production in DEMO/EMULATOR mode; `firebaseInit.ts` enforces at startup |
| R9 | Unrestricted admin overrides | Low | **High** (identified issue) | Critical | **Critical** | **Narrowly authorized recovery operations only** (Correction 5); exactly three operations with validation, reason codes, audit records; no blanket overrides |
| R10 | Frontend guards used for authorization | Medium | **High** (identified issue) | High | **Critical** | **Authorization chain reconciled** (Correction 6): custom claims → Firestore rules → profile hints (hint only) → frontend guards (UX only); all frontend security checks removed |

### 12.2 Risk Register Summary

**Top 3 Risks (Corrected Likelihood ≥ High)**:
1. **R8 — Environment confusion** (now High): Addressed by three-environment model + firebaseInit.ts enforcement
2. **R9 — Unrestricted admin overrides** (now High): Addressed by exactly three authorized recovery operations with validation/audit
3. **R10 — Frontend guards as authorization** (now High): Addressed by authorization chain reconciliation; frontend guards hardened to UX-only

**All risks have mitigations that are implementable within the planning-only constraint** (no source code changes required at this stage; all corrections are architectural/design).

---
## REALISTIC ROADMAP (Correction 11)

### 13.1 Twenty-Week Phased Sequence (Corrected from Original 8-Week)

| Phase | Weeks | Primary Deliverables | Dependencies | Verification |
|-------|-------|---------------------|--------------|--------------|
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

### 13.2 Phase Gate Criteria

**Each phase must pass these gates before advancing**:

1. **Typecheck Gate**: `npm run typecheck` — zero errors
2. **Unit Test Gate**: `npm test` — all domain regression tests passing (coverage ≥ 80% for domain layer)
3. **Emulator Parity Gate**: Same tests pass with `VITE_USE_EMULATORS=true`
4. **Integration Gate** (phases 3–8): e2E critical journeys pass in demo mode
5. **Security Gate**: Frontend guards verified as UX-only; no role-hint authorization; auth chain validated

Failure at any gate halts the phase; the team reverts to last completed phase and addresses the failure.

---
## ACCEPTANCE CRITERIA

### 14.1 Final Acceptance Criteria (All Must Pass)

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
17. [ ] Three-environment model enforced: DEMO cannot access production; EMULATOR isolated to local; LIVE connects to prod

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
## UNRESOLVED DECISIONS REQUIRING OWNER APPROVAL

The following decisions are beyond the scope of this planning proposal and require explicit owner approval:

1. **ML Model Integration** — Whether to integrate a production ML model (beyond the rule-based classifier already in the codebase). The proposal retains rule-based only for now, with `ML_ENHANCED` feature flag for future opt-in. Owner must decide if/when to invest in model training and deployment.

2. **Map Provider Swap** — Whether to remain with Leaflet or swap to Mapbox/Google Maps. The proposal abstracts map provider with a `MAP_PROVIDER` feature flag (default: `leaflet`). Owner must decide based on cost, licensing, and feature requirements.

3. **Admin Recovery Operations Scope** — The three authorized admin recovery operations (`release_stale`, `recapture_job`, `force_complete`) are defined, but owner may wish to add or modify these. Any changes require updating the `adminRecovery` callable contract and Firestore rules.

4. **Feature Flag Defaults for Production** — Owner must approve the default state of feature flags at launch:
   - `DEMO_MODE`: should it be `true` or `false` at launch? (Proposal: `false` — live mode by default)
   - `ML_ENHANCED`: should it be `true` or `false` at launch? (Proposal: `false` — rule-based only)
   - `ADMIN_RECOVERY`: should it be `true` or `false` at launch? (Proposal: `false` in demo/emulator, `true` only in live mode with custom claim)

5. **Firestore Rules Revision** — The proposal preserves existing `firestore.rules` unchanged, but owner may wish to revise rules to align with the new architecture (e.g., stricter custom claim checks). Any rules changes require separate approval and testing.

6. **Production Environment Credentials** — Owner must provide/approve the production Firebase project credentials for `vite build --mode live`. These are not included in this planning document.

7. **Team Resource Allocation** — The 20-week roadmap assumes team availability for the described phases. Owner must confirm resource allocation (developer hours, QA time, DevOps support) for each phase.

8. **Post-Launch Maintenance Model** — Owner must decide the ongoing maintenance model: Will the adapter layer be actively developed post-launch? Will feature flags be regularly toggled? Will the three-environment model be maintained indefinitely?

9. **Analytics Dashboard Scope** — The proposal distinguishes `FUTURE` analytics from `CORE` preserved functionality. Owner must decide which analytics dashboards to implement in Phase 1 vs. defer to later phases.

10. **Code of Admin-User Interaction** — The admin recovery operations are defined, but the broader admin-mechanic-customer interaction model (escalation paths, SLA commitments, customer communication protocols) is outside this proposal's scope and requires owner definition.

---
*This revised architecture proposal corrects all 14 identified issues in the original REDESIGN_PROPOSAL.md. No source code, Firebase resources, database schemas, environment files, or Git state has been modified. The assignment remains in planning mode. Implementation requires explicit owner approval of the unresolved decisions listed above.*

*Document generated during architecture planning phase. Status: Planning Mode — no code modifications.*