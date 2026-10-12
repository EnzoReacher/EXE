# OwnPath workflow diagrams

Implemented prototype is deterministic; authenticated persistence and external model remain proposed.

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
