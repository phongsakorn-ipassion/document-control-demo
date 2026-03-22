import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/roles'
import { ChevronRight, Logout } from '../lib/icons'
import Avatar from './Avatar'
import Badge from './Badge'

const SCREEN_LABELS = {
  '/':      'Dashboard',
  'docs':   'Documents',
  'tasks':  'Workflow & Tasks',
  'wiki':   'Wiki',
  'issues': 'Issues',
  'share':  'Public Share',
}

const DEMO_USERS = [
  { name: 'Alice Johnson', email: 'alice@demo.com' },
  { name: 'Bob Chen',      email: 'bob@demo.com' },
  { name: 'Cathy Park',    email: 'cathy2@demo.com' },
  { name: 'Dave Lee',      email: 'dave@demo.com' },
]

export default function TopBar() {
  const currentUser = useAppStore(s => s.currentUser)
  const currentSite = useAppStore(s => s.currentSite)
  const location = useLocation()
  const [showPanel, setShowPanel] = useState(false)

  const path = location.pathname
  let screenLabel = 'Dashboard'
  if (path === '/') {
    screenLabel = 'Dashboard'
  } else if (path.includes('/docs'))  screenLabel = 'Documents'
  else if (path.includes('/tasks')) screenLabel = 'Workflow & Tasks'
  else if (path.includes('/wiki'))  screenLabel = 'Wiki'
  else if (path.includes('/issues')) screenLabel = 'Issues'
  else if (path.includes('/share')) screenLabel = 'Public Share'
  else if (path.match(/\/site\/[^/]+$/)) screenLabel = 'Overview'

  const userRole = currentUser ? ROLES[currentUser.email] : null

  const handleSignOut = async () => {
    setShowPanel(false)
    await supabase.auth.signOut()
  }

  const handleSwitchUser = async (email) => {
    setShowPanel(false)
    await supabase.auth.signOut()
    await supabase.auth.signInWithPassword({ email, password: 'Demo1234!' })
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        {currentSite ? (
          <>
            <span className="text-slate-500 text-sm">{currentSite.name}</span>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-slate-900 text-sm font-medium">{screenLabel}</span>
          </>
        ) : (
          <span className="text-slate-900 text-sm font-medium">{screenLabel}</span>
        )}
      </div>

      {/* User switcher */}
      {currentUser && (
        <div className="relative">
          <button onClick={() => setShowPanel(!showPanel)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <Avatar name={currentUser.name} size="sm" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-700">{currentUser.name.split(' ')[0]}</div>
              {userRole && <div className="text-[10px] text-slate-400">{userRole.role}</div>}
            </div>
            <span className="text-slate-400 text-xs">▾</span>
          </button>

          {showPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
              <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">Switch Demo User</p>
                  <p className="text-[10px] text-slate-400">Each role has different workflow permissions</p>
                </div>
                <div className="py-1">
                  {DEMO_USERS.map(u => {
                    const r = ROLES[u.email]
                    const isActive = currentUser.email === u.email
                    return (
                      <button key={u.email} onClick={() => !isActive && handleSwitchUser(u.email)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left ${isActive ? 'bg-indigo-50/70' : ''}`}>
                        <Avatar name={u.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">{u.name}</span>
                            <Badge label={r.role} color={r.badge} />
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{r.icon} {r.desc}</p>
                        </div>
                        {isActive && <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />active</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
                  <button onClick={handleSignOut}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 transition">
                    <Logout size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}
