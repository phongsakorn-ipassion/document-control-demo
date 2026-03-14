import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { NAME_MAP, ID_NAME_MAP } from '../lib/roles'
import { useDocuments } from '../hooks/useDocuments'
import { useTasks } from '../hooks/useTasks'
import { useWiki } from '../hooks/useWiki'
import { useProjectLists } from '../hooks/useProjectLists'
import { useActivities } from '../hooks/useActivities'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Grid, Folder, CheckTask, WikiDoc, List } from '../lib/icons'

export default function SiteOverview() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const currentSite = useAppStore(s => s.currentSite)
  const setSite = useAppStore(s => s.setSite)
  const setScreen = useAppStore(s => s.setScreen)
  const [members, setMembers] = useState([])

  const docs = useDocuments(siteId)
  const tasks = useTasks(siteId)
  const wiki = useWiki(siteId)
  const lists = useProjectLists(siteId)
  const activities = useActivities(siteId)

  useEffect(() => {
    setScreen('site-overview')
    if (!currentSite) {
      supabase.from('sites').select('*').eq('id', siteId).single().then(({ data }) => {
        if (data) setSite(data)
      })
    }
  }, [siteId, currentSite, setSite, setScreen])

  useEffect(() => {
    supabase
      .from('site_members')
      .select('*, user:user_id(id, email)')
      .eq('site_id', siteId)
      .then(({ data }) => setMembers(data || []))
  }, [siteId])

  const site = currentSite || { name: 'Loading...', description: '' }
  const listItemCount = lists.data.reduce((sum, l) => sum + (l.items?.length || 0), 0)

  const shortcuts = [
    { label: 'Documents', icon: Folder, bg: 'bg-indigo-50 text-indigo-600', path: '/docs' },
    { label: 'Tasks',     icon: CheckTask, bg: 'bg-amber-50 text-amber-600', path: '/tasks' },
    { label: 'Wiki',      icon: WikiDoc, bg: 'bg-blue-50 text-blue-600', path: '/wiki' },
    { label: 'Lists',     icon: List, bg: 'bg-emerald-50 text-emerald-600', path: '/lists' },
  ]

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {/* Site Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
            <Grid size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{site.name}</h1>
              <Badge label="Public" color="emerald" />
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{site.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {shortcuts.map(s => (
            <button key={s.label} onClick={() => navigate(`/site/${siteId}${s.path}`)}
              className={`${s.bg} px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition`}>
              <s.icon size={14} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard emoji="📄" label="Documents" value={docs.data.length} loading={docs.loading} />
        <MetricCard emoji="✓" label="Active Tasks" value={tasks.data.length} loading={tasks.loading} />
        <MetricCard emoji="📖" label="Wiki Pages" value={wiki.data.length} loading={wiki.loading} />
        <MetricCard emoji="📋" label="List Items" value={listItemCount} loading={lists.loading} />
      </div>

      {/* Members + Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Members</h3>
          <div className="space-y-3">
            {members.map((m, i) => {
              const name = NAME_MAP[m.user?.email] || m.user?.email || 'Unknown'
              const isManager = m.role === 'manager'
              return (
                <div key={m.id || i} className="flex items-center gap-3">
                  <Avatar name={name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{name}</div>
                    <div className="text-xs text-slate-400">{isManager ? 'Site Manager' : 'Collaborator'}</div>
                  </div>
                  <Badge label={isManager ? 'Admin' : 'Member'} color={isManager ? 'indigo' : 'slate'} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Activity Timeline</h3>
          {activities.loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {activities.data.map((a, i) => {
                const name = ID_NAME_MAP[a.actor_id] || 'Unknown'
                return (
                  <div key={a.id || i} className="flex items-center gap-3">
                    <Avatar name={name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        <span className="font-medium">{name}</span>{' '}{a.action}{' '}
                        <span className="text-indigo-600">{a.target}</span>
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ emoji, label, value, loading }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
      <span className="text-xl">{emoji}</span>
      <div>
        {loading ? <div className="h-7 w-8 bg-slate-100 rounded animate-pulse" /> : <div className="text-xl font-bold text-slate-900">{value}</div>}
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
