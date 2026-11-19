# ROADASSIST — AI/ML AND CHATBOT BLUEPRINT

## Status: Repository-Verified ML Inventory and Integration Blueprint

**Critical declaration**: No production ML model is integrated. The ML system is rule-based only, retained as a trust boundary, with optional future model integration behind a feature flag.

---

## 1. ML Models and Classification — Actual Inventory

### 1.1 Trained Models — Status: NONE IN PRODUCTION

| Artifact | Status | Notes |
|---|---|---|
| `ml/model/metadata.json` | Committed artifact | Name: `roadassist-logreg`, Version: `roadassist-logreg-v1` |
| `ml/benchmarks/test_results.json` | Committed artifact | Synthetic training data, metrics on test split only |
| `mlModelInfo.ts` module | Runtime source | Static metadata — no network fetch, no CORS, no runtime model |
| `train_final.py` / `baseline.py` | Training scripts | Synthetic data (seed 42); real-world re-training not performed |

### 1.2 Rule-Based Classifier — STATUS: ACTIVE, PRODUCTION-READY

**`classifyProblem(text)`** — Full classification with category + safety triage:

```
Input: problemText string
Output: { suggestedCategory, matchStatus, safety: SafetyTriage, originalText }
```

**Classification logic**:
1. **Term-matching** against `CATEGORY_TERMS` (20 term sets across 6 categories)
   - `tow`: winch-out, accident, collision, crash, debris, broken-down-tow
   - `engine`: overheating, overheating, head-gasket, timing-belt, timing-chain
   - `battery`: battery, won't start, cranking, dead, alternator
   - `flat-tyre`: flat, puncture, tyre, tire, wheel
   - `other`: general, unsure, help, assistance
   - `general`: catch-all for uncategorized

2. **Tie-break by CATEGORY_PRIORITY order**: `[tow, engine, battery, flat-tyre, other, general]`

3. **Safety triage** via `triageSafety(text)` (separate pattern matching):
   - `EMERGENCY_PATTERNS`: fire, fuel leak, smoke, crash, live lane, electrical arcing
   - `CAUTION_PATTERNS`: overheating, brake fail, steering fail, smoke/burning smell, fluid leak
   - `NORMAL`: none of the above

4. **Result**: Category with highest priority match + safety level + match status (`matched`/`uncertain`)

**Do not describe a rule-based classifier as a trained ML model.** The classifier is frozen term-matching logic, not a model inference pipeline.

### 1.3 `inferCategory(text)` — Simpler Classification

- Term-matching only, returns `GuideCategory` (no safety triage)
- Used where full classification is unnecessary

### 1.4 `triageSafety(text)` — Safety Classification

- Returns: `{ level: SafetyLevel; title: string; message: string; actions: string[] }`
- `SafetyLevel`: `'normal' | 'caution' | 'emergency'`
- Emergency patterns take absolute precedence

### 1.5 `ML_MODEL_INFO` Static Artifact

| Field | Value |
|---|---|
| Name | `roadassist-logreg` |
| Version | `roadassist-logreg-v1` |
| Algorithm | `LogisticRegression` |
| Feature schema | `m9-features-v1` |
| Training rows | `23310` |
| Trained at | `2026-10-07T09:13:58.710968+00:00` |
| Dataset | `SYNTHETIC development data (seed 42) — MUST revalidate/retrain on real history` |
| Synthetic training data | `true` |
| Evaluation (test split) | Hit@3: `0.8264`; NDCG@3: `0.6882`; ROC AUC: `0.8701`; Groups: `484`; Latency p95: `0.133ms` |
| Limitations | 1. Trained/evaluated on synthetic data; real-world quality not established<br>2. Offline metrics describe ranking model only — not proof of better roadside outcomes<br>3. ML orders displayed recommendations; server-side eligibility/dispatch remain authoritative<br>4. Coverage/ETA use straight-line geometry, not live traffic or road networks<br>5. 1.2s client timeout falls back to deterministic ordering when service unavailable |

**Disclosure**: "Offline test-split metrics on synthetic data; display ranking only, dispatch stays authoritative."

### 1.6 Trust Boundary — `parseUntrustedGuideResponse(raw, userText)`

- Model output never overrides deterministic triage
- Local triage result always wins over model-provided safety fields
- Returns null to let caller use deterministic fallback
- **Purpose**: If/when a trained model is integrated, this parser ensures it cannot override server-side business rules

---

## 2. Mechanic Guide — Enhanced Customer-Facing Feature

### 2.1 Guide Categories (from `GuideCategory` type)

