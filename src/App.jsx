import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { NAME_MAP } from './lib/roles'
import useAppStore from './store/useAppStore'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Login from './screens/Login'
import GlobalDashboard from './screens/GlobalDashboard'
import SiteOverview from './screens/SiteOverview'
import DocumentLibrary from './screens/DocumentLibrary'
import WorkflowTasks from './screens/WorkflowTasks'
import Wiki from './screens/Wiki'
import ProjectLists from './screens/ProjectLists'
import PublicShare from './screens/PublicShare'
import PublicWiki from './screens/PublicWiki'

const AVATAR_COLOR_MAP = {
  'Alice Johnson': 'indigo',
  'Bob Chen':      'amber',
  'Cathy Park':    'emerald',
}

function toUser(authUser) {
  return {
    id:          authUser.id,
    email:       authUser.email,
    name:        NAME_MAP[authUser.email] ?? authUser.email,
    avatarColor: AVATAR_COLOR_MAP[NAME_MAP[authUser.email]] ?? 'slate',
  }
}

function AuthLayout() {
  const currentUser = useAppStore(s => s.currentUser)
  if (!currentUser) return <Login />
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const setCurrentUser = useAppStore(s => s.setCurrentUser)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUser(toUser(session.user))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session ? toUser(session.user) : null)
    })
    return () => subscription.unsubscribe()
  }, [setCurrentUser])

  return (
    <Routes>
      {/* Public route — no auth required */}
      <Route path="/share/:token" element={
        <div className="min-h-screen bg-slate-50">
          <PublicShare />
        </div>
      } />

      {/* Public wiki article route — no auth required */}
      <Route path="/wiki/:token" element={
        <div className="min-h-screen bg-slate-50">
          <PublicWiki />
        </div>
      } />

      {/* Auth-protected routes with layout */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<GlobalDashboard />} />
        <Route path="/site/:siteId" element={<SiteOverview />} />
        <Route path="/site/:siteId/docs" element={<DocumentLibrary />} />
        <Route path="/site/:siteId/tasks" element={<WorkflowTasks />} />
        <Route path="/site/:siteId/wiki" element={<Wiki />} />
        <Route path="/site/:siteId/issues" element={<ProjectLists />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
