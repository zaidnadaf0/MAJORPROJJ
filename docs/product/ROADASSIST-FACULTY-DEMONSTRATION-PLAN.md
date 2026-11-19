# ROADASSIST — FACULTY DEMONSTRATION PLAN

## Status: Repository-Verified Demonstration Blueprint for Faculty Evaluation

**Primary objective**: Impress faculty through a reliable, complete, and professional demonstration of the RoadAssist product.

**Secondary objective**: Demonstrate that the project has enterprise-grade architecture, security, and workflow integrity — not merely a collection of working pages.

---

## 1. Preparation

### 1.1 Demo Accounts

| Account Type | Email | UID | Custom Claims | Purpose |
|---|---|---|---|---|
| **Customer** | `cust@roadassist.test` | `demo-cust` | `customer` | Full customer journey: request → tracking → completion |
| **Mechanic** | `mech@roadassist.test` | `demo-mech` | `mechanic` | Full mechanic job flow: offers → acceptance → completion |
| **Admin** | `admin@roadassist.test` | `demo-admin` | `admin: true` | Full admin oversight: recovery, analytics, mechanic management |

**All accounts are pre-created in the demo fixture data** (`src/lib/fixtures.ts`). No signup required for faculty demonstration — accounts are ready to use.

### 1.2 Sample Data

**Pre-seeded demo data includes**:

| Data Type | Contents |
|---|---|
| **Customer vehicles** | 3 vehicles: Toyota Camry 2019 (car), Honda Rebel 2020 (bike), Ford F-150 2018 (truck) |
| **Mechanic profiles** | 2 approved mechanics with specialties (tow, battery, engine), service radii 20-50km, ratings 4.5-5.0 |
| **Sample requests** | 2-3 requests with different problem types (battery flat, engine overheating, tyre puncture) at various stages |
| **Mechanic offers** | Pending offers on sample requests with expiry countdowns |
| **Estimates** | Submitted estimates with approval status |
| **Payments** | Recorded cash/UPI payments with receipt data |

**All sample data matches the exact Firestore schema** — no field mismatches. Derived from actual data snapshots; kept in sync via `seed:local` script.

### 1.3 Demo Reset Procedure

**Before each faculty demonstration, run the reset procedure to ensure clean state**:

1. **Reset emulator state** (if using emulator mode):
   ```
   npm run dev:emulators    # Start emulators if not running
   npm run seed:local       # Reset and seed with fresh fixture data
   ```

2. **If using demo mode**:
   - Verify `VITE_ROADASSIST_MODE=demo` is active in the environment
   - Refresh the application — fixture data loads automatically
   - Confirm demo banner visible: "Demo mode — sample data only, no backend connection"

3. **Verify environment**:
   - Check that the correct build mode is active: `vite build --mode demo` (or emulator/live as appropriate)
   - Confirm no Firebase credentials are being used (demo mode routes to fixtures)
   - Verify demo banner is visible at the top of portal pages

4. **Test critical journey** (quick smoke test):
   - Customer logs in → creates request → mechanic accepts → tracking works → completion
   - If any step fails, re-run `seed:local` and retry

### 1.4 Startup Procedure for Faculty Demo

**Step-by-step startup that faculty should observe**:

1. **Build selection**: "We'll use the demo build mode — `vite build --mode demo`"
2. **Startup**: "Application starts with environment validation — `npm run start` or `npm run dev`"
3. **Mode confirmation**: "Notice the demo banner — this is demo mode, using prepared sample data"
4. **Account login**: "We'll use the pre-created demo accounts — no signup needed"
5. **Journey start**: "Customer logs in and proceeds through the complete workflow"

**Required services at startup**:
- `VITE_ROADASSIST_MODE=demo` in environment (or emulator/live as chosen)
- `VITE_FIREBASE_*` vars present (read but not used in demo mode)
- Emulators running if mode = emulator (Auth 9099, Firestore 8080, Functions 5001)
- Node.js ≥ 20 (required by package.json)

**Fallback plan if services unavailable**:
- If emulators not running in emulator mode → fallback to demo mode (`vite build --mode demo`)
- If Firebase credentials missing → `firebaseConfigured = false`; screens explain backend not connected (this is expected in demo mode)
- If seed data fails → manual data setup from `src/lib/fixtures.ts` structure

### 1.5 Required Browser and Screen-Pize Preparation

