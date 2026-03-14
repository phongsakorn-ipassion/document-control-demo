import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  const currentUser = useAppStore(s => s.currentUser)
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

  if (!currentUser) return <Login />

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<GlobalDashboard />} />
            <Route path="/site/:siteId" element={<SiteOverview />} />
            <Route path="/site/:siteId/docs" element={<DocumentLibrary />} />
            <Route path="/site/:siteId/tasks" element={<WorkflowTasks />} />
            <Route path="/site/:siteId/wiki" element={<Wiki />} />
            <Route path="/site/:siteId/lists" element={<ProjectLists />} />
            <Route path="/site/:siteId/share" element={<PublicShare />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
