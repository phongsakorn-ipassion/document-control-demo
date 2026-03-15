import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { useWiki } from '../hooks/useWiki'
import { useToast } from '../components/Toast'
import Badge from '../components/Badge'
import { Plus, EditPen, SaveDisk, XClose, Share, CheckOk, LinkChain, Globe } from '../lib/icons'

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     badge: 'slate',   dot: 'bg-slate-400' },
  edit:      { label: 'Edit',      badge: 'amber',   dot: 'bg-amber-400' },
  published: { label: 'Published', badge: 'emerald', dot: 'bg-emerald-400' },
  trash:     { label: 'Trash',     badge: 'rose',    dot: 'bg-rose-400' },
}

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'draft',     label: 'Draft' },
  { key: 'edit',      label: 'Edit' },
  { key: 'published', label: 'Published' },
  { key: 'trash',     label: 'Trash' },
]

const FORMAT_BUTTONS = [
  'Bold', 'Italic', 'H1', 'H2', 'H3', '• List', '1. List', 'Quote', 'Image', 'Link', 'Divider', 'Table', 'Code',
]

/* ─── Confirm Modals ─────────────────────────────── */

function PublishModal({ page, onConfirm, onClose }) {
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Publishing...' : 'Publish'}
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60">
            {busy ? 'Unpublishing...' : 'Unpublish'}
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
            {busy ? 'Cancelling...' : 'Move to Trash'}
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
            {busy ? 'Restoring...' : 'Put Back'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function WikiShareModal({ page, siteId, currentUser, onClose }) {
  const showToast = useToast()
  const [tokenRow, setTokenRow] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: existing } = await supabase
        .from('wiki_share_tokens')
        .select('*')
        .eq('page_id', page.id)
        .limit(1)
        .single()

      if (existing) {
        setTokenRow(existing)
        setLoading(false)
      } else {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        const { data: row } = await supabase
          .from('wiki_share_tokens')
          .insert({ page_id: page.id, token, created_by: currentUser?.id })
          .select()
          .single()
        if (row) {
          setTokenRow(row)
          await supabase.from('activities').insert({
            site_id: siteId,
            actor_id: currentUser?.id,
            action: 'shared wiki page',
            target: page.title,
          })
        }
        setLoading(false)
      }
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
      site_id: siteId,
      actor_id: currentUser?.id,
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

        {/* Page info */}
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
            {/* Link display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 mb-3">
              <LinkChain size={14} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs font-mono text-slate-600 truncate flex-1">{shareUrl}</p>
              <button onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0">
                Copy
              </button>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Public access</p>
                <p className="text-xs text-slate-400">
                  {tokenRow.active
                    ? 'Anyone with this link can view the article'
                    : 'Link is disabled — visitors will see an error'}
                </p>
              </div>
              <button onClick={handleToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${tokenRow.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tokenRow.active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Status message */}
            <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs ${tokenRow.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CheckOk size={14} />
              <span>{tokenRow.active ? 'Public access is enabled' : 'Public access is disabled'}</span>
            </div>
          </>
        ) : null}

        <div className="flex justify-end mt-5">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Main Wiki Screen ───────────────────────────── */

export default function Wiki() {
  const { siteId } = useParams()
  const activePageId = useAppStore(s => s.activePageId)
  const setActivePageId = useAppStore(s => s.setActivePageId)
  const setScreen = useAppStore(s => s.setScreen)
  const currentUser = useAppStore(s => s.currentUser)
  const showToast = useToast()

  const { data: pages, loading, error, create, update, remove, publish, unpublish, cancel, putBack } = useWiki(siteId)

  const [filter, setFilter] = useState('all')
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  // Modals
  const [showPublish, setShowPublish] = useState(false)
  const [showUnpublish, setShowUnpublish] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showPutBack, setShowPutBack] = useState(false)
  const [showShare, setShowShare] = useState(false)

  useEffect(() => { setScreen('wiki') }, [setScreen])

  // Auto-select first page
  useEffect(() => {
    if (pages.length > 0 && !activePageId) {
      setActivePageId(pages[0].id)
    }
  }, [pages, activePageId, setActivePageId])

  const activePage = pages.find(p => p.id === activePageId)

  const filteredPages = filter === 'all'
    ? pages
    : pages.filter(p => (p.status || 'draft') === filter)

  // Enter edit mode
  const enterEdit = useCallback(() => {
    if (!activePage) return
    setEditTitle(activePage.title || '')
    setEditContent(activePage.content || '')
    setEditMode(true)
    // Update status to 'edit' if currently 'draft'
    if ((activePage.status || 'draft') === 'draft') {
      update(activePage.id, { status: 'edit' })
    }
  }, [activePage, update])

  const handleSaveDraft = async () => {
    if (!activePage) return
    await update(activePage.id, { title: editTitle, content: editContent })
    showToast('Draft saved')
  }

  const handleCreate = async () => {
    const { data: row } = await create({
      site_id: siteId,
      title: 'New Page',
      content: '',
      status: 'draft',
      owner_id: currentUser?.id,
    })
    if (row) {
      setActivePageId(row.id)
      setEditTitle('New Page')
      setEditContent('')
      setEditMode(true)
    }
  }

  const handlePublish = async () => {
    if (!activePage) return
    // Save content first
    await update(activePage.id, { title: editTitle || activePage.title, content: editContent || activePage.content })
    await publish(activePage.id, editTitle || activePage.title)
    setEditMode(false)
    setShowPublish(false)
    showToast('Page published!')
  }

  const handleUnpublish = async () => {
    if (!activePage) return
    await unpublish(activePage.id, activePage.title)
    setShowUnpublish(false)
    showToast('Page unpublished')
  }

  const handleCancel = async (reason) => {
    if (!activePage) return
    await cancel(activePage.id, activePage.title, reason)
    setEditMode(false)
    setShowCancel(false)
    showToast('Page moved to Trash')
  }

  const handlePutBack = async () => {
    if (!activePage) return
    await putBack(activePage.id, activePage.title)
    setShowPutBack(false)
    showToast('Page restored to Draft')
  }

  const handleDelete = async (pageId) => {
    await remove(pageId)
    if (activePageId === pageId) {
      const remaining = pages.filter(p => p.id !== pageId)
      setActivePageId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const handleFormatBtn = (btn) => {
    // Demo: apply basic formatting tags
    const tagMap = {
      'Bold': ['<strong>', '</strong>'],
      'Italic': ['<em>', '</em>'],
      'H1': ['<h1>', '</h1>'],
      'H2': ['<h2>', '</h2>'],
      'H3': ['<h3>', '</h3>'],
      '• List': ['<ul><li>', '</li></ul>'],
      '1. List': ['<ol><li>', '</li></ol>'],
      'Quote': ['<blockquote>', '</blockquote>'],
      'Image': ['<img src="', '" alt="image" />'],
      'Link': ['<a href="', '">link</a>'],
      'Divider': ['<hr/>', ''],
      'Table': ['<table><tr><td>', '</td></tr></table>'],
      'Code': ['<code>', '</code>'],
    }
    const tags = tagMap[btn]
    if (tags) {
      setEditContent(prev => prev + tags[0] + tags[1])
    }
    showToast(`${btn} inserted`)
  }

  const pageStatus = activePage ? (activePage.status || 'draft') : null

  return (
    <div className="flex h-full">
      {/* ─── Pane 1: Page List ─── */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">PAGES</p>
          <button onClick={handleCreate}
            className="text-indigo-600 hover:bg-slate-100 rounded p-1 transition">
            <Plus size={14} />
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap bg-slate-50 rounded-lg p-0.5 mb-3">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-1 px-1 py-1 rounded-md text-[9px] font-medium transition ${
                filter === f.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : filteredPages.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No pages</p>
        ) : (
          <div className="space-y-0.5">
            {filteredPages.map(page => {
              const status = page.status || 'draft'
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
              return (
                <div key={page.id} className="group flex items-center">
                  <button onClick={() => { setActivePageId(page.id); setEditMode(false) }}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 min-w-0 ${
                      activePageId === page.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className="truncate">{page.title}</span>
                  </button>
                  {status === 'trash' && (
                    <button onClick={() => handleDelete(page.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 transition">
                      <XClose size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Pane 2: Content Area ─── */}
      <div className="flex-1 bg-white p-8 overflow-y-auto">
        {!activePage ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            Select a page to view or create a new one
          </div>
        ) : editMode ? (
          /* ─── Edit Mode ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="text-xl font-bold text-slate-900 bg-transparent border-b-2 border-indigo-300 focus:border-indigo-500 focus:outline-none px-1 py-1 flex-1 mr-4"
                placeholder="Page title..."
              />
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleSaveDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition">
                  <SaveDisk size={14} /> Save Draft
                </button>
                <button onClick={() => setShowPublish(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition">
                  <Globe size={14} /> Publish
                </button>
                <button onClick={() => setShowCancel(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
                  Cancel
                </button>
              </div>
            </div>

            {/* CKEditor-style Toolbar */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-wrap gap-1 mb-3">
              {FORMAT_BUTTONS.map(btn => (
                <button key={btn} onClick={() => handleFormatBtn(btn)}
                  className="text-[10px] font-bold text-slate-600 px-2 py-1 rounded hover:bg-white hover:shadow-sm transition">
                  {btn}
                </button>
              ))}
            </div>

            {/* Content Editor */}
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-[calc(100vh-320px)] min-h-[300px] p-4 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none font-mono"
              placeholder="Write your article content here... You can use HTML tags for formatting."
            />
          </div>
        ) : pageStatus === 'published' ? (
          /* ─── Published View ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{activePage.title}</h1>
                <Badge label="Published" color="emerald" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowShare(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition">
                  <Share size={14} /> Share
                </button>
                <button onClick={() => setShowUnpublish(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition">
                  Unpublish
                </button>
              </div>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: activePage.content }}
              className="text-sm text-slate-700 leading-relaxed prose max-w-none"
            />
          </div>
        ) : pageStatus === 'trash' ? (
          /* ─── Trash View ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-400">{activePage.title}</h1>
                <Badge label="Trash" color="rose" />
              </div>
              <button onClick={() => setShowPutBack(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition">
                Put Back
              </button>
            </div>
            <div className="opacity-50">
              <div
                dangerouslySetInnerHTML={{ __html: activePage.content }}
                className="text-sm text-slate-700 leading-relaxed prose max-w-none"
              />
              {!activePage.content && (
                <p className="text-slate-400 text-sm">This page has no content.</p>
              )}
            </div>
          </div>
        ) : (
          /* ─── Draft / Edit Status View (not in editor) ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{activePage.title}</h1>
                <Badge label={STATUS_CONFIG[pageStatus]?.label || 'Draft'} color={STATUS_CONFIG[pageStatus]?.badge || 'slate'} />
              </div>
              <div className="flex gap-2">
                <button onClick={enterEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
                  <EditPen size={14} /> Edit
                </button>
                <button onClick={() => setShowCancel(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
                  Cancel
                </button>
              </div>
            </div>
            {activePage.content ? (
              <div
                dangerouslySetInnerHTML={{ __html: activePage.content }}
                className="text-sm text-slate-700 leading-relaxed prose max-w-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <EditPen size={36} className="text-slate-200 mb-3" />
                <p className="text-sm text-slate-500 font-medium">No content yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Edit" to start writing your article</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      {showPublish && activePage && (
        <PublishModal page={{ ...activePage, title: editTitle || activePage.title }} onConfirm={handlePublish} onClose={() => setShowPublish(false)} />
      )}
      {showUnpublish && activePage && (
        <UnpublishModal page={activePage} onConfirm={handleUnpublish} onClose={() => setShowUnpublish(false)} />
      )}
      {showCancel && activePage && (
        <CancelPageModal page={activePage} onConfirm={handleCancel} onClose={() => setShowCancel(false)} />
      )}
      {showPutBack && activePage && (
        <PutBackModal page={activePage} onConfirm={handlePutBack} onClose={() => setShowPutBack(false)} />
      )}
      {showShare && activePage && (
        <WikiShareModal page={activePage} siteId={siteId} currentUser={currentUser} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
