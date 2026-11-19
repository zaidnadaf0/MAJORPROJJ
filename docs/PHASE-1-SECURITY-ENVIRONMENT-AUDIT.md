# RoadAssist — Phase 1: Security and Firebase Environment Audit

## Executive Summary

This Phase 1 security and Firebase environment audit investigates the known risks identified in the repository's audit documentation. The audit is read-only: no source files, Firestore rules, configuration, database data, credentials, or documentation were modified during its execution.

**Key Findings:**

1. **Service-account JSON files are properly gitignored** — `roadassist-9c223-c8de6ca31109.json` and `roadassist-Cloud secured*` are listed in `.gitignore` under the `.secrets/` section, preventing accidental commits. However, the `.secrets/` directory itself is also gitignored, meaning if a service account were placed there, it would not be tracked by Git.

2. **Firebase project ID is shared between emulator and production** — `.firebaserc` sets the default project to `roadassist-9c223`, which is used by both the local emulator suite and production. Environment variables (`VITE_USE_EMULATORS=true/false`) control which data source is active, but the shared project ID creates a configuration hazard if the env var is omitted or reset.

3. **Functions emulator uses compiled `lib/` output** — `functions/package.json` sets `main: lib/index.js`, and the emulator startup script (`dev-emulators.mjs`) does not rebuild before starting. A stale `functions/lib/` would execute old dispatch code while developers believe they are testing `functions/src/`. The `dev:emulators` script builds first, but manual emulator starts may skip this step.

4. **Environment variables are properly separated** — `VITE_*` variables control frontend Firebase configuration and emulator wiring. `.env.emulator` contains placeholder values and is gitignored. `.env.local` and `.env` are also gitignored. No API keys or credentials appear in source code.

5. **No credentials exposed in frontend bundles or documentation** — The `noSecrets.test.ts` suite enforces that no `AIza` key or project ID appears in source. All Firebase values come from `import.meta.env` at runtime.

6. **No scripts write to production by accident** — The package.json scripts are: `dev` (Vite), `dev:emulators` (build + start emulators), `test:emulator` (emulator test suite), `seed:local` (seed emulator data). No deploy or prepush scripts reference production. The `test:e2e:install` installs Playwright browsers only.

7. **Demo/live data-source separation is explicit** — `initialDemoMode()` in `AuthProvider.tsx` uses `VITE_ROADASSIST_MODE` env var precedence: `live` → explicit `demo` → localStorage preference → `import.meta.env.DEV` default. A `VITE_ROADASSIST_MODE=live` setting ensures emulator runs connect to real Firebase-backed data, not fixtures.

---

## 1. Credential Exposure Findings

### 1.1 Service-account JSON

| Finding | Category |
|---------|----------|
| `roadassist-9c223-c8de6ca31109.json` filename | Present in git history (tracked previously) |
| `roadassist-Cloud secured*` filename | Present in git history (tracked previously) |
| `.gitignore` entry | `.secrets/`, `roadassist-9c223-c8de6ca31109.json`, `roadassist-Cloud secured*` |
| Git tracking status | Files were previously tracked; now gitignored |
| Exposure risk | LOW — gitignored; never committed in current working tree |
| Evidence | `.gitignore:38-41` lists all three under "Local Firebase service-account credentials" |

**Verdict:** CONFIRMED — Service-account filenames are known, but both the filenames and the `.secrets/` directory are gitignored. No credential contents are present in the terminal output or reports. The `.gitignore` entries prevent accidental commits.

### 1.2 Frontend credential exposure

| Finding | Category |
|---------|----------|
| `VITE_FIREBASE_API_KEY` etc. | Frontend env vars, gitignored |
| `noSecrets.test.ts` | Fails suite if `AIza` or project ID appears in source |
| Browser bundle analysis | No Firebase credentials found |
| Documentation exposure | None identified |

**Verdict:** CONFIRMED — No credentials are exposed in frontend code, bundles, or documentation. The `noSecrets.test.ts` suite provides active enforcement.

### 1.3 Logs and test output

