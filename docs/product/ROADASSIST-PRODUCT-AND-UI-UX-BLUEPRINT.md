# ROADASSIST — PRODUCT AND UI/UX BLUEPRINT

## Status: Repository-Verified Product & Design Specification

**Visual direction**: Hybrid — premium modern SaaS + automotive technology identity.

**Product priority**: Balanced — architecture, functionality, presentation and demonstration reliability.

**Demonstration environment**: Both — fully functional demo environment and separate live Firebase environment.

---

## 1. Product Vision

RoadAssist is a professional roadside assistance platform connecting customers in need with vetted mechanics. The product must feel complete, reliable, and polished — suitable for faculty demonstration and real-world use.

### 1.1 Core Value Proposition
- **Fast**: Customer reports breakdown → mechanic accepted → ETA provided → assistance dispatched
- **Reliable**: Clear status tracking, safety triage, estimate approval, payment recording
- **Secure**: Role-based access, authorization through Firebase Custom Claims + Firestore Rules
- **Transparent**: Upfront estimates, final amount approval, receipt generation
- **Helpful**: Mechanic guide and chatbot for symptom-based guidance

### 1.2 Target User Personas
| Persona | Primary Goals | Key Concerns |
|---|---|---|
| Customer | Get roadside help quickly; understand the process; see ETA; pay fairly | Wait time, cost transparency, safety |
| Mechanic | Accept jobs; update status; earn fairly; manage availability | Job availability, capacity limits, clear instructions |
| Admin | Oversee network; manage mechanics; monitor requests; resolve issues | Network health, mechanic quality, fairness |

### 1.3 Success Metrics (Faculty Evaluation)
- Visual quality: professional identity, consistent design, responsive layouts
- Functional completeness: all user flows work end-to-end
- Navigation: intuitive, clear, accessible
- Responsiveness: mobile, tablet, desktop
- Security: proper authorization, no data leaks
- Data consistency: same data across environments
- AI/ML explanation: clear, honest, not fabricated
- Booking lifecycle: all 17 steps traceable
- Error handling: clear messages, no silent failures
- Demonstration reliability: can repeat without data corruption

---

## 2. Visual Design System

### 2.1 Design Tokens (TailwindCSS Custom)

| Token Category | Values | Usage |
|---|---|---|
| **Color Palette** | `safety-500`, `safety-600` (primary gradient) | CTA buttons, primary actions |
| | `cream` | Backgrounds, secondary text |
| | `steel-300`, `steel-400` | Muted text, borders |
| | `graphite-soft`, `graphite-card` | Surfaces, cards |
| | `grease-soft` | Input backgrounds |
| | `danger`, `danger-solid` | Error states, destructive actions |
| | `success`, `warning` | Success messages, warnings |
| **Typography** | `clay-control` | Base font family, headings |
| | `clay-surface` | Background surfaces |
| | `focus-visible:ring-*` | Keyboard focus indicators |
| | `disabled:cursor-not-allowed`, `disabled:opacity-50` | Disabled state |
| **Spacing** | `p-`, `py-`, `px-` utilities (1-6) | Consistent spacing throughout |
| **Border Radius** | `rounded-xl`, `rounded-2xl`, `rounded-full` | Buttons, cards, badges |
| **Shadows** | `shadow-safety-400`, `shadow-cream-100` | Elevated surfaces |

### 2.2 Color Usage per Portal

| Portal | Primary | Accent | Background | Error | Success |
|---|---|---|---|---|---|
| **Customer** | `safety-500 → safety-600` gradient | `cream` | `gray-50` (light) / `gray-900` (dark) | `danger` | `success` |
| **Mechanic** | `safety-500 → safety-600` gradient | `steel-300` | `gray-50` / `gray-900` | `danger` | `success` |
| **Admin** | `safety-500 → safety-600` gradient | `steel-400` | `gray-50` / `gray-900` | `danger` | `warning` |
| **Public** | `cream` | `safety-500` | `white` / `gray-100` | `danger` | `success` |

### 2.3 Responsive Breakpoints
- **Mobile**: `<640px` — single-column layout, stacked nav, full-width buttons
- **Tablet**: `≥640px` — two-column layouts where appropriate, condensed nav
- **Desktop**: `≥1024px` — full navigation bars, sidebars where beneficial, multi-column grids

