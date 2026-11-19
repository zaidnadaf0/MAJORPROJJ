# Mechanic Booking & Roadside Assistance — Architecture Audit

**Repository:** `/home/mohammedzaidnadaf/Desktop/roadassssist`
**Branch:** `main`
**Audit date:** 2026-11-16
**Mode:** Read-only audit. No application source, rules, configuration, or credentials were modified.
**Verification target:** Local source + Firebase emulators (`roadassist-9c223`). No production deploy and no production data access.

---

## 1. Executive summary

The booking system is **structurally sound and materially implemented**. It is not a mock: the customer request, server-authoritative offer dispatch, mechanic acceptance, lifecycle progression, estimate approval, completion gating, payment recording, tracking, ratings, notifications, and projections all exist in code and are exercised by passing tests. The complete happy-path browser journey passes against real emulator Firestore state.

The architecture is worth **keeping and repairing**, not restructuring. Assignment is genuinely server-owned (`acceptOffer` callable + transaction), Firestore rules form a real second boundary, dispatch is deterministic, and the emulator suite proves the important races (two mechanics, accept vs decline, cancel vs dispatch, repeated sweeps).

The serious problems are **localized workflow semantics**, not a systemic design failure:

1. **A customer-selected mechanic is an exclusive hard filter, not a preference.** If that mechanic is outside radius, specialty-incompatible, at the active-job cap, unavailable, or later declines, the request receives **zero offers** for every rematch round and then sits silently in `requested`. This is the most likely real-world booking failure.
2. **Releasing an assigned job preserves the previous mechanic's approved estimate.** The next mechanic inherits an approval they did not earn, cannot replace it, and can complete against it. This breaks the customer-approval trust boundary.
3. **Final billing is not reconciled with the approved estimate**, and payment recording can succeed with no stored amount.
4. **Rematch offers do not notify mechanics** because the offer trigger ignores updates to an existing offer document. Estimate submission/decision also emits no notification.

None of these invalidate the overall architecture. All are fixable with focused changes, tests, and small rule/schema adjustments.

**Verification in one line:** 294/294 unit tests, 127/127 emulator tests, 18/18 browser E2E tests, 38/38 rules-linter checks, typecheck and both production builds pass; a custom 10-run concurrency probe confirmed the active-job cap holds under simultaneous accepts.

---

## 2. Scope, constraints, method, and evidence standard

### 2.1 In scope

- Customer request creation and the booking wizard.
- Server dispatch: offer generation, eligibility, ranking, expiry, decline, rematch, acceptance.
- Mechanic queue, job progression, release, estimate submission.
- Customer estimate approval, completion, payment recording, rating.
- Firestore schema, indexes, rules, projections, notifications, triggers, scheduled sweep.
- Customer/mechanic/admin portal state consistency.
- ML ranking integration and ETA/tracking behavior.
- Test suites and documented limitations.

### 2.2 Explicitly out of scope

- Deploying Firebase, changing production data, rotating credentials.
- Modifying authentication/authorization, rules, storage rules, or secrets.
- Accessing `D:\MECHIST` or any backup project.
- Replacing working features with mock data.
- Application source changes. This audit produced **only this document** (plus temporary local test artifacts that were removed).

### 2.3 Evidence standard

A capability is called **working** only when it was traced from UI action → client library → backend write/callable → Firestore/rules outcome → UI state. Merely rendering a button is not evidence. Claims are labeled:

- **Confirmed** — directly observed in code and/or a passing test/probe.
- **Inferred** — code path is clear but no execution proof was obtained.
- **Not verified / blocked** — environment or missing harness prevented proof.

All tests were run locally on the current working tree, with the pre-existing uncommitted changes preserved.

---

## 3. System map and component responsibilities

```
React SPA (Vite, React 18, React Router 7)
├── Public experience
│   ├── Landing / service pages / Mechanic Bot guide
│   ├── Mechanic directory  ──► ML ranking API (optional, client-side)
│   └── Mechanic detail     ──► /request?mechanic=<id>
├── Customer portal
│   ├── Dashboard (active job, ETA/location summary)
│   ├── Request wizard (vehicle → problem → location → mechanic → confirm)
│   ├── Tracking (live status, map, estimate approval, receipt, payment, rating)
│   ├── History / vehicles / notifications
├── Mechanic portal
│   ├── Dashboard / requests & offers queue
│   ├── Job page (advance, release, estimate, completion billing, GPS)
│   ├── History & earnings / profile
└── Admin portal
    ├── Dashboard / approvals / mechanic management
    ├── Reports / analytics / logs / users
    └── Ops views

Client libraries
├── src/lib/customer.ts     request create/cancel, estimate decision, public mechanics
├── src/lib/mechanic.ts     incoming offers, advance/release, estimate, payment, live location
├── src/lib/dispatch.ts     offer subscriptions, accept/decline callables
├── src/lib/tracking.ts     Haversine distance, stale-fix handling, heuristic ETA
├── src/lib/mlRank.ts       optional ML re-rank with deterministic fallback
└── src/lib/analytics.ts    reporting/export

Firebase
├── Auth (email/password + custom claims role)
├── Firestore
│   ├── users/{uid}
│   ├── vehicles/{id}
│   ├── requests/{id}
│   │   └── offers/{mechanicId}
│   ├── mechanics/{uid} + private/contact
│   ├── publicMechanics/{uid}   (server projection)
│   └── notifications/{uid}/items/{id}
├── Cloud Functions (Node 20, us-central1)
│   ├── Triggers: onRequestCreate, onRequestWrite, onOfferWrite, onMechanicWrite
│   ├── Callables: acceptOffer, declineOffer, admin role/approval
│   └── Scheduled: scheduledOfferSweep (every 1 minute)
├── Firestore rules + composite/collection-group indexes
└── Hosting (SPA build)

Optional ML service
└── ml/api (FastAPI) — ranking only; never assignment
```

### 3.1 Responsibility split

| Concern | Owner | Notes |
| --- | --- | --- |
| Request creation | Customer client | Rules validate ownership, coordinates, allowlist |
| Candidate eligibility/ranking | Cloud Functions | Deterministic score; no ML |
| Offer batch creation | `onRequestCreate` / sweep / decline | Admin SDK |
| Assignment | `acceptOffer` callable only | Rules deny direct client assignment |
| Offer decline | `declineOffer` callable | Appends `declinedBy`, triggers rematch |
| Lifecycle progression | Mechanic client transaction | Rules enforce canonical transitions |
| Release | Mechanic client transaction | Rules enforce audit fields |
| Estimate submit | Mechanic client transaction | Rules bound values and freeze approval |
| Estimate decision | Customer client update | Rules require pending + owner |
| Completion | Mechanic client transaction | Rules require approved estimate |
| Payment recording | Customer or mechanic client transaction | Rules allow completed jobs only |
| Notifications/projection/rating | Server triggers | Idempotent, deterministic IDs |
| Tracking/ETA | Client | Straight-line only; no routing |
| ML ranking | Client (directory only) | Falls back deterministically |

---

## 4. End-to-end architecture

### 4.1 Booking sequence

```mermaid
sequenceDiagram
    participant C as Customer SPA
    participant FS as Firestore
    participant T as onRequestCreate
    participant D as Dispatch (Admin SDK)
    participant M as Mechanic SPA
    participant Fn as acceptOffer callable

    C->>FS: create requests/{id} (requested, unassigned, pickedMechanicId?)
    FS-->>T: document created
    T->>D: createOfferBatch(requestId)
    D->>FS: read approved+available mechanics (limit 100)
    D->>D: filter decline/pick/cap/specialty/radius, score
    D->>FS: transaction: write ≤3 offers + offerExpiresAt
    FS-->>M: collectionGroup offers(mechanicId, pending) snapshot
    M->>Fn: acceptOffer(requestId)
    Fn->>FS: transaction revalidate request/offer/expiry/decline/mechanic/cap
    Fn->>FS: set accepted + mechanic; supersede sibling offers
    FS-->>C: tracking updates (accepted)
    M->>FS: advanceJob accepted → on-the-way → arrived → service
    M->>FS: submitEstimate (pending)
    C->>FS: approveRejectEstimate (approved/rejected)
    M->>FS: advanceJob → completed (requires approved estimate)
    C->>FS: recordPayment (cash/UPI, completed only)
    C->>FS: rating
    FS-->>T: transitions → notifications, phone attach, location cleanup, rating aggregate
```

### 4.2 Why the happy path is credible

