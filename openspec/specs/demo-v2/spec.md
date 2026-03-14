# demo-v2 Specification

## Purpose
Define the complete behavior, layout, interaction, and data contracts for demo-v2 — a modern, deployable Document Intelligence platform demo built on Alfresco Content Services (ACS) concepts.

## Visual Source of Truth
**The canonical reference for ALL visual, layout, and interaction behavior is:**
`prototype-revamp.html` (sibling of the `openspec/` folder)

Claude Code MUST treat this file as the pixel-level blueprint. Every requirement below maps directly to implemented behavior in that file. When a scenario describes a component, Claude Code shall match the prototype's exact Tailwind classes, spacing, and interaction pattern — not invent alternatives.

## Design Tokens Reference
All Tailwind class strings, component anatomy, Supabase schema, and code patterns are defined in:
`openspec/changes/implement-demo-v2/design.md`

Claude Code MUST read `design.md` before writing any component code.

## Tech Stack Contract
- **Build tool**: Vite 5 — `npm run dev` for local, `npm run build` for production
- **UI framework**: React 18 — functional components + hooks only, zero class components
- **Styling**: Tailwind CSS v3 — utility classes only, zero inline `style=` attributes
- **UI state**: Zustand (`useAppStore.js`) — all navigation/UI state here, never `useState` for cross-component state
- **Server state**: Supabase JS v2 — custom hooks in `src/hooks/`, direct table queries
- **Auth**: Supabase Auth (email/password) — real sessions, not a demo user-switcher `<select>`
- **Database**: Supabase PostgreSQL — 9 tables per `design.md` schema
- **Routing**: React Router v6, `HashRouter` — required for GitHub Pages
- **Deploy**: GitHub Actions → GitHub Pages — workflow in `.github/workflows/deploy.yml`
- **Icons**: Inline SVG React components in `src/lib/icons.jsx` — paths copied from prototype
- **Fonts**: Tailwind system font stack — no Google Fonts CDN

---

## Requirements

### REQ-000: Authentication and Role Model

#### Role definitions
The system SHALL implement three fixed demo roles:

| Role     | User          | Email             | Workflow permission |
|----------|---------------|-------------------|---------------------|
| Admin    | Alice Johnson | alice@demo.com    | Can approve/reject ANY pending task |
| Reviewer | Bob Chen      | bob@demo.com      | Can approve/reject tasks in folder 02 (In Review) assigned to them |
| Approver | Cathy Park    | cathy@demo.com    | Can approve/reject tasks in folder 03 (Final Review) assigned to them |

- Badge colors: Admin → indigo, Reviewer → amber, Approver → emerald
- Role icons: Admin → 👑, Reviewer → 🔍, Approver → ✅
- Admin has `canApproveFolder: null` (all folders); Reviewer = '02'; Approver = '03'

The system SHALL require users to authenticate before accessing any screen.

#### Scenario: Login screen layout
- **WHEN** no Supabase Auth session exists
- **THEN** the system SHALL display a full-page centered login card:
  - Background: `min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center`
  - Card: `bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm`
  - Logo block above the card: indigo-600 rounded-2xl icon (14×14, `<Folder>` white) + "DocHub" (text-2xl font-bold text-indigo-600) + "Document Intelligence Platform" (text-sm text-slate-500)
  - **Quick Login by Role grid** (`grid grid-cols-3 gap-2`): one card per demo user — each card shows `<Avatar>`, first name, role `<Badge>`, and role description icon + text; clicking a card calls `supabase.auth.signInWithPassword` with that user's credentials automatically
  - Divider: "or sign in with email"
  - Email input + Password input (focus ring indigo-300)
  - "Sign In" button (indigo-600, full-width)
  - Demo credentials box at bottom: for each user shows Avatar + first name + role badge + email (clickable to auto-fill) + "Password: Demo1234!"

#### Scenario: Login success
- **WHEN** user submits valid credentials (alice@demo.com, bob@demo.com, or cathy@demo.com / Demo1234!)
- **THEN** `supabase.auth.signInWithPassword()` SHALL succeed
- **AND** `onAuthStateChange` in App.jsx SHALL fire and call `setCurrentUser({ id, email, name, avatarColor })`
- **AND** the Login screen SHALL unmount and the main shell SHALL render

