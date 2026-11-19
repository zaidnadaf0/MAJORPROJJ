# RoadAssist — Final Product Improvement & Implementation Report

**Scope of this report:** the final completion pass on top of the existing
RoadAssist repository (React/Vite frontend + Firebase Cloud Functions + Firestore
rules + deterministic dispatch + optional Logistic Regression ML ranking service).

**Last verified:** 2026-11-15.

**Working tree state:** `main` branch, no commits made, no deploy performed, no
destructive Git operation performed, no credentials touched.

---

## A. Completed improvements

### A.1 Shared control primitives and accessibility (frontend)

- `src/components/ui.tsx`: added shared `controlClasses` plus a new `LinkButton`
  (router link rendered with the exact Button skin). Replaces the invalid
  `<Link><Button>` nesting that was breaking keyboard/AT semantics.
- Migrated the invalid nesting in 9 page files
  (`CustomerDashboard`, `MechanicDetailPage`, `MechanicGuidePage`,
  `ExperiencePage`, `RealModePage`, `SimulationPage`, `MechanicDashboardPage`,
  `LandingPage`, `MarketingPages`).
- Theme-aware visible focus ring and larger minimum touch targets for controls.

### A.2 Public service detail + experience routes (frontend)

- New `src/pages/public/ServiceDetailPage.tsx`: per-service included / before /
  safety / stop guidance, honest indicative pricing, how-the-request-works steps.
- `src/routes.tsx`: added public routes `/service/:id`, `/experience`,
  `/experience/simulation`, `/experience/real` (they were linked but previously
  un-routed).
- `PublicLayout`: accessible mobile menu (hamburger with `aria-expanded` /
  `aria-controls`, closes on route change) and theme toggle inside it.
- Public footer now links to real service detail pages
  (`/service/towing|battery|tire|fuel`) instead of the customer-only `/services`.
- Landing page: "Compare services" now points to `/pricing`; service rows and
  cards link to `/service/:id`; "Open the map" CTA now routes to the live
  experience.
- Marketing pricing cards link to service detail pages.

### A.3 ML model information honesty (frontend)

- New source of truth `src/lib/mlModelInfo.ts` + parity test
  `src/lib/mlModelInfo.test.ts` (reads `ml/model/metadata.json` and
  `ml/benchmarks/test_results.json` and fails on drift; explicitly refuses the
  stale M8 baseline values).
- Admin dashboard ML card now renders the trained model (`roadassist-logreg-v1`,
  Logistic Regression, 23,310 synthetic training rows, feature schema
  `m9-features-v1`, p95 0.133 ms) with held-out test metrics Hit@3 = 0.8264,
  NDCG@3 = 0.6882, and explicit synthetic-data/limitations disclosures.

### A.4 Account data export and profile reliability (frontend)

- New `src/lib/dataExport.ts` + `src/lib/dataExport.test.ts`: pure
  `buildUserDataExport`, `exportFileName`, `toIsoUtc`, `downloadJson`,
  `exportMyData`.
- `src/lib/customer.ts`: added `loadProfile` (distinguishes read failure from
  missing profile) and `listMyRequests` (one-shot owned read).
- `src/pages/customer/SettingsPage.tsx`: honest "Download my data (JSON)" export
  (profile + vehicles + own requests), with error notice; demo mode exports
  fictional records only.
- `src/pages/customer/ProfilePage.tsx`: load-error state with retry, phone
  validation (`isValidOptionalPhone`, `normalizePhone` in
  `src/lib/userProfile.ts`) + tests, Firebase Auth displayName sync after
  Firestore profile save.

### A.5 INR consistency and receipt completeness (frontend)

- `src/lib/reference.ts`: added `formatInr` usage plus new `inrAmount` helper
  (plain numeric rupee value for CSV).
- Replaced inline `₹${(cents / 100).toFixed(0)}` displays with `formatInr` across
  customer dashboard, admin analytics, admin ops, mechanic dashboard.
- Receipt detail now shows: request id, problem, vehicle, service category,
  mechanic, completion recorded (UTC), estimate decision (diagnosis, decision,
  approved amount, decided-at), final charges, payment method / status / recorded
  at (UTC) with explicit "not independently verified" disclosure.