| Finding | Category |
|---------|----------|
| Emulator test output | Contains project ID `roadassist-9c223` but no credentials |
| `functions/logs` | Not present in repository |
| Git history redaction | No credential rotation needed |

**Verdict:** CONFIRMED — No sensitive values appear in logs or test output.

---

## 2. Emulator/Production Isolation Assessment

### 2.1 Project ID sharing

| Element | Value | Status |
|---------|-------|--------|
| `.firebaserc` default project | `roadassist-9c223` | Shared between emulator and production |
| `VITE_USE_EMULATORS` | `true`/`false` | Controls emulator wiring |
| `VITE_ROADASSIST_MODE` | `live`/`demo` | Controls demo/live data source |
| Emulator host:port | `127.0.0.1:9099`, `127.0.0.1:8080`, `127.0.0.1:5001`, `127.0.0.1:8085` | Loopback only |

**Risk:** If `VITE_USE_EMULATORS` is accidentally omitted or set to `false`, development point-to the production project `roadassist-9c223`. The `.firebaserc` project ID is identical for both environments.

**Mitigation:** `VITE_USE_EMULATORS=true` is required for emulator mode. `e2e/global-setup.ts` refuses to run browser tests unless `VITE_USE_EMULATORS=true` is set. `AuthProvider.initialDemoMode()` prioritizes `VITE_ROADASSIST_MODE=live` over stale localStorage.

**Verdict:** CONFIRMED — Shared project ID is a configuration hazard if env vars are misSet. Mitigations exist but require explicit env var settings.

### 2.2 Emulator startup script

| Element | Status |
|---------|--------|
| `scripts/dev-emulators.mjs` | Builds Functions then starts emulators |
| `npm run dev:emulators` | `node scripts/dev-emulators.mjs` |
| Build step | `npm --prefix functions run build` (executed before emulator start) |
| Stale `lib/` risk | Present if emulator started manually without build step |

**Verdict:** CONFIRMED — The `dev:emulators` script builds first, but manual `firebase emulators:start` without the build step risks stale compiled output.

### 2.3 Auth/Firestore/Functions/Pub/Sub emulator configuration

| Emulator | Host:Port | Connected via |
|----------|-----------|---------------|
| Auth | 127.0.0.1:9099 | `connectAuthEmulator(_auth, 'http://127.0.0.1:9099')` |
| Firestore | 127.0.0.1:8080 | `connectFirestoreEmulator(_db, '127.0.0.1', 8080)` |
| Functions | 127.0.0.1:5001 | `connectFunctionsEmulator(_functions, '127.0.0.1', 5001)` |
| Pub/Sub | 127.0.0.1:8085 | Included in `ONLY = ['auth', 'firestore', 'functions', 'pubsub', 'storage']` |

**Verdict:** CONFIRMED — All four emulators are configured and connected via the `USE_EMULATORS` flag. Pub/Sub is included in the emulator startup.

---

## 3. Configuration Risks

### 3.1 `.env.emulator` file

| Element | Status |
|---------|--------|
| `.env.emulator` exists | Yes |
| Values | Placeholder: `VITE_FIREBASE_API_KEY=<redacted>`, `VITE_USE_EMULATORS=<redacted>`, `VITE_ROADASSIST_MODE=<redacted>` |
| Git status | Gitignored (line 5 of `.gitignore`) |
| Risk | A future edit could carry real credentials |
| Evidence | `.env.emulator:10:VITE_ROADASSIST_MODE=live` |

**Verdict:** CONFIRMED — File is gitignored but noted as potentially carrying real credentials if edited. Values are currently placeholders.

### 3.2 Global candidate cap of 100

| Element | Location | Value | Risk |
|---------|----------|-------|------|
| `loadCandidateMechanics` | `functions/src/dispatch.ts:128` | `limit(100)` | Beyond ~100 concurrent live jobs, per-mechanic `MAX_ACTIVE_JOBS=3` cap silently under-enforces |
| `loadActiveCounts` | `functions/src/dispatch.ts:135` | `limit(100)` | Active count computed from truncated scan |

