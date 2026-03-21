export const ROLES = {
  'alice@demo.com': {
    name: 'Alice Johnson',
    role: 'Admin',
    badge: 'indigo',
    icon: '👑',
    desc: 'Full access · manages site & content',
    canApproveFolder: null,
  },
  'bob@demo.com': {
    name: 'Bob Chen',
    role: 'Reviewer',
    badge: 'amber',
    icon: '🔍',
    desc: 'Round 1 approver · 02 In Review stage',
    canApproveFolder: '02',
  },
  'cathy2@demo.com': {
    name: 'Cathy Park',
    role: 'Approver',
    badge: 'emerald',
    icon: '✅',
    desc: 'Round 2 final approver · 03 Final Review stage',
    canApproveFolder: '03',
  },
  'dave@demo.com': {
    name: 'Dave Lee',
    role: 'Viewer',
    badge: 'slate',
    icon: '👁',
    desc: 'Read-only · can browse all content',
    canApproveFolder: false,
  },
}

export const NAME_MAP = {
  'alice@demo.com': 'Alice Johnson',
  'bob@demo.com': 'Bob Chen',
  'cathy2@demo.com': 'Cathy Park',
  'dave@demo.com': 'Dave Lee',
}

export const ID_NAME_MAP = {
  '1fb3704f-5640-4704-9f39-579198643948': 'Alice Johnson',
  'dd1bb245-1ae1-4252-b336-4a7746882a09': 'Bob Chen',
  '3765cfa6-d846-4362-bd77-03bdc8953491': 'Cathy Park',
  '0861827d-768c-4cd9-b89b-f8754087f820': 'Dave Lee',
}

export const DEMO_USERS = [
  { id: '1fb3704f-5640-4704-9f39-579198643948', name: 'Alice Johnson', role: 'Admin', badge: 'indigo' },
  { id: 'dd1bb245-1ae1-4252-b336-4a7746882a09', name: 'Bob Chen', role: 'Reviewer', badge: 'amber' },
  { id: '3765cfa6-d846-4362-bd77-03bdc8953491', name: 'Cathy Park', role: 'Approver', badge: 'emerald' },
  { id: '0861827d-768c-4cd9-b89b-f8754087f820', name: 'Dave Lee', role: 'Viewer', badge: 'slate' },
]
