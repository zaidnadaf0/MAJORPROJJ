# ROADASSIST — MIGRATION AND REGRESSION ROADMAP

## Status: Phased Migration Plan with Dependencies, Test Mapping, and Risk Register

---

## 1. Migration Overview

### 1.1 From Current State to Target State

**Current state** (repository-verified):
- Single `src/lib/` folder with mixed concerns (business logic + Firebase adapters + UI utilities)
- Direct Firebase SDK calls in page components (no adapter layer)
- No environment mode separation beyond `VITE_USE_EMULATORS` flag
- No explicit build-mode profiles (demo/emulator/live)
- Frontend guards used for authorization (security vulnerability — Correction 6)
- No centralized env validation (`src/env.ts` missing)
- No feature flag system (`src/featureFlags.ts` missing)
- `PreviewNotice` with outdated M1 disclaimer (RM1)
- Inconsistent `VITE_ROADASSIST_MODE` naming (RM2)

**Target state**:
- Seven-layer architecture: Presentation ← Application ← Domain ← Infrastructure Adapters ← Infrastructure SDK
- Domain layer completely independent (zero Firebase/React imports)
- Infrastructure adapters translate between Domain DTOs and Firebase SDK
- Three build-mode profiles: DEMO | EMULATOR | LIVE (immutable after build init)
- Feature flags: runtime toggles independent of build mode
- Authorization chain: custom claims → Firestore rules → profile hints (hint only) → frontend guards (UX only)
- Admin: exactly three authorized recovery operations with validation, reason codes, audit records
- `PreviewNotice` removed (RM1); `VITE_ROADASSIST_MODE` naming standardized (RM2)
- Environment validation at startup (`src/env.ts`)
- All 35 features F1–F35 preserved with adapter layer + regression tests

### 1.2 Migration Scope

| Migration Group | Key Activities | Dependencies |
|---|---|---|
| Repository and architecture foundation | Extract domains, create adapters, env config, feature flags | None (Phase 0) |
| Domain logic and business rules | Pure function extraction from `src/lib/` into `src/domains/` | Architecture foundation |
| Firebase adapters and data access | `authAdapter`, `dbAdapter`, `functionsAdapter` | Domain extraction |
| Authentication and authorization | Auth guard hardening, claim reconciliation, rule preservation | Adapter stabilization |
| Customer portal | Page reorganization, NAV hardening, guide integration | Adapter stabilization |
| Mechanic portal | Page reorganization, capacity display, estimate integration | Adapter stabilization |
| Admin portal | Page reorganization, recovery operations, analytics enhancement | Adapter stabilization |
| AI/ML and chatbot | ML provider abstraction, demo bot preservation, flag integration | Domain extraction |
| Maps and tracking | Geolocation adaptation, disclaimer enforcement, throttle preservation | Adapter stabilization |
| Design system and visual redesign | CSS custom tokens, accessible components, responsive layouts | UI component expansion |
| Demo environment | Fixture data, mode enforcement, reset procedure | Env config + feature flags |
| Emulator and live environments | Emulator safety guards, startup validation, mode separation | Env config |
| Observability and testing | Logger + metrics, expanded Vitest coverage, E2E updates | All prior groups |
| Faculty demonstration preparation | Demo accounts, sample data, startup procedure | Demo environment |

---

## 2. Phased Migration Plan (20 Weeks)

### 2.1 Phase 0: Pre-Migration Preparation (Week 0)

| Activity | Deliverable | Verification |
|---|---|---|
| Create feature branch | `git checkout -b redesign/architecture-planning` | Branch exists on repo |
| Take Firestore snapshots | Backup of all collections (`users`, `mechanics`, `vehicles`, `requests`, `offers`, `notifications`, `auditEvents`) | Snapshot verified in Firebase Console |
| Set up Vite build modes | `vite build --mode demo`; `vite build --mode emulator`; `vite build --mode live` | All three build successfully |
| Initialize `src/env.ts` | Environment validator with mode detection | `npm run typecheck` passes |
| Define feature flag defaults | `src/featureFlags.ts` with `DEMO_MODE=false`, `ML_ENHANCED=false`, `MAP_PROVIDER=leaflet`, `ADMIN_RECOVERY=false` | `npm test` passes |

**Exit criteria**: Snapshot taken; branch created; all three build modes work; env validator types pass.