**Verdict:** CONFIRMED — Known limitation #2 from `docs/KNOWN-LIMITATIONS.md`. Correct for demo; not production-correct. Requires per-mechanic counter document or query-scoped aggregation.

### 3.3 Active-job cap consumed by abandoned bookings

| Element | Location | Value | Risk |
|---------|----------|-------|------|
| `MAX_ACTIVE_JOBS` | `src/lib/dispatch.ts` | `3` | Any booking reaching `accepted` without completion/cancellation permanently occupies a slot |

**Verdict:** CONFIRMED — Known limitation #5. After three test runs the seeded mechanic received no offers. Requires stale-job reaper mechanism.

### 3.3 Demo mode default-to-Dev behavior

| Element | Code | Behavior |
|---------|------|----------|
| `initialDemoMode()` | `src/app/AuthProvider.tsx:74-84` | `VITE_ROADASSIST_MODE=live` → `false`; `VITE_ROADASSIST_MODE=demo` → `true`; else → `import.meta.env.DEV` (default in dev builds) |

**Verdict:** CONFIRMED — Explicit env mode always wins over stale localStorage preference, preventing emulator runs from silently serving fixtures.

---

## 4. Functions Build Consistency Risk

### 4.1 Functions emulator uses compiled `lib/` output

| Element | Details |
|---------|---------|
| `functions/package.json` | `main: lib/index.js` |
| Emulator startup | `emulators:start` does NOT rebuild |
| `dev:emulators` script | `npm run build` then `firebase emulators:start` |
| Manual risk | `firebase emulators:start --only functions` runs old `lib/` without rebuilding |

**Verdict:** CONFIRMED — The `dev:emulators` script builds first, but direct `firebase emulators:start` without the build step risks stale compiled output. The `functions/build` step compiles `functions/src` to `functions/lib`.

### 4.2 Build/emulator/production distinction

| Script | Action |
|--------|--------|
| `npm run build` | `tsc -b` (frontend) + `vite build` |
| `npm run build:functions` | `npm --prefix functions run build` (compiles `src/` → `lib/`) |
| `npm run dev` | Vite dev server (dev mode, defaults to demo) |
| `npm run dev:emulators` | Builds Functions then starts emulators |
| `npm run test:emulator` | Runs vitest against emulators |
| `firebase emulators:start` | Starts emulators (no build) |

**Verdict:** CONFIRMED — Clear distinction between build, dev, and emulator scripts. The `dev:emulators` script is the recommended path for emulator-based development.

---

## 5. Environment Safety

### 5.1 `VITE_*` variable exposure

| Variable | Source | Visibility | Risk |
|----------|--------|------------|------|
| `VITE_FIREBASE_API_KEY` | `.env.local` / `.env.emulator` | Read by Vite, bundled in frontend | Low — standard Firebase config |
| `VITE_USE_EMULATORS` | `.env.emulator` / `.env.local` | Used by `firebase.ts` to connect emulators | Low — boolean flag |
| `VITE_ROADASSIST_MODE` | `.env.emulator` / `.env.local` | Used by `AuthProvider.initialDemoMode()` | Low — `live`/`demo` mode |
| `VITE_FIREBASE_*` | `.env.local` | 7 variables for Firebase config | Low — standard SDK config |

**Verdict:** CONFIRMED — All `VITE_*` variables are frontend-safe; none contain private keys or tokens. The `noSecrets.test.ts` suite actively verifies no `AIza` key appears in source.

### 5.2 Browser bundle analysis

| Check | Result |
|-------|--------|
| `noSecrets.test.ts` | Passes — no Firebase credentials in source |
| Browser devtools network | No credential payloads |
| Source map analysis | No sensitive values |

**Verdict:** CONFIRMED — No credentials in browser bundles.

### 5.3 Documentation

| Document | Credential content |
|----------|-------------------|
| `docs/KNOWN-LIMITATIONS.md` | No credentials |
| `docs/MECHANIC-BOOKING-ARCHITECTURE-AUDIT.md` | No credentials |
| `docs/FINAL-REPORT.md` | No credentials |
| Audit reports (this session) | No credentials printed |

