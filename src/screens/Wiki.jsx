import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { ID_NAME_MAP, ROLES } from '../lib/roles'
import { useWiki } from '../hooks/useWiki'
import { useActivities } from '../hooks/useActivities'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Plus, EditPen, XClose, Share, CheckOk, LinkChain, Globe, WikiDoc, Send, RotateCcw, EyeOff, SaveDisk } from '../lib/icons'

/* ─── Stage Definitions (mirrors Documents) ─── */
const PAGE_STAGES = [
  { id: '01', label: 'Draft',     dot: 'bg-slate-400' },
  { id: '02', label: 'Published', dot: 'bg-emerald-400' },
]
const OTHER_STAGES = [
  { id: '00', label: 'Trash',     dot: 'bg-rose-400' },
]
const ALL_STAGES = [...PAGE_STAGES, ...OTHER_STAGES]

const BADGE_MAP = {
  '00': 'rose',
  '01': 'slate',
  '02': 'emerald',
}

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

/* ─── CKEditor config ─── */
const EDITOR_CONFIG = {
  toolbar: {
    items: [
      'heading', '|',
      'bold', 'italic', 'link', '|',
      'bulletedList', 'numberedList', '|',
      'outdent', 'indent', '|',
      'blockQuote', 'insertTable', 'mediaEmbed', '|',
      'undo', 'redo',
    ],
    shouldNotGroupWhenFull: true,
  },
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
    ],
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
  },
}

/* ─── Confirm Modals ─── */