### 2.2 Phase 1: Foundation & Domain Extraction (Weeks 1–4)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 1** | Extract pure functions from `src/lib/` into `src/domains/` | `src/domains/requests.ts`, `src/domains/mechanics.ts`, `src/domains/estimates.ts`, `src/domains/payments.ts`, `src/domains/geolocation.ts`, `src/domains/notifications.ts`, `src/domains/guide.ts`, `src/domains/analytics.ts`, `src/domains/stateMachine.ts`, `src/domains/mlProvider.ts` | None (greenfield within app) | `npm test` all domain functions; `npm run typecheck` |
| **Week 1** | Create `src/env.ts` | Environment validator with `roadassistMode`, `useEmulators` detection; startup throws if misconfigured | None | `npm run typecheck`; manual test: set wrong env → startup error |
| **Week 2** | Create `src/infra/firebase.ts` | Singleton init with mode detection (DEMO/EMULATOR/LIVE); emulator wiring; mode enforcement | `src/env.ts` | `npm test`; verify demo mode → singletons null; emulator mode → emulator connections; live mode → production |
| **Week 2** | Create `src/infra/authAdapter.ts` | Wrap `firebaseAuth()` with mode-aware signIn/signOut/signUp; custom claims awareness | `src/infra/firebase.ts`; `src/domains/` | `vitest test:authAdapter_signIn`; `vitest test:authAdapter_signOut` |
| **Week 3** | Create `src/infra/dbAdapter.ts` | DTO-mapped Firestore access (thin layer, preserves `onSnapshot`, transactions); emulator awareness | `src/infra/firebase.ts`; all `src/domains/` | `vitest test:dbAdapter_createRequest`; `vitest test:dbAdapter_subscribe` |
| **Week 3** | Create `src/infra/functionsAdapter.ts` | Callable wrappers with error classification (offer-expired, already-taken, ineligible, permission-denied, not-found, forbidden, error); mode awareness | `src/infra/firebase.ts`; `src/domains/` | `vitest test:functionsAdapter_acceptOffer_success`; `vitest test:functionsAdapter_contract` |
| **Week 4** | Update all internal imports | All page components, business logic use adapters instead of direct Firebase SDK | Phases 1–3 complete | `npm test` all regression tests; `npm run typecheck` |

**Exit criteria**: All domain pure functions extracted and testable without emulators; all adapter layers functional; full test suite passes against emulator; typecheck zero errors.

### 2.3 Phase 2: API Stabilization (Weeks 5–6)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 5** | Verify adapter parity | All callable contracts (acceptOffer, declineOffer, reassignMechanic) preserved; all realtime listener semantics preserved; all transaction semantics preserved | Phase 1 complete (adapters stable) | Delta testing: identical inputs → identical outputs through old and new code paths; emulator parity tests |
| **Week 5** | Verify adapter layer preserves all semantics | Compare old vs. new output for: request creation, offer acceptance, estimate submission, payment recording, status transitions | Phase 1 complete | `vitest test:adapter_parity_*` suite — all F1–F35 delta tests pass |
| **Week 6** | Migrate page components | All 48 page components use adapters instead of direct Firebase calls; routes unchanged | Phase 1 complete (adapters + domain functions) | `playwright test:e2e` all journeys with exact same URL paths; visual regression |

**Exit criteria**: All adapter contracts verified; parity tested across old and new implementations; e2E journeys pass with identical URLs.

### 2.4 Phase 3: Portal Reorganization (Weeks 7–8)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 7** | Reorganize `src/pages/` | Subdirectories: `pages/public/`, `pages/auth/`, `pages/customer/`, `pages/mechanic/`, `pages/admin/`; all route paths unchanged in `ROUTE_DEFS` | Phase 2 complete (adapters stable) | `playwright test:e2e` all journeys pass with exact same URL paths; no route mismatches |
| **Week 7** | Create portal layouts | `CustomerLayout`, `MechanicLayout`, `AdminLayout`, `PublicLayout` with NAV, auth gates (hardened as per Correction 6) | Phase 2 complete (adapters) | Visual check: each portal has correct NAV; auth gates redirect unauthenticated users |
| **Week 8** | Update `src/routes.tsx` | Route defs remain import-path-identical; all path strings unchanged | Phase 7 complete | `npm run typecheck`; `playwright test:e2e` all critical journeys |

**Exit criteria**: Pages reorganized into portal subdirectories; all route paths identical; navigation works across all portals; e2E tests pass.