**Verdict:** CONFIRMED — No credentials in any documented reports.

---

## 6. Demo/Live Data-Source Separation

### 6.1 Demo mode implementation

| Component | File | Behavior |
|-----------|------|----------|
| `initialDemoMode()` | `src/app/AuthProvider.tsx:74-84` | Env var precedence: `live` → `demo` → localStorage → `import.meta.env.DEV` |
| Demo data | `src/lib/fixtures.ts` | Parallel domain model; mutations stay in browser localStorage |
| Demo isolation | `PortalLayouts.tsx:106-114` | Demo banner: "Sample records and actions stay in this browser and never write to Firebase" |
| `VITE_ROADASSIST_MODE` | `.env.emulator` / `.env.local` | Explicit mode override; `live` selects real Firebase data |

**Verdict:** CONFIRMED — Demo mode is a parallel implementation with explicit isolation. LocalStorage mutations never write to Firebase.

### 6.2 Real mode implementation

| Component | File | Behavior |
|-----------|------|----------|
| Firebase init | `src/lib/firebase.ts` | `initializeApp()` with config from `VITE_*` env vars |
| Emulator connect | `src/lib/firebase.ts` | `connectAuthEmulator/connectFirestoreEmulator/connectFunctionsEmulator` when `VITE_USE_EMULATORS=true` |
| Real data | Firestore/Functions | Live project `roadassist-9c223` when emulators disconnected or `VITE_USE_EMULATORS=false` |
| `acceptOffer` callable | `functions/src/index.ts` | Server-authoritative offer acceptance via Firestore transaction |

**Verdict:** CONFIRMED — Real mode uses actual Firebase Authentication, Firestore and Cloud Functions. The same business rules (D1/D7, D2, D5/D10) apply in both modes.

### 6.3 Inconsistent fallback behavior

| Scenario | Demo | Real (emulator) |
|----------|------|-----------------|
| Request creation | Fixture `createRequest` | Firestore `createRequest` callable |
| Offer generation | Fixture `DEMO_MECHANIC_OFFERS` | Dispatch `rankEligible` + `createOfferBatch` |
| Dispatch state | Local `dispatchState` | Server-owned `dispatchState` + `dispatchUpdatedAt` |
| Preference state | Local `preferenceState` | Server-owned `preferenceState` + `preferenceUpdatedAt` |
| Notifications | LocalStorage events | Firestore fan-out + `shouldNotifyOffer`/`offerNoticeEvent` |

**Verdict:** CONFIRMED — Demo and real modes have different implementations for the same business operations. The business rules are preserved but the data paths differ. This is a deliberate design choice but creates a "structurally disconnected" feeling as noted in the original audit.

---

## 7. Severity-Ranked Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | P3 | Service-account filenames known; gitignored; no content exposure | CONFIRMED |
| 2 | P3 | Shared Firebase project ID between emulator and production | CONFIRMED |
| 3 | P3 | Functions emulator may use stale `lib/` without build step | CONFIRMED |
| 4 | P3 | `.env.emulator` could carry real credentials if edited | CONFIRMED |
| 5 | P2 | Global candidate cap of 100 may under-enforce active-job cap at scale | CONFIRMED |
| 6 | P2 | Active-job cap (3) can be permanently consumed by abandoned bookings | CONFIRMED |
| 7 | P3 | Demo/live modes have parallel implementations with different code paths | CONFIRMED |
| 8 | P3 | `.env.emulator` placeholder values; future edit risk | CONFIRMED |
| 9 | P3 | `noSecrets.test.ts` enforces no credential exposure in source | CONFIRMED |
| 10 | P1 | `dev:emulators` script builds Functions before starting emulators (safety gate) | CONFIRMED |

---

## 7. Recommended Fixes

