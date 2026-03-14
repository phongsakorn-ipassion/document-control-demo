# Tasks: implement-demo-v2

> **Before starting any task group**, Claude Code MUST:
> 1. Read `prototype-revamp.html` in full — this is the pixel-level visual reference for every screen
> 2. Read `openspec/changes/implement-demo-v2/design.md` in full
> 3. Read `openspec/specs/demo-v2/spec.md` in full
>
> All three documents must be read before writing a single line of code.
>
> **Stack**: Vite 5 + React 18 + Tailwind CSS v3 + Zustand + Supabase JS v2 + React Router v6 (HashRouter)

---

## Task Group 1 — Project scaffold

- [ ] 1.1 Run `npm create vite@latest v2 -- --template react` inside `03 - Demo/`
- [ ] 1.2 `cd v2` and run `npm install @supabase/supabase-js react-router-dom zustand`
- [ ] 1.3 Run `npm install -D tailwindcss postcss autoprefixer` then `npx tailwindcss init -p`
- [ ] 1.4 Update `tailwind.config.js` — paste the exact config from `design.md` (content paths, fontFamily, slideIn keyframe, animate-slide-in utility)
- [ ] 1.5 Replace `src/index.css` with the exact CSS from `design.md` (`@tailwind` directives + scrollbar styles)
- [ ] 1.6 Update `vite.config.js` — set `base` to the GitHub repository name as specified in `design.md`
- [ ] 1.7 Create `.env.example` with `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` (no values)
- [ ] 1.8 Create `.github/workflows/deploy.yml` — paste the exact YAML from `design.md`
- [ ] 1.9 Delete Vite template boilerplate: `src/App.css`, `src/assets/react.svg`, all template JSX content in `App.jsx`

**Verify**: `npm run dev` starts with no console errors. Tailwind classes render (check DevTools). `deploy.yml` is syntactically valid YAML.

---

## Task Group 2 — Supabase setup

- [ ] 2.1 Create `src/lib/supabase.js` — paste the exact client init from `design.md`
- [ ] 2.2 Create a new Supabase project at supabase.com (free tier)
- [ ] 2.3 Run the SQL from `design.md` → "Tables" section in the Supabase SQL Editor — verify all 9 tables created
- [ ] 2.4 Run the SQL from `design.md` → "Row Level Security" section — verify all policies created
- [ ] 2.5 Create 3 demo auth users in Supabase Dashboard → Authentication → Users: alice@demo.com, bob@demo.com, cathy@demo.com (all password: Demo1234!)
- [ ] 2.6 Note each user's UUID from auth.users
- [ ] 2.7 Run the seed SQL from `design.md` → "SQL seed data" — replacing `<alice_id>`, `<bob_id>`, `<cathy_id>` with real UUIDs
- [ ] 2.8 Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase → Settings → API into a local `.env` file (do NOT commit)
- [ ] 2.9 Add GitHub Secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Verify**: In browser console, run `const { supabase } = await import('./src/lib/supabase.js')` — then `await supabase.from('sites').select('*')` returns the seeded site. Auth users visible in Supabase dashboard.

---

## Task Group 3 — Zustand store

- [ ] 3.1 Create `src/store/useAppStore.js` — paste the exact store from `design.md`
- [ ] 3.2 Confirm the store includes: `currentUser`, `setCurrentUser`, `currentScreen`, `currentSite`, `setScreen`, `setSite`, `selectedFolder`, `previewDoc`, `setSelectedFolder`, `setPreviewDoc`, `activePageId`, `wikiEditMode`, `setActivePageId`, `setWikiEditMode`, `activeListId`, `setActiveListId`, `shareToken`, `setShareToken`

**Verify**: Import `useAppStore` in browser console — `useAppStore.getState()` shows all keys with correct initial values.

---

## Task Group 4 — SVG icon library

- [ ] 4.1 Create `src/lib/icons.jsx`
- [ ] 4.2 Open `prototype-revamp.html` and locate the `I` component (or `d` constant) — copy EXACT SVG path data for all 20 required icons: `Home`, `Grid`, `Folder`, `CheckTask`, `WikiDoc`, `List`, `Share`, `Upload`, `Eye`, `Download`, `CheckOk`, `XClose`, `Plus`, `EditPen`, `SaveDisk`, `Users`, `PulseWave`, `LinkChain`, `ChevronRight`, `Logout`
- [ ] 4.3 Each icon is a named export following the pattern from `design.md` — props: `{ size = 18, className = '' }`, stroke="currentColor", strokeWidth="2", viewBox="0 0 24 24", fill="none"
- [ ] 4.4 Do NOT substitute different icon designs — paths must match prototype exactly

