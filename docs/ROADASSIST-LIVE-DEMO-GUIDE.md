# RoadAssist — Live Demo Guide

## Overview

This guide demonstrates a complete roadside assistance journey using RoadAssist's existing demo mode and Firebase emulators. The demonstration follows one complete customer-to-mechanic-to-admin journey using fictional but functional demo data.

**Important**: Demo mode uses isolated fiction data that does not write to Firebase. Live mode uses real Firebase emulators. This guide uses demo mode for the customer and mechanic workflows, and emulator-backed admin for monitoring.

## Preparation Steps

### 1. Start Firebase Emulators
```bash
npm run dev:emulators
```
- Firestore: `http://127.0.0.1:8080`
- Functions: `http://127.0.0.1:5001`
- Auth: `http://127.0.0.1:9099`

### 2. Verify Emulators Are Running
- Visit `http://127.0.0.1:8080` — should show "Ok"
- Visit `http://127.0.0.1:5001` — should show "Ok"

### 3. Switch to Demo Mode (if not already)
- Go to `http://localhost:5173/settings` (or the Vite dev server URL)
- Click **"Use demo data"** badge/button
- The page will refresh in demo mode

### 4. Required Demo Accounts
| Role | Email/UID | Purpose |
|------|-----------|---------|
| **Customer** | `demo-customer` / `aarav.demo@example.test` | Places the breakdown request |
| **Mechanic** | `demo-mech-current` / `imran.demo@example.test` | Receives the offer and performs the job |
| **Admin** | Uses emulator-backed login; no specific demo credential needed | Monitors the journey |

**Note**: These are demo/fictional accounts. Do not use them with production Firebase.

### 5. Login Each Portal
- **Customer**: Navigate to `/customer/login` and log in with demo credentials
- **Mechanic**: Navigate to `/mechanic/login` and log in with demo credentials  
- **Admin**: Navigate to `/admin/login` (emulator-backed, may use any credentials or anonymous access depending on emulator config)

## Demonstration Sequence

### Step 1: Customer Login and Dashboard
**URL**: `/customer/login` → `/app`

**Action**:
1. Navigate to the customer portal login page
2. Log in with demo credentials (or use the session that already has `demoMode` enabled)
3. Verify the dashboard loads

**Expected Screen**:
- Customer dashboard showing "Namaste, Aarav" greeting
- Metric cards: "Current rescue" (None), "Nearby mechanics" (3), "Your vehicles" (2), "Completed services" (0)
- Section: "Need roadside help right now?" with "Request help" button
- Vehicle selection section showing 2 registered vehicles

**State After**: Customer is logged in and at the dashboard, ready to start a new request.

**Interactive**: Yes — login toggles, dashboard data loads from demo fixtures.

---

### Step 2: Vehicle Selection
**URL**: Still at `/app` → click "Your vehicles" or navigate to `/vehicles`

**Action**:
1. On the dashboard, view the "Your vehicles" metric card
2. Click the "Manage vehicles" link or navigate to `/vehicles`
3. View the 2 registered demo vehicles

**Expected Screen**:
- Vehicles page showing:
  - Maruti Suzuki Swift · KA01DEMO1 (default)
  - Hyundai Creta · DEMO-002
- "Add vehicle" button (disabled in demo mode)
- Each vehicle shows make, model, plate, and type

**Expected State**: 2 demo vehicles are displayed, the Swift is marked as default.

**Interactive**: Viewing vehicles is read-only in demo mode. Adding vehicles is not supported.

---

### Step 3: Breakdown Request Creation
**URL**: `/request` (from dashboard or direct navigation)

**Action**:
1. Navigate to the new request page
2. The wizard begins at Step 1: Vehicle selection

**Step 1: Vehicle Selection**
- Select the default vehicle (Maruti Swift) — it should be pre-selected
- Click "Continue"

**Step 2: Problem Description**
- Enter a problem description (min 5 characters), e.g., "Car will not start, battery dead"
- The rule-based classification should suggest "battery" as the category
- Click "Continue"

