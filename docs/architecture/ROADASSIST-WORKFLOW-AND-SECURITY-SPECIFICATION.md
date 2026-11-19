# ROADASSIST — WORKFLOW AND SECURITY SPECIFICATION

## Status: Repository-Verified Business Lifecycle and Authorization Model

---

## 1. Complete Business Workflow and State Machine

### 1.1 Valid States (12 Total)

| ID | State Name | Description | Terminal |
|---|---|---|---|
| S1 | `requested` | Request created, awaiting mechanic offer | No |
| S2 | `accepted` | Mechanic has accepted the offer | No |
| S3 | `on-the-way` | Mechanic en route to customer | No |
| S4 | `arrived` | Mechanic has arrived on-site | No |
| S5 | `service` | Mechanic performing repair; estimate submitted & approved | No |
| S6 | `completed` | Job finished; customer has approved final amount | **Yes** |
| S7 | `cancelled` | Customer cancelled while cancellable | **Yes** |
| S8 | `released` | Mechanic released job; request returns to `requested` | No (transitional) |
| S9 | `stale` | Location update threshold exceeded (internal flag) | No (internal) |
| S10 | `recovered` | Admin-recovered from error state (internal) | No (internal) |
| S11 | `estimating` | Mechanic submitting estimate (transitional) | No (transitional) |
| S12 | `payment_pending` | Payment recorded, awaiting confirmation (internal) | No (internal) |

### 1.2 State Transitions (with Actor, Validation, Backend Operation)

| From → To | Actor | Validation | Backend Operation | Failure State |
|---|---|---|---|---|
| `requested` → `accepted` | Mechanic | Offer not expired (`expiresAt > now`), offer still `pending`, request in `requested` status | `acceptOffer` callable; write `mechanicId`, `mechanicName`, `mechanicPhone`, `status: accepted`, `updatedAt`; increment `mechanicCounters.activeJobCount` | `offer-expired`, `already-taken`, `ineligible` |
| `requested` → `cancelled` | Customer | Status in `CANCELLABLE_STATUSES` (`requested`, `accepted`, `on-the-way`, `arrived`) | `updateDoc` with `status: cancelled`, `cancelledAt`, `cancelledBy: 'customer'`; if mechanic assigned, increment their `activeJobCount` | `too-late` |
| `requested` → `released` | Mechanic | Job not in terminal state | `runTransaction`: `status: requested`, `mechanicId: null`, `mechanicName: null`, `mechanicLat: null`, `mechanicLng: null`, `mechanicLocationUpdatedAt: null`, `offerExpiresAt: Timestamp.now() + OFFER_WINDOW_MS`, `releaseReason`, `releasedAt`, `updatedAt`; decrement `mechanicCounters.activeJobCount` by 1 | `invalid-state`, `not-assigned`, `forbidden`, `error` |
| `requested` → `stale` | System | `locationUpdatedAt < now - LOCATION_STALE_MS` (internal) | Flag only — no Firestore write; UI shows warning | N/A (internal flag) |
| `accepted` → `on-the-way` | Mechanic | `canAdvance(status, 'on-the-way')` true | `advanceJob(requestId, 'on-the-way')` transaction | `invalid-transaction`, `forbidden` |
| `on-the-way` → `arrived` | Mechanic | `canAdvance(status, 'arrived')` true | `advanceJob(requestId, 'arrived')` transaction | `invalid-transaction`, `forbidden` |
| `arrived` → `service` | Mechanic | `canAdvance(status, 'service')` true **AND** `estimateStatus === 'approved'` **HARD GATE** | `advanceJob(requestId, 'service')` transaction; if estimate not approved, return `estimate-required` | `estimate-required`, `invalid-transaction`, `forbidden` |
| `service` → `completed` | Mechanic | **INVARIANT**: `finalAmountStatus === 'approved'` MUST be true before this transition. Also requires `estimateStatus === 'approved'`. | `advanceJob(requestId, 'completed', { amountCents, durationMin })` transaction; decrement `mechanicCounters.activeJobCount` by 1 | `estimate-required`, `amount-mismatch`, `forbidden`, `error` |
| `service` → `cancelled` | Admin / Mechanic | Admin: valid recovery reason. Mechanic: only via `reassignMechanic` recovery path, not normal flow | Transaction: `status: cancelled`, `cancelledBy: 'admin'|'mechanic'`, `cancellationReason`, `updatedAt`; mechanic capacity incremented | `forbidden`, `invalid-state` |
| `requested` → `estimating` | Mechanic | Request is `requested` status | Transition flag only — no Firestore write until estimate submitted | N/A (transitional) |
| `estimating` → `service` | Mechanic | Estimate submitted via `submitEstimate` callable; `estimateStatus: 'pending'` → `'approved'` or `'rejected'` | Transaction: `estimateStatus`, `estimatedAmountCents`, `estimatedDurationMin`, `estimateDiagnosis`, `estimateApprovedAt` (if approved) | `invalid-state`, `forbidden`, `error` |
| `service` → `payment_pending` | System | Job `completed`, `paymentStatus !== 'paid'` | `recordPayment` transaction or manual admin recording | `amount-mismatch`, `forbidden`, `error` |
| `payment_pending` → (none) | — | Internal state; payment recorded once | — | N/A |