- Assignment is **not** a client write. `firestore.rules` explicitly removed the old client-direct accept branch (`firestore.rules:384-390`).
- `acceptOfferTx` is a real transaction: it re-reads the request, offer, mechanic, active count, and sibling offers, then writes assignment + offer statuses together (`functions/src/dispatch.ts:223-273`).
- The E2E journey creates a request, observes the offer, accepts as the mechanic, advances the lifecycle, submits an estimate, proves completion is refused before approval, approves as the customer, completes, records payment, and verifies Firestore state (`e2e/booking-journey.e2e.ts:49-232`).
- The emulator suite proves first-win under simultaneous accepts and accept-vs-decline races (`emulator/dispatchTx.test.ts:117-134`, `205-229`).

### 4.3 Realtime model

- Customer tracking subscribes to the request document (`watchRequest`).
- Mechanic queue subscribes to a collection-group query on `offers` (`mechanicId == uid`, `status == pending`), then subscribes to each parent request (`src/lib/mechanic.ts:275-330`).
- Offer countdown is client-derived from `expiresAt`.
- The server is authoritative for assignment; the UI reflects committed state.

---

## 5. Data model and ownership

### 5.1 Collections

| Path | Purpose | Key fields | Write authority |
| --- | --- | --- | --- |
| `users/{uid}` | Profile/role mirror | `role`, name, contact | Owner (bounded), admin |
| `vehicles/{id}` | Customer vehicles | `ownerId`, plate, make/model | Owner |
| `requests/{id}` | Booking aggregate | customer, vehicle, problem, coordinates, status, mechanic snapshot, offer window, preference, estimate/billing/payment/rating fields | Customer create/cancel/estimate/rating/payment; mechanic lifecycle/estimate/payment; server assignment |
| `requests/{id}/offers/{mechanicId}` | Per-mechanic offer | request/customer/mechanic IDs, `status`, `expiresAt`, `round` | Server only |
| `mechanics/{uid}` | Private operational profile | approval, specialties, availability, base/live coords, rating totals | Owner (narrow), admin; server projection |
| `mechanics/{uid}/private/contact` | Phone/email | contact | Owner/admin |
| `publicMechanics/{uid}` | Customer-safe projection | name, approval, availability, specialties, radius, rating, coarse base location | Server/admin only |
| `notifications/{uid}/items/{id}` | Inbox | type/title/body/path/read | Server create; owner read/read-flag |

### 5.2 Important fields on `requests`

- Identity/state: `customerId`, `vehicleId`, `problemText`, `problemCategory`, `customerLat/Lng`, `status`, `mechanicId/Name/Phone`, timestamps.
- Dispatch: `pickedMechanicId`, `declinedBy[]`, `offerExpiresAt`, `rematchRound`.
- Live tracking: `mechanicLat/Lng`, `mechanicLocationUpdatedAt`, `etaMin`.
- Estimate: `estimatedAmountCents`, `estimatedDurationMin`, `estimateDiagnosis`, `estimateStatus`, `estimateApprovedAt`.
- Billing: `amountCents`, `durationMin`.
- Payment: `paymentMethod`, `paymentStatus`, `paidAt`, `paidBy`.
- Rating: `rating`, `comment`, `ratedAt`, aggregation markers.
- Cancellation/release: `cancelledAt/By/Reason`, `releasedAt`, `releaseReason`.

### 5.3 Ownership and privacy

- A customer reads only their own request; a mechanic reads a request only while assigned or holding a valid pending offer; admins read all (`firestore.rules:146-152`).
- Customers never read `mechanics/*`; they read `publicMechanics/*`, which strips private contact and only exists for approved mechanics (`functions/src/projection.ts`, `firestore.rules:477-488`).
- Mechanic phone is denormalized onto the request server-side so the customer can call without reading the private profile (`functions/src/index.ts:111-140`).
- Live mechanic coordinates are cleared from the mechanic profile on completion (`functions/src/index.ts:148-170`).
- Storage rules exist but **no feature uses Storage**; photo upload is greenfield.

### 5.4 Index coverage

`firestore.indexes.json` includes the critical collection-group offer index (`mechanicId ASC, status ASC`, `COLLECTION_GROUP`, lines 85-92), request status/customer/mechanic indexes, public-mechanics availability index, and notification ordering. No missing index was observed in emulator runs.

---

## 6. Request state machine

### 6.1 Canonical states

```mermaid
stateDiagram-v2
    [*] --> requested: customer create
    requested --> accepted: acceptOffer (server only)
    accepted --> on-the-way: mechanic advance
    on-the-way --> arrived: mechanic advance
    arrived --> service: mechanic advance
    service --> completed: mechanic advance + approved estimate
    requested --> cancelled: customer
    accepted --> cancelled: customer
    on-the-way --> cancelled: customer
    arrived --> cancelled: customer
    accepted --> requested: mechanic release
    on-the-way --> requested: mechanic release
    arrived --> requested: mechanic release
    service --> requested: mechanic release
    completed --> completed: rating / payment metadata only
```

### 6.2 Enforced invariants

| Invariant | Enforcement | Evidence |
| --- | --- | --- |
| Only server assigns a mechanic | Callable transaction + rules deny client assignment | `dispatch.ts:223-273`, `firestore.rules:384-390` |
| Assignment is first-win | Transaction re-read + sibling supersede | `dispatch.ts:229-271`, test `dispatchTx.test.ts:117-134` |
| Offer must be pending and unexpired | Server clock check | `dispatch.ts:237-244` |
| Mechanic must still be approved/available | Re-read inside transaction | `dispatch.ts:246-248` |
| Active-job cap | Query inside transaction | `dispatch.ts:250-256` |
| One-step lifecycle | `canAdvance` + rules branch | `src/lib/mechanic.ts:72-83`, `firestore.rules:217-220` |
| Terminal states frozen | Rules | `firestore.rules:214`, `251-252` |
| Completion requires approved estimate | Client transaction **and** rules | `src/lib/mechanic.ts:462-466`, `firestore.rules:251-252` |
| Estimate frozen after approval | Rules | `firestore.rules:291-300` |
| Customer-only estimate decision | Rules require owner + pending | `firestore.rules:310-326` |
| Offers closed on cancel/accept | Trigger + callable | `functions/src/index.ts:60-98` |
| Payment only after completion | Client check + rules | `src/lib/mechanic.ts:717`, `firestore.rules:330-332` |

### 6.3 Gaps in the state machine

The canonical path is correct. The gaps are **edge-state semantics**:

- `requested` has no honest terminal state for "no mechanic available"; it can remain `requested` indefinitely after rematch rounds are exhausted.
- `service` cannot be cancelled by the customer (`firestore.rules:190-196` excludes it), and there is no automatic abandonment reaper.
- `release` returns to `requested` but does not reset estimate state, so the next assignment starts in a semantically inconsistent state (see D2).
- `completed` can carry no `amountCents`, yet payment can still be "recorded" (see D5).

---

## 7. Discovery → preference → assignment pipeline

### 7.1 The three layers

1. **Discovery (customer-facing):** `publicMechanics` query filtered by `approved == true` and `isAvailable == true`, then optionally re-ranked by the ML API in the directory page (`src/pages/customer/MechanicDirectoryPage.tsx:60`, `src/lib/mlRank.ts:98`). If the ML call fails, a deterministic order is used.
2. **Preference (customer-selected):** the request may carry `pickedMechanicId`, written by the client (`RequestPage.tsx:206`, `customer.ts:261`, allowed by `firestore.rules:172-178`).
3. **Assignment (server):** `rankEligible` filters by approval, availability, `declinedBy`, `pickedMechanicId`, active cap, specialty compatibility, location, and radius; scores by distance, live-location freshness, specialty match, rating, and review count; sorts deterministically; offers the top 3 (`functions/src/dispatch.ts:84-125`, `148-162`).

### 7.2 Where the layers diverge

- The directory is ML-ranked; the wizard's dropdown is an **alphabetical, unranked** list of available public mechanics (`customer.ts:446-465`, `RequestPage.tsx:408-412`).
- The directory shows no dispatch eligibility (distance to *this* customer, active load, specialty vs. selected category). The detail page shows a radius but not whether the customer is inside it.
- The wizard's "Prefer a mechanic?" list is not filtered by the selected problem category, the customer's coordinates, the mechanic's active count, or `declinedBy`.
- The server treats the preference as an **exclusive filter**, not a soft preference (`dispatch.ts:95`).

Consequence: the customer can choose a mechanic the dispatcher will never offer to. This is the root of D1 and the core architectural inconsistency in the discovery/assignment boundary.

### 7.3 What works well

- With no preference (the default option), dispatch behaves correctly: top-3 eligible offers, deterministic ordering, expiry, decline, rematch, first-win accept.
- The preference never bypasses eligibility, approval, radius, or the cap. It only narrows the pool. That is safer than allowing a customer to force an ineligible assignment.
- The ML service is never trusted with assignment; a failure falls back to deterministic ordering and cannot break booking.

