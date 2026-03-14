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