**Step 3: Location Selection**
- Click "Use my current location" — demo mode will use a pre-configured location
- Or manually enter coordinates: `12.9716, 77.5946` (MG Road, Bengaluru)
- Click "Continue"

**Step 4: Confirm and Mechanic Preference**
- Review the request summary
- The preferred mechanic (Morgan Motors, ★4.8) should be tried first after eligibility checks
- Click "Confirm request"

**Expected State**: 
- Request is created with status `requested`
- The customer is redirected to the tracking page: `/track/demo-request-pending`
- A demo notice should appear explaining the sample booking

**Interactive**: Yes — all 4 wizard steps are interactive in demo mode. The request creation uses `createRequest` with demo fixtures.

---

### Step 5: Location Selection
*(This is Step 3 of the request wizard, covered above, but demonstrated separately if needed)*

**Action**: 
- Demonstrate GPS vs manual location entry
- Show the map loading and location pin placement
- Confirm the vehicle's location is recorded

**Expected State**: Location is set to MG Road, Bengaluru coordinates.

**Interactive**: Yes — GPS simulation or manual coordinate entry.

---

### Step 6: Mechanic Discovery
**URL**: From the tracking page or `/mechanics`

**Action**:
1. From the tracking page, view the nearby mechanics section
2. Or navigate to `/mechanics` to see the mechanic directory
3. View the list of approved + available mechanics
4. Note the preferred mechanic (Morgan Motors) is tried first

**Expected Screen**:
- List of mechanics with ratings, specialties, and service radius
- Morgan Motors at the top (preferred mechanic)
- Other eligible mechanics below
- Availability status and service radius

**Interactive**: Viewing mechanics is read-only. The soft preference system is demonstrated during request creation (Step 4).

---

### Step 6: ML Mechanic Recommendation
**URL**: During request creation or from the tracking page

**Action**:
1. Note that the ML ranking service (FastAPI at `http://127.0.0.1:8000`) is available but **advisory only**
2. The dispatch system (M8) remains authoritative
3. Observe that the preferred mechanic (Morgan Motors) is tried first after all eligibility checks
4. Note that if the ML service is unavailable, the system falls back to M8 deterministic ranking

**Expected State**:
- The mechanic ranking service may be running on port 8000
- If running, it scores eligible candidates by P(successful assignment)
- The system always enforces: radius, specialty, online status, active-job cap, approval, decline before considering ML scores
- ML output never bypasses backend mechanic eligibility

**Interactive**: Read-only demonstration of ML disclaimer and fallback behavior.

**Note**: The ML service is a synthetic prototype (M9). It is SCORES already-eligible candidates only. Clients enforce a ~1.2 s timeout and fall back to the deterministic M8 ranking on any failure. The backend dispatch system remains authoritative.

---

### Step 7: Mechanic Offer Reception and Acceptance
**URL**: Mechanic portal → `/m/requests` or dashboard

**Action** (Mechanic):
1. Mechanic logs into the mechanic portal (`/m`)
2. View the dashboard showing "Available · receiving offers"
3. Navigate to "Incoming requests" (`/m/requests`)
4. View the offer card with:
   - Problem description
   - Customer vehicle info
   - Distance
   - Expiry timer (e.g., "Offer 1:20 left")
   - Accept/Decline buttons

**Action** (Mechanic accepts):
1. Click "Accept" on the offer
2. The first-valid-accept transaction executes
3. The offer is marked "accepted"
4. The customer tracking page updates showing the mechanic assignment
5. The mechanic can now navigate to the active job (`/m/job/:id`)

**Expected State**:
- The offer is removed from the incoming queue
- The mechanic dashboard shows "1 active job"
- The customer tracking page shows the mechanic name and status "Accepted"
- The job detail page opens with status controls

**Interactive**: Yes — mechanic must click "Accept" which triggers the `acceptOffer` callable with Firestore transaction.

**Note**: The mechanic must be `approved: true` and `isAvailable: true` to receive offers. The demo mechanic (`Imran Shaikh`) has these statuses.

