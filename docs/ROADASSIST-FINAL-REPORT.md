RoadAssist Visual Reconstruction — Premium Light Theme
=======================================================

COMPLETE
--------
All portal pages (public, customer, mechanic, admin) have been redesigned into a
consistent light theme using the RoadAssist design-token system (cream, graphite,
grease, safety-indigo, steel, line). 44 pre-existing TypeScript errors were fixed.
Build and typecheck are green. 284/285 vitest tests pass (1 pre-existing e2e
emulator guard failure unrelated to UI changes).

PRESERVED
---------
- React/TS/Vite architecture
- Firebase Auth with v12 standalone increment()
- Firestore role-based access guards (RequireAdmin, RequireMechanic)
- GPS/nearby mechanics/map markers (MapView light tones)
- Real-time request tracking
- ML/guide rules-based assistant
- Payments (online + offline) with payment-status labels
- All E2E test IDs: login-email, login-password, login-submit, vehicle-option-*,
  wizard-*, request-*, offer-card, offer-problem, offer-accept-*, offer-decline-*,
  estimate-*, job-advance, job-amount, job-duration, track-eta, track-distance,
  demo-banner, payment-method, payment-amount, payment-record, receipt-*
- Role-based access guards inside each page (not route level)
- Demo mode per-page branching (not global switch)
- Firestore rules field allowlists — no new fields added to request payloads
- server-side only: offers creates, notifications/items creates, auditEvents immutable

DESIGN SYSTEM — Light Theme Tokens
-----------------------------------
- page    #F6F6F4  (warm white ground)
- card    #FFFFFF  (surfaces)
- elevated #F4F5F7 (wells, hovers, inset panels)
- accent  #4F46E5  / #4338CA  (indigo-600 / indigo-700)
- text    #0E1525  (near-black navy)
- muted   #5B6679  (secondary copy)
- border  #E6E8EC  (hairline)
- success #15803D
- warning #B45309
- danger  #B91C1C  / #DC2626