**Verify**: Import `{ Home }` in a test component — renders a recognizable home icon in the browser.

---

## Task Group 5 — Shared components

### 5A — Avatar (src/components/Avatar.jsx)
- [ ] 5A.1 Accepts props: `name` (string), `size` ('sm' | 'md' | 'lg')
- [ ] 5A.2 Renders initials: first char of first word + first char of second word, uppercase
- [ ] 5A.3 Size → Tailwind classes per `design.md` Avatar anatomy: sm=`w-7 h-7 text-xs`, md=`w-9 h-9 text-sm`, lg=`w-11 h-11 text-base`
- [ ] 5A.4 Color map per `design.md`: Alice Johnson → `bg-indigo-100 text-indigo-700`, Bob Chen → `bg-amber-100 text-amber-700`, Cathy Park → `bg-emerald-100 text-emerald-700`, fallback → `bg-slate-100 text-slate-600`
- [ ] 5A.5 Add `rounded-full font-semibold flex items-center justify-center flex-shrink-0`

### 5B — Badge (src/components/Badge.jsx)
- [ ] 5B.1 Accepts props: `label` (string), `color` (variant string)
- [ ] 5B.2 Base classes: `px-2 py-0.5 rounded-full text-xs font-medium`
- [ ] 5B.3 Color variants per `design.md` Badge anatomy — all 7 variants
- [ ] 5B.4 Unknown color → defaults to slate variant

### 5C — FileChip (src/components/FileChip.jsx)
- [ ] 5C.1 Accepts props: `type` ('pdf' | 'doc' | 'img')
- [ ] 5C.2 Base classes: `w-10 h-10 rounded-lg border flex items-center justify-center text-[10px] font-bold flex-shrink-0`
- [ ] 5C.3 Type variants per `design.md` FileChip anatomy — exact bg/border/text Tailwind classes + label text

### 5D — Toast (src/components/Toast.jsx)
- [ ] 5D.1 Accepts props: `message` (string), `onDismiss` (callback)
- [ ] 5D.2 Classes: `fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-2xl animate-slide-in`
- [ ] 5D.3 Prefix: `<CheckOk size={14} className="text-emerald-400 flex-shrink-0" />`
- [ ] 5D.4 Auto-dismiss: `useEffect(() => { const t = setTimeout(onDismiss, 2800); return () => clearTimeout(t) }, [])`
- [ ] 5D.5 Export a `useToast()` hook (or context) that exposes `showToast(message)` and renders the Toast at app root level

**Verify**: Call `showToast('Test message')` from any screen — toast appears top-right, slides in, auto-dismisses at 2800ms.

---

## Task Group 6 — Custom data hooks

Create each hook in `src/hooks/` following the pattern from `design.md`. Every hook MUST expose `{ data, loading, error, create, update, remove, refetch }`.

### 6A — useDocuments.js
- [ ] 6A.1 Query `documents` table filtered by `site_id`
- [ ] 6A.2 Join owner data: select `*, owner:owner_id(id, email)` — derive display name via NAME_MAP in component
- [ ] 6A.3 `create(payload)`: insert row, then `refetch()`
- [ ] 6A.4 `update(id, patch)`: update by id, then `refetch()`
- [ ] 6A.5 `remove(id)`: delete by id, then `refetch()`

### 6B — useTasks.js
- [ ] 6B.1 Query `tasks` table filtered by `site_id`, status='pending'
- [ ] 6B.2 Join: `*, document:document_id(name, folder), assignee:assignee_id(id, email)`
- [ ] 6B.3 `approve(taskId, documentId)`: update task status='approved'; update document folder to next stage (02→03, 03→04); insert activity row; `refetch()`
- [ ] 6B.4 `reject(taskId, documentId)`: update task status='rejected'; update document folder to previous stage; insert activity row; `refetch()`

### 6C — useWiki.js
- [ ] 6C.1 Query `wiki_pages` table filtered by `site_id`, ordered by `created_at`
- [ ] 6C.2 `create(payload)`: insert row with `{ site_id, title, content }`, then `refetch()`
- [ ] 6C.3 `update(id, patch)`: update `content` by id, then `refetch()`
- [ ] 6C.4 `remove(id)`: delete by id, then `refetch()`

