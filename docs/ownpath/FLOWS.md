# OwnPath workflow diagrams

The guest Translator is implemented and deterministic. Accounts, owner-isolated persistence and default-off sandbox billing **backend** are implemented in explicit demo-emulator mode. Human auth/billing/history UI, combined entry cutover, actual Stripe and Firebase cloud execution remain separate gates. No external AI model is integrated. Current evidence: [AB_EVIDENCE](AB_EVIDENCE.md); ordered pickup: [AB_NEXT_STEPS](AB_NEXT_STEPS.md). Diagrams describe intended composition, not completed UI or external acceptance.

## Current execution order and dependency gates

```mermaid
flowchart TD
  BASE["AB-00 scope, contracts, ownership — complete"] --> ACC["AB-01/03 accounts and owned storage backend — complete locally"]
  ACC --> BILL["AB-04 durable sandbox billing backend — complete with fake-provider acceptance"]
  ACC --> FE1["AB-02 human FE1 auth/account UI — awaiting reviewed delivery"]
  BILL --> FE2["AB-05 human FE2 pricing/billing/history UI — awaiting reviewed delivery"]
  ACC --> SDK["W5 official SDK emulator acceptance — complete; policy only safe-unavailable"]
  FE1 --> COMPOSE["Explicit coordinator shell/proxy/legacy cutover card"]
  FE2 --> COMPOSE
  COMPOSE --> UI["AB-06 combined authenticated UI and renewed-review acceptance"]
  SDK --> UI
  BILL --> STRIPE["Authorized test settings + isolated endpoint required"]
  STRIPE --> REAL["Actual Stripe hosted Checkout/Portal/lifecycle matrix"]
  ACC --> CLOUD["Separate cloud design + project/region/IAM/mail decisions"]
  CLOUD --> RECOVERY["Authorized cloud/mail/retention/backup-recovery acceptance"]
  UI --> HANDOFF["AB-07 handoff: measured results or explicit external blockers"]
  REAL -. "when authorized and executed" .-> HANDOFF
  RECOVERY -. "when authorized and executed" .-> HANDOFF
  HANDOFF --> OWNER["Separate release decision — no merge/deploy in this run"]
```

Existing guest/API transport/emulator checks are already measured separately; W5 exercises the official browser adapter without taking over human UI. AB-07 setup/evidence preparation can proceed before external gates, but complete cloud/payment acceptance cannot. Frozen contracts do not authorize consumers to change backend authority.

## Accounts: identity, session and recovery

```mermaid
flowchart TD
  GUEST["Guest Translator stays available"] --> ENTRY["Optional account entry — human FE1 delivery pending"]
  ENTRY --> POLICY["Password policy + confirmation; prevent duplicate submits"]
  POLICY --> ID["Official Firebase SDK creates identity in memory"]
  ID --> MAIL["Request verification action email"]
  MAIL --> CSRF["GET /api/auth/csrf establishes bound HttpOnly cookie"]
  CSRF --> EX["POST /api/auth/session with recent provider ID token"]
  EX --> OK{"Identity verified by server?"}
  OK -- No --> DENY["Neutral safe error; preserve recoverable input"]
  OK -- Yes --> PROFILE["UID-idempotent profile bootstrap/repair + session cookie"]
  PROFILE --> ACCOUNT["Trusted account status; Free until canonical paid entitlement"]
  ID -. "exchange unavailable" .-> PENDING["Identity created, session pending — login/retry, do not register again"]
  PROFILE -. "profile bootstrap unavailable" .-> REPAIR["Profile pending — retry account bootstrap"]
  MAIL -. "mail unavailable" .-> RESEND["Mail pending is distinct — explicit resend"]
  ACCOUNT --> ACTION["Validate action mode/code; apply email verification"]
  ACTION --> REFRESH["Reauthenticate/reload provider + exchange a fresh cookie"]
  REFRESH --> VERIFIED["Server observes verified identity AND verified token"]
  ENTRY --> RESET["Neutral reset request; validate code; confirm new password"]
  RESET --> ENTRY
  ACCOUNT --> LOGOUT["Current cookie logout or recent-auth all-session revocation"]
```

SDK credentials are cleared after credential operations; the HttpOnly app cookie is session authority. Invalid/used/expired action handling belongs to the UI and official SDK boundary; emulator acceptance is not mail-delivery or cloud password-policy acceptance. Shared shell/proxy retirement remains gated on reviewed frontend deliveries.

## Billing authority: return is only a status view

```mermaid
flowchart TD
  CATALOG["GET configured sandbox catalog; unavailable stays unavailable"] --> CLICK["Verified user explicitly chooses Pro; stable operation ID"]
  CLICK --> RESERVE["Server-owned customer/checkout reservations and inverse UID binding"]
  RESERVE --> CHECKOUT["Owned Stripe-hosted test Checkout — real exercise still blocked"]
  CHECKOUT --> RETURN["Return/cancel UI polls bounded trusted status — no grant"]
  CHECKOUT --> SIGNATURE["Raw-body signature + expected test account/mode validation"]
  SIGNATURE --> RECEIPT["Durable event receipt, claim and retry"]
  RECEIPT --> CANONICAL["Fetch canonical subscription/invoice/payment/risk evidence"]
  CANONICAL --> FENCE["Lease and generation fence; reject stale reconciliation"]
  FENCE --> PROJECTION["Server entitlement projection"]
  PROJECTION --> RETURN
  PROJECTION --> WRITE{"Verified owner + fresh paid state + unexpired paid-through + no risk block?"}
  WRITE -- Yes --> SAVE["Transactional quota/revision/idempotent explicit save"]
  WRITE -- No --> FREE["Deny paid write; retain owner read/delete and guest generation"]
  RESERVE --> PORTAL["Owned hosted Portal; no client-supplied customer or return URL"]
  RECEIPT -. "outage" .-> RETRY["Provider delivery retry or internal retryPending; no deployed scheduler"]
  RETRY --> CANONICAL
```

