# Proposal: implement-demo-v2

## Why
demo-v1 (`index.html` / `app.js` / `styles.css`) demonstrated ACS-style flows but carries a legacy visual design — a heavy top nav, dense sidebar, and outdated component patterns inherited from Alfresco Share's 2015-era UI. Customer demos have shown that the information density and visual language create onboarding friction for non-technical audiences.

This change replaces the visual layer entirely with a modern, SaaS-era design while keeping the same application journey, data model, and seven core flows. The new design is already proven as an interactive HTML prototype at `prototype-revamp.html`, which was validated with pre-sales stakeholders. demo-v2 is a clean implementation of that prototype as a spec-driven deliverable.

## What Changes

### Replaced entirely
- Visual design: new design system (indigo palette, Inter typography, card-based layouts, 8px grid)
- Navigation: top-bar + nested tabs → persistent left sidebar + top context bar
- Component library: all UI primitives rebuilt (Avatar, Badge, FileChip, Toast)
- Screen layouts: all 7 screens redesigned (see `spec.md` REQ-003 through REQ-009)

### Preserved exactly
- Application journey: Global Dashboard → Site → (Documents / Tasks / Wiki / Lists / Share)
- State model: single in-memory `state` object, same shape as demo-v1
- Workflow logic: two-round approval (01→02→03→04), approve/reject task transitions
- Site-first navigation gate: site apps disabled until a site is opened
- User switching: top-bar switcher that scopes task visibility
- Public share: folder-04-only token generation, no-login public view
- Seed data: same 3 users, 1 site, 5 documents, 2 tasks, 4 wiki pages, 2 project lists

### New capabilities in demo-v2
- Kanban board view for Workflow & Tasks (replaces flat task list)
- Three-pane Document Library with inline preview drawer (no modal)
- Slide-in screen transition animations
- Toast notification system (replacing alert-style flash messages)
- Site context block in sidebar when a site is active
- App shortcut buttons on Site Overview card

## Scope

In scope:
- Full reimplementation as a single static HTML file (`index.html`) — same no-backend, no-Docker constraint
- All 7 screens matching `prototype-revamp.html` pixel-level fidelity
- Complete design token system (colors, typography, spacing, component anatomy) defined in `design.md`
- All seed data and state transitions from demo-v1 preserved

Out of scope:
- Backend Alfresco API integration
- File upload to real storage (upload action shows toast only)
- Real document preview rendering (preview area shows placeholder)
- Authentication beyond demo user switching
- Mobile responsive layout
- Dark mode

## Impact
- Affected specs: `demo-v2` (new domain), supersedes `demo-live`
- Affected files: `index.html` (full replacement), `app.js` (full replacement), `styles.css` (full replacement)
- Affected users: Presales presenters, engineers extending the demo, OpenSpec-driven Claude Code implementations
- Reference prototype: `prototype-revamp.html` — DO NOT modify this file; it is the design source of truth