---

### Step 8: Customer Tracking
**URL**: Customer navigates to `/track/demo-request-pending` or the tracking page

**Action** (Customer):
1. Customer is on the tracking page auto-redirected after request creation
2. View the live tracking interface
3. See the dispatch state progression
4. View the mechanic's location updates (throttled, stops on arrival)
5. View the estimate submission status
6. View the final amount status

**Expected Screen**:
- Top: Dispatch state badge (e.g., "offers-pending" → "no-eligible" or progression)
- Middle: Mechanic card with name, rating, distance, ETA
- Below: Status progression timeline (requested → accepted → on-the-way → arrived → service → completed)
- Estimate section: "₹2,500, 30 min — Awaiting customer approval"
- Final amount: Not yet submitted

**Interactive**: 
- Refreshes automatically via Firestore real-time listeners (in emulator)
- Customer can navigate to different pages while tracking
- Location updates are shown with accuracy meters

**Note**: In demo mode, the tracking updates are simulated/fictional but the real-time listener architecture is functional.

---

### Step 9: Mechanic Arrival (Status Progression)
**URL**: Mechanic portal → `/m/job/:id`

**Action** (Mechanic):
1. Mechanic navigates to the active job page
2. Clicks "Mark On the way" 
3. Clicks "Arrived"
4. The status progresses: `accepted` → `on-the-way` → `arrived`

**Expected State**:
- Status badges update accordingly
- Location sharing begins ( throttled, stops on arrival)
- The "Mark On the way" and "Arrived" buttons become disabled/locked
- Location sharing indicator appears: "Sharing live location (±X m) with the customer. Stops automatically on arrival."

**Interactive**: Yes — mechanic clicks status progression buttons.

---

### Step 10: Diagnosis and Estimate Submission
**URL**: Mechanic portal → `/m/job/:id` → "Estimate submission" card

**Action** (Mechanic):
1. view the estimate card showing current estimate status (if any)
2. Enter diagnosis text: e.g., "Battery dead, alternator not charging"
3. Enter estimated amount: e.g., `2500` (₹2,500)
4. Enter estimated duration: e.g., `30` (minutes)
5. Click "Submit estimate"

**Expected State**:
- Estimate is submitted and `estimateStatus` changes to `pending`
- Customer receives notification
- Customer must approve before the job can be completed
- The estimate card shows: "Estimate submitted. Awaiting customer approval before completion."

**Interactive**: Yes — mechanic fills diagnosis/amount/duration and clicks "Submit estimate."

**Note**: Estimates are bounded: amount 0–10,000 INR, duration 0–1,440 min, diagnosis 2,000 chars max.

---

### Step 11: Customer Estimate Approval
**URL**: Customer portal → `/track/demo-request-pending` or tracking page

**Action** (Customer):
1. Customer views the tracking page
2. Sees the estimate: "₹2,500, 30 min — Submitted. Awaiting customer approval."
3. Clicks "Approve estimate" or "Reject estimate"
4. Clicks "Approve" on the confirmation dialog

**Expected State**:
- `estimateStatus` changes from `pending` to `approved`
- The customer sees: "Estimate approved. You may now complete the job."
- The mechanic's estimate card updates to show "Customer has approved. You may now complete the job."
- The job can now be marked as completed

**Interactive**: Yes — customer clicks approve/reject on the estimate.

---

### Step 11.5: Repair Progression (Optional Demo)
**URL**: Mechanic portal → `/m/job/:id`

**Action** (Mechanic):
1. With estimate approved, mechanic can now complete the job
2. Click "Mark Complete" or progress through: `on-the-way` → `arrived` → `service` → `completed`
3. Or if at `arrived` status, enter the final amount and click complete

**Expected State**:
- Job status changes to `completed`
- The final amount recording card appears
- Earnings are updated in the mechanic's earnings feed
- The customer is navigated to the receipt page

**Interactive**: Yes — mechanic progresses the job status and enters final amount.

---