Billing is default-off and strict test-only. Existing acceptance uses real Firestore with a fake provider plus deterministic Stripe SDK-shaped/signature fixtures. Canonical freshness is bounded to five minutes; write authorization also checks paid-through at the time of the write. Refund/dispute history fails closed. No live or externally hosted payment was executed.

## Explicit saved history and renewed review

```mermaid
flowchart TD
  LOCAL["Current local Translator work"] --> CONSENT["Disclosure + explicit Save; no mount/reload autosave"]
  CONSENT --> SERVER["Server validates owner, verified Pro, size, quota, revision and operation"]
  SERVER --> HISTORY["Owner history; reads/deletes survive downgrade"]
  HISTORY --> FETCH["Fetch snapshot as untrusted data"]
  FETCH --> RESTORE["restoreSnapshot validates version and rebuilds prepared facts"]
  RESTORE --> FACTS["All facts unconfirmed; reviewRequired true"]
  RESTORE --> DRAFTS["Detached untrusted wording drafts; never attach by old ID"]
  FACTS --> CONFIRM["Renew source/fact confirmation"]
  CONFIRM --> REGENERATE["Regenerate grounded candidates"]
  REGENERATE --> CHOICE{"Reapply a saved draft after regeneration?"}
  CHOICE -- No --> REVIEW["Review generated or deliberately edited wording"]
  CHOICE -- Yes --> EXPLICIT["Explicit edit to reapply wording with edited provenance"]
  DRAFTS -. "available only after regeneration" .-> EXPLICIT
  EXPLICIT --> REVIEW
  REVIEW --> ACCEPT["Explicit current acceptance before copy/TXT"]
  SERVER -. "revision conflict" .-> CONFLICT["Preserve unsaved input; deliberate reload/retry"]
```

This restore composition is **pending FE2 implementation/review**. Backend reset/validation tests and server-seeded browser history do not establish safe combined UI export behavior.

## User journey

```mermaid
flowchart TD
  START["Start OwnPath"] --> INPUT["Project + Frontend Intern JD"]
  INPUT --> VALID{"Valid intake?"}
  VALID -- No --> FIX["Guidance / edit"]
  FIX --> INPUT
  VALID -- Yes --> EXTRACT["Extract requirements and candidate facts"]
  EXTRACT --> Q{"Missing personal facts?"}
  Q -- Yes --> ASK["2–4 questions / skip"]
  ASK --> FACTS["Review source facts"]
  Q -- No --> FACTS
  FACTS --> GEN["Confirm facts and generate"]
  GEN --> PROV["Bullets + sources + JD relevance"]
  PROV --> USER{"Review wording"}
  USER -- Edit --> EDIT["Reset approval; preserve revision"]
  EDIT --> USER
  USER -- Reject --> DROP["Discard candidate"]
  USER -- Approve --> COPY["Copy accepted text / TXT"]
  DROP --> USER
  COPY --> END["End / clear session"]
```

## Data processing

```mermaid
flowchart TD
  P["Untrusted project / answers"] --> F["Conservative personal fact extraction"]
  J["Untrusted pasted JD"] --> R["Requirement extraction + Frontend filter"]
  F --> M["Missing fact detection"]
  M --> Q["Question planning"]
  Q --> A["Answer / skip"]
  A --> F
  F --> C["User-confirmed fact set"]
  C --> B["Grounded English template composer"]
  R --> B
  B --> G["Schema and semantic recomposition guard"]
  G -- Valid --> U["Human review"]
  G -- Invalid --> E["Controlled error; no candidate"]
```

## State machine

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> IntakeComplete: valid project/JD
  Draft --> Draft: validation error / correct
  IntakeComplete --> Clarifying: missing facts
  IntakeComplete --> ReadyToGenerate: facts sufficient
  Clarifying --> ReadyToGenerate: answer or skip + confirm
  ReadyToGenerate --> Generated: valid adapter output
  ReadyToGenerate --> Error: timeout / invalid output
  Error --> ReadyToGenerate: retry
  Generated --> RevisionNeeded: edit / regenerate
  RevisionNeeded --> Generated: preserve edits + review
  Generated --> Accepted: individual confirmation
  Accepted --> RevisionNeeded: edit invalidates approval
  Generated --> Discarded: reject
  Accepted --> [*]: copy / clear
  Discarded --> Draft: start again
```

## AI Factory lifecycle

```mermaid
flowchart TD
  BL["Backlog issue"] --> AUDIT["Read-only repo/product audit"]
  AUDIT --> GATE{"Scope / research gate"}
  GATE -- Pending --> SYN["Synthetic prototype only"]
  GATE -- Approved --> CODE["One scoped writer"]
  SYN --> TEST["Controlled fixtures / tests"]
  CODE --> TEST
  TEST --> QA["Independent QA/security review"]
  QA -- Findings --> CODE
  QA -- Pass --> PR["Draft PR + evidence"]
  PR --> OWNER{"Owner release approval"}
  OWNER -- Approved --> RELEASE["Merge / deploy"]
  OWNER -- Pending --> WAIT["Reviewable branch; no release"]
```