---

## 8. On-site lifecycle, estimates, and billing

### 8.1 Estimate workflow

1. Mechanic submits diagnosis, estimated amount (0–₹10,000), estimated duration (0–1,440 min) via `submitEstimate` (`src/lib/mechanic.ts:634-678`).
2. A new estimate starts `pending`; a rejected estimate can be revised back to `pending`.
3. Customer approves or rejects with a numeric timestamp (`src/lib/customer.ts:410-442`).
4. Rules allow the mechanic only `pending/rejected`; only the customer can set `approved` (`firestore.rules:291-326`).
5. Completion is refused unless `estimateStatus == 'approved'`, both in the client transaction and in rules (`mechanic.ts:462-466`, `firestore.rules:251-252`).

This is a genuine trust boundary, not just UI gating. The E2E test proves completion is refused before approval and succeeds afterward (`e2e/booking-journey.e2e.ts:156-197`).

### 8.2 What is intentionally absent

- No line items, tax, discount, invoice document, or currency field.
- No revision history; only the latest diagnosis is retained.
- No re-approval when the final amount differs from the estimate.
- No estimate provenance: the record does not say *which mechanic* submitted the approved estimate. This becomes a defect on release/reassignment (D2).

### 8.3 Completion and payment

- Completion writes optional `amountCents` and `durationMin`; the UI labels amount "optional" (`MechanicJobPage.tsx:270-275`).
- Payment recording (`recordPayment`) requires `status == completed` and an authorized actor, validates method (`cash|upi`), and refuses an amount that contradicts `amountCents` (`mechanic.ts:703-739`).
- If `amountCents` is absent, **any** non-negative amount is accepted and **not stored**; the receipt then shows "Not recorded" for the final amount while payment shows "Recorded" (`mechanic.ts:724-730`, test `mechanicEstimate.test.ts:216-220`, `TrackingPage.tsx:476-478`).
- Payment is offline recording only; it is not provider-verified revenue, and the UI says so.

### 8.4 Billing consistency assessment

The receipt deliberately shows the approved estimate and the final amount side by side, with the note "The final bill is recorded separately when the job is completed" (`TrackingPage.tsx:465-467`). That makes the divergence visible rather than hidden, which lowers the severity. It does not provide a reconciliation rule, a customer re-approval step, or an auditable payment amount.

---

## 9. Realtime tracking, ETA, and location privacy

### 9.1 Mechanics

- The mechanic writes live coordinates to the request, not the public profile, while a job is active (`src/lib/mechanic.ts` live-location path; rules allow lat/lng/updatedAt on non-terminal requests, `firestore.rules:221-245`).
- On completion, `advanceJob` nulls the request's live pin and a trigger nulls the mechanic profile's live coordinates (`mechanic.ts:458-461`, `index.ts:148-170`).
- The customer computes distance with Haversine and marks a fix stale after 5 minutes (`src/lib/tracking.ts`).
- ETA is a client heuristic: straight-line distance at an assumed 30 km/h, explicitly disclaimed as not routing/traffic (`tracking.ts:10-22,104-108`, displayed at `TrackingPage.tsx:297`).

### 9.2 ETA inconsistency

`etaMin` is allowed by rules (1–180) and consumed by notification copy (`notifications.ts:114`), and the customer dashboard prefers it (`CustomerDashboard.tsx:193`). **No current client or function writes `etaMin`.** In the new app it is a dead field inherited from the legacy implementation. Result:

- The tracking page shows a live heuristic ETA.
- The dashboard usually shows "Status updates are live" instead of a numeric ETA.
- "On the way" notifications never include an ETA.
- `docs/KNOWN-LIMITATIONS.md` says there is no ETA calculation, which is no longer true for the tracking page.

This is a consistency/documentation defect (D8/D13), not a booking blocker.

### 9.3 Privacy assessment

- Customer coordinates are on the request; only participants/admin can read it.
- Live mechanic coordinates are job-scoped and cleared on completion.
- Public projection exposes only coarse base coordinates and no contact details.
- Mechanic phone is intentionally denormalized to the request for the customer; it is cleared on release.
- No route history is retained.

---

## 10. Authorization and trust boundaries

### 10.1 Two different guarantees

| Operation | Authority | Strength |
| --- | --- | --- |
| Create request | Rules | Strong: ownership, allowlist, finite coordinates, vehicle existence |
| Assign mechanic | Server callable transaction | Strongest: server clock, cap, first-win, eligibility re-read |
| Decline/rematch | Server callable + transaction | Strong |
| Advance/release | Client transaction + rules | Strong rules boundary, but client-originated |
| Estimate submit/decision | Client transaction/update + rules | Strong rules boundary |
| Payment record | Client transaction + rules | Rules boundary; no financial verification |
| Admin operations | Custom claim `admin` | Strong; rules gate admin paths |

`docs/KNOWN-LIMITATIONS.md:90-108` correctly describes the lifecycle/dispatch asymmetry. That asymmetry is acceptable and should be stated honestly; it is not itself a defect.

### 10.2 Rule coverage observed

- Request create: exact key allowlist, `status == requested`, `mechanicId == null`, bounded `problemText`, finite coordinates, owned vehicle (`firestore.rules:159-179`).
- Direct assignment denied; accept/decline require approved mechanic (`rules` around 349-390).
- Estimate values bounded; approval customer-only; approved estimate frozen.
- Payment only on completed jobs, method allowlist, numeric timestamps, actor ownership.
- Release requires a fresh timestamp, reason, cleared mechanic fields, and audit fields.
- Offers are server-write-only; read is scoped to the addressed mechanic, owning customer, or admin.
- Public mechanics are public-read but server/admin-write with a strict field allowlist.
- Mechanic private contact is owner/admin-only.

### 10.3 Residual security notes

- `pickedMechanicId` is client-written and not validated against approval/existence by rules. The server safely treats it as a filter, so this is a data-quality issue, not an escalation.
- `recordPayment` is repeatable and last-writer-wins (D10). It cannot alter the billed amount, but it can rewrite method/time/actor.
- `createRequest` idempotency is client-held; a fresh key can create a duplicate booking. Documented in `KNOWN-LIMITATIONS.md:220-226`.
- No evidence of a rules bypass was found in the tested paths.

---

## 11. Notifications, projections, and side effects

| Producer | Trigger | Recipient | Idempotency |
| --- | --- | --- | --- |
| `onRequestCreate` | request created | customer "received" | deterministic ID + existence check |
| `onOfferWrite` | **new** offer doc, pending | addressed mechanic | deterministic ID including round |
| `onRequestWrite` | status transition | customer/mechanic | deterministic ID per event |
| `onRequestWrite` | cancellation | counterpart | deterministic ID |
| `onMechanicWrite` | mechanic write | public projection | merge/delete |
| `onRequestWrite` | completed + rating | mechanic aggregate | transactional marker |

### 11.1 Two notification gaps

1. **Rematch offers are silent for returning mechanics.** `onOfferWrite` returns early when the offer document already exists (`index.ts:207-213`). Rematch writes use `tx.set` on the same `offers/{mechanicId}` document, so the second and later rounds are updates, not creates. Mechanics who were in the first batch get no inbox/push notice for later rounds. New candidates still get one. The live in-app queue updates, but a mechanic with the portal closed will miss the offer.
2. **Estimate lifecycle emits no notice.** `noticesForTransition` returns immediately when `before.status === after.status` (`notifications.ts:88`), and no estimate-specific event exists. The customer is not notified that an estimate awaits approval; the mechanic is not notified that it was approved/rejected. Completion is blocked until the customer acts, so this can stall a job.

### 11.2 Projection assessment

- `onMechanicWrite` rebuilds the public projection on every source write and deletes it when approval is lost (`index.ts:21-42`).
- The projection strips private contact and live coordinates.
- Customers therefore never need to read the private mechanic document.
- The projection is eventually consistent; a brief stale window is possible, but not materially harmful.

---

## 12. Verification results

### 12.1 Commands and outcomes

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | **Pass** | No diagnostics |
| `npm run build` | **Pass** | Vite production build in 9.06 s; only chunk-size warning (>500 kB vendor/firebase) |
| `npm run build:functions` | **Pass** | `tsc` clean |
| `npm test` (with emulators up) | **294/294 passed**, 31 files, 1.77 s | All unit tests |
| `npm test` (without emulators) | 293/294 | Only `e2eGuard.vitest.ts` fails by design ("E2E SAFETY GUARD BLOCKED THE RUN") |
| `npm run test:emulator:rules` | **127/127 passed**, 12 files, 17.99 s | Firestore emulator, real rules evaluation |
| `npm run test:e2e` | **18/18 passed**, 51.4 s | Chromium, real emulator Firestore, seeded accounts |
| `npm run lint:rules` | **38/38 checks** | Textual linter, not behavioural proof |
| Custom concurrency probe | **10/10 runs held the cap** | 2 live jobs + 2 simultaneous accepts → exactly one accepted, one `ineligible`, live jobs = 3 |