| Category | Term Set | Typical Scenarios |
|---|---|---|
| `tow` | winch-out, accident, collision, crash, debris | Vehicle immobile, needs towing |
| `engine` | overheating, head-gasket, timing-belt, timing-chain | Engine malfunction, strange noises |
| `battery` | battery, won't start, cranking, dead, alternator | No start, electrical failure |
| `flat-tyre` | flat, puncture, tyre, tire, wheel | Tire damage, pressure loss |
| `other` | general, unsure, help, assistance | Uncategorized breakdown |
| `general` | — | Catch-all, unknown |

### 2.2 Safety Triage — Per Scenario

Each of the 7 demo bot scenarios includes safety signals:

| Scenario | Emergency Patterns | Caution Patterns | Normal |
|---|---|---|---|
| `battery` | Fuel smell + no start | — | — |
| `flat-tyre` | — | — | Normal (if no other patterns) |
| `engine-overheating` | Smoke from engine bay | Temperature warning red | — |
| `low-tyre-pressure` | — | — | Normal (if no other patterns) |
| `engine-warning` | — | Engine running roughly | — |
| `brakes` | — | Brake fail, spongy, grinding | — |
| `fuel` | Fuel leak, smell of fuel | — | — |
| `unknown` | Fire, smoke, fuel smell, brake/steering failure, injury, traffic danger | — | — |

**Safety rule**: The guide **must never** encourage dangerous repairs or tell a customer to continue driving when the situation is unsafe. If `level === 'emergency'`, the guide must recommend immediate professional assistance and advise against driving.

### 2.3 Demo Bot Conversation Flows (7 scenarios — preserved exactly)

Each scenario has `yes`/`no`/`unsure` choices with guidance steps and safety signals. **No LLM integration** — all flows are rule-based decision trees.

#### 2.3.1 `battery` scenario flow
1. "Vehicle will not start / battery problem"
2. Question: "When you turn the key or press start, do you hear clicking or see dim dashboard lights?"
3. **yes**: "Could be battery or alternator — likely flat battery. If clicking, try jump-start. If no click, may need tow."
4. **no**: "Are all electrical accessories (lights, radio) off? Try turning them off and restarting."
5. **unsure**: "Check if headlights or interior lights are on — these drain battery."

#### 2.3.2 `flat-tyre` scenario flow
1. "Flat tyre / puncture"
2. Question: "Is the tyre visibly flat or is the vehicle pulling strongly to one side?"
3. **yes**: "Do not drive on a flat tyre — further damage. If you have a spare, change it. Otherwise, request tow."
4. **no**: "Check tyre pressure if you have a gauge. Minor pressure loss may be safe to limp to service."

#### 2.3.3 `engine-overheating` scenario flow
1. "Engine overheating"
2. Question: "Is the temperature warning red, or do you see steam from the engine bay?"
3. **yes** (red warning or steam): "STOP driving immediately. Engine damage risk. Pull over, turn off engine, request emergency assistance."
4. **no** (warning on but no steam): "Reduce speed, find safe location, check coolant level after cooling."

#### 2.3.4 `low-tyre-pressure` scenario flow
1. "Low tyre pressure"
2. Question: "Is the pressure warning on, or does the tyre look visibly soft?"
3. **yes** (warning on): "Check pressure at nearest service station. Do not drive long distances on under-inflated tyre."
4. **no** (visibly soft): "If you have a spare and can change it, do so. Otherwise, request assistance."

#### 2.3.5 `engine-warning` scenario flow
1. "Engine warning light"
2. Question: "Is the warning light flashing, or is the engine running roughly or losing power?"
3. **yes** (flashing or rough running): "Reduce speed safely. Flashing light = misfire risk. Request assistance if power loss continues."
4. **no** (steady light, engine runs fine): "Monitor for other symptoms. If warning persists, request diagnosis."

#### 2.3.6 `brakes` scenario flow
1. "Brake problems"
2. Question: "Are the brakes weak, spongy, grinding, or not responding normally?"
3. **weak/spongy**: "Brake fluid may be low or have air in lines. Stop driving safely. Request assistance — brake failure risk."
4. **grinding**: "Brake pads completely worn. Do not drive. Request tow immediately."
5. **not responding**: "Complete brake failure risk. Pull over safely. Request emergency assistance."

#### 2.3.7 `fuel` scenario flow
1. "Fuel problem"
2. Question: "Do you smell fuel, see a leak, or suspect the vehicle is simply out of fuel?"
3. **smell fuel/see leak**: "STOP driving. Fire risk. Move vehicle away from ignition. Request emergency assistance — do not restart engine."
4. **out of fuel**: "Pull over safely. Add fuel from container. If no container, request assistance."

#### 2.3.8 `unknown` scenario flow
1. "Unknown breakdown"
2. Safety gate: "Is there fire, smoke, a fuel smell, brake or steering failure, injury, or immediate traffic danger?"
3. **yes**: "EMERGENCY. Do not continue driving. Move to safe location if possible. Call emergency services. Request immediate assistance."
4. **no**: "Describe the problem — mechanic guide will classify and recommend next steps."