### 2.5 Phase 4: UI/UX Enhancement (Weeks 9–11)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 9** | Expand design tokens | `src/styles/tokens.css` with CSS custom properties (`--color-surface`, `--color-text`, `--color-primary`, etc.); `src/styles/variables.css` with theme variables | Phase 3 complete (portals reorganized) | Visual check: CSS vars applied; `document.documentElement.style.setProperty` works |
| **Week 9** | Update UI components for accessibility | Focus visible rings on all interactive elements; color contrast ≥ 4.5:1; ARIA labels where needed; no breaking API changes | Design tokens | `vitest test:ui_a11y`; `playwright test:e2e` a11y automated scan |
| **Week 10** | Add responsive improvements | Mobile-first component patterns; add new components (Alert, StatusPill) alongside existing; no component removal | UI components | `playwright test:e2e` responsive breakpoints (mobile/tablet/desktop); visual regression |
| **Week 11** | Theme system enhancements | CSS custom properties for dynamic theming; `applyTheme()` sets vars on `:root`; preset support (`light`/`dark`/`system`); verify `DEMO_MODE` serves fixture data correctly | Phase 9 complete | Theme toggle cycles light/dark/system; demo mode banner visible with fixture data |

**Exit criteria**: CSS custom properties active; a11y scan passes; responsive behavior verified; theme works in all three modes; demo mode serves fixtures.

### 2.6 Phase 5: ML & Guide Enhancement (Weeks 12–13)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 12** | Create `src/infra/mlProvider.ts` | ML provider abstraction: rule-based classifier (current) + optional model enhancement via `ML_ENHANCED` feature flag; trusted boundary parser `parseUntrustedGuideResponse`; model confidence display; limitations disclosure | Phase 1 complete (domain functions) | `vitest test:mlProvider_ruleBased`; `vitest test:emulator_ml` with `ML_ENHANCED=false` |
| **Week 12** | Integrate ML model info display in admin dashboard | Static artifact only — `mlModelInfo.ts` displayed; no runtime model fetching; `ML_ENHANCED` flag default `false` | Domain extraction complete | Admin page shows model metadata with explicit limitations disclosure |
| **Week 13** | Preserve demo bot flows | 7 scenario flows unchanged; `classifyProblem`, `inferCategory`, `triageSafety` outputs unchanged; `buildFallbackReply` functional | Domain functions (Week 1–4) | `vitest test:classifyProblem`; `vitest test:demoBot_*` all pass; classifier outputs identical |

**Exit criteria**: ML provider abstraction functional; demo bot flows preserved; classifier outputs unchanged; `ML_ENHANCED` opt-in via feature flag only; no runtime model fetching.

### 2.7 Phase 6: Observability & Testing (Weeks 14–16)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 14** | Add observability infrastructure | `src/observability/logger.ts` — structured logging with correlation IDs; `src/observability/metrics.ts` — custom metrics counter; `src/observability/health.ts` — health check endpoints | Phase 1 complete (adapters stable) | `import` works from any component; logs appear in console with correlation ID |
| **Week 15** | Expand Vitest coverage | 100% pure function coverage for domain layer (~80 tests); emulator-integration test suite (~50 tests) covering adapter layers, callable wrappers, DTO mapping, realtime listeners | Phase 2 complete (API stabilization) | `npm test` coverage ≥ 80% for domain layer; `vitest run --config vitest.emulator.config.ts` all pass |
| **Week 16** | Update Playwright E2E tests | New portal navigation paths; all critical journeys in demo mode; CI/CD gate: typecheck → test → test:e2e → lint:rules passes | Phase 3 complete (portal reorganization); Phase 4 complete (UI enhancements) | `npm run test:e2e` all journeys pass in demo mode; CI pipeline green |

**Exit criteria**: Vitest coverage ≥ 80% domain layer; emulator integration tests pass; E2E critical journeys pass in demo mode; CI/CD gate green.