### 12.2 E2E coverage actually executed

```
✓ customer creates a booking, mechanic accepts, job completes
✓ demo mode is OFF in emulator runs (no fixture leakage)
✓ customer documents are visible only to their owner (rules intact)
✓ public experience routes (4 tests)
✓ public mobile navigation (2 tests)
✓ duplicate submission creates exactly one request
✓ page refresh mid-booking keeps the request and its id
✓ customer session survives navigation after acceptance
✓ mechanic decline leaves the request open and records the refusal
✓ customer can cancel a live request and cancellation is committed
✓ an expired offer cannot be accepted and the UI says so
✓ unauthenticated visitor cannot open a protected portal
✓ customer cannot open the admin or mechanic portal
✓ no available mechanics leaves the request honestly unassigned
```

### 12.3 What the green suite does *not* prove

- The scheduled sweep's **scheduling** (the emulator does not fire pubsub schedules). Its logic is proven by direct `sweepRequest`/`rematchRequest` tests.
- Production deployment, indexes, IAM, billing, or quota behavior.
- Live ML inference (the API was not started; client fallback is unit-tested).
- Release/reassignment after estimate approval (no test creates this state).
- Rematch notification fan-out (no test asserts an inbox item after a later round).
- Preferred-mechanic ineligibility (no test picks an out-of-radius/incompatible mechanic).
- Payment repeatability and missing-amount behavior at the rules level (client unit tests cover the missing-amount path; rules do not require one-time payment).
- Multi-tab/offline convergence beyond the covered races.

---

## 13. Status matrix

Legend: **Working** = traced and tested; **Implemented / not tested** = code exists, no execution proof; **Partial** = works on the main path but fails/degrade in a defined case; **Broken** = cannot satisfy the stated behavior; **Missing** = no implementation; **Blocked** = environment prevents proof.

| Capability | Status | Evidence / limitation |
| --- | --- | --- |
| Auth, role guards, protected portals | Working | E2E negative journeys; route guards |
| Vehicle management and ownership | Working | Rules + customer library |
| Request creation and validation | Working | Rules, E2E, idempotency test |
| Duplicate-submit/idempotency (client) | Working (client-only) | E2E; not server-enforced |
| Initial offer batch | Working | Trigger + dispatch tests |
| Deterministic eligibility/ranking | Working | Pure unit tests + emulator |
| First-win acceptance | Working | Transaction + concurrency tests |
| Offer expiry | Working (logic) | Direct expiry tests; scheduler not fired locally |
| Decline + rematch | Working | Callable + emulator tests |
| Active-job cap | Working (emulator-proven) | 10-run probe; production scale caveat |
| Preferred-mechanic selection | **Partial** | Exclusive filter; no fallback when ineligible (D1) |
| Mechanic queue and countdown | Working | Live collection-group query + expiry filter |
| Lifecycle advancement | Working | Rules + E2E |
| Release / reassignment | Working | Prior estimate invalidated on release/reassign (D2) |
| Estimate submission | Working | Bounds, revision, freeze |
| Estimate approval/rejection | Working | Rules + E2E |
| Completion gated on approval | Working | Client + rules + E2E |
| Final amount vs approved estimate | Working | Mandatory final amount; a difference needs customer re-approval (D5) |
| Payment recording | Working | Write-once, amount persisted, external-only verification (D5/D10) |
| Rating and aggregation | Working | Transactional re-rating logic + tests |
| Customer cancellation | Working for requested–arrived | `service` not cancellable |
| Abandoned-job recovery | **Missing** | No reaper/admin reassignment (D6) |
| Tracking distance/staleness | Working | Haversine + 5-minute stale rule |
| ETA | **Partial/inconsistent** | Heuristic on tracking; dead `etaMin` on dashboard (D8) |
| Notifications on status changes | Working | Trigger + idempotent IDs |
| Notifications on rematch | **Broken** | Update-only offer writes are ignored (D3) |
| Notifications on estimate events | **Missing** | No event types (D4) |
| Public mechanic projection | Working | Trigger + fields |
| Search/discovery ranking | Working (directory only) | ML client-side, fallback |
| Discovery → assignment consistency | **Partial** | Different ranking/eligibility views (D7) |
| Admin approvals | Working | Callable + rules + UI |
| Admin job reassignment/cancel | **Missing** | Rules allow admin writes; no product UI |
| Demo-mode isolation | Working | E2E asserts no fixture leakage |
| ML inference service | Implemented / **blocked** | API not started; client fallback tested |
| Scheduled trigger firing | Implemented / **blocked** | Emulator does not fire schedules |
| Storage/photo upload | **Missing** | Rules exist; no feature uses Storage |

---

## 14. Defect register (severity-ranked)

Severity scale: **Critical** = security/data loss/happy path broken; **High** = common path can silently fail or a trust boundary is undermined; **Medium** = specific path degraded or information lost; **Low** = UX/doc/scalability hygiene.

### Summary

| ID | Severity | Defect | Status | Primary evidence |
| --- | --- | --- | --- | --- |
| D1 | **High** | Preferred mechanic is an exclusive filter; ineligible pick strands the request | **Fixed** (D1/D7 milestone) | `dispatch.ts`; `RequestPage.tsx` |
| D2 | **High** | Release preserves the previous mechanic's approved estimate | Fixed | `mechanic.ts`; `firestore.rules`; `emulator/estimates.test.ts` |
| D3 | **Medium** | Rematch offers do not notify returning mechanics | **Fixed** (D1/D7 milestone) | `index.ts`; `notifications.ts` |
| D4 | **Medium** | No notifications for estimate submit/decision | Missing | `notifications.ts:19-28,88` |
| D5 | **Medium** | Final amount not reconciled; missing amount accepted and discarded | Fixed | `mechanic.ts`; `firestore.rules`; `emulator/estimates.test.ts` |
| D6 | **Medium** | Abandoned jobs consume capacity forever; no reaper/reassignment | Missing | `dispatch.ts:17,250-256`; no reaper in `index.ts`; `KNOWN-LIMITATIONS:58-68` |
| D7 | **Medium** | Discovery (ML) and assignment (deterministic) use different eligibility/ranking views | **Partial** (wizard shares dispatch contract) | `MechanicDirectoryPage.tsx`; `RequestPage.tsx`; `dispatch.ts` |
| D8 | Low–Medium | ETA computed twice; `etaMin` is dead; dashboard/tracking disagree | Partial | `TrackingPage.tsx:297`; `CustomerDashboard.tsx:193`; `notifications.ts:114` |
| D9 | Low | Estimate can be submitted/approved before arrival/service | Policy gap | `rules:267-270`; `MechanicJobPage.tsx:230`; `customer.ts:422` |
| D10 | Low–Medium | Payment recording is repeatable/last-writer-wins, no audit | Fixed (write-once) | `firestore.rules`; `mechanic.ts`; `emulator/estimates.test.ts` |
| D11 | Low | No structured location label; `place` is embedded in `problemText` | Data-model gap | `RequestPage.tsx:202`; `customer.ts:233-240` |
| D12 | Low | Candidate/active scans capped at 100 | Scale limit | `dispatch.ts:129,136` |
| D13 | Low | Documentation drift on ETA, preference semantics, cap behavior | Doc defect | `KNOWN-LIMITATIONS.md:47-53,78-86,134-140` |
| D14 | Low | Test gaps: release+estimate, rematch notices, preferred-mechanic ineligibility | Coverage | Test inventory |

---

### D1 — Preferred mechanic is an exclusive hard filter with no fallback

**Severity:** High
**Status:** **Fixed** (D1/D7 milestone — soft preference, fallback, explicit dispatch recovery)

**Evidence**

- The server filters out every mechanic except the pick: `if (request.pickedMechanicId && m.id !== request.pickedMechanicId) continue;` (`functions/src/dispatch.ts:95`).
- If that yields no candidates, the batch stops: `if (ranked.length === 0) return { offers: 0, stopped: 'no-eligible' };` (`dispatch.ts:193`).
- Rematch reuses the same filter (`dispatch.ts:331`) and increments `rematchRound` even when zero candidates are found (`dispatch.ts:391-396`), so after `MAX_REMATCH_ROUNDS = 5` the sweep stops (`dispatch.ts:328,466`). The request remains `requested` indefinitely.
- The customer dropdown lists **all** available public mechanics (`RequestPage.tsx:408-412`) without checking radius, specialty compatibility against the selected category, active-job cap, or `declinedBy`.
- The deep-link validation checks only that a name exists (`RequestPage.tsx:131-141`); `getPublicMechanic` does not verify availability or eligibility (`src/lib/customer.ts:476-484`). A stale/offline pick can therefore be submitted.
- The directory/detail CTAs lead directly into this path (`MechanicDirectoryPage.tsx:189`, `MechanicDetailPage.tsx:60`).