### 2.4 `buildFallbackReply(text)` — Rule-Based Fallback

When model is unavailable (default), returns advice + safety message:
- Category-based guidance
- Safety level from `triageSafety`
- "If the situation feels unsafe, stop and request professional assistance."
- Never fabricate model accuracy or prediction confidence

### 2.5 `validateGuideDraft(draft, vehicles, safety)` — Draft Validation

- Safety level must be one of `normal`/`caution`/`emergency`
- Vehicle selection must match ownerId
- Problem text length: 5-2000 chars (Firestore rules)
- Location validity: customerLat/customerLng must be finite if provided
- Combined text length check

### 2.6 Guide-to-Booking Flow

```
Customer problem report
        ↓
classifyProblem() → suggestedCategory + safety triage
        ↓
Safety check: if emergency → display warning + mandatory escalation
        ↓
Category selection (pre-filled from classifier, user can override)
        ↓
Vehicle selection
        ↓
Location detection (auto + manual override)
        ↓
Request creation with problemCategory + problemText
        ↓
Dispatch offers → Mechanic acceptance → Booking workflow
```

**The ML system remains advisory. It must never independently override:**
- Mechanic eligibility
- Server-side dispatch rules
- Capacity limits
- Authorization
- Safety enforcement
- Financial approval
- Booking state transitions

---

## 3. Chatbot — Professional Interface and Functionality

### 3.1 Chatbot Interface Specification

| Feature | Description |
|---|---|
| **Conversation UI** | Drawer/slide-in panel; scrollable message history; input at bottom; send via button or Enter key |
| **Welcome message** | "RoadAssist Mechanic Guide — I can help you with breakdown problems, safety guidance, and connect you to a mechanic." |
| **Quick-start suggestions** | 3-4 quick taps: "My car won't start", "I have a flat tyre", "Engine warning light", "I need to talk to a mechanic" |
| **Contextual responses** | Each user input → classifier + safety triage → categorized response |
| **Symptom collection** | Structured questions per scenario (7 flows, preserved exactly) |
| **Guidance and safety messages** | Rule-based; never dangerous advice; always escalation path |
| **Mechanic Guide connection** | "View full mechanic guide" CTA after symptom collection |
| **Breakdown reporting transition** | "Start request" CTA after guide consultation — navigates to ServicesPage |
| **Conversation state** | Persisted in localStorage for session recovery; cleared on page unload |
| **Error handling** | Fallback reply on unexpected input; "I'm having trouble understanding — let me connect you to the mechanic guide." |
| **Fallback responses** | `buildFallbackReply(text)` — rule-based, never "I don't know" without offering guidance |
| **Automated vs. human distinction** | Clear labeling: "Mechanic Guide (automated)" vs. "Talk to human assistance" |

### 3.2 Conversation Flow — General Pattern

```
User opens chatbot
        ↓
Welcome + quick-start suggestions
        ↓
User selects quick-start or types custom problem
        ↓
classifyProblem(input) → category + safety triage
        ↓
If safety === emergency:
    → Display safety warning + "Contact emergency services if immediate danger"
    → Offer: "Start request" or "Talk to human assistance"
    → If user confirms → navigate to ServicesPage with pre-filled category
Else:
    → Display category-based guidance + safety level
    → Offer related questions (scenario-specific)
    → User responds → continue flow
        ↓
If user indicates "start request":
    → Navigate to ServicesPage with problemCategory pre-filled
    → Optional: pre-filled problemText from conversation
        ↓
If user says "talk to human assistance":
    → Display: "A human assistant will be with you shortly." + contact options
        ↓
```

### 3.3 Chatbot State Machine

| State | Description | Transition |
|---|---|---|
| `welcome` | Initial state; welcome + quick starts displayed | User selects quick-start or types custom problem |
| `classifying` | `classifyProblem()` running; result being processed | Result processed → guidance state or emergency state |
| `guidance` | Category-based safety message + questions displayed | User responds → continue, start request, or human assistance |
| `emergency` | Safety level = emergency; mandatory warnings displayed | User chooses: "Contact emergency services" / "Start request" / "Cancel" |
| `requesting` | Transition to breakdown reporting | Navigate to ServicesPage (or create request directly) |
| `completed` | Conversation ending | Close chatbot, optional feedback |

### 3.4 Chatbot — What It Does NOT Do

- ❌ Does not independently classify or dispatch
- ❌ Does not override mechanic eligibility
- ❌ Does not bypass capacity limits
- ❌ Does not override safety enforcement
- ❌ Does not handle financial approval
- ❌ Does not transition booking states
- ❌ Does not provide LLM-generated answers without rule-based fallback
- ❌ Claims LLM functionality — **no actual LLM integration exists**

### 3.5 Chatbot — What It DOES Do