### 6D — useProjectLists.js
- [ ] 6D.1 Query `project_lists` table filtered by `site_id`; for each list also fetch `project_list_items` by `list_id` (two queries or a joined select)
- [ ] 6D.2 `createList(name)`: insert into `project_lists`, then `refetch()`
- [ ] 6D.3 `createItem(listId, payload)`: insert into `project_list_items`, then `refetch()`
- [ ] 6D.4 `updateItem(id, patch)`: update item by id, then `refetch()`

### 6E — useActivities.js
- [ ] 6E.1 Query `activities` table filtered by `site_id`, ordered by `created_at desc`, limit 10
- [ ] 6E.2 Join: `*, actor:actor_id(id, email)`
- [ ] 6E.3 `log(payload)`: insert `{ site_id, actor_id, action, target }`, then `refetch()`

**Verify**: In each hook's consuming component, trigger a create/update/delete — confirm Supabase row changes AND the UI updates without a page refresh.

---

## Task Group 7 — App shell and routing (src/App.jsx + src/main.jsx)

- [ ] 7.1 `src/main.jsx`: wrap `<App />` in `<HashRouter>` from `react-router-dom`
- [ ] 7.2 `src/App.jsx`: subscribe to Supabase auth state — paste exact `useEffect` from `design.md` "Auth session management"
- [ ] 7.3 Auth gate: if `currentUser === null` render `<Login />` full-screen; else render the main shell
- [ ] 7.4 Main shell layout: `<div className="flex h-screen overflow-hidden bg-slate-50">`
  - `<Sidebar />` (w-56 fixed height)
  - `<div className="flex-1 flex flex-col min-h-0">`
    - `<TopBar />`
    - `<main className="flex-1 overflow-y-auto">` containing `<Routes>`
- [ ] 7.5 Routes (all wrapped inside authenticated shell):
  ```
  /                    → <GlobalDashboard />
  /site/:siteId        → <SiteOverview />
  /site/:siteId/docs   → <DocumentLibrary />
  /site/:siteId/tasks  → <WorkflowTasks />
  /site/:siteId/wiki   → <Wiki />
  /site/:siteId/lists  → <ProjectLists />
  /site/:siteId/share  → <PublicShare />
  *                    → redirect to /
  ```
- [ ] 7.6 Sidebar navigation drives `setScreen` + `navigate()` from React Router — keep Zustand `currentScreen` in sync with the URL

**Verify**: Open `/#/` — shell renders with sidebar and topbar. Navigate to a site — URL changes to `/#/site/[id]`. Hard refresh keeps the user logged in (Supabase restores session from localStorage).

---

## Task Group 8 — Sidebar (src/components/Sidebar.jsx)

Implement exactly per `spec.md` REQ-002 and `design.md` NavBtn anatomy.

- [ ] 8.1 Outer: `<aside className="w-56 bg-indigo-800 flex flex-col h-screen flex-shrink-0">`
- [ ] 8.2 Logo block (top): per spec.md REQ-001 "Sidebar logo block" scenario — white rounded square (32×32), `Folder` icon indigo, "DocHub" white bold 14px, "Document Intelligence" indigo-300 12px; bottom border indigo-700
- [ ] 8.3 Global nav section: "GLOBAL" label (10px indigo-400 uppercase tracking-wider) + Dashboard `NavBtn`
- [ ] 8.4 Site context block: renders ONLY when `currentSite !== null` — `bg-[rgba(30,27,75,0.6)]` rounded-lg px-3 py-2 mx-2; site name white 12px semibold truncate; description indigo-400 12px truncate; Exit button top-right (indigo-400, `Logout` icon, 12px)
- [ ] 8.5 "SITE APPS" label + 6 NavBtns in exact order from spec.md REQ-002: Overview, Documents, Tasks, Wiki, Project Lists, Public Share
- [ ] 8.6 NavBtn disabled state when `currentSite === null`: `text-indigo-300 cursor-not-allowed` (no hover, no click)
- [ ] 8.7 Helper note below site apps when no site: "Select a site from the Dashboard to access its apps." — indigo-300 text-xs px-3
- [ ] 8.8 Footer: `mt-auto` pushed to bottom, border-t border-indigo-700, "Presale Prototype · v1.0" — indigo-500 text-xs text-center py-3

**Verify**: Sidebar matches prototype exactly. Disabled items non-clickable. Active item has white bg + indigo-700 text. Footer visible at bottom of sidebar.

