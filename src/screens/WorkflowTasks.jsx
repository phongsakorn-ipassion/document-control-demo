import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { ID_NAME_MAP, ROLES, DEMO_USERS } from '../lib/roles'
import { supabase } from '../lib/supabase'
import { useTasks } from '../hooks/useTasks'
import { useActivities } from '../hooks/useActivities'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import FileChip from '../components/FileChip'
import { CheckOk, XClose, Share, LinkChain, Eye, Download } from '../lib/icons'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const STAGE_LABELS = { '01': 'Draft', '02': 'In Review', '03': 'Final Review', '04': 'Published', '00': 'Trash' }

const COLUMNS = [
  { id: '01', label: 'Draft', border: 'border-slate-300', bg: 'bg-slate-50', head: 'text-slate-700' },
  { id: '02', label: 'In Review', border: 'border-amber-300', bg: 'bg-amber-50', head: 'text-amber-700' },
  { id: '03', label: 'Final Review', border: 'border-blue-300', bg: 'bg-blue-50', head: 'text-blue-700' },
  { id: '04', label: 'Published', border: 'border-emerald-300', bg: 'bg-emerald-50', head: 'text-emerald-700' },
]

/* ═══════════════════════════════════════
   Confirm Modals (same pattern as DocumentLibrary)
   ═══════════════════════════════════════ */