#### Scenario: Login failure
- **WHEN** user submits invalid credentials
- **THEN** a rose-50 error banner SHALL appear below the button with the error message

#### Scenario: Session persistence
- **WHEN** a user hard-refreshes the page (GitHub Pages URL)
- **THEN** Supabase client SHALL restore the session from localStorage via `supabase.auth.getSession()`
- **AND** the user SHALL not be forced to log in again

#### Scenario: Sign out
- **WHEN** the user clicks the Sign Out button in the TopBar
- **THEN** `supabase.auth.signOut()` SHALL be called
- **AND** `currentUser` SHALL be cleared in Zustand
- **AND** the Login screen SHALL render

#### Scenario: Multi-user approval demo journey
- **GIVEN** User A (e.g. Alice) is logged in
- **WHEN** Alice clicks "▶ Workflow" on a document in folder 01
- **THEN** the document's `folder` SHALL change to '02' in `documents` table
- **AND** a new row SHALL be inserted into `tasks` with `assignee_id = Bob's user_id`
- **WHEN** Bob logs in (separate browser window)
- **THEN** Bob SHALL see the task in the Workflow & Tasks board with Approve/Reject buttons
- **WHEN** Bob clicks Approve
- **THEN** the task `status` SHALL become 'approved', document `folder` SHALL advance to '03', and an activity row SHALL be inserted

---

### REQ-001: Application Shell

The system SHALL render a persistent shell (Sidebar + TopBar + Content area) while authenticated.

#### Scenario: Shell layout
- **WHEN** the user is authenticated
- **THEN** the shell SHALL render:
  - Left: `<Sidebar />` — `w-56` fixed, `bg-indigo-800`, full viewport height
  - Right: `flex-1 flex flex-col min-h-0`
    - Top: `<TopBar />` — `h-14`, white, `border-b border-slate-200`
    - Below: `<main className="flex-1 overflow-y-auto">` — contains React Router `<Routes>`
- **AND** no horizontal scroll SHALL appear at 1280px viewport width

#### Scenario: Sidebar logo block
- **WHEN** the shell renders
- **THEN** the top of the sidebar SHALL show:
  - Logo row: white rounded square (32×32, `bg-white rounded-lg`) with indigo `<Folder>` icon inside + text stack
  - App name: "DocHub" — white, bold, 14px (`text-sm font-bold text-white`)
  - Sub-label: "Document Intelligence" — `text-indigo-300 text-xs`
  - Bottom border: `border-b border-indigo-700`

#### Scenario: TopBar content
- **WHEN** any screen is active
- **THEN** the TopBar SHALL show:
  - Left: breadcrumb — site name (if inside a site) + ChevronRight icon + screen label in slate colors
  - Right: a **role-aware user switcher button** (`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200`) — shows `<Avatar sz="sm">` + user first name (text-xs font-semibold) + role label (text-[10px] text-slate-400) + ▾ arrow
- **AND** clicking the button SHALL open a dropdown (`w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50`):
  - Header area (`bg-slate-50`): "Switch Demo User" label + "Each role has different workflow permissions" sub-label
  - One row per user: `<Avatar md>` + full name + role desc + `<Badge role color>` — active row: `bg-indigo-50/70` + "● active" indicator
  - Footer (`bg-slate-50`): "Sign Out" button (`hover:text-rose-600`)
  - A full-screen backdrop `div` closes the panel when clicked outside
- **AND** clicking another user row SHALL switch the session (signOut then signInWithPassword)
- **AND** clicking Sign Out SHALL call `supabase.auth.signOut()` → Login screen renders
- **AND** no plain `<select>` user switcher SHALL appear anywhere in the authenticated shell

---

### REQ-002: Sidebar Navigation

The system SHALL provide context-aware navigation in the sidebar.

#### Scenario: Global nav section
- **WHEN** the sidebar renders
- **THEN** a "GLOBAL" section label SHALL appear (`text-[10px] text-indigo-400 uppercase tracking-wider`)
- **AND** one nav item SHALL appear: "Dashboard" with `<Home>` icon

#### Scenario: Site Apps section — no site selected
- **WHEN** `currentSite === null`
- **THEN** all 6 site app items SHALL render in disabled style: `text-indigo-300 cursor-not-allowed`
- **AND** a helper note SHALL appear: "Select a site from the Dashboard to access its apps." — `text-indigo-300 text-xs px-3`
- **AND** clicking any disabled item SHALL do nothing (no navigation, no Zustand update)