Status: Fixed all 44 baseline TS errors (increment API, missing imports, listMyRequests,
reassignMechanic, admin.ts rData, customer.ts doc(...) dataExport mapping).
MapView marker/route colours recalibrated to light theme (customer/line #4F46E5,
mechanic #0F766E, neutral #94A3B8).

PAGES REDESIGNED
----------------
Public:
- LandingPage.tsx — hero + live-tracking preview, capability strip, geolocation
  coverage check, service catalogue, 3-step lifecycle, capabilities, closing CTA
- MarketingPages.tsx — editorial header, Features/Pricing table, About/Contact,
  Onboarding, honesty band

Customer:
- CustomerDashboard.tsx, ServicesPage.tsx, EmergencyPage.tsx, SettingsPage.tsx,
  ProfilePage.tsx, MechanicDetailPage.tsx, VehiclesPage.tsx, MechanicDirectoryPage.tsx
  (client-side search added), CoverageMapPage.tsx, NotificationsPage.tsx (filter tabs),
  HistoryPages.tsx (status filters, CSV export), RequestPage.tsx (vertical step rail +
  summary), TrackingPage.tsx (full rewrite, all IDs kept), MechanicGuidePage.tsx
  (chat assistant + live request draft)

Mechanic:
- MechanicDashboardPage.tsx, MechanicRequestsPage.tsx, MechanicJobPage.tsx
  (preserved job-advance/job-amount/job-duration/estimate-* / offer-accept-* IDs),
- MechanicHistoryEarnings.tsx (both MechanicHistoryPage + MechanicEarningsPage),
- MechanicProfilePage.tsx, MechanicApplyPage.tsx

Admin:
- AdminDashboardPage.tsx — feeds/stats/trends/exceptions/readiness
- MechanicManagementPage.tsx — shared roster for /admin/approvals and /admin/mechanics
- AdminApprovalsPage.tsx — re-exports MechanicManagementPage (single source of truth)
- UsersPage.tsx — user roster with role counts, search, details panel
- AdminAnalyticsPage.tsx — requests/value/estimates/offers/distribution/mechanic network/
  earnings-by-day/exports
- OpsPages.tsx — RequestsPage, AdminRequestDetailPage, DispatchPage, AuditPage
  (largest admin surface: 526 lines, dispatch + request-detail views)
- ReportsHubPage.tsx — CSV exports (requests + mechanics) from bounded snapshots
- LogsPage.tsx — immutable operator audit events

SHARED SHELLS
-------------
- PortalShell.tsx — unified customer/mechanic/admin shell (single nav model,
  sign-out, unread badge). Replaced three divergent shells with one shared
  implementation. Mobile tabs, desktop sidebar, demo/live switch.

COMPONENTS REWRITTEN
--------------------
- ui.tsx — Button/Card/Badge/StatusPill/PageHeader/EmptyState/LoadingState/ErrorState/
  DemoNotice/Alert/Stat/MetricCard/SectionHeading/Field/Input/Select/Textarea/Modal/
  LinkButton/Stepper/PreviewNotice, exported buttonStyles
- Icon.tsx — hand-rolled icon set (battery, fuel, key, tire, bolt, chevron-down,
  arrow-left, message, credit-card, life-buoy, eye, eye-off) replacing any icon dependency

DEAD CODE / ARTIFACTS REMOVED
-----------------------------
- Deleted `.portal-content` typography-override block (component type now depends on
  shell, not the other way around)
- Removed unreachable dead code in mechanic.ts (post-return tx.update(...))
- Re-pointed semantic Tailwind tokens to light palette so 34 page files inherit the
  new system without per-file rewrites
- Unified customer/mechanic/admin shells into single PortalShell
- Removed dead /experience links from PUBLIC_LINKS; kept orphaned page files untouched
- Recoloured MapView tones to light theme
- Restored dataExport.ts to test contract (estimateApprovedAtUtc, approvedBy,
  verification: false instead of broken finalAmountApprox*)
- Fixed nested-Card layout bug in mechanic dashboard; flattened cards in
  history/earnings pages
- Fixed TrackingPage.tsx Card import; Fixed HistoryPages.tsx Badge import
- Fixed MechanicJobPage.tsx Card import

TYPECHECK / BUILD / TEST
------------------------
- npx tsc -p tsconfig.app.json --noEmit --composite false → no output (green)
- npm run build → ✓ built in ~11-15s (depends)
- npx vitest run → 284 passed, 1 failed (e2e/support/e2eGuard.vitest.ts: requires
  Firebase emulators; pre-existing, unrelated to UI changes)
- E2E signs out via getByRole('button', { name: 'Sign out' }) — PortalShell provides
  this on desktop and mobile (duplicate names resolved with .first())

KNOWN LIMITATIONS
-----------------
- E2E emulator guard requires running `npm run dev:emulators` + `npm run seed:local`
  before browser tests; this is a CI/infrastructure requirement, not a code defect.
- Admin pages require Firebase custom admin claim; unauthenticated visitors are
  redirected to login (tested and preserved).
- `ThemeToggle.tsx` is never mounted and references undefined CSS vars; preserved as
  dead code from prior theme-toggle attempt.
- `dataExport.ts` was restored to its test contract; original broken fields removed.
- Mechanic pages preserve the original `aria-label="Toggle specialty: {s}"` quirk
  (pre-existing, not changed).
- E2E test IDs that must survive: verified and preserved across all pages.

FILES MODIFIED (80+ files)
--------------------------
Key portals and their redesigned pages are listed above. Full git diff available
but the complete list includes every portal page, layout, component, lib, and
config file touched by the light-theme migration, token repointing, TS error fixes,
and shared-shell unification.

SUMMARY
-------
The RoadAssist website has been fully reconstructed into a premium light theme
across all portals while preserving 100% of the existing backend architecture,
Firebase integration, role-based access, GPS/tracking, ML guide, payments, and
all E2E test IDs. The design system uses semantic Tailwind tokens (cream, graphite,
grease, safety, steel, line) repointed to a warm-white/indigo light palette, so
one change reaches every page without per-file rewrites. All 44 baseline TS errors
were fixed, the build goes green, and 284 of 285 tests pass (the 1 failure is a
pre-existing e2e emulator guard). No backend was replaced with mock data; no
business logic was changed for UI convenience.