- **Browser**: Chromium (latest), Firefox, or Safari — all supported by Playwright
- **Screen size**: 1440px × 900px minimum for full portal view; 375px × 667px for mobile responsiveness check
- **Window size**: Maximize browser window for demonstration; ensure no URL bar overlap
- **Disable**: Browser extensions that might intercept Firebase connections (ad blockers, etc.)
- **Enable**: JavaScript, cookies, localStorage (required for theme preference persistence)

---

## 2. Demonstration Sequence

### 2.1 Complete Faculty Journey (15 minutes planned)

The demonstration covers the full customer → mechanic → admin lifecycle. Each step shows what should happen on screen.

#### Step 1: Public Website and Product Identity (2 min)
**What to show**:
- Landing page at `/` — "RoadAssist — Roadside Assistance Made Simple"
- Branding: Hybrid premium modern SaaS + automotive technology identity
- Navigation: `/features`, `/pricing`, `/about`, `/contact`, `/onboarding`
- Demonstrate that no authentication is required — full public access

**Expected on screen**:
```
RoadAssist
│
├─ Features       About       Pricing       Contact       Onboarding
```

**Key message**: "This is a professional roadside assistance platform, not just a college project."

#### Step 2: Customer Dashboard (2 min)
**What to show**:
- Customer logs in with `cust@roadassist.test` / password
- Dashboard at `/app` — hero section: "Get back on the road"
- Active request section (or empty state if no request)
- Quick actions: "Request help", "Manage vehicles", "Profile"
- Stats row: total requests, completion rate

**Expected on screen**:
```
RoadAssist — Customer Dashboard
│
├─ [Hero] Get back on the road
│
├─ Quick actions: Request help | My vehicles | Profile
│
├─ Active request: (none) — "Start by requesting help"
│
├─ Recent history: Last 3 completed jobs
│
├─ Vehicle cards: Toyota Camry 2019 (default) | Honda Rebel 2020 | Ford F-150 2018
│
└─ Stats: 12 requests | 92% completion | 8min avg ETA
```

**Key message**: "Dashboard is responsive, has clear empty/error states, and uses consistent design tokens."

#### Step 3: AI/ML Mechanic Guide (2 min)
**What to show**:
- Navigate to `/guide` — Mechanic Guide page
- Select a scenario: "My car won't start" (battery scenario)
- Demonstrate classification: "This looks like a battery issue — possible flat battery"
- Show safety triage: "If you smell fuel or smoke, stop immediately and request assistance"
- Demo bot interaction: Walk through the battery scenario flow
- "Start request" CTA → navigate to ServicesPage

**Expected on screen**:
```
Mechanic Guide
│
┌─ Vehicle: (selected)    Problem: My car won't start
│
├─ Classified as: Battery issue
│   Safety: Normal — no immediate danger
│   Explanation: Keywords: won't start, clicking sound → battery category
│
├─ Quick question: "When you turn the key or press start, do you hear clicking or see dim dashboard lights?"
│   [Yes] [No] [Unsure]
│
└─ CTA: Start request → navigates to ServicesPage
```

**Key message**: "The Mechanic Guide provides rule-based classification with safety triage — never dangerous advice, always escalation path. The demo bot is rule-based, not LLM."

#### Step 4: Chatbot Interaction (2 min)
**What to show**:
- Open chatbot from the dashboard or page header
- Welcome message: "RoadAssist Mechanic Guide — I can help you with breakdown problems, safety guidance, and connect you to a mechanic."
- Quick-start suggestions: "My car won't start", "I have a flat tyre", "Engine warning light", "I need to talk to a mechanic"
- Select "My car won't start"
- Walk through the conversation flow (similar to guide but in chat interface)
- Demonstrate transition to breakdown reporting

**Expected on screen**:
```
┌─────────────────────────────┐
│   RoadAssist Mechanic Guide   │
│   (automated guidance)          │
├───────────────────────────────┤
│ Welcome! I can help you with...│
│                                 │
│ Quick suggestions:              │
│ • My car won't start            │
│ • I have a flat tyre            │
│ • Engine warning light          │
│ • I need to talk to a mechanic  │
└───────────────────────────────┤
│ User input: My car won't start │
│                                 │
│ Classifying...                  │
│                                 │
│ This looks like a battery issue.│
│ If the situation feels unsafe,  │
│ stop and request professional   │
│ assistance.                     │
│                                 │
│ When you turn the key or press  │
│ start, do you hear clicking or  │
│ see dim dashboard lights?       │
│ [Yes]     [No]     [Unsure]     │
└───────────────────────────────┘
```