#### Scenario: Site Apps section — site is open
- **WHEN** `currentSite !== null`
- **THEN** a site context block SHALL appear above the nav items:
  - `bg-[rgba(30,27,75,0.6)] rounded-lg px-3 py-2 mx-2`
  - Site name: `text-white text-xs font-semibold truncate`
  - Site description: `text-indigo-400 text-xs truncate`
- **AND** an "Exit" button SHALL appear top-right (`text-indigo-400 text-xs flex items-center gap-1`)
- **AND** clicking Exit: `setSite(null)` → navigate to `/`
- **AND** all 6 site app items SHALL be enabled and clickable

#### Scenario: Active nav item styling
- **WHEN** a nav item matches the current route
- **THEN** it SHALL render: `bg-white text-indigo-700 shadow-sm` with icon `text-indigo-700`
- **WHEN** inactive and enabled: `text-indigo-100 hover:bg-indigo-700 hover:text-white`

#### Scenario: Nav items list (site apps — exact order)
1. Overview — `<Grid>` icon → navigates to `/site/:siteId`
2. Documents — `<Folder>` icon → navigates to `/site/:siteId/docs`
3. Tasks — `<CheckTask>` icon → navigates to `/site/:siteId/tasks`
4. Wiki — `<WikiDoc>` icon → navigates to `/site/:siteId/wiki`
5. Project Lists — `<List>` icon → navigates to `/site/:siteId/lists`
6. Public Share — `<Share>` icon → navigates to `/site/:siteId/share`

#### Scenario: Sidebar footer
- **WHEN** the sidebar renders
- **THEN** a footer SHALL appear at bottom: `mt-auto border-t border-indigo-700` — "Presale Prototype · v1.0" — `text-indigo-500 text-xs text-center py-3`

---

### REQ-003: Global Dashboard

The system SHALL display a global overview when authenticated and no site is active.

#### Scenario: Hero welcome banner
- **WHEN** the Global Dashboard renders
- **THEN** a full-width banner SHALL appear:
  - `bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-2xl p-6 shadow-lg`
  - Sub-label: "Good morning 👋" — `text-indigo-200 text-sm`
  - Heading: "Good morning, {firstName}!" — first word of `currentUser.name` — `text-white text-2xl font-bold`
  - Body: "You have {N} pending tasks and {N} active site(s)." — `text-indigo-100 text-sm` — counts from live Supabase data

#### Scenario: KPI cards row
- **WHEN** the Global Dashboard renders
- **THEN** THREE metric cards SHALL appear in `grid grid-cols-3 gap-4` — exact classes per `design.md` KPI Card anatomy
  - Card 1: "Active Sites" — count from `sites` table — indigo icon
  - Card 2: "Pending Tasks" — count from `tasks` where `status='pending'` — amber icon
  - Card 3: "My Documents" — count from `documents` where `owner_id=currentUser.id` — blue icon
- **AND** loading state SHALL render `animate-pulse` skeleton cards

#### Scenario: My Sites grid
- **WHEN** the Global Dashboard renders
- **THEN** site cards SHALL render in `col-span-3` of a `grid grid-cols-5 gap-6` layout
- **AND** each site card SHALL match `design.md` "Site Card" anatomy exactly — gradient icon block, stats row, avatar stack, "Open Site →" link
- **AND** clicking a card: `setSite(site)` + `navigate('/site/' + site.id)`
- **AND** "+ New Site" button SHALL show `showToast('New site form — enter name and description')`

#### Scenario: Recent Activity feed
- **WHEN** the Global Dashboard renders
- **THEN** activity rows SHALL appear in `col-span-2` from `useActivities` hook
- **AND** each row: `<Avatar>` + "{name} {action} " + `<span className="text-indigo-600">{target}</span>` + relative time
- **AND** rows separated by `border-b border-slate-100`, hover `hover:bg-slate-50`

#### Scenario: Data loading and error handling
- **WHEN** Supabase data is loading
- **THEN** skeleton placeholders with `animate-pulse` SHALL appear for KPI cards and site cards
- **WHEN** Supabase returns an error
- **THEN** a `bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm` error banner SHALL appear