---

## Task Group 9 — TopBar (src/components/TopBar.jsx)

Implement per `spec.md` REQ-001 "TopBar content" scenario.

- [ ] 9.1 Outer: `<header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">`
- [ ] 9.2 Left side — breadcrumb:
  - If `currentSite` is set: `<span className="text-slate-500 text-sm">{currentSite.name}</span> <ChevronRight size={14} className="text-slate-400" /> <span className="text-slate-900 text-sm font-medium">{screenLabel}</span>`
  - If no site: `<span className="text-slate-900 text-sm font-medium">{screenLabel}</span>`
  - Screen label map: `global-dashboard`→"Dashboard", `site-overview`→"Overview", `documents`→"Documents", `tasks`→"Workflow & Tasks", `wiki`→"Wiki", `project-lists`→"Project Lists", `share`→"Public Share"
- [ ] 9.3 Right side: `<Avatar name={currentUser.name} size="sm" />` + display name (14px slate-700) + Sign Out button
- [ ] 9.4 Sign Out button: calls `supabase.auth.signOut()` which triggers `onAuthStateChange` → clears `currentUser` → Login screen appears
- [ ] 9.5 No user switcher `<select>` — users sign in/out via Supabase Auth (this is the key difference from prototype)

**Verify**: Breadcrumb updates on navigation. Sign Out works and shows Login screen. User name shown matches authenticated email.

---

## Task Group 10 — Login screen (src/screens/Login.jsx)

Implement per `spec.md` REQ-000 (Login) and `design.md` "Authentication flow".

- [ ] 10.1 Full-page centered layout: `<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">`
- [ ] 10.2 Card: `bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm`
- [ ] 10.3 Logo + "DocHub" (indigo-600 text-2xl font-bold) + "Document Intelligence Platform" (slate-500 text-sm)
- [ ] 10.4 Form: email input + password input (both `border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-300`)
- [ ] 10.5 Submit button: `w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition` — shows "Signing in..." while loading
- [ ] 10.6 Error state: rose-50 bg rose-200 border rounded-xl p-3 text-sm text-rose-600 (wrong credentials message)
- [ ] 10.7 Demo credentials helper box: `bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 text-xs text-slate-500`
  - Shows alice@demo.com, bob@demo.com, cathy@demo.com
  - Password: Demo1234!
  - Text: "Click any email to auto-fill"
  - Clicking an email auto-fills the email input
- [ ] 10.8 On submit: call `supabase.auth.signInWithPassword({ email, password })`; on success Zustand `setCurrentUser` is updated via `onAuthStateChange` in App.jsx

**Verify**: Sign in as alice@demo.com / Demo1234! — redirects to main shell. Wrong password shows error. Clicking demo email auto-fills field.

---

## Task Group 11 — Global Dashboard (src/screens/GlobalDashboard.jsx)

Implement per `spec.md` REQ-003. Data from `useActivities(null)` (global feed — no site filter).

- [ ] 11.1 Wrapper: `<div className="p-6 space-y-6 animate-slide-in">`
- [ ] 11.2 Hero banner: `bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-2xl p-6 shadow-lg`
  - Sub-label: "Good morning 👋" — indigo-200 text-sm
  - Heading: "Good morning, {firstName}!" — white text-2xl font-bold
  - Body: "You have {pendingTaskCount} pending tasks and {siteCount} active site(s)." — indigo-100 text-sm
- [ ] 11.3 KPI row: 3-column grid — fetch counts from Supabase or derive from hook data; exact icon/color/label per spec.md REQ-003
- [ ] 11.4 Main content grid: `grid grid-cols-5 gap-6`
  - Sites section: `col-span-3` — "My Sites" heading + "+ New Site" button (text-indigo-600 text-sm) + site cards
  - Activity feed: `col-span-2` — "Recent Activity" heading + activity rows from `useActivities`
- [ ] 11.5 Site card: exact layout from `design.md` "Site Card" anatomy — gradient icon, name + badge, stats row, avatar stack, "Open Site →" link
  - On click: `setSite(site)` + `navigate('/site/' + site.id)`
- [ ] 11.6 "+ New Site" button: `showToast('New site form — enter name and description')` (placeholder for demo)
- [ ] 11.7 Activity row: Avatar (sm) + `{actor.name} {action} ` + `<span className="text-indigo-600">{target}</span>` + relative time (slate-400 text-xs)
- [ ] 11.8 Handle `loading` (pulse skeleton cards) and `error` (rose banner) states for activity feed