**Failure scenario**

1. Customer selects a battery specialist for a `battery` request; the mechanic's specialties are `tow`/`recovery`, so `isCompatible` rejects them (`dispatch.ts:55-70`).
2. `rankEligible` returns zero; no offers are written.
3. Sweep retries five times with the same pick, then stops.
4. Customer sees "searching" forever; no mechanic ever sees the job.

The same happens if the pick is outside its service radius, at its active cap, or goes offline between page render and submit. If the pick declines, `declinedBy` excludes them and the pick filter still excludes everyone else — zero candidates permanently.

**Impact:** A prominent CTA ("Request this mechanic") can create a booking that never dispatches, with no explanation or recovery except customer cancellation. This is the highest-probability production failure.

**Root cause:** `pickedMechanicId` was modeled as a hard selection rather than a preference, and the selection UI has no access to dispatch eligibility.

**Recommended fix**

1. Treat the pick as a **priority boost and first-offer preference**, not a filter: try the pick first; if ineligible or unavailable, fall back to the open pool in the same or next round.
2. Add a server-side `preferenceState` (`honored | unavailable | declined | expired`) so the customer sees why the preference was not honored.
3. Revalidate the pick at submit time against the **same** eligibility function (or a server "preview eligibility" callable) and clear it with an explicit notice if invalid.
4. On rematch, stop filtering by a pick that has declined or become ineligible; optionally keep a soft boost.
5. Make the wizard dropdown eligibility-aware (distance, specialty, capacity) or remove the picker in favor of "best available" plus directory browsing.

**Regression tests**

- Emulator: pick a mechanic outside radius → request still receives open-pool offers.
- Emulator: pick declines → next round excludes the pick but offers others.
- Emulator: pick at active cap → fallback works.
- E2E: `/request?mechanic=<ineligible>` shows an honest notice and places an open request (or a preference state), not a permanently unassigned request.

**Resolution (implemented)**

- `rankEligible` no longer filters by `pickedMechanicId`. The pick receives a fixed `PREFERRED_BOOST = 10_000` **after** every eligibility check (approval, availability, decline, active-job cap, specialty, radius), so an eligible pick ranks first and an ineligible pick simply falls out of the open pool.
- Requests now carry server-owned `dispatchState` (`searching | offers-pending | no-eligible | exhausted`), `preferenceState` (`honored | unavailable | declined | expired`), `dispatchUpdatedAt` and `rematchRound`, separate from the lifecycle `status` (which still only changes on accept/cancel). Clients cannot write any of these fields (rules allowlists).
- `rematchRequest`/`createOfferBatch` write the explicit state, re-arm expired/declined offers in later rounds, and stop at `MAX_REMATCH_ROUNDS` with `dispatchState: 'exhausted'` instead of leaving the request silently `requested`.
- New callable `retryDispatch` (owner customer, open/unassigned, only when `no-eligible`/`exhausted`) resets the bounded round budget and reopens a batch through the same transaction/eligibility path. Declined mechanics remain excluded and retries are idempotent.
- `onOfferWrite` now notifies on genuinely new offers (create, non-pending → pending re-arm, or a new round) with an event key of `round + createdAt` millis, so trigger retries do not duplicate notices while a real retry still notifies.
- Tracking UI distinguishes searching / preferred unavailable / alternatives contacted / no eligible / exhausted, with a retry action in the recoverable terminal states.
- Tests: `functions/src/dispatch.test.ts`, `functions/src/notifications.test.ts`, `src/lib/dispatch.test.ts`, `emulator/dispatchTx.test.ts` (eligible/offline/out-of-radius/capacity/specialty/decline/expiry/fallback/no-eligible/exhaustion+retry/repeated triggers/concurrent accept/stale accept/estimate invalidation).

---

### D2 — Release preserves the previous mechanic's approved estimate

**Severity:** High
**Status:** Broken for the release/reassignment path

**Evidence**

- `releaseJob` writes status back to `requested`, clears mechanic identity/location, sets a new offer window, and adds audit fields — but **does not clear estimate fields** (`src/lib/mechanic.ts:412-424`).
- The release rules allowlist is limited to status/mechanic/offer/audit fields; estimate fields are not writable in that branch (`firestore.rules:380-382`). There is no server trigger that clears them (`functions/src/index.ts:50-77` handles rating, cancellation cleanup, phone, location, supersede, notices only).
- Once approved, the estimate is frozen for the mechanic (`firestore.rules:291-300`), and `submitEstimate` returns `invalid_state` when `estimateStatus === 'approved'` (`mechanic.ts:650`).
- Completion checks only that *some* estimate is approved (`mechanic.ts:462-466`, `firestore.rules:251-252`); it does not check who submitted it.

**Failure scenario**

1. Mechanic A is assigned, submits a ₹5,000 estimate, customer approves.
2. Mechanic A releases the job (breakdown, out of coverage, etc.).
3. Mechanic B accepts the re-offer.
4. Mechanic B sees "Estimate approved — you may now complete the job" for a diagnosis they did not make and cannot change.
5. Mechanic B can complete and bill any amount (D5).

The customer's approval is now attached to the wrong provider, and the new provider is blocked from submitting a correct estimate.

**Impact:** Directly undermines the customer-approval trust boundary and can produce a wrong diagnosis/price. It also creates a dead-end workflow for the new mechanic.

**Root cause:** Estimate state is stored on the request without provider provenance, and release was designed as an assignment-only transition.

**Recommended fix**

1. Add `estimateMechanicId` (and optionally `estimateVersion`) to the request when an estimate is submitted.
2. On release, clear `estimateStatus`, `estimateApprovedAt`, and the estimate values (or mark them `superseded`), and reset `estimateMechanicId`.
3. Gate completion on `estimateStatus == 'approved' && estimateMechanicId == mechanicId`.
4. Alternatively/additionally, require customer re-approval whenever the assigned mechanic changes.
5. Add the new fields to the rules allowlists and to any projection/reporting.

**Regression tests**

- Emulator: approve estimate → release → new mechanic cannot complete until a new estimate is approved.
- Emulator: new mechanic can submit a replacement estimate after reassignment.
- Emulator: release clears/versions estimate provenance.
- E2E: full reassignment journey.

---

### D3 — Rematch offers do not notify returning mechanics

**Severity:** Medium
**Status:** **Fixed** (D1/D7 milestone — notify on new round / re-armed offers)

**Evidence**

- `onOfferWrite` processes only newly created offer documents: `if (change.before.exists) return; // updates are not new offers` (`functions/src/index.ts:213`).
- Initial batches use `tx.set` to create offer docs (`dispatch.ts:195-206`).
- Rematches also use `tx.set` on the same `requests/{id}/offers/{mechanicId}` path, overwriting the previous round's document (`dispatch.ts:379-390`).
- The notification ID includes the round (`index.ts:224`), but no notification is written on the update path.

**Impact:** A mechanic who had an offer in round 0 and is re-offered in round 1+ receives no inbox item. If the portal is closed/backgrounded, the offer silently expires. New candidates in later rounds do get a notice, so behavior is inconsistent. Assignment latency increases and offers can churn through rematch rounds without the mechanic knowing.

**Root cause:** The create-only guard is correct for ordinary updates (accepted/declined/superseded) but wrong for the "expired → pending in a new round" reset.

**Recommended fix**

- Notify when `after.status === 'pending'` **and** (`!change.before.exists` **or** `before.status !== 'pending'` **or** `before.round !== after.round`).
- Keep deterministic IDs keyed by `requestId + round` (already supported).
- Add an emulator test that creates round 0, expires it, rematches to round 1, and asserts exactly one notification per mechanic per round.

**Resolution (implemented)**

- `shouldNotifyOffer(before, after)` implements exactly the condition above; `onOfferWrite` now calls it instead of `if (change.before.exists) return`.
- `offerNoticeEvent(round, createdAt)` produces `offer_round_{round}_{createdAtMillis}`, so duplicate trigger deliveries for the same offer collapse to one inbox doc while a real re-arm or retry still creates a new notice.
- Unit tests cover create/re-arm/new-round/duplicate/non-pending cases (`functions/src/notifications.test.ts`); emulator idempotency remains covered by `emulator/notifications.test.ts`.

---

### D4 — No notifications for estimate submission or decision

**Severity:** Medium
**Status:** Missing

**Evidence**