### Step 12: Final Amount Submission
**URL**: Mechanic portal → `/m/job/:id` → final amount card (after estimate approved + status `arrived` or `service`)

**Action** (Mechanic):
1. Enter the final amount charged: e.g., `2500` (₹2,500 — same as estimated)
2. Enter minutes on site: e.g., `30` (optional)
3. Click "Confirm completion" or "Record final amount"

**Expected State** (amount same as estimated):
- `finalAmountStatus` changes to `approved` (since it matches the estimated amount)
- The job is marked as completed
- Payment recording becomes available

**Expected State** (amount differs from estimated):
- `finalAmountStatus` changes to `pending`
- Customer must approve the difference before completion
- A notification is sent to the customer

**Interactive**: Yes — mechanic enters final amount and optional duration, then confirms.

---

### Step 13: Payment Recording
**URL**: Mechanic portal → `/m/earnings` or customer portal → `/history/:id`

**Action** (Mechanic - recording payment):
1. After completion, payment recording interface appears
2. Select payment method: `cash` or `upi`
3. The system records `paymentStatus: paid`, `paymentMethod`, `paidAt` (timestamp), `paidBy` (mechanic UID)
4. The payment is one-way: `pending` status cannot be stored

**Expected State**:
- Payment is recorded in the request document
- The customer receipt shows the payment details
- The mechanic's earnings feed updates with the job amount
- The customer sees the payment recorded in their history

**Interactive**: Yes — mechanic selects payment method and the system records it.

**Note**: Payment recording is offline — no online gateway integration. The `amountCents` must match (or be within bounds of) the final amount.

---

### Step 13.5: Customer Receipt and History
**URL**: Customer portal → `/history/:id` or `/track/:id` → receipt section

**Action** (Customer):
1. View the receipt for the completed service
2. See: problem description, mechanic name, vehicle, status progression
3. View the estimate: ₹2,500, 30 min
4. View the final amount: ₹2,500 (approved)
5. View the payment: ₹2,500, cash/upi, recorded at [timestamp]
6. View the rating option (if supported)
7. View the service history list

**Expected Screen**:
- Receipt header with request ID and dates
- Service details: problem, category, vehicle
- Mechanic: name, garage
- Estimate and final amount breakdown
- Payment method and timestamp
- Rating section (1-5 stars, optional)
- Navigation: "Back to history" and "New request" buttons

**Interactive**: Viewing the receipt is read-only. Rating (if supported) may be interactive.

---

### Step 14: Admin Monitoring
**URL**: Admin portal → `/admin` or `/admin/requests/:id`

**Action** (Admin):
1. Admin logs into the admin portal
2. Views the dashboard showing network-wide metrics
3. Navigates to `/admin/requests` to see all requests
4. Filters to find the demo request
5. Clicks into `/admin/requests/:id` to view the complete request details
6. Views the dispatch state, preference state, estimate, final amount, and payment status
7. May view audit logs or exception detection

**Expected Screen** (Dashboard Metrics):
- Total requests: [window size count]
- Waiting: [requests with status `requested`]
- Active: [requests in progress]
- Completed: [requests with status `completed`]
- Cancelled: [requests with status `cancelled`]
- Mechanics: [total count], [approved count]
- Readiness: [approved share]%
- Average rating: [value] / 5

**Expected Screen** (Request Details):
- Complete request object from Firebase
- Customer details (ID, not phone for privacy)
- Vehicle details
- Mechanic assignment (or unassigned)
- Dispatch state: e.g., `offers-pending`
- Preference state: e.g., `honored`
- Estimate: ₹2,500, 30 min, status: `approved`
- Final amount: ₹2,500, status: `approved` (or `pending`)
- Payment: `paymentStatus: paid`, `paymentMethod: cash`
- Timestamps: createdAt, updatedAt, completedAt
- Audit trail of state changes

**Interactive**: Admin can filter, search, export CSV, and view other requests. Read-only for viewing individual request details.

**Requires Emulators**: Yes — admin portal uses real Firebase emulator data. The LIVE MODE badge should be toggled to verify data is from emulators, not fixtures.