### 1.3 Critical Invariants (Enforced by State Machine)

1. **Final Amount Prerequisite**: `service → completed` transition requires `finalAmountStatus === 'approved'` as a **guard condition** in the transaction. If `finalAmountStatus` is not `approved`, the transition returns `estimate-required` and does NOT change the status.

2. **Estimate Before Completion**: `service → completed` also requires `estimateStatus === 'approved'`. Both conditions must be met.

3. **Mechanic Capacity Conservation**: Every `advanceJob` transaction that transitions away from a non-terminal state **must** atomically increment `mechanicCounters.{mechanicId}.activeJobCount`. Every transition that assigns a mechanic increments the new mechanic's counter and decrements the old mechanic's counter (via `reassignMechanic` or `releaseJob`).

4. **Estimate Provenance Integrity**: When a request is reassigned to a new mechanic, all estimate fields (`estimatedAmountCents`, `estimatedDurationMin`, `estimateDiagnosis`, `estimateStatus`, `estimateApprovedAt`) are **cleared** (set to `null`/`'pending'`). The new mechanic must submit a fresh estimate before `service → completed` is possible.

5. **Staleness → Recovery**: When location is flagged `stale`, the admin can trigger `recoverJob` which resets the location flag and, if the job has been stale too long, releases the mechanic's capacity and resets the request to `requested` state.

6. **Payment Write-Once**: `paymentStatus` field can only transition: `pending` → `paid`. Once `paid`, it cannot be changed. Admins can view but not overwrite. The `recordPayment` callable enforces this by checking `data.paymentStatus !== 'paid'` before writing.

### 1.4 Transition Diagram (Text Representation)

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

## 2. Authorization Chain (Correction 6)

### 2.1 Formal Authorization Hierarchy

```
Firebase Custom Claims (server-issued, immutable)
        │
        ├──► Firestore Rules (server-enforced data access)
        │     │
        │     ├──► Role Profile Hints (users/{uid}.role — UI only, NEVER trusted)
        │     │
        │     └──► Frontend Guards (purely UX/navigation; NO authorization enforcement)
        │
        └──► Direct data access (bypassing frontend entirely)
```

### 2.2 Authorization Decision Flow

For **any operation**, the following sequence is executed:

```
1. Check Firebase Custom Claims for actor UID
   │
   ├── If claim missing/insufficient → reject with 'forbidden'
   │
   ↓
2. Check Firestore Rules for read/write path
   │
   ├── If rules deny → reject with 'permission-denied'
   │
   ↓
3. If both pass → operation proceeds
   │
   ↓
4. Frontend guard may show navigation hint — but cannot authorize or deny
```

### 2.3 Role Types and Boundaries

| Role Type | Source | Authority | Enforcement Level |
|---|---|---|---|
| **Custom Claim `admin: true`** | Minted server-side in backend phase | **Authoritative admin boundary** | Firestore rules: `allow update: if isClaimAdmin()` |
| **Custom Claim `mechanic: true`** | Minted server-side in backend phase | **Mechanic authority** | Firestore rules: mechanic-scoped writes only |
| **Custom Claim `customer: true`** | Minted server-side in backend phase | **Customer authority** | Firestore rules: customer-owned resources only |
| **Profile hint `role`** | `users/{uid}.role` written at signup | **UI hint only** | **Never** used for authorization; Firestore rules ignore this field |
| **Frontend guard role check** | `RequireAuth`/`RequireCustomer`/`RequireMechanic`/`RequireAdmin` components | **Navigation hint only** | Checks `emailVerified` + optional `customClaims` for UX; **does not enforce** |