function SubmitModal({ page, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Publish Page</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Publish <strong>"{page.title}"</strong> as a public article?</p>
        <p className="text-xs text-slate-400 mb-5">It will be available as a public web page that anyone can view.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Publishing...' : <><Globe size={12} /> Publish</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function UnpublishModal({ page, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Unpublish Page</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Unpublish <strong>"{page.title}"</strong>?</p>
        <p className="text-xs text-slate-400 mb-5">The public link will stop working. The page will move back to Draft.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60">
            {busy ? 'Unpublishing...' : <><EyeOff size={12} /> Unpublish</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function CancelPageModal({ page, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(reason); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Cancel Page</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-3">Cancel <strong>"{page.title}"</strong>? It will be moved to Trash.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for cancellation..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy || !reason.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
            {busy ? 'Cancelling...' : <><XClose size={12} /> Move to Trash</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PutBackModal({ page, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Restore Page</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Restore <strong>"{page.title}"</strong> from Trash?</p>
        <p className="text-xs text-slate-400 mb-5">The page will be moved back to Draft status.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
            {busy ? 'Restoring...' : <><RotateCcw size={12} /> Put Back</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function DeletePageModal({ page, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-rose-600">Delete Page</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Permanently delete <strong>"{page.title}"</strong>?</p>
        <p className="text-xs text-rose-500 mb-5">⚠ This action cannot be undone. The page and all its data will be removed.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
            {busy ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function WikiShareModal({ page, siteId, currentUser, onClose, onShareCreated }) {
  const showToast = useToast()
  const [tokenRow, setTokenRow] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: existing } = await supabase
        .from('wiki_share_tokens').select('*').eq('page_id', page.id).limit(1).single()
      if (existing) {
        setTokenRow(existing)
      } else {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        const { data: row } = await supabase
          .from('wiki_share_tokens')
          .insert({ page_id: page.id, token, created_by: currentUser?.id })
          .select().single()
        if (row) {
          setTokenRow(row)
          onShareCreated?.(page.id)
          await supabase.from('activities').insert({
            site_id: siteId, actor_id: currentUser?.id,
            action: 'shared wiki page', target: page.title,
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [page.id, currentUser?.id, siteId, page.title])

  const shareUrl = tokenRow ? `${window.location.origin}${window.location.pathname}#/wiki/${tokenRow.token}` : ''

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); showToast('Link copied!') }
    catch { showToast('Link copied!') }
  }

  const handleToggle = async () => {
    if (!tokenRow) return
    const newActive = !tokenRow.active
    await supabase.from('wiki_share_tokens').update({ active: newActive }).eq('id', tokenRow.id)
    setTokenRow({ ...tokenRow, active: newActive })
    await supabase.from('activities').insert({
      site_id: siteId, actor_id: currentUser?.id,
      action: newActive ? 'enabled wiki share link' : 'disabled wiki share link',
      target: page.title,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">Share Article</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center">
            <Globe size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{page.title}</p>
            <p className="text-xs text-emerald-600">Published Article</p>
          </div>
        </div>
        {loading ? (
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ) : tokenRow ? (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 mb-3">
              <LinkChain size={14} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs font-mono text-slate-600 truncate flex-1">{shareUrl}</p>
              <button onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0">Copy</button>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Public access</p>
                <p className="text-xs text-slate-400">{tokenRow.active ? 'Anyone with this link can view' : 'Link is disabled'}</p>
              </div>
              <button onClick={handleToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${tokenRow.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tokenRow.active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs ${tokenRow.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CheckOk size={14} />
              <span>{tokenRow.active ? 'Public access is enabled' : 'Public access is disabled'}</span>
            </div>
          </>
        ) : null}
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Main Wiki Screen ─── */

export default function Wiki() {
  const { siteId } = useParams()
  const setScreen = useAppStore(s => s.setScreen)
  const currentUser = useAppStore(s => s.currentUser)
  const showToast = useToast()

  const { data: pages, loading, create, update, remove, publish, unpublish, cancel, putBack } = useWiki(siteId)

  // RBAC: Admin = full access, others = view + edit own pages only
  const userRole = currentUser?.email ? ROLES[currentUser.email] : null
  const isAdmin = userRole?.canApproveFolder === null
  const canEditPage = (page) => isAdmin || page?.owner_id === currentUser?.id

  const [selectedStage, setSelectedStage] = useState('01')
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [isNewPage, setIsNewPage] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  // Share status cache for Published pages
  const [shareStatusMap, setShareStatusMap] = useState({})
  const [shareRefreshTick, setShareRefreshTick] = useState(0)

  // Published share filter
  const [publishedFilter, setPublishedFilter] = useState('all')

  // Modals
  const [showSubmit, setShowSubmit] = useState(null)
  const [showUnpublish, setShowUnpublish] = useState(null)
  const [showCancel, setShowCancel] = useState(null)
  const [showPutBack, setShowPutBack] = useState(null)
  const [showShare, setShowShare] = useState(null)
  const [showDelete, setShowDelete] = useState(null)

  useEffect(() => { setScreen('wiki') }, [setScreen])

  // Fetch share status for published pages
  useEffect(() => {
    if (selectedStage !== '02') return
    const fetchShareStatus = async () => {
      const publishedIds = pages.filter(p => (p.status || '01') === '02').map(p => p.id)
      if (publishedIds.length === 0) { setShareStatusMap({}); return }
      const { data: tokens } = await supabase.from('wiki_share_tokens').select('page_id, active').in('page_id', publishedIds)
      const map = {}
      ;(tokens || []).forEach(t => { if (t.active) map[t.page_id] = true })
      setShareStatusMap(map)
    }
    fetchShareStatus()
  }, [selectedStage, pages, shareRefreshTick])

  const selectedPage = pages.find(p => p.id === selectedPageId)
  const stagePages = pages.filter(p => (p.status || '01') === selectedStage)
  const filteredPages = selectedStage === '02' && publishedFilter !== 'all'
    ? stagePages.filter(p => publishedFilter === 'shared' ? shareStatusMap[p.id] : !shareStatusMap[p.id])
    : stagePages

  // Activity for preview panel
  const activities = useActivities(siteId, { filterTarget: selectedPage?.title })
  const actSentinelRef = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore && !activities.loadingMore })

  const handleCreate = async () => {
    const { data: row } = await create({
      site_id: siteId,
      title: 'New Page',
      content: '',
      status: '01',
      owner_id: currentUser?.id,
    })
    if (row) {
      setSelectedPageId(row.id)
      setEditTitle('New Page')
      setEditContent('')
      setEditMode(true)
      setIsNewPage(true)
      setSelectedStage('01')
    }
  }

  const handleSave = async () => {
    if (!selectedPage) return
    await update(selectedPage.id, { title: editTitle, content: editContent })
    setEditMode(false)
    setIsNewPage(false)
    showToast('Draft saved')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const enterEdit = (page) => {
    setEditTitle(page.title || '')
    setEditContent(page.content || '')
    setEditMode(true)
    setIsNewPage(false)
  }

  const handlePublish = async () => {
    if (!showSubmit) return
    // Save content first if in edit mode
    if (editMode) {
      await update(showSubmit.id, { title: editTitle, content: editContent })
    }
    await publish(showSubmit.id, editTitle || showSubmit.title)
    setEditMode(false)
    setIsNewPage(false)
    setShowSubmit(null)
    setSelectedStage('02')
    showToast('Page published!')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleUnpublish = async () => {
    if (!showUnpublish) return
    await unpublish(showUnpublish.id, showUnpublish.title)
    setShowUnpublish(null)
    setSelectedStage('01')
    showToast('Page unpublished')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleCancel = async (reason) => {
    if (!showCancel) return
    await cancel(showCancel.id, showCancel.title, reason)
    setEditMode(false)
    setIsNewPage(false)
    setShowCancel(null)
    setSelectedStage('00')
    showToast('Page moved to Trash')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handlePutBack = async () => {
    if (!showPutBack) return
    await putBack(showPutBack.id, showPutBack.title)
    setShowPutBack(null)
    setSelectedStage('01')
    showToast('Page restored to Draft')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleDeleteConfirm = async () => {
    if (!showDelete) return
    await remove(showDelete.id)
    if (selectedPageId === showDelete.id) setSelectedPageId(null)
    setShowDelete(null)
    showToast('Page deleted permanently')
  }

  const stageLabel = ALL_STAGES.find(s => s.id === selectedStage)?.label || 'Draft'
  const pagesCount = pages.filter(p => ['01', '02'].includes(p.status || '01')).length
  const othersCount = pages.filter(p => (p.status || '01') === '00').length

  return (
    <div className="flex h-full">
      {/* ─── Pane 1: Stage Sidebar ─── */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3">
          PAGES <span className="ml-1 text-slate-300">({pagesCount})</span>
        </p>
        <div className="space-y-1">
          {PAGE_STAGES.map(s => {
            const count = pages.filter(p => (p.status || '01') === s.id).length
            const isActive = selectedStage === s.id
            return (
              <button key={s.id} onClick={() => { setSelectedStage(s.id); setEditMode(false); setSelectedPageId(null) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${s.dot} flex-shrink-0`} />
                <span className="flex-1 text-left">{s.id} · {s.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3 mt-5">
          OTHERS <span className="ml-1 text-slate-300">({othersCount})</span>
        </p>
        <div className="space-y-1">
          {OTHER_STAGES.map(s => {
            const count = pages.filter(p => (p.status || '01') === s.id).length
            const isActive = selectedStage === s.id
            return (
              <button key={s.id} onClick={() => { setSelectedStage(s.id); setEditMode(false); setSelectedPageId(null) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${s.dot} flex-shrink-0`} />
                <span className="flex-1 text-left">{s.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-xs text-slate-500">
          Pages flow Draft → Published. Cancel moves to Trash.
        </div>
      </div>

      {/* ─── Pane 2: Page List / Editor ─── */}
      <div className="flex-1 p-5 overflow-y-auto bg-slate-50">
        {editMode ? (
          /* ─── Editor View (CKEditor) ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="text-lg font-bold text-slate-900 bg-transparent border-b-2 border-indigo-300 focus:border-indigo-500 focus:outline-none px-1 py-1 flex-1 mr-4"
                placeholder="Page title..."
              />
              <div className="flex gap-2 flex-shrink-0">
                {isNewPage ? (
                  <button onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                    <SaveDisk size={12} /> Save Draft
                  </button>
                ) : (
                  <button onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                    <SaveDisk size={12} /> Save
                  </button>
                )}
                {!isNewPage && (
                  <button onClick={() => setShowSubmit(selectedPage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition">
                    <Send size={12} /> Submit
                  </button>
                )}
                <button onClick={() => {
                  if (selectedPage && !isNewPage) {
                    setShowCancel(selectedPage)
                  } else {
                    setEditMode(false)
                    setIsNewPage(false)
                  }
                }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition">
                  <XClose size={12} /> Cancel
                </button>
              </div>
            </div>

            {/* CKEditor 5 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <CKEditor
                editor={ClassicEditor}
                config={EDITOR_CONFIG}
                data={editContent}
                onChange={(_event, editor) => {
                  setEditContent(editor.getData())
                }}
              />
            </div>
          </div>
        ) : (
          /* ─── Page List View ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{stageLabel}</h2>
                <p className="text-xs text-slate-400">{filteredPages.length} page(s)</p>
              </div>
              {selectedStage === '01' && isAdmin && (
                <button onClick={handleCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                  <Plus size={14} /> New
                </button>
              )}
            </div>
            {selectedStage === '02' && (
              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 mb-4 w-fit ml-auto">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'shared', label: 'Shared' },
                  { key: 'not_shared', label: 'Not Shared' },
                ].map(f => (
                  <button key={f.key} onClick={() => setPublishedFilter(f.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      publishedFilter === f.key
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <WikiDoc size={36} className="text-slate-200 mb-3" />
                <p className="text-sm text-slate-500 font-medium">No pages in {stageLabel}</p>
                {selectedStage === '01' && (
                  <p className="text-xs text-slate-400 mt-1">Click "+ New" to create a page</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPages.map(page => {
                  const status = page.status || '01'
                  const isSelected = selectedPageId === page.id
                  const isPublished = status === '02'
                  const isTrash = status === '00'
                  const isDraft = status === '01'
                  return (
                    <div key={page.id}
                      onClick={() => setSelectedPageId(page.id)}
                      className={`bg-white border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-300 ring-1 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}>
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                        isPublished ? 'bg-emerald-50 border-emerald-200' :
                        isTrash ? 'bg-rose-50 border-rose-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        <WikiDoc size={16} className={
                          isPublished ? 'text-emerald-600' :
                          isTrash ? 'text-rose-400' :
                          'text-slate-400'
                        } />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold truncate ${isTrash ? 'text-slate-400' : 'text-slate-900'}`}>{page.title}</p>
                          <Badge label={ALL_STAGES.find(s => s.id === status)?.label || 'Draft'} color={BADGE_MAP[status] || 'slate'} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {page.owner_id ? ID_NAME_MAP[page.owner_id] || 'Unknown' : 'No owner'} · {timeAgo(page.created_at)}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {isDraft && canEditPage(page) && (
                          <>
                            <button onClick={() => enterEdit(page)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
                              <EditPen size={12} /> Edit
                            </button>
                            {isAdmin && (
                              <>
                                <button onClick={() => setShowSubmit(page)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                                  <Send size={12} /> Submit
                                </button>
                                <button onClick={() => setShowCancel(page)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
                                  <XClose size={12} /> Cancel
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {isPublished && (
                          <>
                            {isAdmin && (
                              shareStatusMap[page.id] ? (
                                <button onClick={() => setShowShare(page)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 transition">
                                  <CheckOk size={12} /> Shared
                                </button>
                              ) : (
                                <button onClick={() => setShowShare(page)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition">
                                  <Share size={12} /> Share
                                </button>
                              )
                            )}
                            {canEditPage(page) && (
                              <button onClick={() => enterEdit(page)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
                                <EditPen size={12} /> Edit
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => setShowUnpublish(page)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition">
                                <EyeOff size={12} /> Unpublish
                              </button>
                            )}
                          </>
                        )}
                        {isTrash && isAdmin && (
                          <>
                            <button onClick={() => setShowPutBack(page)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                              <RotateCcw size={12} /> Put Back
                            </button>
                            <button onClick={() => setShowDelete(page)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                              <XClose size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Pane 3: Preview/Detail Panel ─── */}
      {selectedPage && !editMode && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">Page Details</p>
            <button onClick={() => setSelectedPageId(null)} className="text-slate-400 hover:text-slate-600">
              <XClose size={14} />
            </button>
          </div>

          {/* Title + Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${
              (selectedPage.status || '01') === '02' ? 'bg-emerald-50 border-emerald-200' :
              (selectedPage.status || '01') === '00' ? 'bg-rose-50 border-rose-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              <WikiDoc size={16} className={
                (selectedPage.status || '01') === '02' ? 'text-emerald-600' :
                (selectedPage.status || '01') === '00' ? 'text-rose-400' :
                'text-slate-400'
              } />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{selectedPage.title}</p>
              <Badge label={ALL_STAGES.find(s => s.id === (selectedPage.status || '01'))?.label || 'Draft'}
                color={BADGE_MAP[selectedPage.status || '01'] || 'slate'} />
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2 text-xs mb-5">
            <div className="flex justify-between">
              <span className="text-slate-400">Owner</span>
              <span className="text-slate-700 font-medium">{selectedPage.owner_id ? ID_NAME_MAP[selectedPage.owner_id] || 'Unknown' : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stage</span>
              <span className="text-slate-700 font-medium">{(selectedPage.status || '01')} · {ALL_STAGES.find(s => s.id === (selectedPage.status || '01'))?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Created</span>
              <span className="text-slate-700 font-medium">{timeAgo(selectedPage.created_at)}</span>
            </div>
          </div>

          {/* Content Preview */}
          {selectedPage.content && (
            <div className="border-t border-slate-100 pt-4 mb-5">
              <p className="text-xs font-semibold text-slate-700 mb-2">Content Preview</p>
              <div className="max-h-[200px] overflow-y-auto text-xs text-slate-600 leading-relaxed prose prose-sm"
                dangerouslySetInnerHTML={{ __html: selectedPage.content }}
              />
            </div>
          )}

          {/* Page Activity */}
          <div className="border-t border-slate-100 pt-4 flex-1">
            <p className="text-xs font-semibold text-slate-700 mb-2">Page Activity</p>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {activities.data.length === 0 && !activities.loading ? (
                <p className="text-xs text-slate-400">No activity yet.</p>
              ) : (
                activities.data.map(a => (
                  <div key={a.id} className="flex items-start gap-2">
                    <Avatar name={ID_NAME_MAP[a.actor_id] || '?'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700">
                        <span className="font-medium">{ID_NAME_MAP[a.actor_id] || 'Unknown'}</span>{' '}
                        <span className="text-slate-500">{a.action}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={actSentinelRef} />
              {activities.loadingMore && <div className="h-6 bg-slate-100 rounded animate-pulse" />}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
      {showSubmit && <SubmitModal page={showSubmit} onConfirm={handlePublish} onClose={() => setShowSubmit(null)} />}
      {showUnpublish && <UnpublishModal page={showUnpublish} onConfirm={handleUnpublish} onClose={() => setShowUnpublish(null)} />}
      {showCancel && <CancelPageModal page={showCancel} onConfirm={handleCancel} onClose={() => setShowCancel(null)} />}
      {showPutBack && <PutBackModal page={showPutBack} onConfirm={handlePutBack} onClose={() => setShowPutBack(null)} />}
      {showDelete && <DeletePageModal page={showDelete} onConfirm={handleDeleteConfirm} onClose={() => setShowDelete(null)} />}
      {showShare && <WikiShareModal page={showShare} siteId={siteId} currentUser={currentUser}
        onShareCreated={(pageId) => setShareStatusMap(prev => ({ ...prev, [pageId]: true }))}
        onClose={() => { setShowShare(null); setShareRefreshTick(t => t + 1); activities.refetch?.() }} />}
    </div>
  )
}