**Verify**: Dashboard matches prototype. KPI numbers are real (from Supabase). Clicking site card navigates to Site Overview with site in sidebar. Activity feed populated from seed data.

---

## Task Group 12 — Site Overview (src/screens/SiteOverview.jsx)

Implement per `spec.md` REQ-004. Data: `useTasks(siteId)`, `useDocuments(siteId)`, `useWiki(siteId)`, `useProjectLists(siteId)`, `useActivities(siteId)`.

- [ ] 12.1 Wrapper: `<div className="p-6 space-y-6 animate-slide-in">`
- [ ] 12.2 Site header card: `bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between`
  - Left: 56×56 indigo-to-blue gradient icon (rounded-2xl shadow-md) + Grid icon white + site name (xl bold slate-900) + "Public" emerald badge + description (slate-500 text-sm)
  - Right: 4 shortcut buttons (Documents, Tasks, Wiki, Lists) — each tinted bg, clicking `navigate` to that route
- [ ] 12.3 Metrics row: 4-column grid, exact per spec.md REQ-004 — derive values from hook data (real counts)
- [ ] 12.4 2-column grid below metrics:
  - Members panel (col-span-1): from `site_members` join — first member = Site Manager/Admin badge (indigo), rest = Collaborator/Member (slate)
  - Activity Timeline (col-span-1): from `useActivities(siteId)` — Avatar (sm) + text + relative time
- [ ] 12.5 Handle all loading/error states for each hook

**Verify**: Metric counts match actual Supabase row counts. Shortcut buttons navigate correctly. Members list shows all 3 seeded users.

---

## Task Group 13 — Document Library (src/screens/DocumentLibrary.jsx)

Implement per `spec.md` REQ-005. Data: `useDocuments(siteId)`.

- [ ] 13.1 Three-pane layout: `<div className="flex h-full">` — exact pane widths per `design.md`
- [ ] 13.2 Pane 1 — Folder Tree:
  - "APPROVAL STAGES" label (10px slate-400 uppercase tracking-wider)
  - 4 folder buttons: 01 Draft, 02 In Review, 03 Final Review, 04 Published
  - Each: dot (stage color per spec.md) + "0N · Label" + count pill (count from filtered documents)
  - Active folder: `bg-indigo-50 text-indigo-700` + count pill `bg-indigo-100 text-indigo-600`
  - Inactive: `text-slate-600 hover:bg-slate-50`
  - On click: `setSelectedFolder(id)`
  - Info box below: `bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-xs text-slate-500`
- [ ] 13.3 Pane 2 — File List:
  - Header: folder label (semibold slate-900) + "N document(s)" (text-xs slate-400) + Upload button (indigo-600) + New button (border slate-700)
  - Upload → `showToast('File upload dialog — drag & drop supported')`
  - New → `showToast('Create document form would open here')`
  - Loading state: `animate-pulse` skeleton cards (3 placeholder rows)
  - Error state: rose banner
  - Document cards: filter `documents.data` by `selectedFolder` — exact card layout per spec.md REQ-005 and `design.md` "Document Row Card"
    - Active card (preview open): `border-indigo-300 ring-1 ring-indigo-200`
    - On card click: `setPreviewDoc(doc)` (toggle: if same doc, set null)
    - Workflow button shown for folders 01, 02, 03 — on click: calls workflow action + `showToast`
    - Share button shown for folder 04 only
  - Empty folder: centered `<Folder size={48} className="text-slate-300" />` + "No documents in this stage"
- [ ] 13.4 Pane 3 — Preview Drawer (hidden when `previewDoc === null`):
  - Exact layout per spec.md REQ-005 "Preview drawer" scenario
  - X button: `setPreviewDoc(null)`
  - Download button: `showToast('Downloading ' + previewDoc.name)`
  - Owner: resolve via NAME_MAP (email → display name)

**Verify**: Folder switching filters documents. Clicking a card opens preview drawer. Active card highlighted. Workflow/Share buttons show per folder rule. Empty state appears when folder is empty.

---

## Task Group 14 — Workflow & Tasks (src/screens/WorkflowTasks.jsx)

Implement per `spec.md` REQ-006. Data: `useTasks(siteId)`.