### 2.4 Accessibility Requirements
- **Color contrast**: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (WCAG AA)
- **Focus visible**: `focus-visible:ring-2 focus-visible:ring-safety-400 focus-visible:ring-offset-2`
- **Keyboard navigation**: All interactive elements reachable via Tab, logical order
- **ARIA labels**: Where meaning is not clear from text content
- **Screen reader support**: Proper heading hierarchy, meaningful link text, alt text for icons
- **Reduced motion**: Respect `prefers-reduced-motion` media query
- **Language**: All text in English; no placeholder text presented to users

---

## 3. Customer Portal Redesign

### 3.1 Dashboard Hierarchy
```
/app (CustomerDashboard)
  ├── Hero section: "Get back on the road" CTA + active request summary
  ├── Quick actions: New request, Vehicle management, Profile
  ├── Active request card: Status, mechanic name, ETA, tracking button
  ├── Recent history: Last 5 completed jobs with receipt summaries
  ├── Vehicle cards: List of owned vehicles, set default
  └── Stats row: Total requests, avg ETA, completion rate
```

### 3.2 Navigation Structure
- **Top tabs** (`CUSTOMER_TABS`): `/app`, `/map`, `/services`, `/notifications`, `/profile`
- **Sidebar** (`CUSTOMER_NAV`): Assistance group (Dashboard, Request Help, Mechanic Guide, Mechanic Directory, Live Map, Track Request) + My Account group (Service History, Vehicles, Emergency, Notifications, Profile, Settings)
- **Breadcrumb**: Derived from route path + portal NAV structure (new component, A6)

### 3.3 Page-by-Page Specification

#### 3.3.1 CustomerDashboard.tsx
- **Layout**: Two-column on desktop, full-width on mobile
- **Main sections**: Hero + active request, Quick actions, Recent history, Stats, Vehicles
- **Key components**: `MetricCard`, `SectionHeading`, `EmptyState`, `ErrorState`
- **Empty state**: "No active request — start by requesting help"
- **Error state**: "Network unavailable — showing last known status"
- **Responsive**: Hero stacks above quick actions on mobile

#### 3.3.2 ServicesPage.tsx (Request Help)
- **Problem category preselection**: Integrated `classifyProblem()` from mechanicGuide.ts
- **Safety triage banner**: Displayed before user confirms — EMERGENCY/CAUTION patterns win over model
- **Category selection**: 6 categories (tow, engine, battery, flat-tyre, other, general)
- **Location input**: Auto-detected via geolocation + manual override
- **Vehicle selection**: From user's vehicle list
- **CTA**: "Request help" — disabled if required fields missing

#### 3.3.3 MechanicGuidePage.tsx
- **Symptom-based guidance**: Rule-based classifier + safety triage
- **Demo bot interaction**: 7 scenario flows (battery, flat-tyre, engine-overheating, low-tyre-pressure, engine-warning, brakes, fuel)
- **Safety messages**: Never encourage dangerous repairs; always escalate to roadside assistance
- **Transition to booking**: "Start booking" CTA after guide consultation

#### 3.3.4 MechanicDirectoryPage.tsx
- **Vetted mechanics**: Only `approved: true` + `isAvailable: true` + capacity available
- **Filter by specialty**: Match against request category
- **Distance**: Straight-line from customer location (with `ETA_DISCLAIMER`)
- **Offer acceptance**: One-tap accept/decline via dispatch callable

#### 3.3.5 MechanicDetailPage.tsx
- **Profile**: Name, rating, review count, specialties, service area, vehicle description, garage name
- **Contact**: Private contact only visible to admin or matched mechanic
- **Service area**: Circle on map with `serviceRadiusKm` boundary
- **Availability**: `isAvailable` badge (green = available, red = busy)

#### 3.3.6 CoverageMapPage.tsx
- **Leaflet map**: OpenStreetMap baseline (no provider change)
- **Coverage area**: Predefined regions, not real-time mechanic locations until request created
- **Start request**: Button opens ServicesPage
- **Disclaimer**: `ROUTE_DISCLAIMER` — "Straight-line representation — road routing is not available."

#### 3.3.7 TrackingPage.tsx
- **ETA disclaimer**: Prominent display of `ETA_DISCLAIMER`
- **Stale location banner**: When `isStale()` true — "Location update stale — tap to refresh"
- **Step-by-step rescue**: Visual progression through rescue stages
- **Coordinate refresh**: Manual re-entry fallback if geolocation fails

