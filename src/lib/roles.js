export const ROLES = {
  'alice@demo.com': {
    name:  'Alice Johnson',
    role:  'Admin',
    badge: 'indigo',
    icon:  '👑',
    desc:  'Full access · manages site & content',
    canApproveFolder: null,
  },
  'bob@demo.com': {
    name:  'Bob Chen',
    role:  'Reviewer',
    badge: 'amber',
    icon:  '🔍',
    desc:  'Round 1 approver · 02 In Review stage',
    canApproveFolder: '02',
  },
  'cathy@demo.com': {
    name:  'Cathy Park',
    role:  'Approver',
    badge: 'emerald',
    icon:  '✅',
    desc:  'Round 2 final approver · 03 Final Review stage',
    canApproveFolder: '03',
  },
}

export const NAME_MAP = {
  'alice@demo.com': 'Alice Johnson',
  'bob@demo.com':   'Bob Chen',
  'cathy@demo.com': 'Cathy Park',
}

export const ID_NAME_MAP = {
  '1fb3704f-5640-4704-9f39-579198643948': 'Alice Johnson',
  'dd1bb245-1ae1-4252-b336-4a7746882a09': 'Bob Chen',
  '58a9a91f-7237-492c-b135-b6ecdd45d144': 'Cathy Park',
}

export const DEMO_USERS = [
  { id: '1fb3704f-5640-4704-9f39-579198643948', name: 'Alice Johnson', role: 'Admin',    badge: 'indigo' },
  { id: 'dd1bb245-1ae1-4252-b336-4a7746882a09', name: 'Bob Chen',      role: 'Reviewer', badge: 'amber' },
  { id: '58a9a91f-7237-492c-b135-b6ecdd45d144', name: 'Cathy Park',    role: 'Approver', badge: 'emerald' },
]