---

### REQ-004: Site Overview

The system SHALL display a site-level summary when a site is selected (route `/site/:siteId`).

#### Scenario: Site header card
- **WHEN** Site Overview renders
- **THEN** a `bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between` card SHALL appear:
  - Left: 56×56 indigo-to-blue gradient icon (`w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-md`) + `<Grid>` icon white + site name (`text-xl font-bold text-slate-900`) + "Public" emerald `<Badge>` + description (`text-slate-500 text-sm`)
  - Right: 4 shortcut buttons (Documents, Tasks, Wiki, Lists) — each with tinted bg, clicking navigates to corresponding route

#### Scenario: Metric cards row
- **WHEN** Site Overview renders
- **THEN** FOUR metric cards SHALL appear in `grid grid-cols-4 gap-4` — real counts from Supabase:
  - 📄 Documents count — from `documents` table filtered by `site_id`
  - ✓ Active Tasks count — from `tasks` where `site_id` AND `status='pending'`
  - 📖 Wiki Pages count — from `wiki_pages` filtered by `site_id`
  - 📋 List Items count — from `project_list_items` via list join filtered by `site_id`

#### Scenario: Members panel
- **WHEN** Site Overview renders
- **THEN** a white rounded-xl card with "Members" heading SHALL appear (`col-span-1` of a `grid grid-cols-2 gap-6`)
- **AND** member rows fetched from `site_members` join — first member (role='manager'): "Site Manager" + "Admin" indigo badge; rest (role='member'): "Collaborator" + "Member" slate badge

#### Scenario: Activity Timeline panel
- **WHEN** Site Overview renders
- **THEN** a white rounded-xl card with "Activity Timeline" heading SHALL appear in `col-span-1`
- **AND** entries from `useActivities(siteId)` — Avatar (sm) + "{name} {event}" + relative time (text-xs text-slate-400)

#### Scenario: CRUD — start workflow from Site Overview shortcut
- **WHEN** user clicks "Documents" shortcut
- **THEN** navigation SHALL go to `/site/:siteId/docs`

---

### REQ-005: Document Library

The system SHALL provide a three-pane document management interface at route `/site/:siteId/docs`.

#### Scenario: Three-pane layout
- **WHEN** Document Library renders
- **THEN** the content area SHALL be `flex h-full` with three panes per `design.md` Three-pane Doc Library anatomy:
  - Pane 1: `w-52` (208px) — folder tree
  - Pane 2: `flex-1` — file list
  - Pane 3: `w-72` (288px) — preview drawer (hidden when no doc selected)

#### Scenario: Folder tree — Read
- **WHEN** the folder tree renders
- **THEN** "APPROVAL STAGES" label SHALL appear (`text-[10px] text-slate-400 uppercase tracking-wider`)
- **AND** FOUR folder buttons in order: 01 Draft, 02 In Review, 03 Final Review, 04 Published
- **AND** count pill = `documents.data.filter(d => d.folder === id).length`
- **AND** dot colors: 01=slate-400, 02=amber-400, 03=blue-400, 04=emerald-400
- **AND** active folder styling per `design.md` NavBtn active variant
- **AND** info box below folders: "Documents flow 01→02→03→04 through the approval workflow."

#### Scenario: File list — Read
- **WHEN** a folder is selected (Zustand `selectedFolder`)
- **THEN** documents filtered to that folder SHALL render as cards per `design.md` Document Row Card anatomy
- **AND** loading: `animate-pulse` skeleton rows
- **AND** error: rose error banner
- **AND** empty: `<Folder size={48} className="text-slate-300" />` centered + "No documents in this stage"

#### Scenario: Document card — Create (Upload)
- **WHEN** user clicks "Upload"
- **THEN** `showToast('File upload dialog — drag & drop supported')` SHALL appear
- **NOTE**: Full file storage is outside demo scope — toast is the placeholder action

#### Scenario: Document card — Create (New)
- **WHEN** user clicks "New"
- **THEN** `showToast('Create document form would open here')` SHALL appear