### A.6 Notification reference integrity (backend)

- `functions/src/notifications.ts`: short reference now derived from whole-id
  FNV-1a (`#RA-XXXXXX`), matching the customer UI, instead of clipped tail
  (`#MPLETE`-style) slices; tolerates missing values.

### A.7 Customer-picked mechanic is honoured in ranking (backend)

- `functions/src/dispatch.ts` / `functions/src/dispatch.test.ts`: added unit
  coverage for `pickedMechanicId` (honoured pick, eligibility still enforced,
  decline honoured, unknown id rejected).

### A.8 Demo-data category naming (frontend)

- `src/lib/fixtures.ts`: normalised demo problem categories
  (`tire` → `flat-tyre`, `fuel` → `other`, `lockout` → `other`) and display name
  `Flat Tyre`.

### A.9 Mechanic greeting (frontend)

- `src/pages/mechanic/MechanicDashboardPage.tsx`: `Salaam, …` → `Welcome, …`.

### A.10 Add-vehicle routing (frontend)

- `src/pages/customer/CustomerDashboard.tsx`: vehicle readiness row now links to
  `/vehicles`.

---

## B. Partially completed improvements

- Mechanic portal task-oriented workflow: availability, incoming offers, active
  jobs, diagnosis/estimate, completion, earnings, history — largely in place and
  emulator-verified; full end-to-end lifecycle still needs production-run
  verification.
- Admin portal operational control: dashboards, approvals, users, notifications,
  analytics, reports and logs present; some analytics tables remain wide (overflow
  container present but not yet responsive-tested).
- Customer Service Status Center: tracking page consolidates status, location,
  estimate, payment, history panels; no duplicate tracking subsystem (verified).

---

## C. Pending improvements

- Online payment provider + server-side verification / webhook / refund / payout
  integration (explicitly out of scope; recording remains offline-only).
- Server-side idempotency for duplicate requests (currently client-held key).
- Server-authoritative job lifecycle beyond accept/decline (client `advanceJob`
  write vs callable asymmetry documented).
- Stale-job reaper for abandoned accepted jobs (`MAX_ACTIVE_JOBS` accounting).
- Real-history ML retraining and revalidation (currently synthetic).
- Photo/diagnosis upload (Storage rules exist, no app usage yet).

---

## D. Modified and newly created files (this final pass + pre-existing uncommitted theme/UX work)

New: `src/lib/mlModelInfo.ts`, `src/lib/mlModelInfo.test.ts`, `src/lib/dataExport.ts`,
`src/lib/dataExport.test.ts`, `src/pages/public/ServiceDetailPage.tsx`,
`e2e/experience.e2e.ts`, `docs/FACULTY-DEMO-RUNBOOK.md` (pre-existing from earlier pass).

Modified (this pass): `src/components/ui.tsx`, `src/routes.tsx`,
`src/layouts/PublicLayout.tsx`, `src/pages/public/LandingPage.tsx`,
`src/pages/public/MarketingPages.tsx`, `src/pages/admin/AdminDashboardPage.tsx`,
`src/pages/admin/AdminAnalyticsPage.tsx`, `src/pages/admin/OpsPages.tsx`,
`src/pages/customer/CustomerDashboard.tsx`, `src/pages/customer/ProfilePage.tsx`,
`src/pages/customer/SettingsPage.tsx`, `src/pages/customer/HistoryPages.tsx`,
`src/lib/customer.ts`, `src/lib/reference.ts`, `src/lib/userProfile.ts`,
`src/lib/userProfile.test.ts`, `src/lib/fixtures.ts`,
`src/pages/mechanic/MechanicDashboardPage.tsx`,
`functions/src/notifications.ts`, `functions/src/notifications.test.ts`,
`functions/src/dispatch.test.ts`, `docs/KNOWN-LIMITATIONS.md`.

Modified in the earlier uncommitted pass (not re-verified here): broad theme/UX
overhaul across `src/pages`, `src/components`, `src/layouts`, `src/styles`,
`src/lib`, plus dispatch `pickedMechanicId` honouring, admin claim refresh, e2e
host fix.

