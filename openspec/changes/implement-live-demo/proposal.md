# Proposal: implement-live-demo

## Why
The current project demonstrates core ACS-style flows, but the behavior is only implicitly captured in code and presenter notes. For repeatable live demos, the team needs a formal AI-readable spec package that defines required behavior, acceptance scenarios, and implementation tasks.

## What Changes
- Add a formal domain spec for this demo: `openspec/specs/demo-live/spec.md`
- Propose a live-demo implementation change package with:
  - demo execution requirements (deterministic flow, presenter reliability)
  - stronger workflow/public-share behavior expectations
  - verification checklist for pre-demo validation
- Introduce implementation tasks that map directly to UI and state modules in `index.html` and `app.js`

## Scope
In scope:
- Dashboard, site, document, workflow, task, wiki, project-list, and public-share flows
- Live-demo readiness requirements and acceptance criteria
- Documentation artifacts for AI-assisted implementation planning

Out of scope:
- Backend integration with Alfresco services
- Authentication/authorization systems beyond local demo user switching
- Production hardening, security hardening, and performance benchmarking

## Impact
- Affected specs: `demo-live` (new domain)
- Affected implementation areas (planned): `index.html`, `app.js`, `styles.css`, and demo summary docs
- Affected users: Presales/demo presenters and engineers extending this demo