- [ ] 14.1 Wrapper: `<div className="p-6 space-y-6 animate-slide-in">`
- [ ] 14.2 Board header: "Workflow Board" (text-xl font-semibold slate-900) + "{count} active task(s) · viewing as {currentUser.name}" (text-xs slate-400)
  - Info chip right-aligned: `bg-slate-100 text-slate-400 rounded-lg px-3 py-1.5 text-xs` — "Sign out and back in as another user to see different task assignments"
- [ ] 14.3 4-column kanban grid: `grid grid-cols-4 gap-4`
  - Each column: exact border/bg per `design.md` Kanban Column anatomy
  - Column header: "0N · Label" font-semibold + task count pill (white/60% bg right-aligned)
- [ ] 14.4 Filter tasks by `task.document.folder` for each column
- [ ] 14.5 Task card — not assigned to current user (task.assignee.id !== currentUser.id):
  - `bg-white border-slate-200 rounded-xl p-3 shadow-sm`
  - Document name (text-xs font-bold slate-900) + Avatar (sm) + assignee first name (text-xs slate-500) + priority Badge + due date
  - NO approve/reject buttons
- [ ] 14.6 Task card — assigned to current user:
  - `border-indigo-300` + "● Assigned to you" label (indigo-600, 6px indigo dot)
  - Approve button + Reject button: exact classes from `design.md` Task Card anatomy
  - Approve on click: `tasks.approve(task.id, task.document_id)` → refetch → `showToast('✓ Approved — document moved to next stage')`
  - Reject on click: `tasks.reject(task.id, task.document_id)` → refetch → `showToast('✕ Rejected — document returned to previous stage')`
- [ ] 14.7 Empty column: `border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center h-20 opacity-30 text-xs text-center`
- [ ] 14.8 All tasks completed state (no pending tasks in any column): centered `<CheckOk size={40} className="text-emerald-200" />` + "All tasks completed!" (text-sm text-slate-400 font-semibold)
- [ ] 14.9 Loading state: animate-pulse skeleton columns

**Verify**: Log in as Bob — "Requirements Spec.docx" task shows Approve/Reject. Click Approve → task disappears, toast appears, document moves to folder 03 in Supabase. Log in as Cathy — sees "Design Mockup.png" task. Tasks from other assignees show no buttons.

---

## Task Group 15 — Wiki (src/screens/Wiki.jsx)

Implement per `spec.md` REQ-007. Data: `useWiki(siteId)`.

- [ ] 15.1 Two-pane layout: `<div className="flex h-full">`
  - Pane 1 (Page List): `w-56 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto`
  - Pane 2 (Content): `flex-1 bg-white p-8 overflow-y-auto`
- [ ] 15.2 Page list header: "PAGES" label (10px slate-400 uppercase) + "+" button (indigo-600, hover:bg-slate-100 rounded)
  - "+" creates a new page via `wiki.create({ site_id, title: 'New Page', content: '' })` then sets active page to new page id
- [ ] 15.3 Page buttons: "📄 {title}" — full width left-aligned rounded-lg text-sm
  - Active: `bg-indigo-50 text-indigo-700 font-medium`
  - Inactive: `text-slate-600 hover:bg-slate-50`
  - On click: `setActivePageId(page.id)`
- [ ] 15.4 On mount + when `wiki.data` loads: if `activePageId === null` set to first page's id
- [ ] 15.5 Content area — view mode (`wikiEditMode === false`):
  - Header: page title (text-xl font-bold slate-900) + "Edit" button (border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 flex items-center gap-1.5 with EditPen icon)
  - Divider: `border-b border-slate-200 pb-4 mb-4`
  - Content: `<div dangerouslySetInnerHTML={{ __html: activePage.content }} className="text-sm text-slate-700 leading-relaxed" />`
  - Edit button: `setWikiEditMode(true)`
- [ ] 15.6 Content area — edit mode (`wikiEditMode === true`):
  - Header: title + "Save" button (indigo-600, SaveDisk icon) + "Cancel" button (border slate)
  - Format toolbar: `bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-wrap gap-1 mb-3`
    - 9 buttons: Bold, Italic, H1, H2, H3, • List, Image, Link, Divider — each `text-[10px] font-bold text-slate-600 px-2 py-1 rounded hover:bg-white hover:shadow-sm`
    - Each format button: `showToast('{Format} applied')`
  - Textarea: `w-full h-72 p-4 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none`
  - Pre-fill textarea with `activePage.content`
  - Save: `wiki.update(activePage.id, { content: textareaValue })` → `setWikiEditMode(false)` → `showToast('Page saved')`
  - Cancel: `setWikiEditMode(false)`