### 2.4 Frontend Guard Hardening

**All frontend guards are updated to** check only:

```typescript
// Hardened: only checks auth state for navigation
if (!user?.emailVerified) navigate('/login');

// Authorization is handled by Firestore rules + custom claims,
// never by frontend role comparison.
```

**`RequireCustomer`**, **`RequireMechanic`**, **`RequireAdmin`** components now only:

1. Check `firebaseAuth().currentUser !== null`
2. Check `firebaseAuth().currentUser.emailVerified`
3. **Optionally** check `firebaseAuth().currentUser.customClaims` for the required role (as a **hint**, not enforcement)
4. **Firestore rules are the authoritative boundary**

**Never** do frontend guards compare `users/{uid}.role` against expected roles for security decisions. This was the original vulnerability pattern.

---

## 3. Admin Recovery Operations (Correction 5)

### 3.1 Exactly Three Authorized Operations

Admin has exactly three authorized recovery operations, each funneled through `adminRecovery(requestId, operation, reason, actorId)` callable:

| Operation | Parameters | Validation | Audit Record |
|---|---|---|---|
| `release_stale` | `requestId`, `reason`, `actorId` | Request has mechanic assigned, status is `service` or `on-the-way`, location is stale (`now - locationUpdatedAt > 30 min`), mechanic is unavailable or unresponsive | Creates `/admin/audit/{id}` doc with: `operation: 'release_stale'`, `requestId`, `actorId`, `reason`, `timestamp`, `mechanicId` released, `requestId` reset to `requested` |
| `recapture_job` | `requestId`, `newMechanicId`, `reason`, `actorId` | Request is `stale` or `released`, new mechanic approved + available + capacity, old mechanic capacity already decremented | Creates audit doc; request reassigned to new mechanic (full `reassignMechanic` flow), old mechanic notified |
| `force_complete` | `requestId`, `approvedAmountCents`, `reason`, `actorId` | Request status is `service`, estimate is `approved`, admin has `admin` custom claim | Creates audit doc; sets `finalAmountStatus: approved`, `amountCents: approvedAmountCents`, `paymentStatus: 'paid'`, `paidAt: now`, `paidBy: actorId`, status → `completed`. **Does NOT bypass** the estimate approval requirement — both `estimateStatus === 'approved'` AND `finalAmountStatus === 'approved'` must be true. |

### 3.2 No Other Admin Overrides

- **No blanket status override** possible. Any Firestore write to a request's `status` field without going through this callable is rejected by Firestore rules.
- **No admin bypass** of estimate approval. `force_complete` requires both `estimateStatus === 'approved'` AND `finalAmountStatus === 'approved'`.
- **No admin override** of payment write-once. Once `paymentStatus === 'paid'`, it cannot be changed, even by admin.
- **No admin override** of capacity counters. Admin recovery respects atomic increment/decrement semantics.

### 3.3 Admin Recovery — Reason Codes

Each operation requires a `reason` string with maximum 500 characters. Reason codes are stored in audit records for accountability.

**Valid reason categories**:
- `stale_location` — Mechanic unresponsive, location outdated
- `mechanic_unavailable` — Mechanic can no longer fulfill job
- `customer_unresponsive` — Customer cannot be reached
- `estimate_expired` — Estimate approval window exceeded
- `amount_discrepancy` — Final amount differs from estimate
- `operator_error` — Administrative mistake correction
- `other` — Free text (max 500 chars)

---

## 4. Firebase, Security and Data Compatibility

### 4.1 Firestore Data Contracts (Preserved Unchanged)

**All existing Firestore document shapes are preserved unchanged**:

| Collection | Key Fields (preserved exactly) | Notes |
|---|---|---|
| `users/{uid}` | `uid`, `email`, `displayName`, `role` (hint only), `createdAt`, `updatedAt` | `role` = UI hint; never used for auth |
| `mechanics/{uid}` | All `MechanicRecord` fields + `private.contact.{phone, email}`, `currentLat/currentLng`, `locationUpdatedAt`, `activeJobCount`, `verificationStatus`, `approved`, `createdAt`, `updatedAt` | Private — customer-inaccessible |
| `vehicles/{id}` | All `Vehicle` fields + `ownerId`, `isDefault`, `createdAt`, `updatedAt` | Owner-bound |
| `requests/{id}` | All `ServiceRequest` fields + `id`, `customerId`, `vehicleId`, `status`, `createdAt`, `updatedAt`, estimate/payment fields | Core business document |
| `offers/{id}` (within `requests/{id}/offers`) | `mechanicId`, `mechanicName`, `customerId`, `status`, `expiresAt`, `round`, `createdAt` | Offer pool per request |
| `notifications/{uid}/items/{id}` | `id`, `type`, `title`, `body`, `requestId`, `path`, `createdAt`, `read` | User notification items |
| `publicMechanics/{id}` | `id`, `name`, `approved`, `isAvailable`, `specialties`, `vehicleTypes`, `experienceYears`, `serviceRadiusKm`, `rating`, `reviewCount`, `vehicleDescription`, `garageName`, `baseLat`, `baseLng` (coarse) | Customer-facing projection |
| `auditEvents/{id}` | `operation`, `requestId`, `actorId`, `reason`, `timestamp`, `mechanicId`, `requestStatusBefore`, `requestStatusAfter` | Immutable, write-only via callables |

### 4.2 Callable Function Contracts (Preserved Exactly)

#### `acceptOffer` callable
- **Input**: `{ requestId: string }`
- **Output**: `{ success: boolean }`
- **Preconditions (server-side enforced)**:
  - Offer exists in `requests/{requestId}/offers` with `status: pending`
  - Offer not expired: `expiresAt > serverTime`
  - Request is in `requested` status
  - `customerId` matches request owner
- **Postconditions**:
  - Offer status → `accepted`
  - Request status → `accepted`
  - Mechanic's `activeJobCount` incremented
  - Realtime notifications sent to customer and mechanic
  - Mechanic capacity check: `activeJobCount <= MAX_ACTIVE_JOBS (3)`

#### `declineOffer` callable
- **Input**: `{ requestId: string }`
- **Output**: `{ success: boolean }`
- **Preconditions**: Offer exists, status is `pending`
- **Postconditions**: Offer status → `declined`

#### `reassignMechanic` callable
- **Input**: `{ requestId, newMechanicId, reason, actorId }`
- **Output**: `{ success: boolean }`
- **Preconditions**:
  - Request has assigned mechanic
  - New mechanic approved + available + capacity available
  - Old mechanic's capacity decremented
- **Postconditions**:
  - All estimate fields cleared (`estimatedAmountCents`, `estimatedDurationMin`, `estimateDiagnosis`, `estimateStatus`, `estimateApprovedAt` → `null`/`'pending'`)
  - Request assigned to new mechanic
  - New mechanic's `activeJobCount` incremented
  - Audit record created

#### `submitEstimate` callable
- **Input**: `{ requestId, diagnosis, estimatedAmountCents, estimatedDurationMin }`
- **Output**: `{ success: boolean }`
- **Preconditions**:
  - Request assigned to calling mechanic
  - Request status is `requested` or `estimating`
  - Mechanic is assigned + approved + available
  - Request is open and uncompleted
- **Postconditions**:
  - `estimatedAmountCents` written to request
  - `estimatedDurationMin` written to request
  - `estimateDiagnosis` written to request
  - `estimateStatus: 'pending'`
  - `estimateApprovedAt: null`
  - Realtime notification sent to customer

#### `approveRejectEstimate` callable
- **Input**: `{ requestId, decision: 'approve' | 'reject' }`
- **Output**: `{ success: boolean }`
- **Preconditions**:
  - Customer own the request (via `customerId` match)
  - Request has `estimateStatus: 'pending'`
- **Postconditions**:
  - If `approve`: `estimateStatus: 'approved'`, `estimateApprovedAt: Date.now()`
  - If `reject`: `estimateStatus: 'rejected'`, `estimateApprovedAt: Date.now()`