### 2.8 Phase 7: Demo/Live Separation (Weeks 17–18)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 17** | Implement env config separation | Three build-mode profiles enforced; `firebaseInit.ts` startup validation; impossible to access production Firebase in DEMO/EMULATOR mode | Phase 1 complete (env config); Phase 6 complete (observability) | Verify: DEMO mode → fixtures only; EMULATOR mode → local emulators only; LIVE mode → production |
| **Week 17** | Feature flag independence | `DEMO_MODE`, `ML_ENHANCED`, `MAP_PROVIDER`, `ADMIN_RECOVERY` are runtime toggles independent of build mode; checked in `src/featureFlags.ts` | Phase 5 complete (ML provider) | Test: `DEMO_MODE=true` in emulator mode → fixtures serve; `ADMIN_RECOVERY=true` in emulator → no-op (no custom claim) |
| **Week 18** | Configure Vite build profiles | `vite build --mode demo`; `vite build --mode emulator`; `vite build --mode live`; document environment setup for new developers | Phase 1 complete (env.ts); Phase 7a complete (enforcement) | All three builds succeed; `npm run typecheck` passes for each; environment docs created |

**Exit criteria**: Three build modes work; DEMO cannot access production; EMULATOR isolated to local; LIVE connects to prod; env docs completed.

### 2.9 Phase 8: Final Review & Launch (Weeks 19–20)

| Week | Activities | Deliverables | Dependencies | Verification |
|---|---|---|---|---|
| **Week 19** | Full regression test suite | All F1–F35 regression tests pass in all three modes (demo, emulator, live); performance benchmarking (query latencies, bundle size); accessibility audit (a11y tools) | All prior phases complete | `npm test` all pass; `vitest run --config vitest.emulator.config.ts` all pass; `playwright test:e2e --mode demo` all pass; a11y score ≥ 90 |
| **Week 19** | Security audit | Frontend guards verified as UX-only; no role-hint authorization; auth chain validated; Firestore rules validated; custom claims are authorization boundary | Phase 6 complete (security testing) | Security audit report: all checks pass; no unauthorized access paths |
| **Week 20** | Final typecheck + lint | `npm run typecheck` — zero errors; `npm run lint:rules` — rules valid; merge to main with feature flags OFF by default; deploy to demo environment first, then emulator, then live | All prior phases complete | `npm run typecheck` exits 0; `npm run lint:rules` exits 0; deploy scripts succeed |

**Exit criteria**: All F1–F35 regression tests pass in all three modes; security audit passes; typecheck/lint zero errors; demo environment deployed first; then emulator; then live.

---

## 3. Test Mapping

### 3.1 Test-To-Migration Mapping

| Test Level | Tests | Migrated Features | Migration Phase |
|---|---|---|---|
| **Pure Unit Tests** (Vitest, no Firebase) | ~80 tests | F1–F20 (all domain functions) | Phase 1 |
| **Integration Tests** (Vitest + emulators) | ~50 tests | F21–F35 (adapter + Firebase interaction) | Phase 2–3 |
| **Critical E2E Journeys** (Playwright, 3 modes) | ~60 test cases | All booking workflows, mechanic flows, admin recovery | Phase 4–8 |
| **Security Tests** (Vitest + emulator) | ~10 tests | Auth chain, frontend guard hardening, Firestore rules | Phase 1–8 |

### 3.2 Test Pyramid After Migration