#### 3.3.8 HistoryPages.tsx (Service History)
- **Completed rescues**: List with date, problem type, amount, rating (if provided)
- **Receipt**: Line items (estimate + final amount + payment method), service reference number
- **Rating/feedback**: After completed job — one-star to five-star + optional comment
- **No data**: "No completed requests yet — start your first request"

#### 3.3.9 VehiclesPage.tsx
- **Vehicle list**: Make, model, year, plate, default indicator
- **Add vehicle**: Form with make/model/year/plate
- **Set default**: Toggle default vehicle for new requests

#### 3.3.10 EmergencyPage.tsx
- **SOS contacts**: Pre-configured contacts with phone numbers
- **Safety guidance**: Immediate actions based on problem type
- **One-tap call**: To SOS contacts and to roadassist line
- **Important**: Does not bypass business rules — still creates request if user proceeds

#### 3.3.11 NotificationsPage.tsx
- **Dispatch updates**: Offer received, mechanic accepted, arriving, arrived, estimate ready
- **Account notices**: Profile updates, verification status, password reset
- **Mark read**: Individual + batch (≤50 ops per batch)
- **Unread count**: Pure counter from notification items

#### 3.3.12 ProfilePage.tsx
- **Name, contact info**: Email, phone
- **Preferences**: Theme light/dark/system, notification settings
- **Account security**: Email verification status, session management

#### 3.3.13 SettingsPage.tsx
- **Backend status**: Connection health (configured / emulator / live / unconfigured)
- **Appearance**: Theme preference, reset to defaults
- **Data controls**: Export data, reset to fixtures (demo mode only)
- **About**: Version info, links to terms and privacy

---

## 4. Mechanic Portal Redesign

### 4.1 Dashboard Hierarchy
```
/m (MechanicDashboardPage)
  ├── Availability toggle: Available / Unavailable badge + capacity /3
  ├── Incoming offers: List of pending offers with expiry countdown
  ├── Active job: Current job progress badge + status pill
  ├── Earnings summary: YTD earnings, pending earnings, completed jobs count
  └── Quick actions: Refresh, Available/Unavailable toggle
```

### 4.2 Navigation Structure
- **Top tabs** (`MECHANIC_TABS`): `/m`, `/m/requests`, `/m/job`, `/m/earnings`, `/m/profile`
- **Sidebar** (`MECHANIC_NAV`): Workshop group (Dashboard, Incoming Requests, Active Job, Job History, Earnings, Workshop Profile, Apply)
- **Breadcrumb**: Derived from route path + portal NAV structure

### 4.3 Page-by-Page Specification

#### 4.3.1 MechanicDashboardPage.tsx
- **Availability**: Toggle button — `setAvailability(uid, available)` with 5s throttle (R2 improvement)
- **Capacity display**: "At capacity" warning when `activeJobCount === 3`, greyed-out "Accept" buttons
- **Incoming offers**: List with mechanic name, offer expiry (countdown from `expiresAt`), "Accept" / "Decline"
- **Active job**: Badge showing current status, progress indicator
- **Earnings**: YTD total, average per job, jobs completed count

#### 4.3.2 MechanicRequestsPage.tsx (Incoming Offers)
- **Offer list**: All pending offers for mechanic, grouped by request
- **Offer details**: Customer location (coarse), problem type, vehicle, offer expiry
- **Actions**: Accept / Decline per offer
- **Capacity awareness**: "You have X of 3 live jobs" notice

#### 4.3.3 MechanicJobPage.tsx (Active Job)
- **Status progression**: Pill showing current status (`accepted`, `on-the-way`, `arrived`, `service`, `completed`)
- **Estimate display**: Submitted estimate amount + approval status ("Estimate pending", "Estimate approved")
- **Customer info**: Name, phone (limited — privacy respecting), location (coarse)
- **Location update**: Button to update mechanic location (throttled by `shouldPush`)
- **Diagnosis**: Free-text field for mechanic's diagnosis
- **Estimate submission**: Button → `submitEstimate` callable — gated while request open and uncompleted
- **Status advance**: "Mark as arrived", "Mark as service" — gated by `canAdvance()` and estimate approval
- **Completion**: "Mark complete" — gated by `finalAmountStatus === 'approved'` AND `estimateStatus === 'approved'` (invariant)
- **Release**: "Release job" — returns request to `requested`, decrements mechanic's `activeJobCount`