- [ ] 15.7 Loading state: animate-pulse skeleton for page list and content

**Verify**: Pages load from Supabase. Clicking pages switches content. Edit mode shows toolbar + textarea. Save persists to Supabase (verify row updated in Supabase dashboard). Cancel discards changes.

---

## Task Group 16 — Project Lists (src/screens/ProjectLists.jsx)

Implement per `spec.md` REQ-008. Data: `useProjectLists(siteId)`.

- [ ] 16.1 Two-pane layout: `<div className="flex h-full">`
  - Pane 1 (List Nav): `w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto`
  - Pane 2 (Table): `flex-1 p-5 overflow-auto`
- [ ] 16.2 List nav header: "LISTS" label (10px slate-400 uppercase) + "+" button
  - "+" → `lists.createList('New List')` then set active to new list id → `showToast('New list created')`
- [ ] 16.3 List buttons: "📋 {name}" + item count pill (right-aligned, `bg-slate-100 text-slate-500 text-xs`)
  - Active: `bg-indigo-50 text-indigo-700 font-medium`
  - Inactive: `text-slate-600 hover:bg-slate-50`
  - On click: `setActiveListId(list.id)`
- [ ] 16.4 On mount: if `activeListId === null` set to first list's id
- [ ] 16.5 Table header: list name (font-semibold) + "N items" (text-xs slate-400) + "New Item" button (indigo-600, Plus icon)
  - "New Item" → `showToast('New item form — fill fields to add')`
- [ ] 16.6 Table: `bg-white rounded-xl border border-slate-200 overflow-hidden`
  - Columns: Issue ID | Title | Assignee | Status | Priority | Due Date
  - Header row: `bg-slate-50 border-b border-slate-200` — 10px semibold slate-500 uppercase
  - Data rows: `hover:bg-slate-50 cursor-pointer transition` — border-b border-slate-100
  - Issue ID: `font-mono text-xs text-indigo-600 font-semibold`
  - Title: `text-sm font-semibold text-slate-900`
  - Assignee: `<Avatar name={resolvedName} size="sm" />` + first name (text-xs text-slate-600)
  - Status badge: Done=emerald, In Progress=blue, Open=slate — `<Badge>`
  - Priority badge: High=rose, Medium=amber, Low=slate — `<Badge>`
  - Due Date: `text-xs text-slate-400`
- [ ] 16.7 Loading/error states

**Verify**: Both lists show from Supabase. Switching lists updates table. Badge colors match prototype exactly. Issue ID in monospace indigo.

---

## Task Group 17 — Public Share (src/screens/PublicShare.jsx)

Implement per `spec.md` REQ-009. Data: `useDocuments(siteId)` (for folder-04 docs).

- [ ] 17.1 Centered layout: `<div className="p-6 flex justify-center animate-slide-in"><div className="w-full max-w-2xl">`
- [ ] 17.2 White card: `bg-white rounded-2xl border border-slate-200 p-8`
- [ ] 17.3 Filter `documents.data` for `folder === '04'` → `publishedDocs`

**Path A: no folder-04 document**
- [ ] 17.4 Centered empty state: `<Share size={44} className="text-slate-200" />` + "No published documents available" + "Complete the approval workflow to reach Folder 04 first" — slate-300/400

**Path B: folder-04 document exists AND no share token generated yet**
- [ ] 17.5 Heading + sub-label (per spec.md REQ-009)
- [ ] 17.6 Document row: `bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4`
  - `<FileChip type={doc.type} />` + name (font-semibold truncated) + "owner · size · date" + "Final-Approved" emerald badge
- [ ] 17.7 "Generate Public Share Link" button: `w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm`
  - On click: generate 8-char alphanumeric token → insert into `share_tokens` table → `setShareToken(token)` → `showToast('Share link generated!')`

**Path C: share token generated**
- [ ] 17.8 Link row: `bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3`
  - `<LinkChain size={16} className="text-indigo-600 flex-shrink-0" />`
  - URL: `font-mono text-indigo-600 text-sm flex-1 truncate` — `https://[ghpages-url]/#/share/[token]`
  - "Copy" button: `bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50`
  - Copy on click: `navigator.clipboard.writeText(url)` + `showToast('Link copied to clipboard!')`
