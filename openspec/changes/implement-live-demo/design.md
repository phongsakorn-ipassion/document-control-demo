# Design: implement-live-demo

## Overview
This change formalizes how the current frontend demo should be implemented and validated for predictable live presentation. The design keeps the existing static architecture (single-page HTML/CSS/JS) and adds a clear contract for runtime state transitions and demo checkpoints.

## Current architecture baseline
- UI shell and modals: `index.html`
- Visual theme and ACS-like components: `styles.css`
- Runtime state + rendering + events: `app.js`
- Data model style: in-memory objects with selective localStorage persistence (`demoSharedLinks`)

## Target behavior architecture

### 1) State model boundaries
- Keep a single `state` object in `app.js` as the source of truth for:
  - users, sites, folders, documents
  - tasks, activities
  - wiki pages
  - project lists and items
  - shared links
- Define explicit transition rules in spec for folder workflow transitions and task lifecycle.

### 2) Navigation contract
- Enforce "site-first" entry as a hard precondition for site apps.
- Keep `view`-based rendering (`global`, `site`, `library`, `wiki`, `lists`) with deterministic section toggling.

### 3) Workflow contract
- Preserve two-round progression semantics:
  - Start from `01` => move to `02` + Round 1 task
  - Start from `02` => move to `03` + Round 2 task
  - Approve at `03` => final move to `04`
  - Reject => roll back one stage
- Ensure task visibility is assignee-scoped.

### 4) Public-share contract
- Share creation is allowed only for folder `04` documents.
- Public URL uses token mapping persisted in localStorage.
- Public page runs in dedicated share mode and bypasses normal app boot.

### 5) Live-demo verification strategy
- Add a deterministic manual checklist bound to key transitions:
  - user switch task handoff
  - folder stage movement
  - share link generation/opening
  - wiki edit persistence
  - project list and item creation

## Trade-offs
- Chosen: Frontend-only deterministic demo for speed and portability.
- Not chosen: Backend-backed workflow engine, which would improve realism but increase setup risk during live demos.

## Risks and mitigations
- Risk: Presenter performs actions in wrong order and gets blocked by site-first gate.
  - Mitigation: explicit pre-demo checklist and guided journey in tasks.
- Risk: Share tokens accumulate in localStorage and create stale links.
  - Mitigation: include reset/cleanup step in demo preparation tasks.
- Risk: In-memory state resets on refresh.
  - Mitigation: include non-refresh guidance and optional reset routine in tasks.