**Key message**: "Chatbot provides professional guidance — rule-based, not LLM. Clear distinction between automated guidance and human assistance."

#### Step 5: Breakdown Reporting (2 min)
**What to show**:
- Navigate to `/services` — Request Help page
- Problem category: Pre-filled from classifier (battery)
- Safety triage banner displayed before user confirms
- Location auto-detected (in demo mode: simulated coordinates)
- Vehicle selection: Choose from user's 3 vehicles
- Form validation: Required fields checked
- "Request help" CTA

**Expected on screen**:
```
Request Help — RoadAssist
│
├─ Problem category: Battery   (pre-filled, can override)
│   ⚠️ Safety: Normal — no immediate danger
│
├─ Vehicle: Ford F-150 2018 (default)
│
├─ Location: Auto-detected      (SIMULATED GPS in demo mode)
│   Lat: 12.9716° Lng: 77.5946°
│   (Straight-line representation — road routing not available.)
│
├─ Problem description: My car
│   won't start
│
└─ [Request help] (CTA — enabled)
```

**Key message**: "Safety triage is integrated before booking — EMERGENCY/CAUTION patterns win over model. Map disclaimer visible."

#### Step 6: Mechanic Portal (2 min)
**What to show**:
- Mechanic logs in with `mech@roadassist.test` / password
- Dashboard at `/m` — availability toggle, incoming offers
- Select "Incoming requests" → `/m/requests`
- One pending offer on a sample request
- Accept the offer — demonstrate status progression
- Navigate to active job `/m/job`
- Show status progression: accepted → on-the-way → arrived → service → completed
- Earnings summary

**Expected on screen**:
```
Mechanic Dashboard (/m)
│
├─ Availability: Available  (badge)  Capacity: 0/3
│
├─ Incoming offers: 1 pending
│   • Battery request from customer
│   • Expires in 18:22 (countdown)
│   │ [Accept]   [Decline]
│
└─ Quick: Available toggle
```

After offer acceptance:
```
Active Job (/m/job)
│
├─ Status: accepted
│
├─ Customer: (name, limited contact)
│
├─ Location: (coarse) — map view
│
├─ Estimate: (pending — mechanic to submit)
│
├─ Progress: accepted → on-the-way → arrived → service → completed
│
└─ Earnings: YTD $420 | 3 completed jobs
```

**Key message**: "Mechanic portal is operational workspace — capacity visible, status progression clear, estimate gated, completion requires both approvals."

#### Step 7: Offer Acceptance and Tracking (2 min)
**What to show** (continuing from mechanic dashboard):
- Mechanic taps "Accept" on offer
- Request status → `accepted`
- Customer receives acceptance (in demo: fixture data simulates this)
- Mechanic navigates to `/m/job` — active job page
- Status advances: `on-the-way` → `arrived`
- Customer sees tracking update (in demo: simulated location movement)
- ETA displayed with disclaimer

**Key message**: "Full booking lifecycle works end-to-end — offer acceptance, status progression, customer tracking, ETA with honest disclaimer."

#### Step 8: Diagnosis and Estimate (2 min)
**What to show** (continuing from active job):
- Mechanic submits diagnosis: "Engine overheating — temperature warning red"
- Mechanic submits estimate: ₹2,500 for 60 minutes
- Customer receives estimate notification
- Customer approves estimate → `estimateStatus: approved`
- Status advances to `service` (gated by estimate approval)
- Repair progress display

**Expected on screen**:
```
Active Job — Service in progress
│
├─ Status: service  (estimate approved)
│
├─ Diagnosis: Engine overheating — temperature warning red
│
├─ Estimate: ₹2,500 / 60 minutes — Approved
│
├─ Progress bar: [accepted] → [on-the-way] → [arrived] → [service] → [completed]
│
└─ Mechanic: Updating location (throttled: 25m min / 5s min)
```

**Key message**: "Estimate approval gates the status advance — mechanic cannot bypass to completed without approved estimate."

#### Step 9: Customer Approval and Completion (2 min)
**What to show** (continuing from service stage):
- Customer receives estimate approval notification
- Customer taps "Approve" → `estimateStatus: approved`
- Mechanic's status auto-advances to `service` (or manually advance)
- Mechanic submits final amount: ₹3,000
- Customer receives final amount approval request
- Customer approves final amount → `finalAmountStatus: approved`
- Status advances to `completed`
- Payment recording: cash or UPI
- Receipt generation