#### 4.3.4 MechanicHistoryEarnings.tsx
- **Completed jobs**: List newest first, with amount, date, rating
- **Earnings summary**: YTD, monthly, per-job average
- **Pending payments**: Jobs completed but payment not recorded
- **No data**: "No completed jobs yet"

#### 4.3.5 MechanicProfilePage.tsx
- **Garage location**: BaseLat/baseLng (coarse), service radius
- **Specialties**: Pipe, electrical, battery, etc.
- **Verification status**: `verified` badge, years of experience
- **Vehicle description**: "Toyota Camry 2019" etc.
- **Contact**: Workshop phone/email (private — not customer-visible)
- **Earnings**: Lifetime total, total completed jobs

#### 4.3.6 MechanicApplyPage.tsx
- **Workshop application form**: Name, contact, garage location, specialties, service radius, experience years
- **Verification workflow**: Application → `pending` → admin review → `approved`/`rejected`
- **Application status**: Track application progress via admin portal

#### 4.3.7 MechanicNotificationsPage.tsx
- **Assignment notices**: New offer, offer expired, capacity reached
- **Account notices**: Verification status changes, policy updates
- **Mark read**: Individual + batch

---

## 5. Admin Portal Redesign

### 5.1 Dashboard Hierarchy
```
/admin (AdminDashboardPage)
  ├── Network health overview: Active requests, available mechanics, completion rate
  ├── Pending work: Requests awaiting offer, estimate approval, final amount
  ├── Quick stats: Total mechanics, total customers, today's requests
  └── Navigation tabs
```

### 5.2 Navigation Structure
- **Top nav** (`ADMIN_NAV`): `/admin`, `/admin/dispatch`, `/admin/approvals`, `/admin/mechanics`, `/admin/users`, `/admin/requests`, `/admin/notifications`
- **Insight group** (`ADMIN_TABS`): `/admin`, `/admin/dispatch`, `/admin/requests`, `/admin/mechanics`, `/admin/notifications`
- **Deep insight group**: `/admin/analytics`, `/admin/reports`, `/admin/audit`, `/admin/logs`
- **Breadcrumb**: Derived from route path + portal NAV structure

### 5.3 Page-by-Page Specification

#### 5.3.1 AdminDashboardPage.tsx
- **Network health**: Active requests count, available mechanics / 3 capacity, completion rate (% completed / total)
- **Pending work breakdown**: 
  - Awaiting offers: requests in `requested` status
  - Awaiting estimate: requests in `accepted`/`on-the-way`/`arrived` with `estimateStatus === 'pending'`
  - Awaiting final amount: requests in `service` with `finalAmountStatus === 'pending'`
- **Recent activity**: Last 10 status transitions from audit log

#### 5.3.2 MechanicManagementPage.tsx
- **Application list**: All mechanic applications, status (`pending`, `approved`, `suspended`, `rejected`)
- **Verification actions**: Approve / Suspend / Reject (with reason code)
- **Mechanic details**: Profile view, capacity, active jobs, earnings
- **Suspension reason**: Required for any suspension action

#### 5.3.3 UsersPage.tsx
- **Account list**: All network users, role hint (customer/mechanic — never trusted for auth)
- **Search/filter**: By email, by role hint, by verification status
- **User details**: Profile snapshot, associated vehicles, request history

#### 5.3.4 AdminRequestDetailPage.tsx
- **Authoritative request details**: All fields from `requests/{id}` including estimate, payment, status history
- **Current assignment**: Mechanic name, status, progress
- **Available actions** (based on current state):
  - Release stale: If location stale > 30 min
  - Recapture job: Reassign to new mechanic
  - Force complete: If both estimate and final amount approved
  - Cancel: With reason code

#### 5.3.5 AuditPage.tsx
- **Recent transitions**: Immutable audit events from `/admin/audit`
- **Filter**: By operation type, by date range, by actor UID
- **Audit record fields**: `operation`, `requestId`, `actorId`, `reason`, `timestamp`, `mechanicId`, `requestStatusBefore`, `requestStatusAfter`
- **Searchable**: All fields presented as plain text

#### 5.3.6 AdminAnalyticsPage.tsx
- **Chart visualizations** (Improvement I4):
  - Completion rate bar chart (completed / total, UTC window)
  - Cancellation rate bar chart
  - Average ETA vs. actual duration
  - Top mechanics by completions
