import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { ID_NAME_MAP, DEMO_USERS } from '../lib/roles'
import { useDocuments } from '../hooks/useDocuments'
import { useTasks } from '../hooks/useTasks'
import { useWiki } from '../hooks/useWiki'
import { useProjectLists } from '../hooks/useProjectLists'
import { useActivities } from '../hooks/useActivities'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { useWorkflowConfig, getStageStyles } from '../hooks/useWorkflowConfig'
import { Grid, Folder, CheckTask, WikiDoc, List, Plus, EditPen, XClose, Settings, ChevronRight, ChevronUp, ChevronDown, Trash } from '../lib/icons'

const PAGE_SIZE = 10

const ROLE_LABELS = {
  admin:    { label: 'Admin',    badge: 'indigo',  desc: 'Site Admin' },
  reviewer: { label: 'Reviewer', badge: 'amber',   desc: 'Reviewer' },
  approver: { label: 'Approver', badge: 'emerald', desc: 'Approver' },
  // legacy fallbacks
  manager:  { label: 'Admin',    badge: 'indigo',  desc: 'Site Admin' },
  member:   { label: 'Reviewer', badge: 'amber',   desc: 'Collaborator' },
}

export default function SiteOverview() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.currentUser)
  const currentSite = useAppStore(s => s.currentSite)
  const setSite = useAppStore(s => s.setSite)
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersHasMore, setMembersHasMore] = useState(true)
  const [membersLoadingMore, setMembersLoadingMore] = useState(false)
  const membersOffsetRef = useRef(0)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEditSite, setShowEditSite] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [showAddStage, setShowAddStage] = useState(false)
  const [editStage, setEditStage] = useState(null)
  const [confirmDeleteStage, setConfirmDeleteStage] = useState(null)

  const docs = useDocuments(siteId)
  const tasks = useTasks(siteId)
  const wiki = useWiki(siteId)
  const lists = useProjectLists(siteId)
  const activities = useActivities(siteId)
  const wf = useWorkflowConfig(siteId)

  useEffect(() => {
    setScreen('site-overview')
    if (!currentSite) {
      supabase.from('sites').select('*').eq('id', siteId).single().then(({ data }) => {
        if (data) setSite(data)
      })
    }
  }, [siteId, currentSite, setSite, setScreen])

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true)
    membersOffsetRef.current = 0
    const { data } = await supabase
      .from('site_members')
      .select('*')
      .eq('site_id', siteId)
      .range(0, PAGE_SIZE - 1)
    setMembers(data || [])
    setMembersHasMore((data?.length ?? 0) >= PAGE_SIZE)
    membersOffsetRef.current = data?.length ?? 0
    setMembersLoading(false)
  }, [siteId])

  const loadMoreMembers = useCallback(async () => {
    if (membersLoadingMore || !membersHasMore) return
    setMembersLoadingMore(true)
    const offset = membersOffsetRef.current
    const { data } = await supabase
      .from('site_members')
      .select('*')
      .eq('site_id', siteId)
      .range(offset, offset + PAGE_SIZE - 1)
    if (data) {
      setMembers(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const unique = data.filter(m => !existingIds.has(m.id))
        return [...prev, ...unique]
      })
      setMembersHasMore(data.length >= PAGE_SIZE)
      membersOffsetRef.current = offset + data.length
    }
    setMembersLoadingMore(false)
  }, [siteId, membersLoadingMore, membersHasMore])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const membersSentinel = useInfiniteScroll(loadMoreMembers, { enabled: membersHasMore && !membersLoading })
  const activitySentinel = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore })

  const site = currentSite || { name: 'Loading...', description: '' }
  const listItemCount = lists.data.reduce((sum, l) => sum + (l.items?.length || 0), 0)
  const memberUserIds = members.map(m => m.user_id)

  const handleAddMember = async (userId, role) => {
    const { error: err } = await supabase.from('site_members').insert({ site_id: siteId, user_id: userId, role })
    if (err) return err.message
    const userName = ID_NAME_MAP[userId] || 'User'
    await activities.log({ site_id: siteId, actor_id: currentUser.id, action: 'added member', target: userName })
    showToast(`${userName} added to site`)
    setShowAddMember(false)
    fetchMembers()
    return null
  }

  const handleEditSite = async (name, description) => {
    const { error: err } = await supabase.from('sites').update({ name, description }).eq('id', siteId)
    if (err) return err.message
    const updated = { ...site, name, description }
    setSite(updated)
    await activities.log({ site_id: siteId, actor_id: currentUser.id, action: 'updated site', target: name })
    showToast('Site updated')
    setShowEditSite(false)
    return null
  }

  const handleDeactivate = async () => {
    await supabase.from('sites').update({ active: false }).eq('id', siteId)
    await activities.log({ site_id: siteId, actor_id: currentUser.id, action: 'deactivated site', target: site.name })
    showToast(`Site "${site.name}" deactivated`)
    setSite(null)
    navigate('/')
  }

  const shortcuts = [
    { label: 'Tasks',     icon: CheckTask, bg: 'bg-amber-50 text-amber-600', path: '/tasks' },
    { label: 'Documents', icon: Folder, bg: 'bg-indigo-50 text-indigo-600', path: '/docs' },
    { label: 'Wiki',      icon: WikiDoc, bg: 'bg-blue-50 text-blue-600', path: '/wiki' },
    { label: 'Issues',    icon: List, bg: 'bg-emerald-50 text-emerald-600', path: '/issues' },
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
              <button onClick={() => setShowEditSite(true)}
                className="text-slate-400 hover:text-indigo-600 transition ml-1">
                <EditPen size={14} />
              </button>
              {/* Active / Inactive toggle */}
              <div className="flex items-center gap-1 ml-3 border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => { if (site.active === false) { supabase.from('sites').update({ active: true }).eq('id', siteId).then(() => { setSite({ ...site, active: true }); showToast(`Site "${site.name}" reactivated`); activities.log({ site_id: siteId, actor_id: currentUser.id, action: 'reactivated site', target: site.name }) }) } }}
                  className={`px-3 py-1 text-xs font-medium transition ${site.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  ● Active
                </button>
                <button
                  onClick={() => { if (site.active !== false) setShowDeactivate(true) }}
                  className={`px-3 py-1 text-xs font-medium transition ${site.active === false ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50/50'}`}>
                  ○ Inactive
                </button>
              </div>
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
        <MetricCard emoji="✓" label="Active Tasks" value={tasks.data.length} loading={tasks.loading} />
        <MetricCard emoji="📄" label="Documents" value={docs.data.length} loading={docs.loading} />
        <MetricCard emoji="📖" label="Wiki Pages" value={wiki.data.length} loading={wiki.loading} />
        <MetricCard emoji="📋" label="List Items" value={listItemCount} loading={lists.loading} />
      </div>

      {/* Workflow Pipeline Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Workflow Pipeline</h3>
            <span className="text-xs text-slate-400">({wf.stages.length} stages)</span>
            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">Applies to Documents & Wiki</span>
          </div>
          <button onClick={() => setShowAddStage(true)}
            className="flex items-center gap-1 text-indigo-600 text-xs font-medium hover:underline">
            <Plus size={12} /> Add Stage
          </button>
        </div>

        {/* Pipeline visualization */}
        {wf.stages.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {wf.stages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
                <div className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                  stage.stage_type === 'draft' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                  stage.stage_type === 'published' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                  'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}>
                  {stage.stage_name}
                  {stage.assignee_id && (
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({(ID_NAME_MAP[stage.assignee_id] || 'Unknown').split(' ')[0]})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stage table */}
        {wf.stages.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-2 w-8">#</th>
                <th className="text-left py-2">Stage</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Default Assignee</th>
                <th className="text-right py-2 w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {wf.stages.map((stage, i) => {
                const prevStage = i > 0 ? wf.stages[i - 1] : null
                const nextStage = i < wf.stages.length - 1 ? wf.stages[i + 1] : null
                const canMoveUp = stage.stage_type === 'review' && prevStage?.stage_type === 'review'
                const canMoveDown = stage.stage_type === 'review' && nextStage?.stage_type === 'review'
                return (
                  <tr key={stage.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2 text-slate-400">{i + 1}</td>
                    <td className="py-2 font-medium text-slate-700">{stage.stage_name}</td>
                    <td className="py-2">
                      <Badge label={stage.stage_type[0].toUpperCase() + stage.stage_type.slice(1)} color={stage.stage_type === 'draft' ? 'slate' : stage.stage_type === 'published' ? 'emerald' : 'amber'} />
                    </td>
                    <td className="py-2 text-slate-600">
                      {stage.assignee_id ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={ID_NAME_MAP[stage.assignee_id] || '?'} size="sm" />
                          <span>{ID_NAME_MAP[stage.assignee_id] || 'Unknown'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {stage.stage_type === 'review' ? (
                        <div className="flex gap-0.5 justify-end">
                          <button onClick={() => canMoveUp && wf.swapOrder(stage.id, prevStage.id)}
                            disabled={!canMoveUp}
                            className={`p-1 rounded transition ${canMoveUp ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-slate-200 cursor-not-allowed'}`}>
                            <ChevronUp size={12} />
                          </button>
                          <button onClick={() => canMoveDown && wf.swapOrder(stage.id, nextStage.id)}
                            disabled={!canMoveDown}
                            className={`p-1 rounded transition ${canMoveDown ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-slate-200 cursor-not-allowed'}`}>
                            <ChevronDown size={12} />
                          </button>
                          <button onClick={() => setEditStage(stage)}
                            className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition">
                            <EditPen size={12} />
                          </button>
                          <button onClick={() => setConfirmDeleteStage(stage)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition">
                            <Trash size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">Locked</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {wf.loading && <div className="h-16 bg-slate-50 rounded animate-pulse" />}
      </div>

      {/* Members + Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Members</h3>
            <button onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1 text-indigo-600 text-xs font-medium hover:underline">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {members.map((m, i) => {
              const name = ID_NAME_MAP[m.user_id] || 'Unknown'
              const roleMeta = ROLE_LABELS[m.role] || ROLE_LABELS.member
              return (
                <div key={m.id || i} className="flex items-center gap-3">
                  <Avatar name={name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{name}</div>
                    <div className="text-xs text-slate-400">{roleMeta.desc}</div>
                  </div>
                  <Badge label={roleMeta.label} color={roleMeta.badge} />
                </div>
              )
            })}
            {members.length === 0 && (
              <p className="text-sm text-slate-400">No members yet. Click "+ Add" to invite.</p>
            )}
            {/* Sentinel for infinite scroll */}
            {membersHasMore && <div ref={membersSentinel} className="h-6" />}
            {membersLoadingMore && <div className="h-8 bg-slate-100 rounded animate-pulse" />}
            {!membersHasMore && members.length > 0 && (
              <p className="text-xs text-slate-300 text-center py-1">No more members</p>
            )}
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
            <div className="max-h-[400px] overflow-y-auto space-y-3">
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
              {/* Sentinel for infinite scroll */}
              {activities.hasMore && <div ref={activitySentinel} className="h-6" />}
              {activities.loadingMore && <div className="h-8 bg-slate-100 rounded animate-pulse" />}
              {!activities.hasMore && activities.data.length > 0 && (
                <p className="text-xs text-slate-300 text-center py-1">No more activity</p>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          existingIds={memberUserIds}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
        />
      )}
      {showEditSite && (
        <EditSiteModal
          site={site}
          onClose={() => setShowEditSite(false)}
          onSave={handleEditSite}
        />
      )}
      {showAddStage && (
        <AddStageModal
          onClose={() => setShowAddStage(false)}
          onAdd={async (name, assigneeId) => {
            await wf.addReviewStage(name, assigneeId)
            showToast('Stage added')
            setShowAddStage(false)
          }}
        />
      )}
      {editStage && (
        <EditStageModal
          stage={editStage}
          onClose={() => setEditStage(null)}
          onSave={async (patch) => {
            await wf.updateStage(editStage.id, patch)
            showToast('Stage updated')
            setEditStage(null)
          }}
        />
      )}
      {showDeactivate && (
        <ConfirmActionModal
          title="Deactivate Site?"
          message={`Are you sure you want to deactivate "${site.name}"? It will be hidden from the active sites list.`}
          confirmLabel="Deactivate"
          confirmColor="rose"
          onClose={() => setShowDeactivate(false)}
          onConfirm={handleDeactivate}
        />
      )}
      {confirmDeleteStage && (
        <ConfirmDeleteStageModal
          stage={confirmDeleteStage}
          checkUsage={wf.checkStageUsage}
          onClose={() => setConfirmDeleteStage(null)}
          onConfirm={async () => {
            const result = await wf.removeStage(confirmDeleteStage.id)
            if (result?.error) {
              showToast(result.error)
            } else {
              showToast('Stage removed')
            }
            setConfirmDeleteStage(null)
          }}
        />
      )}
    </div>
  )
}

/* ── Add Member Modal ── */
function AddMemberModal({ existingIds, onClose, onAdd }) {
  const [selectedId, setSelectedId] = useState(null)
  const [role, setRole] = useState('reviewer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedId) { setError('Select a user'); return }
    setLoading(true)
    setError('')
    const err = await onAdd(selectedId, role)
    if (err) { setError(err); setLoading(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Add Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XClose size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select User</label>
            <div className="space-y-2">
              {DEMO_USERS.map(u => {
                const alreadyAdded = existingIds.includes(u.id)
                const isSelected = selectedId === u.id
                return (
                  <button type="button" key={u.id} disabled={alreadyAdded}
                    onClick={() => { setSelectedId(u.id); setError('') }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                      alreadyAdded
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer'
                    }`}>
                    <Avatar name={u.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900">{u.name}</span>
                      <span className="ml-2"><Badge label={u.role} color={u.badge} /></span>
                    </div>
                    {alreadyAdded && <span className="text-xs text-slate-400">Already added</span>}
                    {isSelected && !alreadyAdded && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
              <option value="approver">Approver</option>
            </select>
          </div>
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !selectedId}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ── Edit Site Modal ── */
function EditSiteModal({ site, onClose, onSave }) {
  const [name, setName] = useState(site.name || '')
  const [description, setDescription] = useState(site.description || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Site name is required'); return }
    setLoading(true)
    setError('')
    const err = await onSave(name.trim(), description.trim())
    if (err) { setError(err); setLoading(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Edit Site</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XClose size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site Name *</label>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }} autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description"
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ── Add Stage Modal ── */
function AddStageModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Stage name is required'); return }
    if (!assigneeId) { setError('Select a default assignee'); return }
    setLoading(true)
    setError('')
    try {
      await onAdd(name.trim(), assigneeId)
    } catch (err) {
      setError(err.message || 'Failed to add stage')
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Add Review Stage</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XClose size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stage Name *</label>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }} autoFocus
              placeholder="e.g. Technical Review"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Assignee *</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select assignee...</option>
              {DEMO_USERS.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ── Edit Stage Modal ── */
function EditStageModal({ stage, onClose, onSave }) {
  const [name, setName] = useState(stage.stage_name || '')
  const [assigneeId, setAssigneeId] = useState(stage.assignee_id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Stage name is required'); return }
    if (!assigneeId) { setError('Select a default assignee'); return }
    setLoading(true)
    setError('')
    try {
      await onSave({ stage_name: name.trim(), assignee_id: assigneeId })
    } catch (err) {
      setError(err.message || 'Failed to update stage')
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Edit Stage</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XClose size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stage Name *</label>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }} autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Assignee *</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select assignee...</option>
              {DEMO_USERS.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ── Confirm Delete Stage Modal ── */
function ConfirmDeleteStageModal({ stage, checkUsage, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    checkUsage(stage.stage_code).then(u => { setUsage(u); setLoading(false) })
  }, [stage.stage_code, checkUsage])

  const blocked = usage && usage.total > 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Delete Stage</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XClose size={18} />
          </button>
        </div>
        {loading ? (
          <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ) : blocked ? (
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-rose-700 mb-1">Cannot delete "{stage.stage_name}"</p>
              <p className="text-xs text-rose-600">
                {usage.docCount} document(s) and {usage.wikiCount} wiki page(s) are currently in this stage.
                Move or process them before deleting.
              </p>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
                OK
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-1">Delete <strong>"{stage.stage_name}"</strong>?</p>
            <p className="text-xs text-slate-400 mb-5">This review stage will be permanently removed from the pipeline.</p>
            <div className="flex justify-end gap-3">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={async () => { setBusy(true); await onConfirm(); setBusy(false) }} disabled={busy}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-60">
                {busy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ── Confirm Action Modal (reusable) ── */
function ConfirmActionModal({ title, message, confirmLabel, confirmColor = 'rose', onClose, onConfirm }) {
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