- Inbox types do not include estimate events (`functions/src/notifications.ts:19-28`).
- `noticesForTransition` returns immediately when the request status is unchanged (`notifications.ts:88`). Estimate writes do not change `status`.
- The completion gate means the job cannot finish until the customer approves, but the customer may not know an estimate is waiting unless the tracking page is open.
- The mechanic likewise gets no notice when the customer approves/rejects.

**Impact:** Workflow stalls and manual refresh is required. In a real deployment this is a support burden and a completion-delay risk.

**Recommended fix**

- Add `estimate_pending`, `estimate_approved`, `estimate_rejected` inbox types.
- Emit to the counterpart on estimate status transitions, with deterministic IDs including `estimateApprovedAt`/version to avoid duplicates on retries.
- Include the amount (formatted) and a deep link to `/track/{id}` or `/m/job/{id}`.
- Add unit tests for event mapping and emulator tests for idempotency.

---

### D5 — Final amount is not reconciled with the approved estimate

**Severity:** Medium
**Status:** **Implemented** (D5/D10 milestone — completion reconciliation + explicit customer re-approval)

**Evidence (pre-fix)**

- `advanceJob` accepts optional `amountCents` and never compares it to `estimatedAmountCents` (`src/lib/mechanic.ts:467-469`).
- The completion UI has a separate optional amount field and does not prefill it from the estimate (`MechanicJobPage.tsx:268-275`).
- Rules allow completion with no amount (`firestore.rules:253-256`) and any amount up to ₹10,000.
- `recordPayment` validates the amount against `amountCents` only when `amountCents` exists; otherwise it accepts any amount and does not store it (`mechanic.ts:724-730`).
- The receipt shows both figures and notes that the final bill is recorded separately (`TrackingPage.tsx:465-467,475-476`).

**Impact:** The customer approves one number but can be billed another without re-approval. A completed job can have a recorded payment with no amount, so the receipt is internally inconsistent and earnings/analytics undercount. This is not an online-payment vulnerability, but it is a material billing-integrity gap.

**Resolution**

- Completion now requires a priced, approved estimate and a mandatory final `amountCents` (₹0 allowed for a zero-cost service). The mechanic UI prefills it from the approved estimate.
- Equal to the approved estimate → `finalAmountStatus: 'approved'` inheriting the estimate approval.
- Different (higher or lower) → `finalAmountStatus: 'pending'`, approval fields null; the customer must approve via `approveFinalAmount()` before payment. The mechanic cannot self-approve.
- `advanceJob` returns `amount_required` / `estimate_required`; rules enforce the same at the trust boundary.
- Migration safety: legacy completed jobs with no `finalAmountStatus` are payable only when `amountCents === estimatedAmountCents`.
- Tests: `src/lib/mechanicEstimate.test.ts`, `src/lib/customerEstimate.test.ts`, `emulator/estimates.test.ts` (equal/higher/lower/zero-cost/pending/final approval).

---

### D6 — Abandoned jobs consume capacity forever; no reaper or admin reassignment

**Severity:** Medium
**Status:** Missing (acknowledged in existing docs)

**Evidence**

- `MAX_ACTIVE_JOBS = 3` and acceptance counts every `accepted/on-the-way/arrived/service` job (`dispatch.ts:17,250-256`).
- There is no stale-job reaper in `functions/src/index.ts`; the scheduled function only sweeps open `requested` jobs (`index.ts:271-289`).
- Admin callables cover role/approval only (`functions/src/admin.ts`, `approval.ts`); no reassignment/cancel callable.
- Rules allow admin updates (`firestore.rules:393-394`), but no admin job-management UI was found.
- A customer cannot cancel once the request is `service` (`firestore.rules:190-196`).
- `KNOWN-LIMITATIONS.md:58-68` already documents that three neglected jobs stop a mechanic from receiving offers.

**Impact:** Capacity leaks silently; a mechanic can be effectively locked out; a customer can be stuck in `service` with no product path to resolution.

**Recommended fix**

- Scheduled stale-job detector with explicit SLAs (e.g., accepted without movement, arrived without service start, service exceeding a maximum duration).
- Notify mechanic and admin at thresholds; auto-release after a documented grace period with audit fields.
- Add an admin callable/UI for reassignment/cancel, with reason and audit.
- On auto-release, apply the same estimate reset as D2.

---

### D7 — Discovery and assignment use different views of the network

**Severity:** Medium
**Status:** **Partially fixed** (D1/D7 milestone — wizard shares the server eligibility contract; ML remains directory-only)

**Evidence**

- Directory: ML re-rank (`MechanicDirectoryPage.tsx:60`, `mlRank.ts:98`), rich detail page.
- Wizard: alphabetical dropdown of available publics (`customer.ts:446-465`, `RequestPage.tsx:408-412`), no category/distance/load filtering.
- Server: deterministic eligibility + score (`dispatch.ts:84-125`) that the customer never sees.
- The only bridge is `pickedMechanicId`, which the server treats as an exclusive filter.

**Impact:** Customer expectations do not match dispatch reality (feeds D1); ML work does not influence matching; the "best available" concept is not explained anywhere.

**Recommended fix**

- Define one **eligibility contract** shared by discovery, the wizard, and dispatch (same specialty/radius/availability/cap rules).
- Either show only dispatch-eligible mechanics in the wizard, or show all but label them "may not be available" and make the preference soft.
- If ML is meant to influence assignment, move ranking server-side (or feed a server-computed score); otherwise state clearly that ML is directory-only.
- Add a "why this mechanic" explanation using the same factors as `rankEligible`.

**Resolution (implemented, partial)**

- New callable `previewEligibleMechanics` calls the **same** `rankEligible` used by dispatch and returns only public fields (`id`, `name`, `km`, `preferred`).
- The wizard labels each available mechanic "available now" vs "may not be available" using that preview, explains that the pick is tried first but falls back automatically, and shows the same soft note on the review step.
- Preview failures are treated as "unknown" and **never** block submission; the pick remains a soft preference, not an eligibility filter.
- ML ranking remains directory-only; it is not used for assignment. This is documented rather than changed here (not part of D1/D7 scope).

---

### D8 — ETA is computed twice and `etaMin` is dead

**Severity:** Low–Medium
**Status:** Partial/inconsistent

**Evidence**

- Tracking computes a heuristic ETA from live distance (`src/lib/tracking.ts:104-108`, used at `TrackingPage.tsx:297`).
- Dashboard reads `active.etaMin` (`CustomerDashboard.tsx:193`).
- No current client/function writes `etaMin`; grep finds it only in rules, docs, legacy, and notification copy.
- Notifications would include it if present (`notifications.ts:114`), but it never is.
- `KNOWN-LIMITATIONS.md:78-86` says there is no ETA calculation and that a heuristic is "not authorised", which no longer matches the tracking page.

**Impact:** Dashboard and tracking disagree; notifications lack ETA; documentation is inaccurate. No booking failure.

**Recommended fix**

- Choose one source of truth: compute ETA in the tracking/dashboard selector from live coordinates, or persist `etaMin` on each location update.
- Remove the dead dashboard branch or populate it.
- Update `KNOWN-LIMITATIONS.md` to describe the heuristic and its assumptions.
- Keep the "not routing/traffic" disclaimer prominent.

---

### D9 — Estimate can be submitted/approved before arrival or service

**Severity:** Low
**Status:** Policy gap

**Evidence**

- Rules allow estimate writes on any non-terminal request (`firestore.rules:267-270`).
- The mechanic UI shows the estimate card for any non-terminal status (`MechanicJobPage.tsx:230`).
- The customer can approve any pending estimate on a non-terminal request (`customer.ts:422`).
- Copy says the estimate is a diagnosis "before completing", not necessarily "after arrival".

**Impact:** A customer can pre-approve an undiagnosed repair, or a mechanic can price before inspecting. May be intentional, but it is not stated as policy.

**Recommended fix**

- Decide the business rule. If diagnosis requires presence, require `arrived` or `service` (UI + rules). If pre-approval is allowed, document it and adjust copy.

---

### D10 — Payment recording is repeatable and last-writer-wins

**Severity:** Low–Medium
**Status:** **Implemented** (write-once payment record; no immutable event log yet)

**Evidence (pre-fix)**

- Rules allow payment fields on completed requests without checking the current `paymentStatus` (`firestore.rules:330-347`).
- `recordPayment` does not reject an already-paid request (`mechanic.ts:703-739`).
- Both customer and assigned mechanic are authorized (`rules:330-331`).
- The UI hides the panel once `paymentStatus === 'paid'` (`TrackingPage.tsx:764`), so ordinary users cannot repeat it, but a direct SDK write can.
- `paidAt` is regenerated on each write and `paidBy` changes to the last actor.