- **Responsive grid**: Cards stack on mobile, show side-by-side on desktop
- **Currency formatting**: INR/₹ with locale-aware formatting
- **CSV export**: Button per section → download `requests-{date}.csv`

#### 5.3.7 ReportsHubPage.tsx
- **CSV exports**: From `ReportsHubPage` — pre-populated headers, download confirmation modal
- **Date range picker**: Custom window for export
- **Section exports**: Per-collection (`requests`, `mechanics`, `users`, `auditEvents`)
- **Download confirmation**: "Your CSV is being generated — download below"

#### 5.3.8 AdminNotificationsPage.tsx
- **Admin inbox**: System notifications, policy updates, maintenance windows
- **Mark read**: Individual + batch
- **Notification types**: Scheduled maintenance, policy changes, system updates

#### 5.3.9 LogsPage.tsx
- **Operational request activity**: Live snapshotted activity log
- **Filter**: By request ID, by actor, by date range
- **Event types**: Request creation, offer acceptance, estimate submission, status transitions, payment recording
- **Real-time vs. historical**: Toggle between live and historical log

---

## 6. Component System

### 6.1 Design System Hierarchy
```
src/styles/          # Design tokens (CSS custom properties)
src/components/      # Presentational UI
  ui/                # Base components (Button, Input, Badge, etc.)
  layout/            # Layout components (Header, Sidebar, Breadcrumb)
  forms/             # Form components (Field, Input, Select, etc.)
  displays/          # Stat, MetricCard, EmptyState, ErrorState, AlertBanner
  navigation/        # Portal nav components (Breadcrumb, PortalNav)
  modals/            # Modal, ConfirmationDialog, etc.
  index.ts           # Barrel re-exports
```

### 6.2 Component Catalog

| Component | Variants | Key Features | Portal Usage |
|---|---|---|---|
| **Button** | primary/secondary/ghost/danger, sm/md/lg | Gradient primary, border-secondary, ghost text, danger bg; size-specific padding/radius | All portals |
| **Card** | — | Rounded-2xl, border-line-soft, bg-graphite-card, p-5 | All portals — request cards, mechanic cards, etc. |
| **Badge** | neutral/success/warning/danger/brand | Rounded-full, border, px/py, mono font, size 11px | Status indicators across all portals |
| **PageHeader** | — | RoadAssist logotype, page title, description | All portal pages |
| **EmptyState** | — | Rounded-2xl, dashed border, bg-soft, center-aligned | Customer: "No active requests"; Mechanic: "No completed jobs"; Admin: "No data for selected filter" |
| **LoadingState** | — | Grid animate-pulse, 3 pulse bars, role="status" | All portals during data fetch |
| **ErrorState** | — | Rounded-2xl, border-danger/30, bg-danger/10, role="alert" | All portals on network errors |
| **DemoNotice** | — | Demo banner with "Demo preview" label | Demo mode only — explicit labeling |
| **Stat** | — | px/py stat box, mono label, tabular-nums value | Dashboard stats, admin metrics |
| **MetricCard** | icon, label, value, helper, tone | Card with metric value, icon, helper text; tone = success/warning/danger | All dashboards |
| **SectionHeading** | title/description/action | h2 title, description text, action node | All pages |
| **Field** | label/children/hint | block label, children, hint span | Forms across all portals |
| **Input** | — | Rounded-xl, border-line-soft, bg-grease-soft, px/px/[15px], text-cream placeholder | All forms |
| **LinkButton** | primary/secondary/ghost, to | clay-control, gap, steel-300 hover | Navigation supplementary actions |
| **PreviewNotice** | routePath | **REMOVED** — M1 disclaimer outdated; replaced by `DemoNotice` where needed | N/A (removed, see RM1) |
| **AlertBanner** | success/warning/danger/brand | Professional alert with auto-dismiss, a11y (role="alert", aria-live="polite") | All portals for important messages |
| **Breadcrumb** | — | Derived from route path + portal NAV structure; shows portal home + current path | All portals (new A6) |

### 6.3 Component Philosophy
- **Expand, don't rewrite**: New components added alongside existing; same API surface preserved
- **No breaking changes**: All existing components maintain exact same props and behavior
- **Accessibility first**: Focus visible, color contrast, ARIA labels where needed
- **Tailwind-first**: All styles in Tailwind utilities; CSS custom properties for tokens, not component-level replacement
- **Portal-specific variations**: Same component type, different tone/color mapping per portal