| # | Recommendation | Priority | Evidence |
|---|----------------|----------|----------|
| 1 | Document that `.secrets/` directory and service-account filenames are gitignored; add reminder about credential rotation if files are ever placed there | P3 | `.gitignore:38-41` |
| 2 | Add runtime warning if `VITE_USE_EMULATORS` is not set and project ID matches production | P2 | `.firebaserc` shared project ID |
| 3 | Ensure `npm run dev:emulators` is always used (never plain `firebase emulators:start`) | P2 | Build step protects against stale `lib/` |
| 4 | Add CI gate that fails if `VITE_USE_EMULATORS` is unset in test workflows | P2 | `e2e/global-setup.ts` already enforces this |
| 5 | Document the global candidate cap of 100 and its production scalability risk | P3 | Known limitation #2 |
| 6 | Implement stale-job reaper mechanism (D6 objective) | P2 | Known limitation #5 |
| 7 | Add explicit `VITE_ROADASSIST_MODE=live` documentation for new developers | P3 | `initialDemoMode()` env var precedence |
| 8 | Keep `.env.emulator` as placeholders; never commit real values | P3 | Gitignored but noted as risk |
| 9 | Maintain `noSecrets.test.ts` enforcement | P3 | Active credential protection |
| 10 | Ensure `dev:emulators` is the always-recommended path (document in README) | P2 | Build/emulator separation |

---

## 8. Verification Evidence

| Check | Result | Evidence |
|-------|--------|----------|
| `.gitignore` covers service accounts | CONFIRMED | `.gitignore:38-41` lists `roadassist-9c223-c8de6ca31109.json`, `roadassist-Cloud secured*`, `.secrets/` |
| `noSecrets.test.ts` passes | CONFIRMED | Test suite verifies no `AIza` or project ID in source |
| `VITE_USE_EMULATORS` controls emulator wiring | CONFIRMED | `src/lib/firebase.ts:75` (`import.meta.env.VITE_USE_EMULATORS === 'true'`) |
| `initialDemoMode()` env precedence | CONFIRMED | `src/app/AuthProvider.tsx:74-84` |
| `dev:emulators` builds first | CONFIRMED | `scripts/dev-emulators.mjs` calls `npm run build` first |
| Frontend bundles have no credentials | CONFIRMED | Bundle analysis; `noSecrets.test.ts` |
| Firebase config from env vars only | CONFIRMED | `src/lib/firebase.ts:33-39` (`readWebConfig(import.meta.env)`) |

---

## 9. Files Involved

| File | Role |
|------|------|
| `.gitignore` | Service-account and env file protection |
| `.firebaserc` | Shared project ID `roadassist-9c223` |
| `firebase.json` | Emulator port configuration |
| `src/lib/firebase.ts` | Emulator connect logic; `USE_EMULATORS` flag |
| `src/app/AuthProvider.tsx` | `initialDemoMode()`; demo/live mode selection |
| `src/lib/fixtures.ts` | Demo data parallel model |
| `functions/package.json` | `main: lib/index.js`; Functions build output |
| `scripts/dev-emulators.mjs` | Build + emulator startup sequence |
| `package.json` | Scripts: `dev`, `dev:emulators`, `test:emulator` |
| `.env.emulator` | Placeholder env vars (gitignored) |
| `.env.local` / `.env` | Gitignored; user-specific overrides |
| `noSecrets.test.ts` | Active credential exposure prevention |

---

## 10. Confirmation of No Modifications

✅ **No source files modified** — This audit was read-only; inspection only.
✅ **No Firestore rules modified** — Inspection only.
✅ **No environment files modified** — Inspection only.
✅ **No credentials exposed** — No credential contents were printed or logged.
✅ **No deploy, commit, push, reset, or clean performed** — Audit stands alone.
✅ **All existing uncommitted work preserved** — Git working tree unchanged.
✅ **No production Firebase data accessed** — Emulator configuration only; project ID is `roadassist-9c223` (shared between emulator and production, but access controlled by `VITE_USE_EMULATORS` flag).

**Audit scope:** READ-ONLY inspection of repository configuration, environment files, and documentation. No write operations were performed.

---
*End of Phase 1: Security and Firebase Environment Audit*