#### Scenario: Workflow action — Update (advance stage)
- **WHEN** user clicks "▶ Workflow" on a document in folder 01, 02, or 03
- **THEN** `documents.update(doc.id, { folder: nextFolder })` SHALL be called (01→02, 02→03, 03→04)
- **AND** a `tasks` row SHALL be inserted: `{ site_id, document_id: doc.id, assignee_id: nextApprover, folder: nextFolder, priority: 'High' }`
  - Round 1 (folder 02): assignee = Bob (bob@demo.com user id)
  - Round 2 (folder 03): assignee = Cathy (cathy@demo.com user id)
  - Round 3 (folder 04): document status set to 'Final-Approved', no task needed
- **AND** an activity row SHALL be inserted: `{ action: 'started workflow on', target: doc.name }`
- **AND** `showToast('Workflow started — task assigned')` SHALL appear

#### Scenario: Preview drawer — Read
- **WHEN** user clicks a document card (not a button)
- **THEN** Pane 3 SHALL appear with document metadata
- **AND** clicking the same card again SHALL close the drawer (`setPreviewDoc(null)`)
- **AND** clicking X SHALL close the drawer

#### Scenario: Preview drawer — Download
- **WHEN** user clicks "Download" in the preview drawer
- **THEN** `showToast('Downloading ' + doc.name)` SHALL appear

---

### REQ-006: Workflow & Tasks

The system SHALL display pending tasks as a Kanban board with real-time approval actions at `/site/:siteId/tasks`.

#### Scenario: Board layout
- **WHEN** Workflow & Tasks renders
- **THEN** board header SHALL show: "Workflow Board" title + "{N} active task(s) · viewing as {currentUser.name}" + info chip ("Switch demo user (top-right) to change role perspective")
- **AND** immediately below the header a **role-context banner** SHALL appear:
  - Admin → `bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 px-4 py-3` + `<Badge "Admin View" indigo>` + "Full access — you can approve or reject any pending task"
  - Reviewer → `bg-amber-50 border-amber-200` + `<Badge "Reviewer" amber>` + "Round 1 approvals — your tasks are in the 02 · In Review column"
  - Approver → `bg-emerald-50 border-emerald-200` + `<Badge "Approver" emerald>` + "Round 2 approvals — your tasks are in the 03 · Final Review column"
- **AND** `grid grid-cols-4 gap-4` kanban grid SHALL appear below the banner

#### Scenario: Kanban columns — Read
- **WHEN** the board renders
- **THEN** FOUR columns SHALL appear with border/bg per `design.md` Kanban Column map
- **AND** tasks filtered by `task.document.folder` per column (from `useTasks(siteId)` data)
- **AND** loading: `animate-pulse` skeleton columns

#### Scenario: Task card — not assigned to current user — Read
- **GIVEN** `task.assignee.id !== currentUser.id`
- **THEN** card: `bg-white border-slate-200 rounded-xl p-3 shadow-sm` — no action buttons
- **THEN** shows: document name (bold) + Avatar (sm) + assignee first name + priority Badge + due date

#### Scenario: Task card — can approve — Read + Update
- **GIVEN** the current user is Admin (canApproveFolder = null), OR the task.assignee_id matches currentUser.id AND the task.folder matches the user's canApproveFolder
- **THEN** card: `border-indigo-300` + "● Assigned to you" label for assigned tasks OR "● Admin access" label for Admin viewing others' tasks (indigo-600, 6px indigo dot)
- **AND** Approve button + Reject button per `design.md` Task Card anatomy
- **AND** the `canApprove` logic MUST come from `design.md` "Role model" section — do not re-implement differently

#### Scenario: Approve action — Update
- **WHEN** user clicks Approve
- **THEN** `useTasks.approve(task.id, task.document_id)` SHALL:
  1. Update `tasks` row: `status = 'approved'`
  2. Update `documents` row: advance `folder` (02→03, 03→04) or set `status = 'Final-Approved'` if reaching 04
  3. Insert into `activities`: `{ action: 'approved', target: task.document.name }`
  4. Call `refetch()` on both tasks and documents hooks
- **AND** `showToast('✓ Approved — document moved to next stage')` SHALL appear
- **AND** the task card SHALL disappear from the board immediately

#### Scenario: Reject action — Update
- **WHEN** user clicks Reject
- **THEN** `useTasks.reject(task.id, task.document_id)` SHALL:
  1. Update `tasks` row: `status = 'rejected'`
  2. Update `documents` row: regress `folder` (03→02, 02→01)
  3. Insert into `activities`: `{ action: 'rejected', target: task.document.name }`
  4. Call `refetch()` on both hooks
