import { useNavigate, useLocation } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { Home, Grid, Folder, CheckTask, WikiDoc, List, Logout } from '../lib/icons'

const SITE_NAV = [
  { id: 'site-overview', label: 'Overview',      icon: Grid,      path: '' },
  { id: 'tasks',         label: 'Tasks',         icon: CheckTask, path: '/tasks' },
  { id: 'documents',     label: 'Documents',     icon: Folder,    path: '/docs' },
  { id: 'wiki',          label: 'Wiki',          icon: WikiDoc,   path: '/wiki' },
  { id: 'issues',        label: 'Issues',        icon: List,      path: '/issues' },
]

function NavBtn({ icon: Icon, label, active, disabled, onClick }) {
  if (disabled) {
    return (
      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-300 cursor-not-allowed" disabled>
        <Icon size={18} />
        <span>{label}</span>
      </button>
    )
  }
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-white text-indigo-700 shadow-sm'
          : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
      }`}>
      <Icon size={18} className={active ? 'text-indigo-700' : ''} />
      <span>{label}</span>
    </button>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentSite = useAppStore(s => s.currentSite)
  const setSite = useAppStore(s => s.setSite)
  const setScreen = useAppStore(s => s.setScreen)

  const currentPath = location.pathname

  const handleGlobal = () => {
    setScreen('global-dashboard')
    navigate('/')
  }

  const handleSiteNav = (item) => {
    if (!currentSite) return
    setScreen(item.id)
    navigate(`/site/${currentSite.id}${item.path}`)
  }

  const handleExit = () => {
    setSite(null)
    navigate('/')
  }

  const isGlobalActive = currentPath === '/'

  return (
    <aside className="w-56 bg-indigo-800 flex flex-col h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-indigo-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Folder size={16} className="text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">DocHub</div>
            <div className="text-indigo-300 text-xs">Document Intelligence</div>
          </div>
        </div>
      </div>

      {/* Global Nav */}
      <div className="px-3 pt-4">
        <p className="text-[10px] text-indigo-400 uppercase tracking-wider px-3 mb-2">GLOBAL</p>
        <NavBtn icon={Home} label="Dashboard" active={isGlobalActive} onClick={handleGlobal} />
      </div>

      {/* Site Context */}
      {currentSite && (
        <div className="mx-2 mt-3 bg-[rgba(30,27,75,0.6)] rounded-lg px-3 py-2 relative">
          <div className="text-white text-xs font-semibold truncate pr-12">{currentSite.name}</div>
          <div className="text-indigo-400 text-xs truncate">{currentSite.description}</div>
          <button onClick={handleExit} className="absolute top-2 right-2 text-indigo-400 text-xs flex items-center gap-1 hover:text-white">
            <Logout size={12} />
            <span>Exit</span>
          </button>
        </div>
      )}

      {/* Site Apps */}
      <div className="px-3 pt-4 flex-1">
        <p className="text-[10px] text-indigo-400 uppercase tracking-wider px-3 mb-2">SITE APPS</p>
        <div className="space-y-0.5">
          {SITE_NAV.map(item => {
            const isSiteActive = currentSite && (
              item.path === ''
                ? currentPath === `/site/${currentSite.id}`
                : currentPath === `/site/${currentSite.id}${item.path}`
            )
            return (
              <NavBtn
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={isSiteActive}
                disabled={!currentSite}
                onClick={() => handleSiteNav(item)}
              />
            )
          })}
        </div>
        {!currentSite && (
          <p className="text-indigo-300 text-xs px-3 mt-3">Select a site from the Dashboard to access its apps.</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-indigo-700">
        <p className="text-indigo-500 text-xs text-center py-3">Prototype · v1.0</p>
      </div>
    </aside>
  )
}