- ✅ Provides rule-based symptom classification
- ✅ Delivers safety triage with emergency/caution/normal classification
- ✅ Guides customer through breakdown description
- ✅ Offers 7 predefined demo bot scenario flows
- ✅ Connects to Mechanic Guide classification
- ✅ Transitions customer to breakdown reporting (ServicesPage)
- ✅ Maintains conversation state for session recovery
- ✅ Falls back to deterministic responses on unexpected input
- ✅ Clearly distinguishes automated guidance from human assistance

---

## 4. AI/ML Integration Flow

### 4.1 End-to-End Flow Diagram

```
Customer breakdown input
        │
        ▼
-------------------------------------------> (Mechanic Guide — rule-based)
│  classifyProblem(text) → suggestedCategory    │
│  triageSafety(text) → safety level           │
│  buildFallbackReply(text) → advice + safety │
        │                                       │
        ▼                                       ▼
Customer sees: category + safety message   Mechanic system: category + safety
        │                                       │
        ▼                                       ▼
        → Mechanic Directory (filter by category)  → Dispatch offers
        │                                       │
        ▼                                       ▼
Customer → ServicesPage → Request creation → Offer → Accept → Booking workflow
```

### 4.2 Chatbot Entry Point

```
Customer opens chatbot
        ↓
Welcome + quick-start suggestions
        ↓
User provides symptom text
        ↓
classifyProblem(userText) → category + safety
        ↓
Display result: "This looks like a [category] issue. [Safety message]"
        ↓
User continues or starts request
        ↓
Navigate to ServicesPage (category pre-filled from classifier)
```

### 4.3 ML System Constraints (Absolute)

The ML system must remain **advisory only**. It must never independently override:

1. **Mechanic eligibility** — Server-side dispatch rules determine which mechanics are eligible
2. **Server-side dispatch rules** — `acceptOffer` callable validates all eligibility
3. **Capacity limits** — `MAX_ACTIVE_JOBS = 3` enforced by Firestore rules + transactions
4. **Authorization** — Custom claims + Firestore rules are the sole authorization boundary
5. **Safety enforcement** — `triageSafety` emergency patterns always win; guide never overrides
6. **Financial approval** — Estimate and final amount approval are customer/admin decisions
7. **Booking state transitions** — State machine gates (estimate + final amount prerequisites) are server-enforced

### 4.4 Feature Flag: `ML_ENHANCED`

- **Default**: `false` — rule-based classifier only, no model lookups
- **When `true`**: Rule-based classifier is supplemented with offline model lookups only
- **Model lookups**: Read from committed artifacts (`mlModelInfo.ts`) only; no network fetch
- **Feature flag gate**: Admin dashboard display; no runtime model loading
- **Purpose**: Allows future trained model integration without breaking existing rule-based system
- **Safety**: When `false`, model outputs are completely ignored; `parseUntrustedGuideResponse` returns null

---

## 5. ML Presentation — Professional UI

### 5.1 Classification Result Display

When customer uses the mechanic guide or chatbot, display:

| Element | Description | Format |
|---|---|---|
| **Classification result** | `suggestedCategory` from `classifyProblem()` | "This looks like a **tow** issue" |
| **Confidence/probability** | Not applicable — rule-based, no probability | N/A (display "categorized by rules" not "95% confident") |
| **Recommended category** | `suggestedCategory` (may be overridden by user) | Pill tag: "Tow" / "Engine" / "Battery" etc. |
| **Explanation** | Brief rationale from term-matching | "Keywords: won't start, clicking sound → battery category" |
| **Model information** | Static artifact disclosure only | "Classification by rule-based system; trained model not integrated" |
| **Limitations** | Explicit and visible | "Trained on synthetic data; real-world quality not established" |
| **Relevant safety guidance** | `safety` from `SafetyTriage` | Emergency banner if `level === 'emergency'`; caution banner if `level === 'caution'` |

### 5.2 UI Component: ClassificationResult

```
<ClassificationResult
  category="tow"
  safetyLevel="normal"
  explanation="Keywords: won't start, clicking sound → battery category"
  modelDisclosure="Classification by rule-based system; trained model not integrated"
  limitations="Trained on synthetic data; real-world quality not established"
/>
```

- **Emergency safety level**: Full-width banner with `AlertBanner` component (danger tone), safety actions, "Do not continue driving" message
- **Caution safety level**: `AlertBanner` with warning tone, advisory message
- **Normal safety level**: Subtle badge or line below category pill

### 5.3 What ML Presentation Does NOT Include

- ❌ No prediction confidence scores (rule-based, no probabilities)
- ❌ No model accuracy claims (synthetic data only, not real-world validated)
- ❌ No "AI-powered" badging without qualified disclosure
- ❌ No runtime model fetching or network requests
- ❌ No model output that overrides deterministic triage

---