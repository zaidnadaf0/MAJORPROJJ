# RoadAssist Faculty Demonstration Runbook

This runbook uses **local emulators + seeded fictional data only**. It never
touches production Firebase and never requires paid services.

## Prerequisites
- Node.js >= 20 (project tested on Node 24)
- Java runtime (Firebase Firestore/PubSub emulators)
- Optional: Python virtualenv at `ml/.venv` for the FastAPI recommendation service

## Startup (three terminals)

Terminal 1 — emulators (builds Functions first, then starts Auth, Firestore,
Functions, PubSub and Storage):

```bash
npm run dev:emulators
```

Terminal 2 — seed the local demo data (run once the emulators report ready):

```bash
npm run seed:local
```

Terminal 3 — frontend pointed at the emulators:

```bash
npx vite --mode emulator --host 127.0.0.1 --port 5173
```

Open <http://127.0.0.1:5173/>.

Optional — ML ranking service (without it the app shows the clearly labelled
deterministic fallback):

```bash
cd ml
.venv/bin/uvicorn api.main:app --port 8000
```

Then start Vite with the ML URL (set `VITE_ML_API_URL` in `.env.emulator` or the
shell). ML only changes **display order**; server-side dispatch is authoritative.

## Test accounts (local emulator only)

Password for all three seeded accounts: `Test!2345`

| Role | Email | Login page |
| --- | --- | --- |
| Customer | cust@roadassist.test | `/customer/login` |
| Mechanic | mech@roadassist.test | `/mechanic/login` |
| Admin | admin@roadassist.test | `/admin/login` |

These exist only in the emulator. They are not production credentials.

## Full demonstration sequence

1. Customer logs in at `/customer/login`.
2. Dashboard shows the seeded vehicle and active request.
3. Open **Request Help** and create an assistance request (vehicle, problem
   category, location).
4. Allow browser GPS, or use the manual location/ map pin fallback.
5. The **AI-Powered Mechanic Recommendations** card appears on
   **Find Mechanics**. If the ML service is down it says
   “Deterministic fallback”.
6. Explain the model: Logistic Regression, artifact `roadassist-logreg-v1`,
   23,310 synthetic training rows, offline held-out test Hit@3 0.8264 / NDCG@3 0.6882.
   State clearly that these are offline metrics on synthetic data.
7. Customer selects a mechanic (or lets dispatch rank the eligible set).
8. Backend validates eligibility/availability/active-job limits and dispatches.
9. Mechanic logs in at `/mechanic/login` and accepts the offer.
10. Mechanic marks **On the way** then **Arrived**.
11. Mechanic records the diagnosis.
12. Mechanic submits the estimate.
13. Customer approves the estimate.
14. Mechanic completes the service.
15. Mechanic records the payment (cash/UPI — recorded, not gateway-verified).
16. Customer opens **Service History** for the receipt.
17. Admin logs in at `/admin/login` and reviews the request plus the
    **ML model information** card on the Operations dashboard.

## Short, focused demos

- **ML recommendations:** Find Mechanics → recommendation card → fallback label.
- **AI Mechanic Guide:** `/guide` → answer follow-ups → safety warnings.
  It offers possible causes, not a confirmed diagnosis, and has no LLM backend.
- **Admin operations:** `/admin` KPIs, `/admin/analytics` charts,
  `/admin/approvals` queue, `/admin/logs` audit view.
- **Themes:** use the sun / moon / monitor control in the portal header (or
  Settings → Appearance) to pick Light / Dark / System. The choice persists
  after refresh and follows the OS in System mode.

## Troubleshooting

- **Emulators unavailable:** confirm ports 9099/8080/5001/8085 are free, rerun
  `npm run dev:emulators`, then `npm run seed:local`.
- **ML unavailable:** the directory labels the deterministic fallback; no
  action required for a demo.
- **GPS denied:** use manual coordinates or the map pin.
- **No eligible mechanics:** the request stays open and the scheduled offer
  sweep retries. Explain the bounded offer window.
- **Refresh mid-demo:** the request persists in Firestore; reopen Tracking.
- **Wrong portal data:** you are probably in Demo mode. Settings shows the
  active mode; “live” records come from the emulator.

## Known limitations (state these honestly)

- ML training data is synthetic; reported metrics are offline evaluation.
- Offline cash/UPI payments are recorded by an actor, not independently verified.
- Distance and ETA are straight-line approximations, not road-aware routing.
- Production Firebase runtime, production security rules deployment and
  real-device GPS accuracy are not verified.
- Firebase vendor bundle is large; a chunk-size warning is expected.

## Verification commands

```bash
npm run typecheck
npm run lint
npm run build
npm run build:functions
npm test
npm run test:emulator:rules
cd ml && .venv/bin/python -m pytest -q
npm run test:e2e
```