---

## E. Verification results

| # | Check | Exact command | Result | Evidence |
|---|---|---|---|---|
| 1 | TypeScript | `npm run typecheck` | **PASS** | `tsc -b --noEmit` clean |
| 2 | ESLint | `npx eslint .` | **PASS** (0 errors; 59 pre-existing-style warnings) | 0 errors |
| 3 | Frontend production build | `npm run build` | **PASS** | Vite build ok (chunk-size warning only) |
| 4 | Cloud Functions build | `npm run build:functions` | **PASS** | `functions` tsc clean |
| 5 | Unit tests | `npm test` | **PASS** | 31 files / **294 tests passed**, 0 failed |
| 6 | Firestore emulator suite | `npx vitest run --config vitest.emulator.config.ts` (+ `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, emulators already running) | **mostly PASS** | 125 passed / 2 failed in `emulator/customer.test.ts`; full file run 4/6 |
| 7 | `npm run test:emulator:rules` wrapper | `firebase emulators:exec --only firestore …` | **BLOCKED** | Firestore emulator port 8080 already occupied by a running instance → "Could not start Firestore Emulator, port taken" |
| 8 | ML Python tests | `ml/.venv/bin/python -m pytest tests -q` | **PASS** | 20 passed |
| 9 | Playwright E2E | `npm run test:e2e` | **PASS** | 18/18 passed (incl. new `e2e/experience.e2e.ts`) |
| 10 | Responsive spot-check | Playwright viewport 390x844 | **PASS** | mobile nav + no horizontal overflow on `/`, `/pricing`, `/experience`, `/service/towing` |

**Failed checks (honest reporting):**

- Emulator suite: 2 failures in `emulator/customer.test.ts`
  (`uses a deterministic request key to prevent duplicate and conflicting retries`,
  `denies the missing-doc pre-read but allows the create, then the retry read`).
  These paths were not modified during this pass (frontend customer repository
  changes were purely additive). Status: **pre-existing / unresolved** — must not
  be reported as passing.

**BLOCKED:**

- `npm run test:emulator:rules`: could not start Firestore emulator (port conflict with
  an already-running emulator instance). The underlying rules suite was executed
  directly instead and is reported above.

---

## F. Known limitations

1. ML trained/evaluated on **synthetic data** (seed 42, 23,310 rows). Real-world
   performance not established. Offline test metrics (Hit@3 0.8264, NDCG@3 0.6882)
   are reported with disclosure only.
2. GPS accuracy, stale-coordinate handling, straight-line distance and no live
   traffic ETA (documented in `docs/KNOWN-LIMITATIONS.md`).
3. Payment recording is offline only (cash/UPI self-reported); no online provider
   or server-side verification.
4. Final billed amount (`amountCents`) vs approved estimate not reconciled.
5. Customer-side job status advances use rules-validated transactions, not
   server-callables (documented asymmetry).
6. Admin dashboard stats are bounded (max 200 loaded records) and demo-mode
   figures are explicitly labelled.
7. No production Firebase project was tested in this session; emulator + local
   only.

---

## G. Faculty demonstration readiness

**State: Ready for a controlled local/emulator demonstration** with the documented
honest limitations.

- Emulator-verified booking journey (customer → dispatch → accept → complete) via
  Playwright E2E.
- New public experience suite (landing → experience → simulation/real, service
  detail, mobile nav, overflow) passing.
- ML transparency, profile/settings, export, receipt, INR consistency now covered
  by unit tests.
- Not ready for production claim: production Firebase, real payments, real ML
  history, and the two unresolved emulator tests remain.

---

## H. Faculty demonstration preparation (2026-11-15)

Task executed under the "presentation preparation" constraint: no application
source, rules, Functions or database behaviour was changed; no commit, push,
reset, clean, deploy or credential write occurred. Only documentation was edited
(the ML metric line in `docs/FACULTY_DEMO_RUNBOOK.md`).

### H.1 Admin demo result

**PASS (locally, emulator-backed).**

- Login: `admin@roadassist.test` / `Test!2345` against the local emulator
  (Auth + Firestore via `VITE_USE_EMULATORS=true`).
- Captured screenshots of: Operations dashboard (`05-admin-dashboard`),
  Dispatch monitoring (`06-admin-dispatch`), Analytics (`07-admin-analytics`),
  Reports (`08-admin-reports`), Approvals (`09-admin-approvals`), Users
  (`10-admin-users`), Requests (`11-admin-requests`), Audit/System activity
  (`12-admin-audit`), Notifications (`13-admin-notifications`), Logs
  (`14-admin-logs`).
- All pages rendered and were screenshotted without error. Admin navigation and
  the read-only dispatch views were exercised.

### H.2 ML live-path result

**PASS (locally, service + browser).**

- FastAPI service (`ml/.venv/bin/uvicorn api.main:app`) on `127.0.0.1:8000:
  `/health` → `{"status":"ok","model_version":"roadassist-logreg-v1"}`;
  `/model-info` → full metadata; `/predict` → valid score response;
  `/rank-mechanics` → `{"ranked":[{"mechanic_id":...,"score":...,"rank":1,"model_version":"roadassist-logreg-v1"}]}`.
- Frontend seam: Vite served with `VITE_ML_API_URL=http://127.0.0.1:8000`; browser
  `POST /rank-mechanics` → HTTP 200; UI rendered **"ML ranking active"** and
  **"Ordered by ML ranking"** (`15-mechanics-ML-ranking.png`).

### H.3 ML deterministic fallback result

**PASS (locally, service stopped).**

- With the ML service stopped, the Find Mechanics page rendered
  **"Deterministic fallback"** plus the honest warning
  *"ML service unavailable or invalid response — showing deterministic
  recommendations instead."*; screenshot `26-mechanics-fallback.png`.

### H.4 Screenshot evidence

Dedicated folder: `/tmp/opencode/roadassist-demo-shots/` (new, dedicated; no
pre-existing evidence files overwritten).

| # | Shot | File |
|---|---|---|
| 1 | Public landing (light / dark) | `01-landing-light.png`, `02-landing-dark.png` |
| 2 | Customer dashboard | `16-customer-dashboard.png`, `28-customer-dashboard-dark.png`, `29-customer-dashboard-light.png` |
| 3 | Request assistance form | `17-request-assistance-form.png`, `24-mobile-request.png` |
| 4 | Mechanic recommendations (ML / fallback) | `15-mechanics-ML-ranking.png`, `26-mechanics-fallback.png` |
| 5 | Tracking with active mechanic | `27-tracking-active-mechanic.png` |
| 6 | Estimate approval | `21-estimate-approval.png` |
| 7 | Completed service receipt | `22-completed-service-receipt.png` |
| 8 | Mechanic dashboard | `19-mechanic-dashboard.png` |
| 9 | Mechanic active job | `20-mechanic-active-job.png` |
| 10 | Admin dashboard | `05-admin-dashboard.png` |
| 11 | Admin dispatch monitoring | `06-admin-dispatch.png` |
| 12 | Admin analytics/reports | `07-admin-analytics.png`, `08-admin-reports.png` |
| 13 | Light / dark theme examples | `01/02-landing`, `28/29-customer-dashboard` |
| 14 | Mobile responsive customer experience | `23-mobile-landing.png`, `24-mobile-request.png`, `25-mobile-dashboard.png` |

### H.5 Failures / missing evidence

- None blocking in this preparation pass. All requested shots were captured.
- Note: screenshots were produced programmatically and were not visually
  reviewed by the authoring agent in this session.

### H.6 Final faculty demonstration readiness assessment

**State: Ready for a controlled local/emulator demonstration**, pending the
user's sign-off on `docs/FINAL-REPORT.md` / `docs/KNOWN-LIMITATIONS.md` and the
resolution of the two pre-existing emulator test failures.

## E–G addendum: final deliverables index

- Final report: this document (`docs/FINAL-REPORT.md`).
- Evidence and limitations: `docs/KNOWN-LIMITATIONS.md`.
- Demo instructions: `docs/FACULTY-DEMO-RUNBOOK.md`.
- ML artifacts: `ml/model/metadata.json`, `ml/benchmarks/*`, `ml/reports/*`.