- [ ] 17.9 "Public View Preview" mockup below: `border-2 border-dashed border-slate-300 rounded-2xl p-6`
  - Header bar: slate-50, "DocHub" + `<Share size={16} className="text-indigo-600" />` + "Public Access" emerald badge
  - Center: `<FileChip>` + doc name + "Shared by {owner} · {date} · No login required" (slate-400 text-xs)
  - Preview placeholder: `bg-slate-100 rounded-xl h-28 flex items-center justify-center text-xs text-slate-400` "Document Preview"
  - Buttons: "Download File" (indigo-600) + "Full Preview" (border slate) — centered

**Verify**: With no published doc → empty state. With Final Report.pdf in folder 04 → generate button appears. Click generate → link row + mockup appear. Copy button fires toast.

---

## Task Group 18 — CI/CD and environment

- [ ] 18.1 Confirm `.github/workflows/deploy.yml` is committed and references `./v2/dist` as publish_dir
- [ ] 18.2 Confirm `vite.config.js` `base` value matches the GitHub repo name exactly (e.g. `/dochub-demo-v2/`)
- [ ] 18.3 Add GitHub Secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in repo Settings → Secrets → Actions
- [ ] 18.4 Push to `main` — confirm GitHub Actions workflow runs green
- [ ] 18.5 Open the GitHub Pages URL — confirm login screen loads, auth works, and all 7 screens render with real data

**Verify**: GitHub Actions build succeeds with no errors. Deployed URL accessible publicly. Login flow works. All screens load data from Supabase.

---

## Task Group 19 — Multi-user approval workflow end-to-end test

This is the primary demo journey — verify it works completely before sign-off.

- [ ] 19.1 Open the app (local dev or deployed URL)
- [ ] 19.2 Log in as **alice@demo.com** / Demo1234!
- [ ] 19.3 Navigate to Documents → folder 01 → click "▶ Workflow" on "Project Charter.pdf" → confirm document moves to folder 02 + task assigned to Bob appears in Supabase `tasks` table
- [ ] 19.4 Open a **second browser window** (or incognito tab)
- [ ] 19.5 Log in as **bob@demo.com** / Demo1234! in the second window
- [ ] 19.6 Navigate to Workflow & Tasks — confirm Bob's task card shows "Requirements Spec.docx" AND "Project Charter.pdf" (the one Alice just submitted) with Approve/Reject buttons
- [ ] 19.7 Click **Approve** on one task → confirm task disappears + document moves to next folder + toast shown
- [ ] 19.8 Verify in Supabase dashboard: `tasks.status = 'approved'`, `documents.folder` incremented
- [ ] 19.9 Switch to Alice's window → navigate to Documents → confirm the approved document is now in folder 03
- [ ] 19.10 Log in as **cathy@demo.com** → verify Cathy sees the round-2 task (Design Mockup.png in folder 03) and can approve it → document moves to folder 04

**Sign-off criterion**: The full User A → submit → User B → approve → document advances journey works with real Supabase persistence and real separate auth sessions.

---

## Task Group 20 — Visual verification (MUST DO LAST)

- [ ] 20.1 Open `prototype-revamp.html` side-by-side with the running React app in browser
- [ ] 20.2 Compare **Login screen**: card layout, inputs, demo credentials box
- [ ] 20.3 Compare **Global Dashboard**: hero gradient, KPI cards, site cards, activity feed layout
- [ ] 20.4 Compare **Site Overview**: header card, metric cards, members panel, activity timeline
- [ ] 20.5 Compare **Document Library**: 3-pane layout, folder tree dots/pills, document card layout, preview drawer
- [ ] 20.6 Compare **Workflow & Tasks**: 4-column kanban, column colors, task card assigned vs non-assigned
- [ ] 20.7 Compare **Wiki**: 2-pane, page list, view mode, edit mode toolbar + textarea
- [ ] 20.8 Compare **Project Lists**: 2-pane, issue table column widths, badge colors
- [ ] 20.9 Compare **Public Share**: pre-generate vs post-generate states, public view mockup
- [ ] 20.10 All toasts: verify position (top-right), slide-in animation, auto-dismiss at 2800ms
- [ ] 20.11 Sidebar: active/disabled/hover states, site context block, footer
- [ ] 20.12 TopBar: breadcrumb format, sign-out button
- [ ] 20.13 Animate-slide-in: every screen entry has the slide-in animation

**Sign-off criterion**: Any screen element that differs visually from the prototype MUST be corrected before implementation is considered complete. Do not mark this group complete with known visual differences outstanding.