---

## 7. Responsive Design by Portal

| Portal | Mobile (≥320px) | Tablet (≥640px) | Desktop (≥1024px) |
|---|---|---|---|
| **Customer** | Single column, stacked tabs, full-width buttons | Two-column: filters above results; condensed NAV | Full NAV, side-by-side stats, metric cards grid |
| **Mechanic** | Single column, bottom tab bar, offer list single item | Two-column: offers list + details; capacity bar visible | Capacity bar always visible; multi-offer comparison |
| **Admin** | Single column, stacked tabs, filter dropdowns | Two-column: charts + tables side-by-side; action buttons | Full-width charts; tables with horizontal scroll if needed; metric cards grid |
| **Public** | Single column, stacked sections, full-width buttons | Two-column: features grid; pricing table responsive | Features grid 3-column; pricing table full-width |

---

## 8. Accessibility Summary

| Requirement | Implementation |
|---|---|
| Color contrast ≥ 4.5:1 | All Tailwind colors meet WCAG AA when used per tokens; custom properties with fallbacks |
| Focus visible | `focus-visible:ring-2 focus-visible:ring-safety-400 focus-visible:ring-offset-2` on all interactive elements |
| Keyboard navigation | Tab order logical; Escape closes modals; Arrow keys navigate lists where appropriate |
| ARIA labels | `role="alert"` on ErrorState/AlertBanner; `aria-live="polite"` on status updates; meaningful link text |
| Reduced motion | `prefers-reduced-motion` — disable pulse animations, reduce transition durations |
| Form labels | All `<Input>` components have associated `<label>`; no placeholder-only forms |
| Error announcements | Live region announcements for form validation errors |
| Language | All text in English; no culturally-specific assumptions |

---

## 9. Design System Migration Plan

### 9.1 What Stays the Same
- All existing Tailwind configuration unchanged
- All existing component APIs preserved (same props, same return types)
- All existing route paths unchanged
- All existing color class names (`safety-500`, `cream`, etc.) continue to work alongside new CSS custom properties

### 9.2 What Gets Added
- CSS custom properties in `styles/tokens.css` (`:root` definitions)
- New components: `AlertBanner`, `Breadcrumb`, `StatusPill` (capacity badge)
- Expanded theme system: CSS custom properties for dynamic theming
- New layout components: `PortalHeader`, `PortalSidebar`, `PortalNav`

### 9.3 What Gets Improved
- Component accessibility (focus visible, color contrast, ARIA)
- Responsive behavior across all portals
- Visual hierarchy and spacing consistency
- Empty and error state differentiation

### 9.4 What Gets Removed
- `PreviewNotice` component (RM1) — outdated M1 disclaimer

---

## 10. UI/UX Acceptance Criteria (Per Portal)

### 10.1 Customer Portal
- [ ] Dashboard loads with active request or empty state clearly labeled
- [ ] Services form includes safety triage before booking
- [ ] Map shows coverage area with disclaimer; straight-line representation only
- [ ] Tracking page has prominent ETA disclaimer + stale location banner
- [ ] History receipt shows line items: estimate + final amount + payment method
- [ ] Emergency page has SOS contacts and safety guidance
- [ ] All forms have accessible labels and error announcements

### 10.2 Mechanic Portal
- [ ] Dashboard shows capacity /3 with "at capacity" warning when full
- [ ] Incoming offers have expiry countdown (from `expiresAt`)
- [ ] Active job page displays estimate approval status gate
- [ ] Completion is gated by both estimate AND final amount approval
- [ ] Release job returns request to `requested` and restores capacity
- [ ] Profile shows verification status and specialties

### 10.3 Admin Portal
- [ ] Dashboard shows pending work breakdown by status transition stage
- [ ] Mechanic management has approve/suspend/reject with reason codes
- [ ] Analytics has chart visualizations + CSV export
- [ ] Audit log shows immutable transition records
- [ ] Three authorized admin operations only (release_stale, recapture_job, force_complete)
- [ ] Force complete cannot bypass estimate approval

### 10.4 Public Portal
- [ ] Landing page has clear value proposition
- [ ] Features/pricing/about/contact pages all accessible
- [ ] Onboarding path clear for new users
- [ ] No authentication required — full public access

---