- **AND** `showToast('✕ Rejected — document returned to previous stage')` SHALL appear
- **AND** the task card SHALL disappear from the board immediately

#### Scenario: Empty column
- **WHEN** no tasks in a column
- **THEN** dashed placeholder: `border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center h-20 opacity-30 text-xs text-center` — "No tasks"

#### Scenario: All tasks completed — Read
- **WHEN** `tasks.data.length === 0` (no pending tasks)
- **THEN** centered empty state: `<CheckOk size={40} className="text-emerald-200" />` + "All tasks completed!" (text-sm text-slate-400 font-semibold)

---

### REQ-007: Wiki

The system SHALL provide a two-pane wiki with Create, Read, Update at `/site/:siteId/wiki`.

#### Scenario: Two-pane layout
- **WHEN** Wiki renders
- **THEN** `flex h-full` with Pane 1 `w-56` (page list) + Pane 2 `flex-1` (content)

#### Scenario: Page list — Read
- **WHEN** the page list renders
- **THEN** pages from `useWiki(siteId)` SHALL appear as buttons: "📄 {title}"
- **AND** active: `bg-indigo-50 text-indigo-700 font-medium`
- **AND** loading: `animate-pulse` skeleton page buttons
- **AND** on mount: first page auto-selected via `setActivePageId(pages[0].id)`

#### Scenario: Create new wiki page — Create
- **WHEN** user clicks "+"
- **THEN** `wiki.create({ site_id, title: 'New Page', content: '' })` SHALL insert a new row
- **AND** after refetch, the new page SHALL be auto-selected
- **AND** edit mode SHALL activate immediately (so user can type the title — via update)

#### Scenario: Content area — view mode — Read
- **WHEN** a page is selected and `wikiEditMode === false`
- **THEN** page title + Edit button + `<div dangerouslySetInnerHTML={{ __html: page.content }} />` SHALL appear

#### Scenario: Content area — edit mode — Update
- **WHEN** user clicks Edit → `setWikiEditMode(true)`
- **THEN** format toolbar (9 buttons) + textarea (pre-filled with `page.content`) SHALL appear
- **AND** clicking Save: `wiki.update(page.id, { content: textareaValue })` → `setWikiEditMode(false)` → `showToast('Page saved')`
- **AND** clicking Cancel: `setWikiEditMode(false)` with no database write

#### Scenario: Delete wiki page — Delete
- **WHEN** user clicks a delete icon next to a page in the page list (visible only on hover)
- **THEN** `wiki.remove(page.id)` SHALL delete the row
- **AND** after refetch, the first remaining page SHALL be auto-selected

---

### REQ-008: Project Lists

The system SHALL provide a two-pane project issue tracker at `/site/:siteId/lists`.

#### Scenario: Two-pane layout
- **WHEN** Project Lists renders
- **THEN** `flex h-full` with Pane 1 `w-52` (list nav) + Pane 2 `flex-1` (table)

#### Scenario: List navigation — Read
- **WHEN** lists render from `useProjectLists(siteId)`
- **THEN** each list: "📋 {name}" + item count pill
- **AND** active: `bg-indigo-50 text-indigo-700 font-medium`
- **AND** on mount: first list auto-selected

#### Scenario: Create list — Create
- **WHEN** user clicks "+"
- **THEN** `lists.createList('New List')` SHALL insert into `project_lists`
- **AND** new list auto-selected after refetch

#### Scenario: Issue table — Read
- **WHEN** a list is selected
- **THEN** items from that list SHALL render in a table with columns: Issue ID | Title | Assignee | Status | Priority | Due Date
- **AND** Status badge colors: Done=emerald, In Progress=blue, Open=slate
- **AND** Priority badge colors: High=rose, Medium=amber, Low=slate
- **AND** Issue ID: `font-mono text-xs text-indigo-600 font-semibold`
- **AND** Assignee: `<Avatar name={resolvedName} size="sm" />` + first name
- **AND** loading: `animate-pulse` skeleton rows

#### Scenario: Create list item — Create
- **WHEN** user clicks "New Item"
- **THEN** `showToast('New item form — fill fields to add')` SHALL appear
- **NOTE**: Full form is outside demo scope — toast is the placeholder

