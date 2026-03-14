# Tasks

## 1. Spec baseline and alignment
- [ ] 1.1 Confirm baseline spec reflects actual current code behavior in `app.js`
- [ ] 1.2 Reconcile README/demo-summary wording with implemented modules (no unsupported claims)
- [ ] 1.3 Validate OpenSpec artifacts for `implement-live-demo`

## 2. Live-demo reliability updates
- [ ] 2.1 Add a deterministic demo reset action (state reset + localStorage share cleanup)
- [ ] 2.2 Add/confirm clear flash messages for each blocked precondition
- [ ] 2.3 Add activity entries for every key transition used in live presentation

## 3. Workflow and task hardening
- [ ] 3.1 Enforce transition guardrails for invalid folder workflow starts
- [ ] 3.2 Ensure approve/reject outcomes are visible in both task and document views
- [ ] 3.3 Verify assignee-only task visibility under user switching

## 4. Public-share hardening
- [ ] 4.1 Enforce share-only-from-folder-04 behavior in all UI entry points
- [ ] 4.2 Add stale/invalid token handling message consistency in public mode
- [ ] 4.3 Verify public preview/download behavior for text and image payloads

## 5. Wiki and project-list readiness
- [ ] 5.1 Validate wiki create/edit/save/delete/rename flows end-to-end
- [ ] 5.2 Validate image insertion path in wiki editor
- [ ] 5.3 Validate project list creation and item creation with expected table fields

## 6. Demo runbook and verification
- [ ] 6.1 Write a pre-demo checklist (browser, user, site, sample files)
- [ ] 6.2 Write a timed presenter script (7-step flow)
- [ ] 6.3 Execute full dry-run and record pass/fail per scenario