**Key message**: "Final amount approval is a prerequisite gate — mechanic cannot bypass to completed without customer-approved final amount. Payment is write-once."

#### Step 10: Admin Monitoring (1 min)
**What to show**:
- Admin logs in with `admin@roadassist.test` / password
- Dashboard at `/admin` — network health overview
- Pending work: requests awaiting final amount
- Analytics page with chart visualizations
- Audit log showing recent transitions
- Mechanic management page

**Key message**: "Admin provides meaningful oversight — not unrestricted power. Three authorized recovery operations only."

#### Step 11: Summary and Q&A (1 min)
**What to show**:
- Recap of demonstrated journeys (all 11 steps)
- Highlight professional features: architecture, security, UI/UX, workflow integrity
- Mention remaining decisions requiring owner approval (ML model integration, map provider, resource allocation, etc.)
- Faculty evaluation criteria overview

---

## 3. Faculty Evaluation Criteria

### 3.1 Measurable Acceptance Criteria

| Criteria | Measurement | Weight |
|---|---|---|
| **Visual quality** | Professional identity; consistent design language; premium-looking dashboards; typography and spacing; responsive layouts; across all portals and public pages | 15% |
| **Functional completeness** | All 17 booking lifecycle steps traceable; all portal pages working; AI/ML guide and chatbot functional; maps and tracking operational | 20% |
| **Navigation** | Intuitive navigation; clear breadcrumb trails; consistent NAV across portals; responsive tab behavior; accessible tab ordering | 10% |
| **Responsiveness** | Mobile (≥320px), tablet (≥640px), desktop (≥1024px) — all layouts adapt; no horizontal overflow; touch-friendly targets | 10% |
| **Security** | Authorization chain validated; frontend guards hardened to UX-only; no role-hint authentication; Firestore rules enforce correct boundaries; custom claims are authorization boundary | 15% |
| **Data consistency** | Same data across demo/emulator/live modes; no data corruption during journeys; proper reset between demonstrations; environment isolation | 10% |
| **AI/ML explanation** | Rule-based classifier displayed with explicit limitations; no fabricated accuracy; model info shows synthetic training disclosure; never claims LLM functionality | 8% |
| **Booking lifecycle** | All 17 steps traceable; estimate prerequisite gate functional; final amount prerequisite gate functional; payment write-once enforcement; capacity counters conserved | 15% |
| **Error handling** | Clear error messages (not silent failures); empty states differentiated from loading; error states with guidance; a11y announcements for errors | 5% |
| **Demonstration reliability** | Can repeat demonstration without corrupting data or bypassing business rules; demo reset procedure works; environment mode selection works correctly | 12% |

**Total: 100%**

### 3.2 Pass/Fail Threshold

- **All 10 criteria must meet minimum threshold** (not average — each criterion is independently evaluated)
- **Critical failures** (security, data consistency, booking lifecycle, demonstration reliability) result in automatic failure regardless of other scores
- **Recommended pass**: ≥ 7 criteria meet "met expectations"; all critical criteria pass

### 3.3 Demonstration Reliability Requirements

| Requirement | Description |
|---|---|
| **Repeatability** | Demonstration can be repeated 3 times without data corruption or needing full reset beyond the planned reset procedure |
| **Environment integrity** | Demo mode cannot accidentally access production Firebase; emulator mode isolated to local; live mode connects to prod — verified by observation |
| **No bypasses** | No business rule bypasses visible during demonstration (estimate gate, final amount gate, capacity conservation, payment write-once) |
| **Reset consistency** | Demo reset procedure (`seed:local` or mode switch) restores to known baseline each time |
| **Error transparency** | Any errors that occur are shown transparently, not hidden or silently ignored |

### 3.4 Evaluation Environment Checklist

**Before faculty demonstration begins, verify**:

- [ ] Build mode set correctly (`vite build --mode demo` )
- [ ] Demo banner visible: "Demo mode — sample data only, no backend connection"
- [ ] Pre-created accounts work: `cust@roadassist.test`, `mech@roadassist.test`, `admin@roadassist.test`
- [ ] Environment validation passed at startup (no errors)
- [ ] Firestore emulator running (if emulator mode) or fixtures loaded (if demo mode)
- [ ] All three portal layouts load correctly (customer, mechanic, admin)
- [ ] Navigation works across all portals
- [ ] Demo reset procedure completed
- [ ] ETA disclaimer visible on tracking page
- [ ] Map disclaimer visible on map page
- [ ] Safety triage banner on services form
- [ ] Classification result display with limitations disclosure
- [ ] Chatbot operates with rule-based responses only
- [ ] No LLM claims or functionality visible
- [ ] Admin recovery operations are the exactly-three authorized types
- [ ] Capacity counter visible and conserved (max 3 jobs)
- [ ] Payment write-once enforcement visible (cannot re-record)
- [ ] Estimate prerequisite gate functional (cannot complete without approved estimate)
- [ ] Final amount prerequisite gate functional (cannot complete without approved final amount)
- [ ] All 11 demonstration steps executable in sequence

---

## 4. Failure Handling

### 4.1 During Demonstration — If Something Goes Wrong

| Issue | Immediate Action | Recovery |
|---|---|---|
| **Page won't load** | Refresh browser; verify build mode; check console for errors | Re-run demo reset; retry from beginning of step |
| **Data looks wrong** | Note the issue; continue demonstration from current state (if valid) | After demo, run `seed:local`; document issue for fix |
| **Button doesn't respond** | Verify correct account/role; check demo mode is active | If persistent, switch to next demonstratable step |
| **Estimate gate fails** | Explain the prerequisite — "Estimate must be approved before completion is possible" | Manually advance via admin `force_complete` (with validation visible) |
| **Capacity full** | Explain the constraint — "Mechanic at max capacity (3/3 live jobs)" | Use admin `release_stale` to free a slot, then retry |
| **Location shows stale** | Explain the 5-minute staleness threshold | Refresh location (simulated re-position in demo mode) |
| **Demo mode banner missing** | Verify `VITE_ROADASSIST_MODE=demo`; re-build with `--mode demo` | Rebuild and restart |

### 4.2 After Demonstration — If Issues Found

1. **Document the issue** in the development tracker
2. **Run the demo reset procedure** (`npm run seed:local` in emulator mode; mode switch in demo mode)
3. **Fix the issue** in the next development sprint
4. **Re-demonstrate** after fix — verify the same issue does not recur
5. **If critical issue cannot be fixed before faculty evaluation**: be transparent about known limitations; emphasize architecture integrity and planned improvements

---

## 5. Key Talking Points for Faculty

### 5.1 Architecture Quality
- "Seven-layer architecture with explicit dependency direction: Presentation ← Application ← Domain ← Infrastructure Adapters ← Infrastructure SDK"
- "Domain layer is completely independent — zero Firebase imports, zero React imports, pure TypeScript functions testable without emulators"
- "Three-environment model: DEMO | EMULATOR | LIVE — build-mode selected at Vite build time; feature flags runtime toggles independent of mode"

### 5.2 Security Model
- "Authorization chain reconciled: Firebase Custom Claims → Firestore Rules → Profile Hints (hint only, never trusted) → Frontend Guards (UX only)"
- "Frontend guards hardened: check only `emailVerified` and `customClaims` for navigation; never for authorization decisions"
- "Admin has exactly three authorized recovery operations with validation, reason codes, and immutable audit records — no blanket overrides"

### 5.3 AI/ML Honesty
- "No production ML model integrated — rule-based classifier preserved as trust boundary"
- "ML model info displays synthetic training disclosure: 'Trained on synthetic data; real-world quality not established'"
- "Chatbot is rule-based with 7 predefined scenario flows — no LLM functionality"
- "Model output never overrides deterministic triage — parseUntrustedGuideResponse parser ensures model cannot override business rules"

### 5.4 Workflow Integrity
- "Complete booking state machine with 12 valid states, all transitions defined with actor, validation, and backend operation"
- "Critical invariants: final amount prerequisite (mechanic cannot bypass), estimate before completion, mechanic capacity conservation, payment write-once, estimate provenance through reassignment"
- "Stale-job recovery with admin-authorized operations only"

### 5.5 Presentation Quality
- "Professional design system with CSS custom properties; accessible components (focus visible, color contrast ≥ 4.5:1); responsive layouts across all portals; consistent navigation; excellent typography and spacing; smooth purposeful interactions; consistent error/empty/loading states"
- "Each portal has its own information architecture while sharing the same visual language"
- "Both demo and live environments functional — faculty can see the product in both demonstration and production-ready configurations"

---