```
                     ┌─────────────────────┐
                     │   E2E Playwright      │
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

### 3.3 Parity Verification (Correction 13)

**Behavior parity proven through three methods**:

1. **Delta Testing**: Identical inputs through old and new implementations; outputs compared
2. **Emulator Parity Testing**: Same delta tests run with `VITE_USE_EMULATORS=true`; old path → direct SDK; new path → adapters + emulators; outputs match
3. **E2E Regression Testing**: Critical journeys tested in all three modes (demo, emulator, live); behavior consistent for same user actions

**No claim of "100% parity" without passing all three test levels**. The proposal explicitly states: "Behavior parity is proven when all three test levels pass for a given feature."

---

## 4. Risk Register (Updated from Architecture Document)

| # | Risk | Likelihood | Impact | Mitigation |
|---|----|---|---|---|
| R1 | Firestore rules breakage | Medium | Critical | Rules changes in separate PR; rules unit tests on every commit; backward-compatible field additions only; **all rules preserved unchanged** (verified in audit) |
| R2 | Auth regression — sign-in/sign-up flows break | Medium | Critical | Auth adapter preserves exact `firebaseAuth()` API; emulator tests cover full flow; **custom claims + rules preserved** (Correction 6) |
| R3 | Offer/expiry logic drift | Medium | Critical | Contract-test the callable function; emulator tests with edge cases; **callable contract preserved exactly** (Correction 7) |
| R4 | ML model misclassification | Low | Low (removed as prod feature) | Rule-based classifier retained as fallback; `ML_ENHANCED` flag default `false`; **ML is FUTURE, not implemented** (Correction 14) |
| R5 | Performance degradation | Medium | Medium | DTO mapping in-memory only; queries still go direct to Firestore; profile before/after; **adapters don't add query layers** (Correction 7) |
| R6 | UI regression — layouts break | Medium | Medium | Visual regression testing with Playwright; component tests preserve API surface; **Tailwind config unchanged**; UI components expanded, not rewritten (Correction 14) |
| R7 | Data loss during migration | Medium | Critical | Pre-migration snapshots; migration scripts are idempotent; **four rollback strategies** (Correction 10); **snapshots before each phase** |
| R8 | Environment confusion — prod access during dev | High | Critical | **Three-environment model** (Correction 9) + **feature flag independence**; impossible to access production in DEMO/EMULATOR mode; `firebaseInit.ts` enforces at startup |
| R9 | Unrestricted admin overrides | High | Critical | **Narrowly authorized recovery operations only** (Correction 5); exactly three operations with validation, reason codes, audit records; no blanket overrides |
| R10 | Frontend guards used for authorization | High | Critical | **Authorization chain reconciled** (Correction 6): custom claims → Firestore rules → profile hints (hint only) → frontend guards (UX only); all frontend security checks removed |

**Top 3 Risks**:
1. **R8 — Environment confusion** (now High): Addressed by three-environment model + firebaseInit.ts enforcement
2. **R9 — Unrestricted admin overrides** (now High): Addressed by exactly three authorized recovery operations with validation/audit
3. **R10 — Frontend guards as authorization** (now High): Addressed by authorization chain reconciliation; frontend guards hardened to UX-only

All risks have mitigations that are implementable within the planning-only constraint (no source code changes required at this stage; all corrections are architectural/design).

---

## 5. Rollback Strategy (Summary from Architecture Document)

### 5.1 Four Independent Rollback Strategies

| Strategy | Trigger | Action | Scope | Time |
|---|---|---|---|---|
| **A: Application Code Rollback** | Critical bugs in current phase | `git revert <phase-commit>`; restore prior tagged version; `npm run preview` on prior build | Frontend code, adapter layers, route definitions, component changes | 15 minutes |
| **B: Configuration Rollback** | Environment misconfiguration; wrong build mode | Switch Vite build mode (`vite build --mode live` instead of `--mode emulator`); reset feature flags to defaults | Build mode, feature flag states | 5 minutes |
| **C: Database Schema Rollback** | Firestore rules change breaks data access | Firestore point-in-time restore; revert `firestore.rules` to prior revision; idempotent migration script in reverse | Firestore document shapes, index definitions, rules patterns | 15–30 minutes |
| **D: Data Rollback** | Firestore documents corrupted | Restore from pre-migration snapshots; Firebase Console `firestore:backups:restore`; data repair scripts | All collections; snapshots point-in-time | 30–60 minutes |

**Feature flags are a supplement, not a replacement** for rollback strategies A–D.

### 5.2 Rollback Execution Order

1. **First**: Try Rollback Strategy B (configuration) — quickest, often sufficient
2. **Second**: Try Rollback Strategy A (code revert) — if config change doesn't fix the issue
3. **Third**: Try Rollback Strategy C (schema/restore) — if code revert doesn't fix the issue
4. **Fourth**: Try Rollback Strategy D (data restore) — last resort; most time-consuming

After any rollback, halt the current phase, document the issue, and resume from the last successfully completed phase.

---

## 6. Acceptance Gates (Per Phase)

| Gate | Criteria | Must Pass |
|---|---|---|
| **Typecheck Gate** | `npm run typecheck` — zero errors | Every phase merge |
| **Unit Test Gate** | `npm test` — all domain regression tests passing (coverage ≥ 80% for domain layer) | Every phase merge |
| **Emulator Parity Gate** | Same tests pass with `VITE_USE_EMULATORS=true` | Every phase merge |
| **Integration Gate** (phases 3–8) | e2E critical journeys pass in demo mode | Phase 3–8 only |
| **Security Gate** | Frontend guards verified as UX-only; no role-hint authorization; auth chain validated | Every phase merge |

Failure at any gate halts the phase; team reverts to last completed phase and addresses the failure.

---