**Impact:** A participant can overwrite the recorded method/time/actor. There is no immutable audit trail, which matters even for offline payment recording.

**Resolution**

- Rules and `recordPayment` reject any payment write when `paymentStatus == 'paid'` (`already_paid`), so payment is write-once and concurrent submissions resolve to exactly one recorded payment.
- The recorded amount is persisted as `paymentAmountCents` and must exactly equal the reconciled final `amountCents`.
- `paymentVerification` is always `external`; there is no gateway-verified state, and `paidBy` must equal the authenticated caller.
- Tests: `src/lib/mechanicEstimate.test.ts` (missing/invalid/negative/duplicate/zero-cost/legacy) and `emulator/estimates.test.ts` (amount rules, duplicate, unauthorized actor, concurrent writes, offline cash/UPI, unverified online attempt).

**Remaining limitation:** the record is write-once rather than event-sourced, so there is still no separate immutable audit trail of corrections. Any future correction workflow must append a payment event or an admin-only audit document.

---

### D11 — No structured location label

**Severity:** Low
**Status:** Data-model gap

**Evidence**

- The wizard concatenates `place` into `problemText`: `` `${svcName ? `[${svcName}] ` : ''}${problem.trim()} @ ${place.trim()}` `` (`RequestPage.tsx:202`).
- `NewRequest` has coordinates but no `locationLabel`/address (`customer.ts:233-240`).
- The create allowlist has no address field (`firestore.rules:172-178`).

**Impact:** The customer's location description is only free text; it cannot be displayed as a distinct field, filtered, exported cleanly, or used in notifications. Reports and receipts parse mixed content.

**Recommended fix:** Add a bounded `locationLabel` field to the schema/rules/UI, keep `problemText` for the problem only, and display the label consistently in mechanic/admin views.

---

### D12 — Candidate and active scans are capped at 100

**Severity:** Low (scale limit)
**Status:** Documented limitation

**Evidence**

- `loadCandidateMechanics` reads at most 100 approved+available mechanics (`dispatch.ts:129`).
- `loadActiveCounts` scans at most 100 live requests (`dispatch.ts:136`).
- The concurrency probe shows the cap is still enforced at acceptance, so a truncated count causes **under-offering**, not over-assignment.
- `KNOWN-LIMITATIONS.md:47-53` states the cap "silently under-enforces"; that wording is too strong for the acceptance path, but the undercount/under-offer issue is real.

**Impact:** Beyond ~100 simultaneous live jobs or ~100 available mechanics, some eligible mechanics may not be offered, and offer generation can mis-rank. Acceptance revalidation prevents overloading.

**Recommended fix:** Maintain per-mechanic active counters transactionally, or query active jobs scoped to the candidate batch, or paginate candidates. Update the docs to distinguish offer-generation undercount from acceptance enforcement.

---

### D13 — Documentation drift

**Severity:** Low
**Status:** Doc defect

**Evidence**

- `KNOWN-LIMITATIONS.md:78-86` says there is no ETA calculation and a heuristic is not authorised; `tracking.ts:104-108` and `TrackingPage.tsx:297` implement/display one.
- `KNOWN-LIMITATIONS.md:134-140` says `pickedMechanicId` is "a customer preference in the ranking layer only"; in code it is an exclusive filter (`dispatch.ts:95`), which is why D1 exists.
- `KNOWN-LIMITATIONS.md:47-53` says the active-job cap "silently under-enforces" beyond 100 live jobs; the acceptance path re-queries and held the cap in 10/10 concurrent runs. The real issue is under-offering/undercounting.
- The docs are otherwise unusually accurate and should be preserved as the basis for updates.

**Recommended fix:** Update the three sections after the D1/D2/D8 fixes, and add a short "audit findings" link to this report.

---

### D14 — Coverage gaps in the existing test suite

**Severity:** Low
**Status:** Coverage gap

**Evidence**

- E2E covers the happy path, duplicate submit, refresh, session survival, decline, cancel, expired offer, auth guards, and no-mechanics. It does not cover release, reassignment, estimate inheritance, preferred-mechanic ineligibility, rematch notifications, or payment repeatability.
- The release emulator test uses a request with no estimate (`emulator/mechanic.test.ts:151-172`), so D2 is invisible to it.
- The scheduler's firing is not testable in the emulator; its logic is directly tested.
- ML inference was not run.

**Recommended fix:** Add the regression tests listed under each defect, especially D1/D2/D3. Treat these as the acceptance criteria for the repair work.

---

## 15. Documentation drift, observability, and operational risks

### 15.1 Documentation drift

| Document claim | Current reality | Action |
| --- | --- | --- |
| "No ETA calculation; heuristic not authorised" (`KNOWN-LIMITATIONS:78-86`) | Tracking computes/displays a 30 km/h straight-line heuristic | Update docs; keep disclaimer |
| "`pickedMechanicId` is a preference in the ranking layer only" (`:134-140`) | It is an exclusive candidate filter | Fix code (D1), then update wording |
| "Active-job cap silently under-enforces beyond 100" (`:47-53`) | Acceptance re-query held the cap; the 100-scan can undercount offers | Clarify the failure mode |
| "Payment recording exists" (accurate) | Repeatable, amount may be discarded | Add integrity caveat until fixed |

### 15.2 Observability

Strengths:
- Server logs for dispatch batches, accepts, sweeps, projections, notifications, and cleanup.
- Deterministic notification IDs make retry behavior auditable.
- Trigger `failurePolicy: true` for request lifecycle cleanup.

Gaps:
- No structured metrics (offer latency, accept rate, no-eligible rate, rematch exhaustion, estimate-to-completion time).
- No alert when a request exhausts rematch rounds or sits in `requested`/`service` beyond SLA.
- No alert on repeated trigger failures.
- No admin view of `preferenceState`/`rematchRound`/`estimateMechanicId` (the last does not exist yet).

### 15.3 Configuration and deployment risks

- Emulator and production share the project ID; isolation depends on `VITE_USE_EMULATORS=true`. The E2E global setup is a strong guard (`e2e/global-setup.ts`), but a manual `.env` mistake remains possible.
- The Functions emulator runs compiled `lib/`; `dev:emulators` rebuilds first, which prevents stale-code testing. Production deploy must also build.
- A service-account JSON reportedly sits in the repo root (gitignored). Treat any exposed key as compromised and rotate before deploy. This audit did not open it.
- Scheduled functions require pubsub/billing in production; local emulator does not fire schedules.
- Composite indexes must be deployed with the rules; the emulator auto-creates some indexes, so "works locally" is not proof of production index readiness.

---

## 16. Recommendations, repair-vs-restructure, and implementation order

### 16.1 Verdict: repair, do not restructure

The system already has the hard parts right:

- Server-authoritative assignment with transactional first-win.
- Rules as a genuine second boundary, not decorative.
- Deterministic, testable eligibility/scoring.
- Idempotent notifications and projections.
- Real E2E coverage of the full happy path.
- Honest documentation of most limitations.

The defects are semantic and localized. A rewrite would discard a working, tested core and would not automatically solve the preference/release/billing semantics. Repair is lower risk and higher value.

### 16.2 Recommended implementation order

**Phase 0 — Lock the semantics (no behavior change yet)**
1. Write failing tests for D1, D2, D3, D5 (emulator + E2E).
2. Decide and document: preference is soft vs. hard; estimate requires arrival vs. pre-approval; final amount tolerance/re-approval; payment write-once vs. event log.
3. Add the missing fields to the schema design (`estimateMechanicId`, `preferenceState`, `paymentAmountCents` or payment events, `locationLabel`).

**Phase 1 — Fix the trust boundary (highest data-integrity risk)**
4. D2: clear/version estimates on release; gate completion on the current mechanic's estimate; add rules + tests.
5. D10: make payment write-once or event-sourced; persist the amount.

**Phase 2 — Fix booking success (highest user-facing risk)**
6. D1: make `pickedMechanicId` a soft preference; add fallback, preference state, and submit-time eligibility revalidation.
7. D7: share one eligibility contract between discovery/wizard/dispatch; show eligibility reasons.
8. D6: add stale-job detection, notification, auto-release, and admin reassignment.

**Phase 3 — Fix billing and communication**
9. D5: require/reconcile final amount; re-approval on material change; persist payment amount.
10. D3/D4: notify on rematch rounds and estimate events; add idempotency tests.

**Phase 4 — Consistency and hygiene**
11. D8: single ETA source; populate or remove `etaMin`; update dashboard/notifications.
12. D9: enforce or document estimate timing.
13. D11: add structured location label.
14. D12: replace 100-scans with counters/pagination at scale.
15. D13/D14: update docs and close test gaps.

