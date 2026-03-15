import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { NAME_MAP, ID_NAME_MAP } from '../lib/roles'
import { useActivities } from '../hooks/useActivities'
import { DEFAULT_WORKFLOW_STAGES } from '../hooks/useWorkflowConfig'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Home, Grid, Folder, CheckTask, Plus, ChevronRight, XClose } from '../lib/icons'

const PAGE_SIZE = 10

export default function GlobalDashboard() {
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.currentUser)
  const setSite = useAppStore(s => s.setSite)
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const [sites, setSites] = useState([])
  const [sitesLoading, setSitesLoading] = useState(true)
  const [sitesHasMore, setSitesHasMore] = useState(true)
  const [sitesLoadingMore, setSitesLoadingMore] = useState(false)
  const sitesOffsetRef = useRef(0)
  const [siteFilter, setSiteFilter] = useState('active') // 'active' | 'inactive' | 'all'
  const [activeSiteCount, setActiveSiteCount] = useState(0)
  const [taskCount, setTaskCount] = useState(0)
  const [docCount, setDocCount] = useState(0)
  const [showNewSite, setShowNewSite] = useState(false)
  const [reactivateSite, setReactivateSite] = useState(null)
  const activities = useActivities(null)

  useEffect(() => {
    setScreen('global-dashboard')
  }, [setScreen])

  const fetchSites = useCallback(async () => {
    setSitesLoading(true)
    sitesOffsetRef.current = 0
    let query = supabase.from('sites').select('*').order('created_at', { ascending: false })
    if (siteFilter === 'active') query = query.eq('active', true)
    else if (siteFilter === 'inactive') query = query.eq('active', false)
    const { data: s } = await query.range(0, PAGE_SIZE - 1)
    setSites(s || [])
    setSitesHasMore((s?.length ?? 0) >= PAGE_SIZE)
    sitesOffsetRef.current = s?.length ?? 0
    setSitesLoading(false)
  }, [siteFilter])

  const loadMoreSites = useCallback(async () => {
    if (sitesLoadingMore || !sitesHasMore) return
    setSitesLoadingMore(true)
    const offset = sitesOffsetRef.current
    let query = supabase.from('sites').select('*').order('created_at', { ascending: false })
    if (siteFilter === 'active') query = query.eq('active', true)
    else if (siteFilter === 'inactive') query = query.eq('active', false)
    const { data: s } = await query.range(offset, offset + PAGE_SIZE - 1)
    if (s) {
      setSites(prev => [...prev, ...s])
      setSitesHasMore(s.length >= PAGE_SIZE)
      sitesOffsetRef.current = offset + s.length
    }
    setSitesLoadingMore(false)
  }, [sitesLoadingMore, sitesHasMore, siteFilter])

  useEffect(() => {
    const fetchData = async () => {
      await fetchSites()
      const { count: ac } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('active', true)
      setActiveSiteCount(ac || 0)
      const { count: tc } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      setTaskCount(tc || 0)
      const { count: dc } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('owner_id', currentUser.id)
      setDocCount(dc || 0)
    }
    fetchData()
  }, [currentUser, fetchSites])

  const sitesSentinel = useInfiniteScroll(loadMoreSites, { enabled: sitesHasMore && !sitesLoading })
  const activitySentinel = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore && !activities.loading })

  const openSite = (site) => {
    setSite(site)
    navigate(`/site/${site.id}`)
  }

  const handleCreateSite = async (name, description) => {
    const id = crypto.randomUUID()
    const { error: siteErr } = await supabase.from('sites').insert({ id, name, description })
    if (siteErr) return siteErr.message

    await supabase.from('site_members').insert({ site_id: id, user_id: currentUser.id, role: 'admin' })

    // Auto-seed default workflow stages (Draft + Published only)
    const seedStages = DEFAULT_WORKFLOW_STAGES.map(s => ({ ...s, site_id: id }))
    await supabase.from('site_workflow_stages').insert(seedStages)

    await activities.log({ site_id: id, actor_id: currentUser.id, action: 'created site', target: name })

    showToast(`Site "${name}" created successfully`)
    setShowNewSite(false)
    const newSite = { id, name, description }
    setSite(newSite)
    navigate(`/site/${id}`)
    return null
  }

  const firstName = currentUser?.name?.split(' ')[0] || ''

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-2xl p-6 shadow-lg">
        <p className="text-indigo-200 text-sm">Good morning 👋</p>
        <h1 className="text-white text-2xl font-bold">Good morning, {firstName}!</h1>
        <p className="text-indigo-100 text-sm mt-1">
          You have {taskCount} pending tasks and {activeSiteCount} active site(s).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard icon={<Grid size={20} />} iconBg="bg-indigo-50 text-indigo-700" value={activeSiteCount} label="Active Sites" loading={sitesLoading} />
        <KpiCard icon={<CheckTask size={20} />} iconBg="bg-amber-50 text-amber-600" value={taskCount} label="Pending Tasks" loading={sitesLoading} />
        <KpiCard icon={<Folder size={20} />} iconBg="bg-blue-50 text-blue-600" value={docCount} label="My Documents" loading={sitesLoading} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-5 gap-6">
        {/* Sites */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">My Sites</h2>
              {/* Filter button group */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                {[{ key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }, { key: 'all', label: 'All' }].map(f => (
                  <button key={f.key} onClick={() => setSiteFilter(f.key)}
                    className={`px-3 py-1 text-xs font-medium transition ${siteFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowNewSite(true)}
              className="flex items-center gap-1 text-indigo-600 text-sm hover:underline">
              <Plus size={14} /> New Site
            </button>
          </div>
          {sitesLoading ? (
            <div className="space-y-4">
              {[1,2].map(i => <div key={i} className="h-40 bg-white rounded-[20px] animate-pulse" />)}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto space-y-4 pr-1">
              {sites.map(site => (
                <SiteCard key={site.id} site={site} onClick={() => openSite(site)} onReactivate={() => setReactivateSite(site)} />
              ))}
              {/* Sentinel for infinite scroll */}
              {sitesHasMore && <div ref={sitesSentinel} className="h-6" />}
              {sitesLoadingMore && <div className="h-40 bg-white rounded-[20px] animate-pulse" />}
              {!sitesHasMore && sites.length > 0 && (
                <p className="text-xs text-slate-300 text-center py-2">No more sites</p>
              )}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {activities.loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}
              </div>
            ) : activities.error ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm m-3">{activities.error.message}</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {activities.data.map((a, i) => {
                  const name = ID_NAME_MAP[a.actor_id] || 'Unknown'
                  return (
                    <div key={a.id || i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
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
                {/* Sentinel for infinite scroll */}
                {activities.hasMore && <div ref={activitySentinel} className="h-6" />}
                {activities.loadingMore && (
                  <div className="px-4 py-3">
                    <div className="h-10 bg-slate-100 rounded animate-pulse" />
                  </div>
                )}
                {!activities.hasMore && activities.data.length > 0 && (
                  <p className="text-xs text-slate-300 text-center py-3">No more activity</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewSite && <NewSiteModal onClose={() => setShowNewSite(false)} onCreate={handleCreateSite} />}
      {reactivateSite && (
        <ConfirmModal
          title="Reactivate Site?"
          message={`Are you sure you want to reactivate "${reactivateSite.name}"?`}
          confirmLabel="Reactivate"
          confirmColor="emerald"
          onClose={() => setReactivateSite(null)}
          onConfirm={async () => {
            await supabase.from('sites').update({ active: true }).eq('id', reactivateSite.id)
            await activities.log({ site_id: reactivateSite.id, actor_id: currentUser.id, action: 'reactivated site', target: reactivateSite.name })
            showToast(`Site "${reactivateSite.name}" reactivated`)
            setReactivateSite(null)
            fetchSites()
            const { count: ac } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('active', true)
            setActiveSiteCount(ac || 0)
          }}
        />
      )}
    </div>
  )
}

function NewSiteModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Site name is required'); return }
    setLoading(true)
    setError('')
    const err = await onCreate(name.trim(), description.trim())
    if (err) { setError(err); setLoading(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Create New Site</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XClose size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site Name *</label>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }} autoFocus
              placeholder="e.g. Project Alpha"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this site"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60">
              {loading ? 'Creating...' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function ConfirmModal({ title, message, confirmLabel, confirmColor = 'rose', onClose, onConfirm }) {
  const [busy, setBusy] = useState(false)
  const colorMap = {
    rose: 'bg-rose-600 hover:bg-rose-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
  }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XClose size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={async () => { setBusy(true); await onConfirm(); setBusy(false) }} disabled={busy}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60 ${colorMap[confirmColor] || colorMap.rose}`}>
            {busy ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function KpiCard({ icon, iconBg, value, label, loading }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-all duration-150">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      <div>
        {loading ? (
          <div className="h-8 w-12 bg-slate-100 rounded animate-pulse" />
        ) : (
          <div className="text-2xl font-bold text-slate-900">{value}</div>
        )}
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}

function SiteCard({ site, onClick, onReactivate }) {
  const isInactive = site.active === false
  return (
    <div onClick={onClick}
      className={`bg-white border rounded-[20px] p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${isInactive ? 'border-slate-200 opacity-75 hover:border-slate-300' : 'border-slate-200 hover:border-indigo-300'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${isInactive ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-indigo-500 to-blue-500'}`}>
          <Grid size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{site.name}</h3>
            {isInactive
              ? <Badge label="Inactive" color="rose" />
              : <Badge label="Public" color="emerald" />
            }
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{site.description}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
        <div className="flex -space-x-2">
          <Avatar name="Alice Johnson" size="sm" />
          <Avatar name="Bob Chen" size="sm" />
          <Avatar name="Cathy Park" size="sm" />
        </div>
        {isInactive ? (
          <button onClick={e => { e.stopPropagation(); onReactivate() }}
            className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg hover:bg-emerald-100 transition">
            Reactivate
          </button>
        ) : (
          <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
            Open Site <ChevronRight size={12} />
          </span>
        )}
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
