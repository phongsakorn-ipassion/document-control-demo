# Design: implement-demo-v2

## Development Workflow (MUST follow for every change)

> **This workflow is mandatory.** Claude Code must follow these steps in order for every feature request, bug fix, or enhancement — no exceptions.

1. **Spec first** — Update this `design.md` with the new feature/fix spec (problem, solution, affected files, UI prototype if applicable). Get user confirmation before coding.
2. **Implement** — Write code following the spec.
3. **Build** — Run `npm run build` and fix any errors.
4. **Commit & Push** — Commit all changed files (including `design.md`) and push to `origin main`.
5. **Manual steps** — If there are database migrations or Supabase config changes, list them clearly for the user.

## Overview
This document is the **authoritative design contract** for demo-v2. Claude Code MUST read this entire file before writing any code. Every visual value here is derived directly from `prototype-revamp.html` and must be reproduced exactly — not approximated.

> **Note on tech stack**: This implementation uses Vite 5 + React 18 + Tailwind CSS v3 + Zustand + Supabase. The visual design tokens in this file are expressed as **Tailwind class names** (mapping to the same hex values as the prototype) and as **Tailwind config extension values** where custom tokens are needed.

---

## Architecture

### Stack overview
```
Frontend build:   Vite 5 (npm run dev / npm run build)
UI framework:     React 18 — functional components + hooks only, no class components
Styling:          Tailwind CSS v3 — utility classes only, zero inline styles
UI state:         Zustand (useAppStore.js) — currentUser, currentScreen, currentSite, UI flags
Server state:     Supabase JS v2 — custom hooks per domain, direct queries
Auth:             Supabase Auth (email/password) — real session, not a demo switcher
Database:         Supabase PostgreSQL — 9 tables, anon RLS for demo
Routing:          React Router v6, HashRouter (GitHub Pages compatible)
Deploy:           GitHub Actions → GitHub Pages
Icons:            Inline SVG components in src/lib/icons.jsx — paths copied from prototype
Fonts:            Tailwind system font stack (no CDN)
```

### File structure (implement exactly)
```
v2/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
├── src/
│   ├── components/
│   │   ├── Avatar.jsx
│   │   ├── Badge.jsx
│   │   ├── FileChip.jsx
│   │   ├── Toast.jsx
│   │   ├── Sidebar.jsx
│   │   └── TopBar.jsx
│   ├── screens/
│   │   ├── Login.jsx
│   │   ├── GlobalDashboard.jsx
│   │   ├── SiteOverview.jsx
│   │   ├── DocumentLibrary.jsx
│   │   ├── WorkflowTasks.jsx
│   │   ├── Wiki.jsx
│   │   ├── ProjectLists.jsx
│   │   └── PublicShare.jsx
│   ├── store/
│   │   └── useAppStore.js
│   ├── lib/
│   │   ├── supabase.js
│   │   └── icons.jsx
│   ├── hooks/
│   │   ├── useDocuments.js
│   │   ├── useTasks.js
│   │   ├── useWiki.js
│   │   ├── useProjectLists.js
│   │   └── useActivities.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## package.json

```json
{
  "name": "dochub-demo-v2",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.0"
  }
}
```

---

## vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/dochub-demo-v2/',   // MUST match GitHub repository name exactly
})
```

---

## tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // These extend Tailwind's default palette with demo-specific aliases.
        // All standard Tailwind color utilities (indigo-800, amber-50, etc.) are available as-is.
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.18s ease forwards',
      },
    },
  },
  plugins: [],
}
```

---

## src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Thin scrollbar — global */
::-webkit-scrollbar       { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
```

---

## src/lib/supabase.js

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnon)
```

---

## src/store/useAppStore.js

```js
import { create } from 'zustand'

const useAppStore = create((set) => ({
  // Auth (populated from Supabase session on boot)
  currentUser: null,           // { id, email, name, avatarColor }
  setCurrentUser: (user) => set({ currentUser: user }),

  // Navigation
  currentScreen: 'global-dashboard',
  currentSite: null,           // { id, name, description } or null
  setScreen: (screen) => set({ currentScreen: screen }),
  setSite: (site) => set({
    currentSite: site,
    currentScreen: site ? 'site-overview' : 'global-dashboard',
  }),

  // Document Library UI state
  selectedFolder: '01',
  previewDoc: null,
  setSelectedFolder: (folder) => set({ selectedFolder: folder, previewDoc: null }),
  setPreviewDoc: (doc) => set({ previewDoc: doc }),

  // Wiki UI state
  activePageId: null,
  wikiEditMode: false,
  setActivePageId: (id) => set({ activePageId: id, wikiEditMode: false }),
  setWikiEditMode: (mode) => set({ wikiEditMode: mode }),

  // Project Lists UI state
  activeListId: null,
  setActiveListId: (id) => set({ activeListId: id }),

  // Public Share UI state
  shareToken: null,
  setShareToken: (token) => set({ shareToken: token }),

  // Toast (managed via Toast component — not Zustand)
}))