**Phase 5 — Production verification (not performed here)**
16. Deploy rules + indexes + functions; verify scheduled sweep firing, callable region/auth, and index availability.
17. Run a staged end-to-end with real accounts; monitor no-eligible/rematch-exhaustion and stale-job metrics.
18. Rotate any exposed service-account key before deploy.

### 16.3 What not to do

- Do not "fix" D1 by letting the customer force assignment to an ineligible mechanic. Keep eligibility server-side.
- Do not remove the rules gate on completion to simplify billing. Fix the data model instead.
- Do not replace the deterministic dispatcher with ML. ML can rank, but eligibility, cap, expiry, and first-win must remain deterministic/server-owned.
- Do not treat the green E2E happy path as proof of release/reassignment correctness; it does not cover that path.

---

## Final readiness answers (Q1–Q7)

### Q1. Is the structure suitable for the intended workflow?

**Yes, with caveats.** The layered structure (React client libraries → Firestore/rules ← Cloud Functions) is appropriate for a real-time roadside-assistance marketplace. Assignment is correctly server-authoritative, discovery is separated from assignment, and the data model supports the lifecycle. The caveat is that the **preference** layer bridges discovery and assignment with different eligibility views, and lifecycle writes are client-originated (rules-guarded). Both are repairable without changing the overall shape.

### Q2. Is the lifecycle correct?

**Correct on the canonical path; incomplete on edge semantics.** `requested → accepted → on-the-way → arrived → service → completed` is enforced, terminal states are frozen, and completion requires a customer-approved estimate. The lifecycle is **not correct** for release/reassignment (stale approved estimate), abandonment (no reaper), post-service cancellation (not allowed), or billing reconciliation (final amount can diverge). These are the areas to fix before calling the lifecycle production-correct.

### Q3. Are discovery and assignment properly separated?

**Separated in ownership, not in semantics.** Discovery is a public, client-side, optionally ML-ranked view; assignment is a server-side deterministic pipeline. The separation of authority is good. But the customer's pick is passed across the boundary as an exclusive filter, and the wizard does not use the dispatcher's eligibility rules. The two sides need one shared eligibility contract and a soft-preference model.

### Q4. Is state consistent across the customer, mechanic, and admin portals?

**Mostly consistent on the happy path; inconsistent in specific states.** All portals read the same request document, so status, mechanic identity, estimate, and payment fields converge. Inconsistencies appear when:
- a job is released after approval (estimate belongs to the previous mechanic);
- the final amount differs from the estimate or is missing;
- ETA is shown on tracking but not on the dashboard (`etaMin` is never written);
- payment is overwritten by the other participant;
- rematch/estimate events produce no notification.

### Q5. What are the most serious problems?

1. **D2 — stale approved estimate after release/reassignment.** It breaks the customer-approval trust boundary and dead-ends the new mechanic.
2. **D1 — preferred mechanic strands the request.** A primary CTA can produce a booking that never dispatches.
3. **D5 — unreconciled final billing / missing payment amount.** The customer approves one figure and can be billed another; receipts can show payment without an amount.
4. **D3/D4 — missing notifications for rematch and estimate events.** Jobs stall or offers silently expire.
5. **D6 — no stale-job recovery.** Capacity leaks and customers can be stuck in `service`.

### Q6. Repair or restructure?

**Repair.** The core architecture is sound and proven by tests. The defects are localized workflow/data-integrity issues. A restructure would be unjustified and would risk losing the working dispatch/rules guarantees. The repair should start with failing tests and the trust-boundary fixes (D2, D10), then booking success (D1, D7, D6), then billing/communication (D5, D3, D4).

### Q7. What is the exact implementation order?

1. **Freeze semantics + add failing tests** for D1, D2, D3, D5.
2. **D2:** clear/version estimates on release; gate completion on the current mechanic; rules + tests.
3. **D10:** payment write-once or event log; persist amount.
4. **D1:** soft preference + fallback + `preferenceState` + submit-time eligibility revalidation.
5. **D7:** shared eligibility contract across directory/wizard/dispatch.
6. **D6:** stale-job detector, SLA notifications, auto-release, admin reassignment UI/callable.
7. **D5:** require/reconcile final amount; re-approval on material change.
8. **D3/D4:** rematch and estimate notifications with idempotency tests.
9. **D8/D9/D11/D12:** ETA single source, estimate timing policy, structured location, scale counters.
10. **D13/D14:** update docs, close test gaps.
11. **Production verification:** deploy rules/indexes/functions; verify scheduler, callables, indexes, monitoring, and credential rotation.

---

## Appendix A — Reproduction recipes for the highest-risk defects

### A.1 D1 — preferred mechanic strands the request

1. Seed an approved, available mechanic with `specialties: ['tow']`, `serviceRadiusKm: 5`, based far from the customer.
2. As the customer, place a `battery` request and select that mechanic.
3. Observe `requests/{id}`: `status = requested`, `pickedMechanicId = <mechanic>`, `offers` empty.
4. Wait through five sweep/rematch rounds (or call `rematchRequest` repeatedly). `rematchRound` reaches 5, no offers are written, status remains `requested`.

**Expected after fix:** the pick is skipped/softened and eligible open-pool mechanics receive offers, or the customer sees an explicit "preferred mechanic unavailable" state.

### A.2 D2 — stale estimate survives release

1. Assign mechanic A; advance to `service`.
2. Submit estimate ₹5,000; approve as customer.
3. As mechanic A, release the job with a reason.
4. Assign mechanic B (accept a new offer).
5. Observe: `estimateStatus = approved`, `estimatedAmountCents = 500000`, `estimateDiagnosis` from A, `mechanicId = B`.
6. As B, try to submit a new estimate → denied; try to complete → allowed.

**Expected after fix:** release clears/versions the estimate; B must submit and obtain approval before completion.

### A.3 D3 — rematch notification missing

1. Create an offer in round 0 for mechanic M.
2. Expire it; run `rematchRequest` so M is re-offered in round 1.
3. Inspect `notifications/{M}/items`: only the round-0 item exists.

**Expected after fix:** one additional idempotent item for round 1.

### A.4 D5 — payment with no stored amount

1. Complete a job with no `amountCents` (UI amount left blank).
2. As the customer, record a cash payment of any amount.
3. Observe: `paymentStatus = paid`, no `amountCents`, no payment amount field; receipt shows final amount "Not recorded".

**Expected after fix:** completion requires an amount, or the payment amount is persisted and reconciled.

---

## Appendix B — Key file/line index

| Area | File | Lines |
| --- | --- | --- |
| Eligibility/ranking | `functions/src/dispatch.ts` | 84-125 |
| Offer batch | `functions/src/dispatch.ts` | 148-211 |
| Accept transaction | `functions/src/dispatch.ts` | 223-273 |
| Decline/rematch | `functions/src/dispatch.ts` | 278-398 |
| Sweep | `functions/src/dispatch.ts` | 449-472 |
| Triggers/callables/schedule | `functions/src/index.ts` | 21-289 |
| Offer notification guard | `functions/src/index.ts` | 207-227 |
| Estimate events (absent) | `functions/src/notifications.ts` | 19-28, 65-95 |
| Request rules | `firestore.rules` | 146-395 |
| Estimate rules | `firestore.rules` | 262-326 |
| Payment rules | `firestore.rules` | 328-347 |
| Release rules | `firestore.rules` | 364-382 |
| Request creation | `src/lib/customer.ts` | 233-295 |
| Estimate decision | `src/lib/customer.ts` | 410-442 |
| Release/advance | `src/lib/mechanic.ts` | 402-482 |
| Estimate submit | `src/lib/mechanic.ts` | 634-678 |
| Payment record | `src/lib/mechanic.ts` | 703-746 |
| Wizard submit/picker | `src/pages/customer/RequestPage.tsx` | 131-147, 200-207, 404-414 |
| Mechanic estimate/billing UI | `src/pages/mechanic/MechanicJobPage.tsx` | 229-279 |
| Customer estimate/receipt UI | `src/pages/customer/TrackingPage.tsx` | 297, 395-480, 764-771 |
| Dashboard ETA | `src/pages/customer/CustomerDashboard.tsx` | 193 |
| Tracking heuristics | `src/lib/tracking.ts` | 10-22, 104-108 |
| Indexes | `firestore.indexes.json` | 1-95 |
| E2E happy path | `e2e/booking-journey.e2e.ts` | 49-232 |
| Negative journeys | `e2e/negative-journeys.e2e.ts` | 66-320 |

---

**Audit conclusion:** The booking system is real, tested, and architecturally worth keeping. It is **not yet production-correct** for preferred-mechanic selection, release/reassignment, final billing reconciliation, rematch/estimate notifications, and abandoned-job recovery. Fix those five areas in the order above, add the listed regression tests, and verify the scheduler/indexes in a real deployment before claiming production readiness.