function SubmitModal({ doc, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(doc); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Submit for Review</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Are you sure you want to submit <strong>{doc.name}</strong> for review?</p>
        <p className="text-xs text-slate-400 mb-5">This will move the document to In Review.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition">
            {busy ? 'Submitting…' : '✓ Submit'}
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

function CancelDocModal({ doc, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(doc, reason); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Cancel Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-3">Cancelling <strong>{doc.name}</strong> will move it to Trash.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason *"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300 mb-4 resize-none" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Back</button>
          <button onClick={handle} disabled={!reason.trim() || busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition">
            {busy ? 'Cancelling…' : '✗ Cancel Document'}
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

function ApproveModal({ doc, nextLabel, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Approve Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Are you sure you want to approve <strong>{doc.name}</strong>?</p>
        <p className="text-xs text-slate-400 mb-5">This will move the document to {nextLabel}.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition">
            {busy ? 'Approving…' : '✓ Approve'}
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

function RejectModal({ doc, prevLabel, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(reason); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Reject Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-3">Rejecting <strong>{doc.name}</strong> will move it back to {prevLabel}.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for Rejection *"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300 mb-4 resize-none" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handle} disabled={!reason.trim() || busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition">
            {busy ? 'Rejecting…' : '✗ Reject'}
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

/* ───── Share Modal (reused from DocumentLibrary pattern) ───── */
function TaskShareModal({ doc, siteId, currentUser, onClose }) {
  const [tokenRow, setTokenRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [copied, setCopied] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    const init = async () => {
      const { data: existing } = await supabase
        .from('share_tokens')
        .select('id, token, active')
        .eq('document_id', doc.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        setTokenRow(existing)
        setLoading(false)
        return
      }

      const t = crypto.randomUUID().replace(/-/g, '').substring(0, 12)
      const { data: inserted } = await supabase
        .from('share_tokens')
        .insert({ document_id: doc.id, token: t, created_by: currentUser.id, active: true })
        .select('id, token, active')
        .single()
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'shared', target: doc.name })
      setTokenRow(inserted ?? { id: null, token: t, active: true })
      setLoading(false)
    }
    init()
  }, [])

  const toggleActive = async () => {
    if (!tokenRow?.id) return
    setToggling(true)
    const newActive = !tokenRow.active
    await supabase.from('share_tokens').update({ active: newActive }).eq('id', tokenRow.id)
    await supabase.from('activities').insert({
      site_id: siteId, actor_id: currentUser.id,
      action: newActive ? 'enabled share link' : 'disabled share link',
      target: doc.name,
    })
    setTokenRow(prev => ({ ...prev, active: newActive }))
    showToast(newActive ? 'Share link enabled' : 'Share link disabled')
    setToggling(false)
  }

  const shareUrl = tokenRow ? `${window.location.origin}${window.location.pathname}#/share/${tokenRow.token}` : ''
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    showToast('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Share Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 mb-5">
          <FileChip type={doc.type} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
            <p className="text-xs text-slate-500">Final-Approved · {doc.size_label}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><div className="h-8 w-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Public Link (no login required)</label>
              <div className={`border rounded-xl p-3 flex items-center gap-2 ${tokenRow.active ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200 opacity-60'}`}>
                <LinkChain size={14} className={`flex-shrink-0 ${tokenRow.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`font-mono text-xs flex-1 truncate ${tokenRow.active ? 'text-indigo-600' : 'text-slate-400 line-through'}`}>{shareUrl}</span>
                <button onClick={copyLink} disabled={!tokenRow.active}
                  className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1 rounded-lg hover:bg-slate-50 transition flex-shrink-0 disabled:opacity-40">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className={`border rounded-xl p-3 flex items-center gap-3 mb-4 ${tokenRow.active ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <button onClick={toggleActive} disabled={toggling}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${tokenRow.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${tokenRow.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <div className="flex-1">
                <p className={`text-xs font-semibold ${tokenRow.active ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {tokenRow.active ? 'Active' : 'Disabled'}
                </p>
                <p className="text-xs text-slate-500">
                  {tokenRow.active
                    ? 'Public access is enabled — anyone with this link can view'
                    : 'Link is disabled — visitors will see "expired" message'}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Close</button>
        </div>
      </div>
    </div>, document.body
  )
}

/* ───── Document Activity Panel (for Preview Drawer) ───── */
function TaskDocActivityPanel({ docName, siteId }) {
  const activities = useActivities(siteId, { filterTarget: docName })
  const sentinel = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore })

  if (activities.loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}</div>
  }
  if (activities.data.length === 0) {
    return <p className="text-xs text-slate-400 py-2">No activity yet for this document.</p>
  }

  return (
    <div className="max-h-[200px] overflow-y-auto space-y-2">
      {activities.data.map((a, i) => {
        const name = ID_NAME_MAP[a.actor_id] || 'Unknown'
        return (
          <div key={a.id || i} className="flex items-start gap-2">
            <Avatar name={name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700 leading-tight"><span className="font-medium">{name}</span>{' '}{a.action}</p>
              <span className="text-[10px] text-slate-400">{timeAgo(a.created_at)}</span>
            </div>
          </div>
        )
      })}
      {activities.hasMore && <div ref={sentinel} className="h-4" />}
      {activities.loadingMore && <div className="h-6 bg-slate-100 rounded animate-pulse" />}
      {!activities.hasMore && activities.data.length > 0 && <p className="text-[10px] text-slate-300 text-center">No more activity</p>}
    </div>
  )
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export default function WorkflowTasks() {
  const { siteId } = useParams()
  const currentUser = useAppStore(s => s.currentUser)
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const { data: tasks, docs, loading, error, approve, reject, submit, cancel, refetch } = useTasks(siteId)

  useEffect(() => { setScreen('tasks') }, [setScreen])

  // Modal states
  const [submitDoc, setSubmitDoc] = useState(null)
  const [cancelDoc, setCancelDoc] = useState(null)
  const [approveTask, setApproveTask] = useState(null)   // { task, docName, nextLabel }
  const [rejectTask, setRejectTask] = useState(null)    // { task, docName, prevLabel }
  const [shareDoc, setShareDoc] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [shareTokenCache, setShareTokenCache] = useState({})  // docId → boolean (has share token)
  const [publishedFilter, setPublishedFilter] = useState('all')  // 'all' | 'shared' | 'not_shared'

  const userRole = currentUser ? ROLES[currentUser.email] : null

  // Check which published docs already have share tokens
  useEffect(() => {
    const pubDocs = docs.filter(d => d.folder === '04')
    if (pubDocs.length === 0) return
    const checkTokens = async () => {
      const { data: tokens } = await supabase
        .from('share_tokens')
        .select('document_id, active')
        .in('document_id', pubDocs.map(d => d.id))
      const cache = {}
      ;(tokens || []).forEach(t => { cache[t.document_id] = t.active !== false })
      setShareTokenCache(cache)
    }
    checkTokens()
  }, [docs])

  const canApproveDoc = () => {
    if (!userRole) return false
    if (userRole.canApproveFolder === null) return true  // Admin
    return false
  }

  const canApproveTask = (task) => {
    if (!userRole) return false
    if (userRole.canApproveFolder === null) return true  // Admin
    return task.assignee_id === currentUser.id && task.folder === userRole.canApproveFolder
  }

  /* ── Action handlers ── */
  const handleSubmit = async (doc) => {
    await submit(doc.id, doc.name)
    setSubmitDoc(null)
    showToast('Document submitted — moved to In Review')
  }

  const handleCancel = async (doc, reason) => {
    await cancel(doc.id, doc.name, reason)
    setCancelDoc(null)
    showToast('Document cancelled — moved to Trash')
  }

  const handleApprove = async () => {
    if (!approveTask) return
    await approve(approveTask.task.id, approveTask.task.document_id)
    setApproveTask(null)
    showToast('Approved — document moved to next stage')
  }

  const handleReject = async (reason) => {
    if (!rejectTask) return
    await reject(rejectTask.task.id, rejectTask.task.document_id, reason)
    setRejectTask(null)
    showToast('Rejected — document returned to previous stage')
  }

  const handlePreview = (doc) => {
    if (doc?.file_path) {
      const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path)
      if (data?.publicUrl) { window.open(data.publicUrl, '_blank'); return }
    }
    showToast('No file attached to preview')
  }

  const handleDownload = (doc) => {
    if (doc?.file_path) {
      const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path)
      if (data?.publicUrl) {
        const link = document.createElement('a')
        link.href = data.publicUrl
        link.download = doc.name
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('Downloading: ' + doc.name)
        return
      }
    }
    showToast('No file attached to download')
  }

  // Helper: get the document object from a card item
  const getDocFromItem = (item) => {
    if (item.type === 'doc') return item.doc
    if (item.type === 'task') return item.task?.document || null
    return null
  }

  // Role context banner
  const roleBanner = userRole ? {
    Admin: { bg: 'bg-indigo-50 border-indigo-200', badge: 'Admin View', color: 'indigo', text: 'Full access — you can manage any document or task' },
    Reviewer: { bg: 'bg-amber-50 border-amber-200', badge: 'Reviewer', color: 'amber', text: 'Round 1 approvals — your tasks are in the 02 · In Review column' },
    Approver: { bg: 'bg-emerald-50 border-emerald-200', badge: 'Approver', color: 'emerald', text: 'Round 2 approvals — your tasks are in the 03 · Final Review column' },
  }[userRole.role] : null

  /* ── Build column data ── */
  const getColumnItems = (colId) => {
    if (colId === '01') return docs.filter(d => d.folder === '01').map(d => ({ type: 'doc', doc: d }))
    if (colId === '04') {
      return docs.filter(d => d.folder === '04').filter(d => {
        if (publishedFilter === 'all') return true
        const isShared = shareTokenCache[d.id] === true
        return publishedFilter === 'shared' ? isShared : !isShared
      }).map(d => ({ type: 'doc', doc: d }))
    }
    return tasks.filter(t => t.folder === colId).map(t => ({ type: 'task', task: t }))
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-slide-in">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const totalItems = COLUMNS.reduce((acc, col) => acc + getColumnItems(col.id).length, 0)

  return (
    <div className="flex h-full animate-slide-in">
      {/* Main content area */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Workflow Board</h1>
            <p className="text-xs text-slate-400">{totalItems} item(s) · viewing as {currentUser?.name}</p>
          </div>
          <div className="bg-slate-100 text-slate-400 rounded-lg px-3 py-1.5 text-xs">
            Switch demo user (top-right) to change role perspective
          </div>
        </div>

        {/* Role Banner */}
        {roleBanner && (
          <div className={`${roleBanner.bg} border rounded-xl flex items-center gap-3 px-4 py-3`}>
            <Badge label={roleBanner.badge} color={roleBanner.color} />
            <span className="text-sm text-slate-700">{roleBanner.text}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm">{error.message}</div>
        )}

        {/* All tasks completed */}
        {totalItems === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <CheckOk size={40} className="text-emerald-200" />
            <p className="text-sm text-slate-400 font-semibold mt-3">All tasks completed!</p>
          </div>
        )}

        {/* Kanban Grid */}
        {totalItems > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const items = getColumnItems(col.id)
              return (
                <div key={col.id} className={`border-2 ${col.border} ${col.bg} rounded-2xl p-3 min-h-[200px] flex flex-col`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-semibold ${col.head}`}>{col.id} · {col.label}</h3>
                    <div className="flex items-center gap-1.5">
                      {col.id === '04' && (
                        <select value={publishedFilter} onChange={e => setPublishedFilter(e.target.value)}
                          className="bg-white/80 border border-emerald-200 rounded-lg px-1.5 py-0.5 text-[10px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer">
                          <option value="all">All</option>
                          <option value="shared">Shared</option>
                          <option value="not_shared">Not Shared</option>
                        </select>
                      )}
                      {items.length > 0 && (
                        <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">{items.length}</span>
                      )}
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center h-20 opacity-30 text-xs text-center">
                      {col.id === '01' ? 'No drafts' : col.id === '04' ? 'No published docs' : 'No tasks'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
                      {items.map(item => {
                        const itemDoc = getDocFromItem(item)
                        const isSelected = previewDoc && itemDoc && previewDoc.id === itemDoc.id
                        const cardClick = () => {
                          if (itemDoc) setPreviewDoc(isSelected ? null : itemDoc)
                        }

                        /* ── Column 01: Draft documents ── */
                        if (col.id === '01' && item.type === 'doc') {
                          const d = item.doc
                          const ownerName = ID_NAME_MAP[d.owner_id] || 'Unknown'
                          const canAct = canApproveDoc()
                          return (
                            <div key={d.id} onClick={cardClick}
                              className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-400 border-indigo-400' : canAct ? 'border-indigo-300 hover:shadow-md' : 'border-slate-200 hover:shadow-md'}`}>
                              <p className="text-xs font-bold text-slate-900 mb-2">{d.name}</p>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar name={ownerName} size="sm" />
                                <span className="text-xs text-slate-500">{ownerName.split(' ')[0]}</span>
                              </div>
                              {canAct && (
                                <>
                                  <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Admin access
                                  </p>
                                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => setSubmitDoc(d)}
                                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition">
                                      <CheckOk size={12} /> Submit
                                    </button>
                                    <button onClick={() => setCancelDoc(d)}
                                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition">
                                      <XClose size={12} /> Cancel
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        }

                        /* ── Columns 02 & 03: Tasks with Approve/Reject ── */
                        if ((col.id === '02' || col.id === '03') && item.type === 'task') {
                          const task = item.task
                          const assigneeName = ID_NAME_MAP[task.assignee_id] || 'Unknown'
                          const canAct = canApproveTask(task)
                          const isAssigned = task.assignee_id === currentUser?.id
                          const docName = task.document?.name || 'document'
                          const nextLabel = col.id === '02' ? 'Final Review' : 'Published'
                          const prevLabel = col.id === '03' ? 'In Review' : 'Draft'

                          return (
                            <div key={task.id} onClick={cardClick}
                              className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-400 border-indigo-400' : canAct ? 'border-indigo-300 hover:shadow-md' : 'border-slate-200 hover:shadow-md'}`}>
                              <p className="text-xs font-bold text-slate-900 mb-2">{docName}</p>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar name={assigneeName} size="sm" />
                                <span className="text-xs text-slate-500">{assigneeName.split(' ')[0]}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge label={task.priority} color={task.priority === 'High' ? 'rose' : task.priority === 'Medium' ? 'amber' : 'slate'} />
                                <span className="text-xs text-slate-400">{task.due_date}</span>
                              </div>

                              {canAct && (
                                <>
                                  <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    {isAssigned ? 'Assigned to you' : 'Admin access'}
                                  </p>
                                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => setApproveTask({ task, docName, nextLabel })}
                                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition">
                                      <CheckOk size={12} /> Approve
                                    </button>
                                    <button onClick={() => setRejectTask({ task, docName, prevLabel })}
                                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition">
                                      <XClose size={12} /> Reject
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        }

                        /* ── Column 04: Published documents with Share ── */
                        if (col.id === '04' && item.type === 'doc') {
                          const d = item.doc
                          const ownerName = ID_NAME_MAP[d.owner_id] || 'Unknown'
                          const hasToken = shareTokenCache[d.id] === true

                          return (
                            <div key={d.id} onClick={cardClick}
                              className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-400 border-indigo-400' : 'border-slate-200 hover:shadow-md'}`}>
                              <p className="text-xs font-bold text-slate-900 mb-2">{d.name}</p>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar name={ownerName} size="sm" />
                                <span className="text-xs text-slate-500">{ownerName.split(' ')[0]}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge label="Final-Approved" color="emerald" />
                              </div>
                              <div onClick={e => e.stopPropagation()}>
                                {hasToken ? (
                                  <button onClick={() => setShareDoc(d)}
                                    className="w-full flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                                    <CheckOk size={12} /> Shared
                                  </button>
                                ) : (
                                  <button onClick={() => setShareDoc(d)}
                                    className="w-full flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition">
                                    <Share size={12} /> Share
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        }

                        return null
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pane: Preview Drawer ── */}
      {previewDoc && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
            <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600"><XClose size={16} /></button>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <FileChip type={previewDoc.type} />
            <p className="text-sm font-semibold text-slate-900 mt-3">{previewDoc.name}</p>
            {previewDoc.status && <Badge label={previewDoc.status} color="emerald" />}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Owner</span>
              <span className="text-slate-700">{ID_NAME_MAP[previewDoc.owner_id] || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Size</span>
              <span className="text-slate-700">{previewDoc.size_label || 'No file'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stage</span>
              <span className="text-slate-700">{STAGE_LABELS[previewDoc.folder] || previewDoc.folder}</span>
            </div>
            {previewDoc.comment && (
              <div>
                <span className="text-slate-400 block mb-1">Comment</span>
                <p className="text-slate-600 bg-slate-50 rounded-lg p-2 text-xs">{previewDoc.comment}</p>
              </div>
            )}
          </div>

          {/* Document Activity History */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 mb-3">Document Activity</h4>
            <TaskDocActivityPanel docName={previewDoc.name} siteId={siteId} />
          </div>

          {/* View + Download buttons */}
          <div className="mt-auto pt-4 flex gap-2">
            {previewDoc.file_path ? (
              <>
                <button onClick={() => handlePreview(previewDoc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
                  <Eye size={14} /> Preview
                </button>
                <button onClick={() => handleDownload(previewDoc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                  <Download size={14} /> Download
                </button>
              </>
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 text-center text-xs text-slate-400">
                No file attached
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {submitDoc && <SubmitModal doc={submitDoc} onConfirm={handleSubmit} onClose={() => setSubmitDoc(null)} />}
      {cancelDoc && <CancelDocModal doc={cancelDoc} onConfirm={handleCancel} onClose={() => setCancelDoc(null)} />}
      {approveTask && (
        <ApproveModal
          doc={{ name: approveTask.docName }}
          nextLabel={approveTask.nextLabel}
          onConfirm={handleApprove}
          onClose={() => setApproveTask(null)}
        />
      )}
      {rejectTask && (
        <RejectModal
          doc={{ name: rejectTask.docName }}
          prevLabel={rejectTask.prevLabel}
          onConfirm={handleReject}
          onClose={() => setRejectTask(null)}
        />
      )}
      {shareDoc && (
        <TaskShareModal doc={shareDoc} siteId={siteId} currentUser={currentUser} onClose={() => { setShareDoc(null); refetch() }} />
      )}
    </div>
  )
}