#### Scenario: Update list item — Update
- **WHEN** user clicks a row's status badge (future enhancement — placeholder for demo)
- **THEN** `showToast('Status updated')` SHALL appear

---

### REQ-009: Public Share

The system SHALL allow generating tokenized public share links for published documents at `/site/:siteId/share`.

#### Scenario: Page layout
- **WHEN** Public Share renders
- **THEN** content centered: `p-6 flex justify-center` — card `w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-8`

#### Scenario: No published document — Read (empty state)
- **GIVEN** `documents.data.filter(d => d.folder === '04').length === 0`
- **THEN** centered empty: `<Share size={44} className="text-slate-200" />` + "No published documents available" + "Complete the approval workflow to reach Folder 04 first"

#### Scenario: Document available, no token — Read + Create
- **GIVEN** at least one document in folder 04
- **AND** `shareToken === null`
- **THEN** heading + sub-label + document row (`bg-emerald-50 border-emerald-200`) + "Final-Approved" emerald badge + "Generate Public Share Link" button
- **WHEN** user clicks Generate:
  - Generate 8-char alphanumeric token (Math.random + toString(36))
  - Insert into `share_tokens` table: `{ document_id, token, created_by: currentUser.id }`
  - `setShareToken(token)` in Zustand
  - `showToast('Share link generated!')`

#### Scenario: Token generated — Read
- **GIVEN** `shareToken !== null`
- **THEN** link row SHALL appear: `bg-slate-50 border-slate-200 rounded-xl p-4 flex items-center gap-3`
  - `<LinkChain>` icon (indigo-600) + monospace URL in indigo-600 + "Copy" button
- **AND** "Public View Preview" mockup SHALL appear (dashed border, DocHub header, document info, preview placeholder, Download + Full Preview buttons)
- **WHEN** user clicks "Copy": `navigator.clipboard.writeText(url)` + `showToast('Link copied to clipboard!')`

---

### REQ-010: Shared Components

#### Scenario: Avatar component
- **THEN** `<Avatar name="Alice Johnson" size="sm|md|lg" />` renders a circle with initials
- **AND** color per exact mapping in `design.md` Avatar anatomy

#### Scenario: Badge component
- **THEN** `<Badge label="In Review" color="amber" />` renders per `design.md` Badge anatomy

#### Scenario: FileChip component
- **THEN** `<FileChip type="pdf|doc|img" />` renders 40×40 type-coded icon per `design.md` FileChip anatomy

#### Scenario: Toast component
- **THEN** `showToast('message')` renders fixed top-right toast: `fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-2xl animate-slide-in`
- **AND** auto-dismisses after 2800ms
- **AND** multiple toasts stack vertically (each new toast pushes previous ones down)

#### Scenario: slide-in animation
- **THEN** every screen component's outermost div SHALL have `animate-slide-in` class
- **AND** the animation is `opacity: 0, translateY(8px) → opacity: 1, translateY(0)` over 0.18s ease

---

### REQ-011: State Model

The system SHALL maintain Zustand as the single UI state authority.

#### Scenario: Zustand store initial values
- **WHEN** the app boots
- **THEN** `useAppStore.getState()` SHALL return:
  - `currentUser`: null (populated after auth)
  - `currentScreen`: 'global-dashboard'
  - `currentSite`: null
  - `selectedFolder`: '01'
  - `previewDoc`: null
  - `activePageId`: null (set to first page on Wiki mount)
  - `wikiEditMode`: false
  - `activeListId`: null (set to first list on Project Lists mount)
  - `shareToken`: null

#### Scenario: Navigation state rules
- All cross-component navigation state lives in Zustand — never `useState` in a parent component passed as prop
- React Router URL and Zustand `currentScreen` MUST stay in sync
- `setSite(site)` sets `currentSite` and navigates to `/site/:siteId`
- `setSite(null)` clears `currentSite` and navigates to `/`

#### Scenario: Server data rules (Supabase hooks)
- All server data lives in custom hooks — never stored in Zustand
- Every hook exposes `{ data, loading, error, create, update, remove, refetch }`
- Every write operation (create/update/remove) calls `refetch()` after completion
- Every consuming component MUST handle all three states: `loading`, `error`, `data`