#### `recordPayment` callable
- **Input**: `{ requestId, method: 'cash' | 'upi', amount: number }`
- **Output**: `{ success: boolean }`
- **Preconditions**:
  - Request status is `completed`
  - `paymentStatus !== 'paid'` (write-once enforcement)
  - Authorized actor (customer or mechanic for completed job)
- **Postconditions**:
  - `paymentMethod: method`
  - `paymentStatus: 'paid'`
  - `amountCents: amount`
  - `paidAt: Date.now()`
  - `paidBy: actorId`

### 4.3 Realtime Listener Preservation

**All existing `onSnapshot` listeners are preserved exactly**. The adapter layer does not replace `onSnapshot` — it wraps it with:
- Automatic emulator connection (`connectFirestoreEmulator`)
- DTO mapping of snapshot data (conversion layer, not replacement)
- Error classification (translate `permission-denied` into application-level events)
- **Presence of the exact same callback signature** — consumers do not need to change

### 4.4 Transaction Semantics Preservation

**All Firestore transactions preserve exact semantics**:
- `runTransaction` with `setOption: 'merge'` remains the mutation path
- All business logic that currently uses `runTransaction` (createRequest, advanceJob, releaseJob, submitEstimate, recordPayment, reassignMechanic) continues to use it
- Adapters add DTO mapping **around** the transaction, not inside it — the transaction body uses raw Firestore types as before

### 4.5 Security Rules Preservation

**`firestore.rules` preserved unchanged**. Key rules (from audit):

1. **Client role fields are UI hints only** — never trusted for authorization
2. **Custom claims** (`request.auth.token.admin == true`) are the authoritative admin boundary
3. **Mechanic authority** = `approved == true` in private record, never client-selected role
4. **`users/{uid}`** creation: self-signup, role in `['customer', 'mechanic']` only; no self-promotion to admin
5. **Request creation**: customer-owned, valid vehicle, finite coords, bounded problem text (5-2000 chars), owned vehicle doc
6. **Mechanic updates**: availability + live/base-location only; approved/verification/rating/reviewCount/phone/email unwritable
7. **Estimate customer write**: only `estimateStatus` from `pending` to `approved`/`rejected`, with `estimateApprovedAt` timestamp
8. **Payment write-once**: `paymentStatus` forbidden to write `pending`; once `paid`, cannot be changed
9. **Admin operations**: `isClaimAdmin()` gate on `allow update: if isClaimAdmin()` and `allow delete: if isClaimAdmin()`
10. **Assignment is server-only**: direct client status/mechanicId writes denied; every accept travels through `acceptOffer` callable

---

## 5. Capacity Invariants

### 5.1 Mechanic Capacity Cap

- **`MAX_ACTIVE_JOBS = 3`** — maximum live jobs per mechanic
- Enforced via:
  - Firestore rules: mechanic can only have 3 active jobs
  - Transaction logic: `activeJobCount` atomically incremented on job assignment, decremented on release/completion
  - UI: "At capacity" badge when `activeJobCount === 3`, Accept buttons disabled

### 5.2 Capacity Reconciliation

| Scenario | Action |
|---|---|
| Normal job completion | `activeJobCount` decremented by 1 |
| Mechanic releases job | `activeJobCount` decremented by 1; request → `requested` |
| Mechanic reassignment | Old mechanic's `activeJobCount` decremented; new mechanic's incremented |
| Admin `release_stale` | Mechanic's `activeJobCount` decremented; request → `requested` |
| Admin `recapture_job` | Old mechanic's `activeJobCount` decremented (if still assigned), new mechanic's incremented |

**Counter conservation**: Every increment is matched by a decrement across the system. No path exists where `activeJobCount` can permanently increase without a corresponding decrement.

### 5.3 Double-Decrement Prevention

- `activeJobCount` is only decremented within `runTransaction` bodies
- Each transaction has explicit guard: `if (current.activeJobCount > 0) decrementBy(1)`
- `reassignMechanic` always decrements old mechanic and increments new mechanic in the **same transaction**
- Admin recovery operations decrement only if the mechanic is still assigned (validated in preconditions)

**No path to double-decrement** exists in the transaction logic.

---