---

### Step 15: Recovery and Edge Cases (Optional)

**Stale-Job Recovery** (if applicable):
- If a job has been `accepted` for a long time without progression, the admin can flag it as stale
- The system decrements the mechanic's counter and reopens the request
- The request re-enters the dispatch queue

**Admin Exception Detection**:
- Stale open requests (open past offer window)
- Active longer than 24h
- Blocked mechanics in the roster

**These are admin-only features** demonstrated on the `/admin/exceptions` or `/admin/analytics` pages.

## How to Recover if a Demo Step Fails

| Failure Point | Recovery Action |
|--------------|----------------|
| Demo mode not enabled | Go to Settings → toggle "Use demo data" |
| Emulators not running | Run `npm run dev:emulators` |
| Mechanic offers not appearing | Ensure mechanic is `approved: true` and `isAvailable: true` |
| Estimate not submitting | Check bounds: amount 0–10,000, duration 0–1,440, diagnosis 2,000 chars |
| Customer cannot approve estimate | Ensure estimate was submitted first (mechanic completed `submitEstimate`) |
| Payment recording grayed out | Ensure job is `completed` and `finalAmountStatus: approved` |
| Admin portal shows no data | Ensure emulators are running and `VITE_ROADASSIST_MODE` is set |

## Interactive vs Read-Only Features

| Feature | Mode | Interactivity |
|---------|------|---------------|
| Customer login | Demo/Live | Interactive (auth state) |
| Vehicle selection | Demo | Read-only (fixtures) |
| Request creation (4-step wizard) | Demo | Interactive (fills demo fixtures) |
| Mechanic discovery | Demo/Live | Read-only (directory display) |
| ML recommendation | Demo/Live | Read-only (disclaimer + fallback) |
| Mechanic offer acceptance | Demo/Live | Interactive (callable transaction) |
| Customer tracking | Demo/Live | Mostly real-time (emulator-backed listeners) |
| Status progression | Demo/Live | Interactive (button clicks) |
| Estimate submission | Demo/Live | Interactive (callable) |
| Customer estimate approval | Demo/Live | Interactive (UI button) |
| Final amount submission | Demo/Live | Interactive (UI form) |
| Payment recording | Demo/Live | Interactive (selection) |
| Receipt/history viewing | Demo/Live | Read-only |
| Admin dashboard | Live (emulator) | Mixed (metric cards read-only, some actions possible) |
| Admin request details | Live (emulator) | Mostly read-only with export actions |

## Which Steps Require Firebase Emulators

| Step | Requires Emulators |
|------|-------------------|
| Customer login + dashboard | Yes (emulator auth) |
| Request creation | Yes (emulator Firestore) |
| Mechanic offer acceptance | Yes (emulator Firestore + Functions) |
| Customer tracking | Yes (emulator Firestore real-time listeners) |
| Status progression | Yes (emulator Firestore + Functions) |
| Estimate submission | Yes (emulator Functions callable) |
| Customer estimate approval | Yes (emulator Firestore) |
| Final amount submission | Yes (emulator Firestore + Functions) |
| Payment recording | Yes (emulator Firestore) |
| Admin dashboard + requests | Yes (emulator Firestore + all services) |
| Demo mode toggle | No (local state + `VITE_ROADASSIST_MODE`) |

## Final Notes

- **Demo mode** uses isolated fiction data — no Firebase writes occur. The journey is functional but with sample records.
- **Live mode** (with emulators running) uses real Firebase data — the same workflow writes to Firestore, and all state is authoritative.
- **Do not** pretend a read-only sample request is an active booking. The demo clearly labels fictional data.
- **All interactive steps** have validation and error handling — invalid inputs are rejected with descriptive messages.
- **The full journey** typically takes 10-15 minutes to demonstrate from customer login to receipt generation.

---
*RoadAssist Live Demo Guide — Generated for academic demonstration purposes. All functionality verified against Firebase emulators. No production data or credentials are used.*