export default useAppStore
```

---

## Supabase auth.users constraint

> **IMPORTANT:** Supabase does NOT expose `auth.users` via the PostgREST API. Any `.select()` with a foreign key join to `auth.users` (e.g. `owner:owner_id(id, email)`, `assignee:assignee_id(id, email)`, `actor:actor_id(id, email)`) will fail at runtime. Instead:
> - Use `.select('*')` to fetch raw UUID fields (`owner_id`, `assignee_id`, `actor_id`)
> - Resolve display names in React using `ID_NAME_MAP[uuid]` from `src/lib/roles.js`
> - The `DEMO_USERS` array in `src/lib/roles.js` provides id, name, role, and badge for the 3 demo users

## Custom hook pattern

Every data hook MUST follow this exact signature:

```js
// Example: src/hooks/useDocuments.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDocuments(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('documents')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setError(err)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { error: err } = await supabase.from('documents').insert(payload)
    if (!err) fetch()
    return err
  }

  const update = async (id, patch) => {
    const { error: err } = await supabase.from('documents').update(patch).eq('id', id)
    if (!err) fetch()
    return err
  }

  const remove = async (id) => {
    const { error: err } = await supabase.from('documents').delete().eq('id', id)
    if (!err) fetch()
    return err
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
```

Rules:
- ALL three — `data`, `loading`, `error` — MUST be handled in every consuming UI component.
- `loading` → render a spinner (indigo animated pulse or Tailwind `animate-pulse` skeleton).
- `error` → render a rose-50 error banner with the error message.
- Every write (insert/update/delete) MUST call `fetch()` to re-sync local state.

---

## Supabase database schema

Run this SQL in the Supabase SQL Editor to create tables, RLS, and seed data.

### Tables

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- sites
create table sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

-- site_members (links auth.users to sites)
create table site_members (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid references sites(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  role       text not null default 'member',  -- 'manager' | 'member'
  unique(site_id, user_id)
);

-- documents
create table documents (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references sites(id) on delete cascade,
  name        text not null,
  folder      text not null default '01',  -- '01'|'02'|'03'|'04'
  type        text not null default 'pdf', -- 'pdf'|'doc'|'img'
  size_label  text,                        -- e.g. "2.4 MB"
  owner_id    uuid references auth.users(id),
  status      text,                        -- e.g. 'Final-Approved'
  created_at  timestamptz default now()
);

-- tasks (approval tasks — one per document-per-review-round)
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid references sites(id) on delete cascade,
  document_id  uuid references documents(id) on delete cascade,
  assignee_id  uuid references auth.users(id),
  folder       text not null,  -- stage the task belongs to: '02' or '03'
  priority     text not null default 'Medium',  -- 'High'|'Medium'|'Low'
  due_date     text,
  status       text not null default 'pending', -- 'pending'|'approved'|'rejected'
  created_at   timestamptz default now()
);

-- wiki_pages
create table wiki_pages (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid references sites(id) on delete cascade,
  title      text not null,
  content    text,
  created_at timestamptz default now()
);

-- project_lists
create table project_lists (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid references sites(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

-- project_list_items
create table project_list_items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid references project_lists(id) on delete cascade,
  issue_key   text not null,  -- e.g. 'ISS-001'
  title       text not null,
  assignee_id uuid references auth.users(id),
  status      text not null default 'Open',    -- 'Open'|'In Progress'|'Done'
  priority    text not null default 'Medium',  -- 'High'|'Medium'|'Low'
  due_date    text,
  created_at  timestamptz default now()
);

-- activities (event log)
create table activities (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references sites(id) on delete cascade,
  actor_id    uuid references auth.users(id),
  action      text not null,  -- e.g. 'uploaded', 'approved', 'edited wiki page'
  target      text not null,  -- document name, wiki title, etc.
  created_at  timestamptz default now()
);

-- share_tokens (public share links)
create table share_tokens (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  token       text not null unique,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
alter table sites              enable row level security;
alter table site_members       enable row level security;
alter table documents          enable row level security;
alter table tasks              enable row level security;
alter table wiki_pages         enable row level security;
alter table project_lists      enable row level security;
alter table project_list_items enable row level security;
alter table activities         enable row level security;
alter table share_tokens       enable row level security;

-- Demo policy: authenticated users can read + write everything
-- (production would scope to site membership — swap these for real deployments)
create policy "auth read all"  on sites              for select using (auth.role() = 'authenticated');
create policy "auth write all" on sites              for all    using (auth.role() = 'authenticated');

create policy "auth read all"  on site_members       for select using (auth.role() = 'authenticated');
create policy "auth write all" on site_members       for all    using (auth.role() = 'authenticated');

create policy "auth read all"  on documents          for select using (auth.role() = 'authenticated');
create policy "auth write all" on documents          for all    using (auth.role() = 'authenticated');

create policy "auth read all"  on tasks              for select using (auth.role() = 'authenticated');
create policy "auth write all" on tasks              for all    using (auth.role() = 'authenticated');

create policy "auth read all"  on wiki_pages         for select using (auth.role() = 'authenticated');
create policy "auth write all" on wiki_pages         for all    using (auth.role() = 'authenticated');

create policy "auth read all"  on project_lists      for select using (auth.role() = 'authenticated');
create policy "auth write all" on project_lists      for all    using (auth.role() = 'authenticated');

create policy "auth read all"  on project_list_items for select using (auth.role() = 'authenticated');
create policy "auth write all" on project_list_items for all    using (auth.role() = 'authenticated');

create policy "auth read all"  on activities         for select using (auth.role() = 'authenticated');
create policy "auth write all" on activities         for all    using (auth.role() = 'authenticated');

-- share_tokens: public (anon) can read by token; auth can create
create policy "anon read by token" on share_tokens for select using (true);
create policy "auth create"        on share_tokens for insert with check (auth.role() = 'authenticated');
```

### Supabase Auth seed users

Create these users in the Supabase Dashboard → Authentication → Users → "Add user":

| Email             | Password  | Display Name    |
|-------------------|-----------|-----------------|
| alice@demo.com    | Demo1234! | Alice Johnson   |
| bob@demo.com      | Demo1234! | Bob Chen        |
| cathy@demo.com    | Demo1234! | Cathy Park      |

After creating, note each user's UUID from the auth.users table — needed for the SQL seed below.

### SQL seed data

Replace `<alice_id>`, `<bob_id>`, `<cathy_id>` with the actual UUIDs from auth.users.

```sql
-- Insert site
insert into sites (id, name, description)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Site 01', 'Project Alpha Documentation');

-- Insert site members
insert into site_members (site_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '<alice_id>', 'manager'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '<bob_id>',   'member'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '<cathy_id>', 'member');

-- Insert documents
insert into documents (id, site_id, name, folder, type, size_label, owner_id, status) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Project Charter.pdf',      '01', 'pdf', '2.4 MB', '<alice_id>', null),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Requirements Spec.docx',   '02', 'doc', '1.1 MB', '<bob_id>',   null),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Design Mockup.png',        '03', 'img', '5.2 MB', '<alice_id>', null),
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Final Report.pdf',         '04', 'pdf', '3.8 MB', '<alice_id>', 'Final-Approved'),
  ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Meeting Notes.docx',       '01', 'doc', '0.5 MB', '<cathy_id>', null);

-- Insert tasks
insert into tasks (id, site_id, document_id, assignee_id, folder, priority, due_date) values
  ('tttttttt-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', '<bob_id>',   '02', 'High',   'Mar 15'),
  ('tttttttt-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', '<cathy_id>', '03', 'Medium', 'Mar 16');

-- Insert wiki pages
insert into wiki_pages (site_id, title, content) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Welcome',          '<strong>Welcome to Site 01</strong><p>This wiki contains project documentation and shared team knowledge base.</p>'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Project Overview', '<strong>Project Overview</strong><p>This initiative focuses on implementing a modern document intelligence platform.</p>'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Team Guidelines',  '<strong>Team Guidelines</strong><p>Follow contribution standards. All documents must pass through the two-round approval workflow before publishing.</p>'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Release Notes',    '<strong>Release Notes — v1.0</strong><p>Initial release includes Document Library, two-round Approval Workflow, collaborative Wiki, and Project Lists.</p>');

-- Insert project lists and items
with list1 as (
  insert into project_lists (id, site_id, name)
  values ('llllllll-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Sprint Backlog')
  returning id
),
list2 as (
  insert into project_lists (id, site_id, name)
  values ('llllllll-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bug Tracker')
  returning id
)
insert into project_list_items (list_id, issue_key, title, assignee_id, status, priority, due_date) values
  ('llllllll-0000-0000-0000-000000000001', 'ISS-001', 'Setup CI/CD Pipeline',       '<bob_id>',   'Done',        'High',   'Mar 10'),
  ('llllllll-0000-0000-0000-000000000001', 'ISS-002', 'Design System Setup',        '<alice_id>', 'In Progress', 'High',   'Mar 15'),
  ('llllllll-0000-0000-0000-000000000001', 'ISS-003', 'API Integration Layer',      '<cathy_id>', 'Open',        'Medium', 'Mar 20'),
  ('llllllll-0000-0000-0000-000000000001', 'ISS-004', 'User Authentication Module', '<alice_id>', 'Open',        'High',   'Mar 22'),
  ('llllllll-0000-0000-0000-000000000002', 'BUG-001', 'Login page redirect issue',  '<bob_id>',   'In Progress', 'High',   'Mar 14'),
  ('llllllll-0000-0000-0000-000000000002', 'BUG-002', 'File upload size limit',     '<alice_id>', 'Open',        'Low',    'Mar 18');

-- Insert activities
insert into activities (site_id, actor_id, action, target, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '<alice_id>', 'uploaded',            'Final Report.pdf',        now() - interval '10 minutes'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '<bob_id>',   'approved',            'Requirements Spec.docx',  now() - interval '25 minutes'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '<cathy_id>', 'edited wiki page',    'Team Guidelines',         now() - interval '1 hour'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '<alice_id>', 'started workflow on', 'Design Mockup.png',       now() - interval '2 hours'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '<bob_id>',   'added item to list',  'Sprint Backlog',          now() - interval '3 hours');
```

---

## Role model

Each demo user has a fixed role that determines their workflow permissions. Claude Code MUST implement this role model exactly.

```js
// src/lib/roles.js — add this file
export const ROLES = {
  'alice@demo.com': {
    name:  'Alice Johnson',
    role:  'Admin',
    badge: 'indigo',
    icon:  '👑',
    desc:  'Full access · manages site & content',
    // Admin can approve/reject ANY pending task (not just their own)
    canApproveFolder: null,  // null = all folders
  },
  'bob@demo.com': {
    name:  'Bob Chen',
    role:  'Reviewer',
    badge: 'amber',
    icon:  '🔍',
    desc:  'Round 1 approver · 02 In Review stage',
    // Reviewer only sees Approve/Reject on tasks assigned to them in folder 02
    canApproveFolder: '02',
  },
  'cathy@demo.com': {
    name:  'Cathy Park',
    role:  'Approver',
    badge: 'emerald',
    icon:  '✅',
    desc:  'Round 2 final approver · 03 Final Review stage',
    // Approver only sees Approve/Reject on tasks assigned to them in folder 03
    canApproveFolder: '03',
  },
}
```

### Role permission matrix

| Role     | Upload docs | Start workflow | Approve Round 1 (02) | Approve Round 2 (03) | Manage site |
|----------|-------------|----------------|----------------------|----------------------|-------------|
| Admin    | ✅          | ✅             | ✅ (any)             | ✅ (any)             | ✅          |
| Reviewer | ✅          | ✅             | ✅ (assigned only)   | ❌                   | ❌          |
| Approver | ✅          | ✅             | ❌                   | ✅ (assigned only)   | ❌          |

### Role-context banner (WorkflowTasks screen)

When the Workflow & Tasks screen renders, show a role-context banner below the board header:

```
Admin    → bg-indigo-50  border-indigo-200  "Admin View — Full access, you can approve or reject any pending task"
Reviewer → bg-amber-50   border-amber-200   "Reviewer — Round 1 approvals, your tasks are in the 02 · In Review column"
Approver → bg-emerald-50 border-emerald-200 "Approver — Round 2 approvals, your tasks are in the 03 · Final Review column"
```

### task card `canApprove` logic

```js
// A user can see Approve/Reject buttons if:
// 1. They are Admin (canApproveFolder === null), OR
// 2. The task is assigned to them AND the task is in their canApproveFolder
const userRole = ROLES[currentUser.email]
const canApprove = userRole.canApproveFolder === null
  || (task.assignee_id === currentUser.id && task.folder === userRole.canApproveFolder)
```

### Seed task assignment rule

Seed tasks MUST follow this assignment:
- Folder 02 tasks → assigned to Bob (Reviewer)
- Folder 03 tasks → assigned to Cathy (Approver)
- Alice (Admin) has no pre-assigned tasks but can approve everything

---

## Authentication flow

### Login screen (src/screens/Login.jsx)
- Full-page centered card: white bg, rounded-2xl, shadow-2xl, max-width 400px
- Logo + "DocHub" heading (indigo) + "Document Intelligence Platform" sub-label
- Email input + Password input + "Sign In" button (indigo-600, full-width)
- Demo helper box (slate-50, rounded-xl): shows alice@demo.com / bob@demo.com / cathy@demo.com + "Demo1234!" password
- On submit: `supabase.auth.signInWithPassword({ email, password })`
- On success: Zustand `setCurrentUser({ id, email, name, avatarColor })` — derive `name` from email prefix

### Auth session management (src/App.jsx)
```js
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setCurrentUser(toUser(session.user))
  })
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setCurrentUser(session ? toUser(session.user) : null)
  })
  return () => subscription.unsubscribe()
}, [])
```

### User name derivation helper
```js
// Map email → display name
const NAME_MAP = {
  'alice@demo.com':  'Alice Johnson',
  'bob@demo.com':    'Bob Chen',
  'cathy@demo.com':  'Cathy Park',
}

function toUser(authUser) {
  return {
    id:          authUser.id,
    email:       authUser.email,
    name:        NAME_MAP[authUser.email] ?? authUser.email,
    avatarColor: AVATAR_COLOR_MAP[NAME_MAP[authUser.email]] ?? 'slate',
  }
}
```

### Multi-user demo journey
1. User A (Alice — alice@demo.com) logs in → uploads a document to folder 01
2. Alice clicks "▶ Workflow" on the document → document moves to folder 02, a task row is inserted in `tasks` (assignee = Bob's user_id)
3. User B (Bob — bob@demo.com) opens a second browser window/tab → logs in → navigates to Workflow & Tasks → sees task assigned to him
4. Bob clicks **Approve** → task status becomes 'approved', document folder advances to '03', activity row inserted
5. Bob clicks **Approve** again on the round-2 task (Cathy's task is for the next stage) → document reaches folder 04 with status 'Final-Approved'

---

## GitHub Actions deploy.yml

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        working-directory: v2
        run: npm ci

      - name: Build
        working-directory: v2
        env:
          VITE_SUPABASE_URL:      ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir:  ./v2/dist
```

GitHub repository secrets required:
- `VITE_SUPABASE_URL` — from Supabase project Settings → API
- `VITE_SUPABASE_ANON_KEY` — from Supabase project Settings → API

---

## Layout Dimensions

```
Viewport width target:    1280px+
Sidebar width:            224px  (fixed, w-56)
TopBar height:            56px   (fixed, h-14)
Content area:             flex-1 (fills remaining width × remaining height after topbar)

Document Library — Folder Tree pane:    w-52 (208px)
Document Library — Preview Drawer pane: w-72 (288px)
Wiki — Page List pane:                  w-56 (224px)
Project Lists — List Nav pane:          w-52 (208px)
Public Share — max content width:       max-w-2xl (672px)
```

---

## Component Anatomy (Tailwind class strings)

### Avatar
```
Sizes:
  sm: w-7 h-7 text-xs   (28×28)
  md: w-9 h-9 text-sm   (36×36)
  lg: w-11 h-11 text-base (44×44)
Shape: rounded-full
Content: initials (firstChar of first + last name), uppercase, font-semibold
Color mapping (exact — do not change):
  "Alice Johnson" → bg-indigo-100  text-indigo-700
  "Bob Chen"      → bg-amber-100   text-amber-700
  "Cathy Park"    → bg-emerald-100 text-emerald-700
  fallback        → bg-slate-100   text-slate-600
```

### Badge
```
Base classes: px-2 py-0.5 rounded-full text-xs font-medium
Color variants:
  slate   → bg-slate-100   text-slate-600
  amber   → bg-amber-100   text-amber-700
  blue    → bg-blue-100    text-blue-700
  emerald → bg-emerald-100 text-emerald-700
  rose    → bg-rose-100    text-rose-700
  indigo  → bg-indigo-100  text-indigo-700
  violet  → bg-violet-100  text-violet-700
```

### FileChip
```
Base: w-10 h-10 rounded-lg border flex items-center justify-center text-[10px] font-bold flex-shrink-0
Type variants:
  pdf → bg-rose-50    border-rose-200    text-rose-600    label "PDF"
  doc → bg-blue-50    border-blue-200    text-blue-600    label "DOC"
  img → bg-violet-50  border-violet-200  text-violet-600  label "IMG"
```

### NavBtn (Sidebar nav item)
```
Base: w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150

States:
  active   → bg-white text-indigo-700 shadow-sm  (icon: text-indigo-700)
  enabled  → text-indigo-100 hover:bg-indigo-700 hover:text-white
  disabled → text-indigo-300 cursor-not-allowed (no hover)
```

### Toast
```
Position: fixed top-5 right-5 z-50
Container: flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-2xl animate-slide-in
Prefix icon: check SVG, w-3.5 h-3.5, text-emerald-400
Auto-dismiss: 2800ms
```

### KPI Card (Global Dashboard)
```
Container: bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-all duration-150
Icon block: w-11 h-11 rounded-xl flex items-center justify-center
  Sites  → bg-indigo-50 text-indigo-700
  Tasks  → bg-amber-50  text-amber-600
  Docs   → bg-blue-50   text-blue-600
Value: text-2xl font-bold text-slate-900
Label: text-xs text-slate-500
```

### Site Card (Global Dashboard)
```
Container: bg-white border border-slate-200 rounded-[20px] p-5 cursor-pointer transition-all duration-200
           hover:border-indigo-300 hover:shadow-md
Icon block: w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-sm
Avatar stack: flex, each avatar -ml-2 except first
Footer: border-t border-slate-100 pt-3 mt-3 flex items-center justify-between
```

### New Site Modal (Global Dashboard)
```
Trigger:    "+ New Site" button in My Sites header opens modal
Overlay:    fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm
Container:  bg-white rounded-2xl shadow-2xl w-full max-w-md p-6
Header:     flex items-center justify-between mb-5
            Title: text-lg font-bold text-slate-900 — "Create New Site"
            Close: XClose icon, text-slate-400 hover:text-slate-600
Form fields:
  Site Name *:   text input, placeholder "e.g. Project Alpha", required
  Description:   text input, placeholder "Brief description of this site", optional
  Input style:   same as Login — border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-300
Buttons:    flex justify-end gap-3 pt-2
  Cancel:   px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50
  Create:   px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
Error:      bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5
```

**Journey:**
1. User clicks "+ New Site" → modal opens
2. User fills Site Name (required) and Description (optional)
3. On submit:
   - INSERT into `sites` table (new UUID)
   - INSERT into `site_members` (current user as `manager`)
   - INSERT into `activities` ("created site" action)
4. Success → toast notification, modal closes, auto-navigate to new Site Overview
5. Error → inline error message in modal

### Add Member Modal (Site Overview)
```
Trigger:    "+ Add" button in Members section header
Overlay:    portal to document.body — fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
Container:  bg-white rounded-2xl shadow-2xl w-full max-w-md p-6
Header:     "Add Member" — same pattern as New Site modal
User picker:
  List of DEMO_USERS cards — each shows Avatar + Name + Role badge
  Already-added users: opacity-50 cursor-not-allowed, "Already added" label
  Selected user: border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200 + checkmark circle
  Unselected:   border-slate-200 hover:border-indigo-300
Role selector: <select> dropdown — "Member" (default) or "Manager"
  Style: same input style (border rounded-xl px-4 py-2.5 bg-slate-50)
Buttons:    [Cancel] [Add Member] — same button pattern
```

**Journey:**
1. User clicks "+ Add" in Members header → modal opens
2. Select a user from the 3-user list (already-added are disabled)
3. Choose role (Member or Manager)
4. On submit:
   - INSERT into `site_members` (site_id, user_id, role)
   - INSERT into `activities` ("added member [name]")
5. Success → toast, modal closes, member list refreshes
6. Error → inline error in modal

### Edit Site Modal (Site Overview)
```
Trigger:    Pencil (EditPen) icon next to site name in Site Header
Overlay:    portal — same pattern as other modals
Container:  bg-white rounded-2xl shadow-2xl w-full max-w-md p-6
Header:     "Edit Site"
Form:       Same fields as New Site (Site Name *, Description)
            Pre-filled with current site values
Buttons:    [Cancel] [Save Changes]
```

**Journey:**
1. User clicks pencil icon next to site name → modal opens with current values
2. Edit name/description
3. On submit:
   - UPDATE `sites` SET name, description WHERE id = siteId
   - Update Zustand store (setSite) for immediate UI refresh
   - INSERT into `activities` ("updated site [name]")
4. Success → toast, modal closes, header updates immediately

### Kanban Column
```
Container: border-2 rounded-2xl p-3 min-h-[200px]
Stage color map:
  01 → border-slate-300   bg-slate-50   header text-slate-700
  02 → border-amber-300   bg-amber-50   header text-amber-700
  03 → border-blue-300    bg-blue-50    header text-blue-700
  04 → border-emerald-300 bg-emerald-50 header text-emerald-700
```

### Task Card
```
Base: bg-white border rounded-xl p-3 shadow-sm
Not assigned: border-slate-200
Assigned to current user: border-indigo-300
"Assigned to you" label: text-xs font-semibold text-indigo-600 flex items-center gap-1.5 (with 6px indigo-500 dot: w-1.5 h-1.5 rounded-full bg-indigo-500)
Approve button: flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white
Reject button:  flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white
```

### Three-pane Document Library
```
Container: flex h-full (fills content area)
Pane 1 (folder tree): w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto
Pane 2 (file list):   flex-1 p-5 overflow-y-auto bg-slate-50
Pane 3 (preview):     w-72 flex-shrink-0 bg-white border-l border-slate-200 p-5 overflow-y-auto
                      — hidden when no doc selected, flex flex-col when open
```

### Document Row Card
```
Base: bg-white border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-150
Default:  border-slate-200  hover:border-slate-300 hover:shadow-sm
Selected: border-indigo-300 ring-1 ring-indigo-200
Inline action buttons (View/Download): p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition
  — Eye icon (16px) for View, Download icon (16px) for Download
  — Appear on ALL documents in ALL folders (01–04)
  — View: opens file in new tab from Supabase Storage (falls back to toast if no file)
  — Download: triggers browser download from Supabase Storage (falls back to toast if no file)
Approve button: px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100
Reject button:  px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100
  — Approve/Reject shown only if user has role permission (canApproveDoc check)
  — Folders 01/02/03 only — not shown on 04 Published
Share button:   Only on folder 04 — bg-emerald-50 text-emerald-600
```

---

## Lazy Loading (Infinite Scroll)

All list components use a reusable `useInfiniteScroll` hook with `IntersectionObserver`:
```
Page size:       10 records per load
Trigger:         Sentinel element at bottom of scrollable container
Observer:        IntersectionObserver with rootMargin 100px
Loading state:   Skeleton pulse row at bottom while fetching
End indicator:   "No more [items]" text when all loaded
```

**Affected lists:**
- Dashboard → My Sites list (max-h-[600px]), Recent Activity (max-h-[500px])
- Site Overview → Members list (max-h-[400px]), Activity Timeline (max-h-[400px])
- Document Library → Document list per folder, Document Activity in preview panel (max-h-[200px])

**Hook signature:**
```js
// src/hooks/useInfiniteScroll.js
export function useInfiniteScroll(onLoadMore, { enabled = true })
// Returns sentinelRef to attach to a <div> at bottom of list
```

**Data hooks updated with pagination:**
- `useDocuments(siteId)` → adds `loadMore`, `hasMore`, `loadingMore`
- `useActivities(siteId, { filterTarget })` → adds `loadMore`, `hasMore`, `loadingMore`, `filterTarget` option

---

## System Roles (v2)

Site members now use 3 roles instead of 2:

| DB `site_members.role` | Label      | Badge   | Description                |
|------------------------|------------|---------|----------------------------|
| `admin`                | Admin      | indigo  | Full access, manage site   |
| `reviewer`             | Reviewer   | amber   | Round 1 approver (folder 02) |
| `approver`             | Approver   | emerald | Round 2 approver (folder 03) |

Legacy fallbacks: `manager` → Admin, `member` → Reviewer

**AddMemberModal** role selector updated to 3 options: Admin / Reviewer / Approver.

**New site creation** now inserts `role: 'admin'` instead of `role: 'manager'`.

---

### New Document Modal (Document Library)
```
Trigger:    "New" button (only button in toolbar — "Upload" removed)
Overlay:    portal to document.body — fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
Container:  bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in
Header:     "Create New Document"
File upload zone:
  border-2 border-dashed border-slate-300 rounded-xl p-8 text-center
  hover:border-indigo-400 transition cursor-pointer
  Real <input type="file"> — accepts .pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.gif,.svg,.webp
  Max file size: 5 MB (validated client-side)
Picked state:
  bg-emerald-50 border-emerald-200 rounded-xl p-4 — shows FileChip + name + actual size + remove (X)
Editable fields:
  Document Name *: text input (pre-filled from file name)
  File Type:       toggle chip group — [PDF] [DOC] [IMG]
    Active:   bg-indigo-600 text-white
    Inactive: bg-slate-100 text-slate-600 hover:bg-slate-200
  Comment for Approver: textarea, 3 rows, optional
    placeholder "Optional: leave a note for the reviewer..."
Buttons:    [Cancel] [Create Document]
```

**Journey:**
1. User clicks "New" → modal opens with file upload zone
2. User clicks zone → browser file picker opens (real file selection)
3. Validates file ≤ 5MB; auto-detects type from extension
4. Document Name pre-filled from filename, editable
5. Optional comment textarea for next approver
6. On submit:
   - Upload file to Supabase Storage bucket `documents` (path: `{siteId}/{uuid}_{filename}`)
   - INSERT into `documents` (folder: '01', file_path, owner_id, comment)
   - INSERT into `activities` (action: 'uploaded', target: name)
   - If comment provided → INSERT into `activities` (action: 'commented: "..." on', target: name)
7. Success → toast "Document created in Draft", modal closes, folder 01 selected
8. Error → inline error message in modal

### Approve Confirmation Modal (Document Library)
```
Trigger:    "✓ Approve" button on document card (role-gated)
Overlay:    portal — same pattern
Container:  bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in
Header:     "Approve Document"
Body:       "Are you sure you want to approve '{doc.name}'?"
            "This will move the document to {next stage label}."
Buttons:    [Cancel] [✓ Approve] — Approve is bg-emerald-600 text-white
```

**Journey:**
1. User clicks "✓ Approve" on document card → modal opens
2. Confirm → document moves to next folder (01→02→03→04)
3. If 04: status set to 'Final-Approved'
4. If 02/03: task created for next reviewer (Bob for 02, Cathy for 03)
5. Activity logged: "approved {doc.name}"
6. Toast confirmation, list refreshes

### Reject Confirmation Modal (Document Library)
```
Trigger:    "✗ Reject" button on document card (role-gated)
Overlay:    portal — same pattern
Container:  bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in
Header:     "Reject Document"
Body:       "Rejecting '{doc.name}' will move it back to {prev stage}."
            Reason textarea (required): 3 rows, focus:ring-rose-300
Buttons:    [Cancel] [✗ Reject] — Reject is bg-rose-600 text-white, disabled until reason filled
```

**Journey:**
1. User clicks "✗ Reject" → modal opens
2. User must provide rejection reason (required)
3. Confirm → document moves to previous folder (03→02, 02→01)
4. Activity logged: "rejected ({reason}) {doc.name}"
5. Toast confirmation, list refreshes

### Share Document Modal (Document Library)
```
Trigger:    "Share" button on folder 04 (Published) document cards
Overlay:    portal — same pattern
Container:  bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in
Header:     "Share Document"
Doc info:   emerald card showing FileChip + name + "Final-Approved · size"
Link display:
  bg-slate-50 border rounded-xl p-3 — LinkChain icon + monospace URL + [Copy] button
Confirmation: CheckOk icon + "Anyone with this link can view and download this document."
Buttons:    [Close]
```

**Journey:**
1. User clicks "Share" on published doc → modal opens
2. Auto-generates share token (UUID-based, 12 chars)
3. Inserts `share_tokens` row + logs "shared" activity
4. Displays public URL: `{origin}/#/share/{token}`
5. Copy button copies to clipboard with toast confirmation

### Preview Drawer — Document Activity Section
```
Location:   Below metadata in Preview Drawer (right pane)
Separator:  border-t border-slate-100 mt-5 pt-4
Header:     "Document Activity" — text-xs font-semibold text-slate-700
List:       Filtered activities WHERE target = doc.name
            Each row: Avatar(sm) + name + action + timeAgo
            max-h-[200px] overflow-y-auto with lazy loading (10 per page)
Empty:      "No activity yet for this document."
Comment:    If doc has comment, shown above activity section in bg-slate-50 rounded-lg p-2
```

### Public Share Route
```
Route:      /share/:token — accessible WITHOUT authentication
Layout:     Full-page (no Sidebar/TopBar), min-h-screen bg-slate-50
Lookup:     share_tokens.token → join document_id → fetch document
Preview:    If image type: renders <img> from Supabase Storage public URL
            If PDF/DOC: shows FileChip placeholder with "Click Preview or Download"
Actions:    [Download File] (indigo-600) + [Full Preview] (border/slate)
            Both use Supabase Storage public URL for real file access
Error:      "Invalid or expired share link" empty state
```

### Supabase Storage Setup
```sql
-- Create storage bucket for document files
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Allow authenticated users to upload
CREATE POLICY "auth upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.role() = 'authenticated'
);

-- Allow public read (for preview/download/share)
CREATE POLICY "public read" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents'
);
```

### Database Schema Addition
```sql
-- Add file_path and comment columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS comment TEXT;
```

---

## Animation

All screen entry animations use the Tailwind custom animation `animate-slide-in` (defined in tailwind.config.js). Apply to the outermost `<div>` of each screen component:

```jsx
<div className="animate-slide-in ...">
  {/* screen content */}
</div>
```

---

## SVG Icon Library (src/lib/icons.jsx)

All icons are React functional components. Props: `{ size = 18, className = '' }`. Use `currentColor` for stroke. Exact SVG path data MUST be copied from `prototype-revamp.html` (look for the `I` component / `d` constant object). Do not substitute different icon designs.

Required icons: `Home`, `Grid`, `Folder`, `CheckTask`, `WikiDoc`, `List`, `Share`, `Upload`, `Eye`, `Download`, `CheckOk`, `XClose`, `Plus`, `EditPen`, `SaveDisk`, `Users`, `PulseWave`, `LinkChain`, `ChevronRight`, `Logout`.

```jsx
// Example pattern
export function Home({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round"
         strokeLinejoin="round" className={className}>
      {/* EXACT path from prototype-revamp.html */}
    </svg>
  )
}
```

---

## Seed Data (visual reference — matches SQL seed above)

### Activity Feed entries (fetched from `activities` table, joined with auth.users for name)
```
Alice Johnson   uploaded            Final Report.pdf          10 min ago
Bob Chen        approved            Requirements Spec.docx    25 min ago
Cathy Park      edited wiki page    Team Guidelines           1 hr ago
Alice Johnson   started workflow on Design Mockup.png         2 hrs ago
Bob Chen        added item to list  Sprint Backlog            3 hrs ago
```

### Documents (fetched from `documents` table)
```
id 1: Project Charter.pdf     folder:01  owner:Alice  size:2.4 MB  type:pdf
id 2: Requirements Spec.docx  folder:02  owner:Bob    size:1.1 MB  type:doc
id 3: Design Mockup.png       folder:03  owner:Alice  size:5.2 MB  type:img
id 4: Final Report.pdf        folder:04  owner:Alice  size:3.8 MB  type:pdf  status:Final-Approved
id 5: Meeting Notes.docx      folder:01  owner:Cathy  size:0.5 MB  type:doc
```

### Tasks (fetched from `tasks` table, joined with documents and assignee)
```
task 1: Requirements Spec.docx  assignee:Bob    folder:02  priority:High    due:Mar 15
task 2: Design Mockup.png       assignee:Cathy  folder:03  priority:Medium  due:Mar 16
```

---

## Trade-offs and risks

### Trade-offs
- **Chosen**: Vite + React 18 — modern component model, hooks-based state, hot-reload DX, tree-shaking for smaller bundles.
- **Not chosen**: Vanilla JS single file — zero CRUD capability, no real auth, not maintainable past demo scope.
- **Chosen**: Supabase — free tier, PostgreSQL, built-in Auth, anon RLS perfect for demo; no custom backend to build.
- **Not chosen**: Firebase / PocketBase — Supabase SQL model is closer to Alfresco's relational content store, better narrative for the presale.
- **Chosen**: Zustand — minimal boilerplate vs Redux, works seamlessly with React hooks, sufficient for the UI-state needs of this demo.
- **Chosen**: HashRouter — GitHub Pages does not support server-side routing rewrites; hash-based routing requires zero server config.
- **Chosen**: GitHub Actions → GitHub Pages — free static hosting, CI/CD from git push, no infrastructure to manage.

### Risks and mitigations
- **Risk**: Claude Code diverges from prototype visual when spec language is ambiguous.
  - **Mitigation**: spec.md and this design.md reference exact Tailwind class names and hex values. config.yaml mandates reading prototype-revamp.html before any screen is implemented.
- **Risk**: Supabase free tier cold-start latency (500ms+) makes loading states feel broken in demo.
  - **Mitigation**: useDocuments and other hooks use optimistic local state updates for all writes so the UI responds instantly. `loading` skeletons use `animate-pulse` so they appear intentional.
- **Risk**: Supabase anon key is visible in built JS bundle.
  - **Mitigation**: RLS policies ensure anon key can only read share_tokens. All other operations require `auth.role() = 'authenticated'`. This is acceptable for a demo deployment.
- **Risk**: Auth state missing on hard refresh (GitHub Pages).
  - **Mitigation**: Supabase client auto-restores session from localStorage on init via `getSession()` call in App.jsx `useEffect`.

---

## Round 3 — Bug Fixes & UX Improvements

### 3.1 Graceful File Upload (`tryUploadFile`)
- File upload to Supabase Storage is now **optional/graceful**
- `tryUploadFile(siteId, file)` wraps upload in try/catch — returns `null` on failure instead of blocking document creation
- If upload fails (e.g. bucket not found), document record is still created without `file_path`
- Toast warning: `"Document created (file upload skipped — create Storage bucket in Supabase Dashboard)"`

### 3.2 Trash Folder (00)
- New folder `{ id: '00', label: 'Trash', dot: 'bg-rose-400' }` added to FOLDERS array
- Position: first item in folder list (before 01 Draft)
- Documents in Trash show a **"Put Back"** button that restores them to `01` (Draft)
- **PutBackModal**: confirmation dialog with document name, updates `folder` from `'00'` → `'01'`
- Activity logged: `"restored from Trash"` with target = document name

### 3.3 Draft Folder (01) Button Rename
- **"Approve" → "Submit"**: moves document from `01` → `02` (In Review)
  - **SubmitModal**: confirms submission with document name
  - Activity: `"submitted for review"`
- **"Reject" → "Cancel"**: moves document from `01` → `00` (Trash)
  - **CancelDocModal**: requires reason textarea, updates `folder` to `'00'` and stores `reject_reason`
  - Activity: `"cancelled document"`
- Folders `02` and `03` retain "Approve" / "Reject" labels and behavior unchanged

### 3.4 Edit Document Modal
- Available only on `01 Draft` folder
- **EditDocModal**: pre-fills current document values (name, type, file, comment)
- Can replace file (new upload via `tryUploadFile`), edit name, change type, add/update comment
- Activity: `"edited document"`

### 3.5 No-File Messaging
- Preview drawer: if `!doc.file_path`, shows a centered block `"No file attached"` instead of Preview/Download buttons
- Preview/Download actions: if no file, show toast `"No file attached to preview/download"`
- Share modal: if no file, shows amber warning `"This document has no file attached. Recipients won't be able to preview or download."`

### 3.6 Public Share Page Update
- **Removed**: entire "Document Preview" panel area (image preview / placeholder block)
- If document has `file_path`: shows Download + Full Preview buttons
- If document has no `file_path`: shows `"No file attached to this document"` message
- Unused `LinkChain` icon import removed

### 3.7 Reusable Hooks
- **`useInfiniteScroll(onLoadMore, { enabled })`**: reusable IntersectionObserver hook, returns sentinel ref
  - Used across GlobalDashboard (sites + activities), SiteOverview (members + activities), DocumentLibrary (documents + doc activities)
- **`useActivities`**: added `filterTarget` option for per-document activity filtering in preview drawer
- **`useDocuments`**: added pagination (offset, loadMore, hasMore, loadingMore) with PAGE_SIZE = 10

---

## Round 4 — Share Link Toggle & Workflow Tasks Enhancement

### 4.1 Share Link Enable/Disable Toggle (Documents → 04 Published)

**Problem:** Every click on "Share" generates a new token. Old tokens live forever with no way to revoke.

**Solution:**
- `share_tokens` table: add `active` boolean column (default `true`)
- **ShareModal** behavior change:
  - On open, query `share_tokens` for existing token where `document_id = doc.id`
  - If token exists → display it (no re-generation)
  - If no token → generate new one (same as before)
  - Add **toggle switch** to enable/disable the link
    - Toggle calls `supabase.from('share_tokens').update({ active: !current }).eq('id', tokenRow.id)`
    - **Enabled (green):** "Public access is enabled — anyone with this link can view"
    - **Disabled (red):** "Link is disabled — visitors will see 'expired' message"
  - Activity logged: `"shared"` on first generation, `"disabled share link"` / `"enabled share link"` on toggle
- **PublicShare.jsx** update:
  - After fetching `share_tokens` row, check `tokenRow.active === true`
  - If `active === false`, show same error state as invalid token: "Invalid or expired share link"

### 4.2 Workflow Tasks — Column-Specific Actions with Confirm Popups

**Problem:** All task columns show identical Approve/Reject buttons without confirmation. Column 01 (Draft) and 04 (Published) shouldn't have Approve/Reject.

**Solution — per-column button mapping:**

#### Column 01 · Draft
- **Data sync:** Show documents in folder `01` from `documents` table (not from `tasks` table which only has review-stage tasks). Use `useDocuments` hook filtered to `folder === '01'`.
- **Buttons (if canApproveDoc):** `Submit` (emerald) + `Cancel` (rose)
- **SubmitModal:** "Are you sure you want to submit {name} for review?" → moves doc to folder `02`, creates task for reviewer, logs `"submitted for review"`
- **CancelDocModal:** Requires reason textarea → moves doc to folder `00` (Trash), logs `"cancelled document"` with reason

#### Column 02 · In Review
- **Data:** Tasks from `tasks` table with `folder === '02'`
- **Buttons (if canApproveTask):** `Approve` (emerald) + `Reject` (rose)
- **ApproveModal:** "Are you sure you want to approve {name}?" → "moves to Final Review"
- **RejectModal:** Requires reason textarea → "moves back to Draft"

#### Column 03 · Final Review
- **Data:** Tasks from `tasks` table with `folder === '03'`
- **Buttons (if canApproveTask):** `Approve` (emerald) + `Reject` (rose)
- **ApproveModal:** "Are you sure you want to approve {name}?" → "moves to Published"
- **RejectModal:** Requires reason textarea → "moves back to In Review"

#### Column 04 · Published
- **Data:** Documents in folder `04` from `documents` table
- **Buttons:** Only `Share` button (emerald) — shown only if document has no existing active share token
- **Share action:** Opens same ShareModal from DocumentLibrary (with enable/disable toggle from 4.1)
- If already shared → shows "Shared ✓" indicator instead of button

### 4.3 Confirm Modal Pattern (reused across Tasks)
All confirm modals follow the same pattern from DocumentLibrary.jsx:
- `createPortal(jsx, document.body)` for overlay
- Fixed full-screen `bg-black/40 backdrop-blur-sm`, z-50
- `max-w-sm` white card with `animate-slide-in`
- Click-outside closes, X button closes
- Loading state disables button and shows "...ing" text
- Reject/Cancel modals require reason textarea (button disabled until filled)

### 4.4 useTasks Hook Updates
- Add `submit(documentId)` method: updates `documents.folder` from `01` → `02`, inserts new task row for reviewer, logs activity
- Add `cancel(documentId, reason)` method: updates `documents.folder` from `01` → `00`, logs activity with reason
- Existing `approve` and `reject` remain unchanged

### 4.5 Key Files Changed
| File | Changes |
|---|---|
| `share_tokens` table | Add `active` boolean column (default true) via SQL |
| `src/screens/PublicShare.jsx` | Check `active` flag on token lookup |
| `src/screens/DocumentLibrary.jsx` ShareModal | Load existing token, add toggle switch |
| `src/screens/WorkflowTasks.jsx` | Column-specific buttons + 6 confirm popup modals |
| `src/hooks/useTasks.js` | Add `submit`, `cancel` methods |

### 4.6 Manual Steps (User Action Required)

**Supabase SQL Editor — run once:**
```sql
ALTER TABLE share_tokens ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
```
This adds the `active` column used by the share link toggle. Without it, the toggle won't persist.

### 4.7 Column Scroll with 3-Row Visible Limit

**Problem:** Each kanban column grows infinitely, pushing the board taller with no scroll.

**Solution:**
- Card area per column: `max-h-[480px] overflow-y-auto` (fits ~3 cards visible)
- Thin scrollbar via Tailwind scrollbar utilities or custom CSS
- Column outer container keeps `min-h-[200px]` unchanged

### 4.8 Clickable Card → Preview Slide Panel

**Problem:** Task cards are not clickable. No way to see document details without navigating to Documents menu.

**Solution:**
- Clicking card body (not action buttons) sets `previewDoc` state
- Right-side preview panel (`w-72`, same as Documents Pane 3):
  - FileChip + doc name + status badge
  - Metadata: Owner, Size, Stage, Comment
  - Document Activity log (reuse `useActivities` + `useInfiniteScroll` pattern)
  - View/Download buttons at bottom (or "No file attached")
- Layout: outer `flex` wrapper — kanban area `flex-1 overflow-y-auto`, preview panel `w-72` on right
- Close button (X) dismisses panel
- `timeAgo()` helper duplicated locally (same as DocumentLibrary pattern)

**Files changed:**
| File | Changes |
|---|---|
| `src/screens/WorkflowTasks.jsx` | Add scroll per column, clickable cards, preview panel |
| `openspec/.../design.md` | Add sections 4.7 & 4.8 |

### 4.9 Published Folder — Share Status Indicator & Filter

**Problem:** Share button in "04 Published" looks identical whether doc is shared or not. No way to filter shared vs unshared.

**Solution:**

**Share button visual state:**
- **Not shared:** Filled green button → `<Share /> Share`
- **Already shared:** Outlined green button → `<CheckOk /> Shared ✓`
- Both open ShareModal (copy link / toggle active)

**Filter button group** (only when `selectedFolder === '04'`):
- Segmented pill: `All` | `Shared` | `Not Shared`
- In header bar next to "New" button
- State: `shareFilter` (`'all'` | `'shared'` | `'not_shared'`)
- State: `shareStatusMap` — `{ [docId]: boolean }` cached from `share_tokens` query
- `useEffect` fetches `share_tokens` when folder is `04`
- `filteredDocs` applies secondary filter when `shareFilter !== 'all'`

**Files changed:**
| File | Changes |
|---|---|
| `src/screens/DocumentLibrary.jsx` | Share button conditional icon, filter group, share status cache |

### 4.10 Tasks Board — Published Column Share Filter Dropdown

**Problem:** Tasks board "04 Published" column shows all published docs with no way to filter by share status, unlike Documents menu.

**Solution:**
- Add a small dropdown select in the "04 Published" column header (next to the count badge)
- Options: `All` (default) | `Shared` | `Not Shared`
- Uses existing `shareTokenCache` to filter items in the Published column
- Compact `<select>` styled to match column header aesthetic

**Files changed:**
| File | Changes |
|---|---|
| `src/screens/WorkflowTasks.jsx` | Add `publishedFilter` state + dropdown in col 04 header + filter logic |

### 4.11 Sidebar Menu Re-order & Rename

**Problem:** Menu order doesn't match user's preferred workflow priority. "Project Lists" label is unclear.

**Solution:**

Re-order `SITE_NAV` array in `Sidebar.jsx`:
1. Overview
2. Tasks
3. Documents
4. Wiki
5. Issues (renamed from "Project Lists")
6. Public Share

Also rename route path from `/lists` to `/issues` for consistency.

**Files changed:**
| File | Changes |
|---|---|
| `src/components/Sidebar.jsx` | Re-order SITE_NAV items, rename "Project Lists" → "Issues" |
| `src/App.jsx` | Update route path `/lists` → `/issues` |

### 4.12 Persist Selected Site on Page Refresh

**Problem:** Refreshing the browser loses the selected site — user gets bounced back to the Global Dashboard and must re-select.

**Solution:**

Use Zustand `persist` middleware to save `currentSite` to `localStorage`:
- Wrap `useAppStore` with `persist()` from `zustand/middleware`
- Only persist `currentSite` (not UI-transient state like `previewDoc`, `selectedFolder`)
- On page load, Zustand auto-hydrates `currentSite` from localStorage
- `setSite(null)` (Exit button) clears the persisted value

**Files changed:**
| File | Changes |
|---|---|
| `src/store/useAppStore.js` | Add `persist` middleware, whitelist `currentSite` |

---

## Round 5 — Wiki Publishing Hub (Revised)

### 5.1 Overview

Wiki becomes a **public article publishing hub** with a **3-pane layout mirroring Documents**. Pages have stages (Trash, Draft, Published) displayed in a stage sidebar (Pane 1). Real **CKEditor 5** library is integrated for rich content editing. Published pages can be shared as public web articles.

### 5.2 Layout: 3-Pane (mirrors Documents menu)

```
┌──────────────┬──────────────────────────┬──────────────────┐
│    Pane 1    │       Pane 2             │     Pane 3       │
│  Stage Tree  │     Page List            │  Preview/Detail  │
│   (w-52)     │     (flex-1)             │    (w-72)        │
│              │                          │                  │
│ PAGES    (3) │  ┌─────────────────┐     │  Title           │
│  📝 Draft  2 │  │ Welcome Page    │     │  Owner: Alice    │
│  🌐 Published│  │ Alice · Draft   │     │  Stage: Draft    │
│           1  │  └─────────────────┘     │  ──────────────  │
│              │  ┌─────────────────┐     │  Content Preview │
│ OTHERS   (1) │  │ Project Overview│     │  (rendered HTML) │
│  🗑 Trash  1 │  │ Bob · Draft     │     │  ──────────────  │
│              │  └─────────────────┘     │  Page Activity   │
│              │                          │  • Alice created │
└──────────────┴──────────────────────────┴──────────────────┘
```

### 5.3 Page Stages

| Status | Label | Section | Dot Color | Description |
|--------|-------|---------|-----------|-------------|
| `01` | Draft | PAGES | `bg-slate-400` | New/saved pages |
| `02` | Published | PAGES | `bg-emerald-400` | Live as public web page |
| `00` | Trash | OTHERS | `bg-rose-400` | Cancelled pages |

Workflow: Draft → Published (Submit), any stage → Trash (Cancel), Trash → Draft (Put Back)

### 5.4 NPM Dependencies

```bash
npm install @ckeditor/ckeditor5-react @ckeditor/ckeditor5-build-classic
```

### 5.5 Database Changes

**Add columns to `wiki_pages`:**
```sql
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS status text DEFAULT '01';
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
UPDATE wiki_pages SET status = '01' WHERE status IS NULL OR status NOT IN ('00','01','02');
```

**Create `wiki_share_tokens` table:**
```sql
CREATE TABLE wiki_share_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid REFERENCES wiki_pages(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  active      boolean DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE wiki_share_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read by token" ON wiki_share_tokens FOR SELECT USING (true);
CREATE POLICY "auth create" ON wiki_share_tokens FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth update all" ON wiki_share_tokens FOR UPDATE USING (auth.role() = 'authenticated');
```

### 5.6 Page Creation & Editor Journey

**Step 1 — Click (+) New button in Pane 2 header:**
- Creates new page record (`status: '01'`, `owner_id: currentUser.id`)
- Opens CKEditor 5 in Pane 2 with title input
- Buttons: **[Save Draft]** + **[Cancel]**

**Step 2 — Save Draft:**
- Saves title + content to DB
- Toast: "Draft saved"
- Buttons become: **[Edit]** + **[Submit]** + **[Cancel]**

**Step 3 — Edit (on existing Draft):**
- Re-opens CKEditor with existing content
- Buttons: **[Save]** + **[Submit]** + **[Cancel]**

**Step 4 — Submit → Published:**
- Confirm popup: "Publish '{title}' as a public article?"
- Moves page to `status: '02'` (Published)
- Activity logged

**Step 5 — Cancel → Trash:**
- Confirm popup with reason textarea (required)
- Moves page to `status: '00'` (Trash)

**Step 6 — Put Back (from Trash):**
- Confirm popup: "Restore '{title}' to Draft?"
- Moves page back to `status: '01'`

### 5.7 Pane 1 — Stage Sidebar (w-52, mirrors Documents)

```
── PAGES ──────────── (3)
   📝 01 · Draft          2
   🌐 02 · Published      1

── OTHERS ─────────── (1)
   🗑 Trash               1
```

Section headers show total count. Each stage button shows per-stage count.

### 5.8 Pane 2 — Page List (flex-1)

Header: Stage label + page count + [+ New] button
Page row card: `bg-white border rounded-xl p-4` with title, owner avatar, status badge
- Draft pages show: [Edit] [Submit] [Cancel] action buttons
- Published pages show: [Share] / [Shared ✓] + [Edit] + [Unpublish] buttons
- Trash pages show: [Put Back] button
- Click card → opens Pane 3 detail

### 5.9 Pane 3 — Preview/Detail Panel (w-72)

Same pattern as Documents preview drawer:
- Title + Status badge
- Owner, Stage, Created date
- Content preview (rendered HTML, max-h with scroll)
- Page Activity log (from `activities` table, filtered by page title)
- Action buttons at bottom

### 5.10 CKEditor 5 Integration

- Library: `@ckeditor/ckeditor5-react` + `@ckeditor/ckeditor5-build-classic`
- Component: `<CKEditor editor={ClassicEditor} data={content} onChange={...} />`
- Config: heading, bold, italic, link, bulletedList, numberedList, blockQuote, insertTable, mediaEmbed, undo, redo
- Renders in Pane 2 when editing, replaces page list

### 5.11 Confirm Modals (portal pattern)

1. **SubmitModal** — "Publish '{title}' as a public article?" → emerald confirm
2. **CancelPageModal** — "Cancel '{title}'? It will be moved to Trash." + reason textarea → rose confirm
3. **PutBackModal** — "Restore '{title}' from Trash to Draft?" → indigo confirm
4. **UnpublishModal** — "Unpublish '{title}'? Back to Draft." → amber confirm
5. **WikiShareModal** — Same pattern as Documents ShareModal: show/generate token, copy link, enable/disable toggle

### 5.12 Public Wiki Route

- Route: `/wiki/:token` — accessible WITHOUT authentication
- File: `src/screens/PublicWiki.jsx`
- Standalone article layout (no Sidebar/TopBar)
- Header: DocHub logo + "Public Article" badge
- Content: page title + rendered HTML
- Footer: "Shared via DocHub"
- Error: "Invalid or expired article link"

### 5.13 Files Changed

| File | Changes |
|---|---|
| `package.json` | Add `@ckeditor/ckeditor5-react`, `@ckeditor/ckeditor5-build-classic` |
| `wiki_pages` table | Add `status` + `owner_id` columns |
| New `wiki_share_tokens` table | Public article share links |
| `src/hooks/useWiki.js` | Add `publish`, `unpublish`, `cancel`, `putBack` methods; use status codes `00`/`01`/`02` |
| `src/screens/Wiki.jsx` | Complete rewrite: 3-pane layout, CKEditor 5, stage sidebar, modals, share |
| `src/screens/PublicWiki.jsx` | Public article page |
| `src/App.jsx` | `/wiki/:token` public route (already added) |

---

## Round 6 — Bug Fixes & Enhancements

### 6.1 Wiki: Share button not updating immediately
**Problem:** After clicking Share and generating a link on a Published page, the button stays as "Share" instead of showing "Shared ✓" until a manual refresh.
**Solution:** Pass `onShareCreated` callback from WikiShareModal to parent; immediately update `shareStatusMap` when a new token is created.

### 6.2 Wiki: Page Activity not recording Edit/Submit/Cancel/PutBack
**Problem:** Activity log in the preview panel wasn't consistently refreshing after workflow actions.
**Solution:** Increased refetch delay from 300ms to 600ms to ensure Supabase insert completes before re-query. The `useWiki` hook already logs activities for all workflow methods.

### 6.3 CKEditor: Display more toolbar tools
**Problem:** The Classic pre-built editor (`@ckeditor/ckeditor5-build-classic`) only ships with ~10 toolbar plugins. Extra items (strikethrough, underline, alignment, code, etc.) were silently dropped.
**Solution:** Switched from `@ckeditor/ckeditor5-build-classic` to the unified `ckeditor5` package. Now explicitly importing 25+ plugins: Bold, Italic, Underline, Strikethrough, Font (size/color/background), Alignment, Heading, Link, List, TodoList, BlockQuote, CodeBlock, Code, Table, Indent, MediaEmbed, HorizontalLine, FindAndReplace, Highlight, RemoveFormat, SpecialCharacters.

### 6.4 Wiki Trash: Add delete confirm popup
**Problem:** Clicking the (X) delete button on a Trash page deleted it immediately with no confirmation.
**Solution:** Added `DeletePageModal` confirmation dialog with warning text "This action cannot be undone." Button triggers modal instead of direct delete.

### 6.5 Documents Trash: Add delete button with confirm popup
**Problem:** Documents in Trash only had "Put Back" — no way to permanently delete.
**Solution:** Added delete (X) icon button next to "Put Back" on Trash documents. Added `DeleteDocModal` confirmation dialog matching Wiki's pattern. Uses `remove()` from `useDocuments` hook.

### 6.6 Files Changed

| File | Changes |
|---|---|
| `package.json` | Replace `@ckeditor/ckeditor5-build-classic` with `ckeditor5` unified package |
| `src/screens/Wiki.jsx` | CKEditor 5 unified imports + 25 plugins, `DeletePageModal`, share immediate update, longer activity refetch delay |
| `src/screens/DocumentLibrary.jsx` | `DeleteDocModal`, delete (X) button on Trash docs, `handleDeleteDoc` handler |

---

## 7. Round 7 — Issues Full CRUD + Remove Public Share Menu

### 7.1 Remove "Public Share" Sidebar Menu
**Problem:** The "Public Share" sidebar item links to `/share` which has no auth-protected page (only the public `/share/:token` route exists).
**Solution:** Remove the `{ id: 'share', label: 'Public Share', icon: Share, path: '/share' }` entry from `SITE_NAV` in `Sidebar.jsx`. Remove unused `Share` import if no longer needed.

### 7.2 Issues Module — Full CRUD Rewrite
**Problem:** The Issues screen (`ProjectLists.jsx`) only displays data in a table with no real CRUD. The "New Item" button shows a toast instead of creating an item. No edit, delete, or detail panel.

**Solution:** Complete rewrite of `ProjectLists.jsx` with 3-pane layout (matching Wiki/Documents pattern):

#### Layout
```
┌──────────┬─────────────────────────┬────────────┐
│ Pane 1   │ Pane 2                  │ Pane 3     │
│ w-52     │ flex-1                  │ w-72       │
│          │                         │            │
│ LIST NAV │ ISSUE TABLE             │ DETAIL     │
│          │                         │ PANEL      │
│ • List A │ ID | Title | Assignee.. │            │
│ • List B │                         │ Issue info │
│          │                         │ + Activity │
│ [+ New]  │            [+ New Item] │            │
└──────────┴─────────────────────────┴────────────┘
```

#### Pane 1 — List Navigator
- Shows all project_lists for the site with item counts
- Click to select active list
- **Create List**: ➕ button → inline input with Enter to save, Escape to cancel
- **Rename List**: Double-click list name → inline edit
- **Delete List**: Hover shows 🗑 icon → confirm modal → deletes list + all items

#### Pane 2 — Issue Table
- Table columns: Issue Key, Title, Assignee, Status, Priority, Due Date
- Click row to select issue → opens Pane 3
- **Status badge click** → cycles through: Open → In Progress → Done → Open
- **Priority badge click** → cycles through: Low → Medium → High → Low
- **"+ New Item" button** → opens `CreateItemModal`

#### Pane 3 — Detail Panel (shows when issue selected)
- Issue icon + Title + Status badge
- Metadata rows: Assignee, Priority, Due Date, Created
- Description section (if exists)
- Action buttons: Edit (✏️ EditPen), Delete (🗑 Trash)
- Edit button → opens `EditItemModal`
- Delete button → `DeleteItemModal` confirm
- Activity log (using `useActivities` with `filterTarget: issue_key`)

#### Modals
1. **CreateItemModal** — Form: Title (required), Description (optional), Assignee (select), Status (select), Priority (select), Due Date (date input). Auto-generates issue_key as `ISS-{padded count}`.
2. **EditItemModal** — Same form, pre-filled with current values.
3. **DeleteItemModal** — Confirm dialog: "Permanently delete ISS-001? This action cannot be undone."
4. **DeleteListModal** — Confirm dialog: "Delete list and all its items?"
5. **RenameListModal** — Inline edit (no modal needed, just inline input)

#### Activity Logging
All CRUD actions insert into `activities` table:
- `created issue {issue_key}` / `updated issue {issue_key}` / `deleted issue {issue_key}`
- `changed status of {issue_key} to {status}` / `changed priority of {issue_key} to {priority}`
- `created list {name}` / `renamed list {old} to {new}` / `deleted list {name}`

### 7.3 Hook Changes — `useProjectLists.js`
Add missing CRUD methods:
- `updateList(id, patch)` — rename list
- `deleteList(id)` — delete list + cascade items
- `deleteItem(id)` — delete single item
- Ensure `createItem` returns the created row for activity logging

### 7.4 Icon Additions — `icons.jsx`
- `Trash` — trash can icon for delete actions
- `Calendar` — calendar icon for due date display

### 7.5 Files Changed

| File | Changes |
|---|---|
| `openspec/changes/implement-demo-v2/design.md` | Round 7 spec |
| `src/components/Sidebar.jsx` | Remove "Public Share" from SITE_NAV |
| `src/screens/ProjectLists.jsx` | Full rewrite: 3-pane layout, all CRUD modals, inline status/priority toggle, detail panel with activity |
| `src/hooks/useProjectLists.js` | Add `updateList`, `deleteList`, `deleteItem`; return created row from `createItem` |
| `src/lib/icons.jsx` | Add `Trash`, `Calendar` icons |

---

## 8. Round 8 — Filter Enhancements (Tasks, Wiki, Issues)

### 8.1 Tasks: Published Dropdown Inline with Header
**Problem:** The Published column's filter dropdown sits on a separate line below the header, wasting vertical space.
**Solution:** Move the `<select>` into the same flex row as the column title and count badge. Layout: `04 · Published  [▾ All]  (3)` all on one line.

### 8.2 Wiki: Published Share Filter Button Group
**Problem:** The Published pages list shows all pages with no way to filter by share status.
**Solution:** When `selectedStage === '02'`, show a segmented button group below the header: **All** | **Shared** | **Not Shared**. Uses existing `shareStatusMap` to determine share status. Add `publishedFilter` state ('all' | 'shared' | 'not_shared') and filter `filteredPages` accordingly.

### 8.3 Issues: Table Filter Bar
**Problem:** The issue table has no filtering capability. Users can't narrow down by assignee, status, priority, or date ranges.
**Solution:** Add a filter bar between the list header and table with:
- **Row 1:** Assignee dropdown (All + 3 users), Status dropdown (All + 3 statuses), Priority dropdown (All + 3 levels)
- **Row 2:** Issue Date range (from/to date pickers), Due Date range (from/to date pickers)
- Client-side filtering on the items array before rendering

### 8.4 Files Changed

| File | Changes |
|---|---|
| `src/screens/WorkflowTasks.jsx` | Move Published dropdown inline with column header |
| `src/screens/Wiki.jsx` | Add `publishedFilter` state + button group + filter logic for Published stage |
| `src/screens/ProjectLists.jsx` | Add filter state (assignee, status, priority, issue date range, due date range) + filter bar UI + filtering logic |

---

## 9. Round 9 — RBAC Enforcement & Dynamic Configurable Workflow

### 9.1 Problem
1. **Incomplete RBAC**: Wiki and Issues had zero role-based access control; Documents and Tasks had partial enforcement. Any user could perform any action.
2. **Hardcoded 4-stage workflow**: The approval pipeline (Draft → In Review → Final Review → Published) was hardcoded with fixed stage codes (`01`–`04`) and fixed assignees. No way to customize per site.

### 9.2 Solution: Full RBAC Enforcement

**Admin detection**: `isAdmin = userRole?.canApproveFolder === null` (from `site_members` → `ROLES` map).

| Module | Admin | Non-Admin |
|---|---|---|
| **Wiki** | Full CRUD, Submit, Unpublish, Share, Delete | View all + Edit own pages only |
| **Issues (ProjectLists)** | Create/delete lists + full item CRUD | Create/edit items, no list management |
| **Documents** | Full CRUD + approve/reject at any stage | Submit own drafts, approve only at assigned stages |
| **Tasks** | View all stages, approve/reject at any stage | Approve/reject only tasks assigned to them |

### 9.3 Solution: Dynamic Configurable Approval Workflow

#### New Supabase table: `site_workflow_stages`

```sql
CREATE TABLE site_workflow_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  stage_order INT NOT NULL,
  stage_code TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_type TEXT NOT NULL CHECK (stage_type IN ('draft','review','published')),
  assignee_id UUID,
  color TEXT DEFAULT 'indigo',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Default seed** (matches pre-existing behavior):
| Order | Code | Name | Type | Assignee | Color |
|---|---|---|---|---|---|
| 1 | 01 | Draft | draft | — | slate |
| 2 | 02 | In Review | review | Bob Chen | amber |
| 3 | 03 | Final Review | review | Carol Davis | violet |
| 4 | 04 | Published | published | — | emerald |

#### Key design decisions
- **Stage codes are STABLE**: once created, `stage_code` never changes. Only `stage_order` changes when reordering. This avoids migrating existing documents/tasks that reference stage codes.
- **Config-driven approval**: `stage.assignee_id === currentUser.id` replaces hardcoded `canApproveFolder` checks.
- **Dynamic grid layout**: `style={{ gridTemplateColumns: \`repeat(N, minmax(0,1fr))\` }}` replaces `grid-cols-4`.
- **Dynamic Tailwind styles**: `getStageStyles(color)` maps color names to literal Tailwind class objects (JIT can't handle dynamic class names).

### 9.4 New Hook: `useWorkflowConfig(siteId)`

**File:** `src/hooks/useWorkflowConfig.js`

**Exports:**
- `useWorkflowConfig(siteId)` — fetches `site_workflow_stages`, returns:
  - `stages` (sorted by `stage_order`), `loading`, `refetch`
  - `draftStage`, `publishedStage`, `reviewStages`
  - `getNextStage(code)`, `getPrevStage(code)`, `getStage(code)`
  - `stageLabel(code)` — returns stage name for a code
  - `addReviewStage(name, assigneeId)` — inserts before Published, bumps order
  - `updateStage(id, patch)` — updates stage name/assignee
  - `removeStage(id)` — deletes review stage, recomputes orders
- `getStageStyles(color)` — returns `{ dot, border, bg, head }` literal Tailwind classes

**STYLE_MAP** covers: `slate`, `amber`, `violet`, `emerald`, `indigo`, `blue`, `rose`, `cyan`, `orange`, `teal`.

### 9.5 Impact on Existing Modules

#### DocumentLibrary.jsx
- Imports `useWorkflowConfig`, `getStageStyles`
- Removes hardcoded `STAGE_FOLDERS`, `OTHER_FOLDERS`, `FOLDERS`
- Dynamically computes folders from `wf.stages`
- `canApproveDoc` uses `wf.getStage(doc.folder)?.assignee_id === currentUser?.id`
- Submit/Approve/Reject use `wf.getNextStage()` / `wf.getPrevStage()`
- Stage type checks use `docStage?.stage_type` instead of hardcoded folder codes

#### WorkflowTasks.jsx
- Imports `getStageStyles` from workflow config
- Removes hardcoded `STAGE_LABELS` and `COLUMNS`
- Dynamically builds columns from `wfStages` (returned by `useTasks`)
- `canApproveTask` uses `task.assignee_id === currentUser.id`
- All column type checks use `col.stageType` instead of hardcoded IDs

#### useTasks.js (Rewritten)
- Fetches `site_workflow_stages` internally
- Returns `stages` alongside existing data
- Submit/Approve/Reject all use dynamic stage lookup
- No longer imports `DEMO_USERS`

#### SiteOverview.jsx
- Workflow Pipeline Config section with:
  - Pipeline visualization (stage chips with arrows)
  - Stages table (order, name, type, assignee, actions)
  - Add Stage button → `AddStageModal` (name + assignee form)
  - Edit/Delete buttons for review stages → `EditStageModal`
  - Draft/Published stages show "Locked" (non-editable)

#### Wiki.jsx — RBAC only
- `isAdmin` / `canEditPage(page)` guards on all actions
- Non-admin: view + edit own pages; no Submit/Unpublish/Share/Delete

#### ProjectLists.jsx — RBAC only
- `isAdmin` guards on Create List / Delete List buttons
- All users can create/edit items within lists

### 9.6 Files Changed

| File | Changes |
|---|---|
| `openspec/changes/implement-demo-v2/design.md` | Round 9 spec |
| `src/hooks/useWorkflowConfig.js` | **NEW** — dynamic workflow config hook |
| `src/hooks/useTasks.js` | Full rewrite: dynamic stages, config-driven approve/reject |
| `src/screens/DocumentLibrary.jsx` | Dynamic folders from config, config-driven approval |
| `src/screens/WorkflowTasks.jsx` | Dynamic columns from config, config-driven task approval |
| `src/screens/SiteOverview.jsx` | Workflow Pipeline config panel + AddStageModal + EditStageModal |
| `src/screens/Wiki.jsx` | RBAC enforcement (admin vs. own-page access) |
| `src/screens/ProjectLists.jsx` | RBAC enforcement (admin-only list management) |
| `src/lib/icons.jsx` | Add `Settings` gear icon |

---

## 10. Round 10 — Workflow Unification & Bug Fixes

### 10.1 Problems
1. **Documents blank page**: `wf.stages` is `[]` on first render (async fetch), causing STAGE_FOLDERS to be empty and the page to crash.
2. **Site creation missing workflow stages**: New sites have no default pipeline stages.
3. **Type badge lowercase**: Stage type shows raw "draft"/"review"/"published" instead of Title Case.
4. **No delete confirmation**: Deleting a stage had no confirmation dialog.
5. **No reorder capability**: Review stages couldn't be reordered.
6. **No usage safety check**: Deleting a stage with existing data (docs/wiki) was allowed.
7. **Wiki not synced with pipeline**: Wiki used hardcoded 2-stage (Draft/Published) system instead of configurable workflow.
8. **Tasks only tracked documents**: Wiki pages were invisible in the Tasks kanban.
9. **Tasks columns misaligned**: Stage columns could show gaps due to data sync issues.

### 10.2 Solutions

#### D1: Documents blank page fix
- Add `wf.loading` guard in DocumentLibrary.jsx — show skeleton while stages load.

#### S1: Auto-seed workflow stages on site creation
- GlobalDashboard.jsx `handleCreateSite` now inserts `DEFAULT_WORKFLOW_STAGES` (exported from `useWorkflowConfig.js`) into `site_workflow_stages` table.
- Default stages: Draft, In Review (assigned to Reviewer), Final Review (assigned to Approver), Published.

#### S2: Capitalize type badge
- `stage.stage_type[0].toUpperCase() + stage.stage_type.slice(1)` in SiteOverview.jsx.

#### S3: Confirm delete with usage check
- New `ConfirmDeleteStageModal` component checks usage via `checkStageUsage(stageCode)` before allowing deletion.
- If documents or wiki pages exist in the stage, deletion is blocked with a count message.

#### S4: Reorder review stages
- ▲/▼ buttons on each review stage row in the stages table.
- New `swapOrder(idA, idB)` method in `useWorkflowConfig` swaps `stage_order` of two stages.
- Only adjacent review stages can be swapped (draft/published are locked).

#### S5: Pipeline label
- "Applies to Documents & Wiki" tag in the pipeline header.

#### W1: Wiki full workflow integration
- Wiki.jsx now uses dynamic stages from `useWiki` (which fetches `site_workflow_stages`).
- `useWiki.js` rewritten with: `submit()`, `approve()`, `reject()`, `publish()`, `unpublish()` — all using dynamic stage codes.
- Wiki `submit()` creates task records for assigned reviewers.
- Wiki sidebar shows all pipeline stages (Draft → Review stages → Published + Trash).
- Review stages show Approve/Reject buttons for assigned reviewers.

#### T1+T2: Tasks unified kanban
- `useTasks.js` now fetches `wiki_page:wiki_page_id(...)` in task join + `wiki_pages` in draft/published.
- Returns `wikiPages` alongside `docs`.
- `approve()`/`reject()` handle both doc and wiki tasks (checks `task.wiki_page_id`).
- WorkflowTasks.jsx renders wiki pages with 📖 badge in Draft/Published columns.
- Review task cards show 📖 or 📄 type indicator.

### 10.3 DB Migration (User must run)

```sql
-- Add wiki_page_id to tasks table
ALTER TABLE tasks ADD COLUMN wiki_page_id UUID REFERENCES wiki_pages(id);

-- Remap existing wiki page status codes to match workflow stage codes
-- (Old: '02' = Published; New: '04' = Published matching site_workflow_stages)
UPDATE wiki_pages SET status = '04' WHERE status = '02';
```

### 10.4 Files Changed

| File | Changes |
|---|---|
| `openspec/changes/implement-demo-v2/design.md` | Round 10 spec |
| `src/lib/icons.jsx` | Add `ChevronUp`, `ChevronDown` icons |
| `src/hooks/useWorkflowConfig.js` | Add `DEFAULT_WORKFLOW_STAGES`, `swapOrder`, `checkStageUsage`; `removeStage` now checks usage |
| `src/hooks/useWiki.js` | Full rewrite: dynamic workflow stages, task creation on submit/approve/reject |
| `src/hooks/useTasks.js` | Add wiki task support: fetch `wiki_page` join + `wikiPages`, handle wiki in approve/reject |
| `src/screens/GlobalDashboard.jsx` | Auto-seed workflow stages on site creation |
| `src/screens/DocumentLibrary.jsx` | Add `wf.loading` guard to fix blank page |
| `src/screens/SiteOverview.jsx` | Capitalize type badge, confirm delete modal, reorder ▲/▼ buttons, pipeline label |
| `src/screens/Wiki.jsx` | Full rewrite: dynamic pipeline stages, review approve/reject, config-driven RBAC |
| `src/screens/WorkflowTasks.jsx` | Render wiki items in kanban (draft/published/review), type badges |

---

## Round 11: Bug Fixes (8 issues)

### 11.1 Summary

Round 11 fixes 8 bugs found after Round 10 deployment across Overview, Tasks, Documents, and Wiki modules.

### 11.2 Fixes

#### O1: swapOrder click doesn't reorder stages
- **Root cause**: `Promise.all` parallel updates to `site_workflow_stages` cause race condition in PostgreSQL.
- **Fix**: Change `swapOrder` in `useWorkflowConfig.js` to sequential updates (await first, then second).

#### O2: Duplicate members on add/refresh
- **Root cause**: `membersHasMore` starts `true` → InfiniteScroll sentinel fires at offset 0 before initial fetch completes, duplicating rows.
- **Fix**: Add `membersLoading` state guard in SiteOverview.jsx. Only enable sentinel when `membersHasMore && !membersLoading`. Deduplicate by `id` on load-more.

#### O3: New site defaults 4 stages instead of 2
- **Root cause**: `DEFAULT_WORKFLOW_STAGES` exports 4 stages (Draft, In Review, Final Review, Published).
- **Fix**: Change to 2 stages only: Draft (order 0, code '01') + Published (order 1, code '04'). Admin can add review stages manually. Update GlobalDashboard seed logic to remove reviewer/approver auto-assign.

#### T1: Wiki draft items have no action buttons in Tasks board
- **Root cause**: Draft column wiki card template in WorkflowTasks.jsx lacks Submit/Cancel buttons.
- **Fix**: Add Submit/Cancel buttons for wiki draft cards (matching document draft card pattern). Add wiki submit handler that calls `useTasks.submitWiki()` which creates task for first review stage.

#### T2: Wiki task preview shows Document layout instead of Page Detail
- **Root cause**: Preview panel assumes all items are documents (shows file type, file size, download buttons).
- **Fix**: Detect wiki items in preview panel. Show wiki-specific layout: page title, 📖 icon, "Wiki" badge, content preview (HTML), page activity. Hide file-related buttons (Preview/Download) for wiki items.

#### D1: Documents page shows blank white screen
- **Root cause**: `OTHER_FOLDERS` variable referenced on line 912 but never defined → ReferenceError crashes component.
- **Fix**: Define `const OTHER_FOLDERS = [TRASH_FOLDER]` before the return statement.

#### W1: Duplicate "created" + "edited" activity on new page
- **Root cause**: `create()` in useWiki.js logs "created wiki page", then the immediate `handleSave()` (first save) logs "edited wiki page".
- **Fix**: In Wiki.jsx `handleSave`, when `isNewPage` is true, call `update()` with `{ silent: true }` to suppress the redundant "edited" activity log.

#### W2: Published pages show Edit button (should be read-only)
- **Root cause**: Published stage action buttons include Edit for page owners.
- **Fix**: Remove Edit button from Published stage. Published pages are read-only. To edit, user must click Unpublish first (moves to Draft), then edit.

### 11.3 Files Changed

| File | Changes |
|---|---|
| `openspec/changes/implement-demo-v2/design.md` | Round 11 spec |
| `src/hooks/useWorkflowConfig.js` | O1: sequential swapOrder; O3: DEFAULT_WORKFLOW_STAGES → 2 stages |
| `src/screens/SiteOverview.jsx` | O2: membersLoading guard + deduplicate |
| `src/screens/GlobalDashboard.jsx` | O3: remove reviewer/approver auto-assign from seed |
| `src/screens/WorkflowTasks.jsx` | T1: wiki draft actions; T2: wiki preview panel |
| `src/screens/DocumentLibrary.jsx` | D1: define OTHER_FOLDERS |
| `src/screens/Wiki.jsx` | W1: silent save for new pages; W2: remove Edit from Published |
