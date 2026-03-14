import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { ID_NAME_MAP, DEMO_USERS, ROLES } from '../lib/roles'
import { useDocuments } from '../hooks/useDocuments'
import { useActivities } from '../hooks/useActivities'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import FileChip from '../components/FileChip'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Folder, Upload, Plus, Eye, Download, XClose, ChevronRight, CheckOk, Share, LinkChain } from '../lib/icons'

const FOLDERS = [
  { id: '01', label: 'Draft',        dot: 'bg-slate-400' },
  { id: '02', label: 'In Review',    dot: 'bg-amber-400' },
  { id: '03', label: 'Final Review', dot: 'bg-blue-400' },
  { id: '04', label: 'Published',    dot: 'bg-emerald-400' },
]

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'DOC' },
  { value: 'img', label: 'IMG' },
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function detectType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'doc'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'img'
  return 'pdf'
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

/* ───── New Document Modal (with real file upload + comment) ───── */
function NewDocModal({ onClose, onSubmit }) {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState('pdf')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFilePick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_FILE_SIZE) {
      setError(`File size ${formatBytes(f.size)} exceeds 5 MB limit`)
      return
    }
    setFile(f)
    setFileName(f.name)
    setFileType(detectType(f.name))
    setError(null)
  }

  const clearFile = () => {
    setFile(null)
    setFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!fileName.trim()) return
    setSaving(true)
    setError(null)
    const err = await onSubmit({
      file,
      name: fileName.trim(),
      type: fileType,
      size_label: file ? formatBytes(file.size) : '0 KB',
      comment: comment.trim(),
    })
    if (err) { setError(err); setSaving(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Create New Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>

        {/* File Upload Zone */}
        <input ref={fileInputRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.gif,.svg,.webp"
          onChange={handleFilePick} />

        {!file ? (
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition cursor-pointer mb-5">
            <Upload size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">Click to upload a file</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOC, IMG — max 5 MB</p>
          </button>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 mb-5">
            <FileChip type={fileType} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            </div>
            <button onClick={clearFile} className="text-slate-400 hover:text-slate-600">
              <XClose size={14} />
            </button>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Document Name *</label>
            <input value={fileName} onChange={e => setFileName(e.target.value)}
              placeholder="e.g. Project Charter.pdf"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File Type</label>
            <div className="flex gap-2">
              {FILE_TYPES.map(ft => (
                <button key={ft.value} onClick={() => setFileType(ft.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    fileType === ft.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Comment for Approver</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Optional: leave a note for the reviewer..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5 mb-4">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!fileName.trim() || saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? 'Creating…' : 'Create Document'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Approve Confirmation Modal ───── */
function ApproveModal({ doc, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const nextLabel = FOLDERS.find(f => f.id === (doc.folder === '01' ? '02' : doc.folder === '02' ? '03' : '04'))?.label

  const handleConfirm = async () => {
    setSaving(true)
    await onConfirm(doc)
    // modal closes via parent
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Approve Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-2">
          Are you sure you want to approve <span className="font-semibold">"{doc.name}"</span>?
        </p>
        <p className="text-xs text-slate-400 mb-6">
          This will move the document to <span className="font-medium text-slate-600">{nextLabel}</span>.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition">
            {saving ? 'Approving…' : '✓ Approve'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Reject Confirmation Modal ───── */
function RejectModal({ doc, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const prevLabel = FOLDERS.find(f => f.id === (doc.folder === '03' ? '02' : '01'))?.label

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setSaving(true)
    await onConfirm(doc, reason.trim())
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Reject Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-2">
          Rejecting <span className="font-semibold">"{doc.name}"</span> will move it back to <span className="font-medium">{prevLabel}</span>.
        </p>
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1">Reason for Rejection *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Please explain why this document is being rejected..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!reason.trim() || saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition">
            {saving ? 'Rejecting…' : '✗ Reject'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Share Document Modal ───── */
function ShareModal({ doc, siteId, currentUser, onClose }) {
  const [token, setToken] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const showToast = useToast()

  const generateToken = async () => {
    setGenerating(true)
    const t = crypto.randomUUID().replace(/-/g, '').substring(0, 12)
    await supabase.from('share_tokens').insert({
      document_id: doc.id,
      token: t,
      created_by: currentUser.id,
    })
    await supabase.from('activities').insert({
      site_id: siteId,
      actor_id: currentUser.id,
      action: 'shared',
      target: doc.name,
    })
    setToken(t)
    setGenerating(false)
  }

  useEffect(() => { generateToken() }, [])

  const shareUrl = `${window.location.origin}${window.location.pathname}#/share/${token}`

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

        {!token ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Public Link (no login required)</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
                <LinkChain size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="font-mono text-indigo-600 text-xs flex-1 truncate">{shareUrl}</span>
                <button onClick={copyLink}
                  className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1 rounded-lg hover:bg-slate-50 transition flex-shrink-0">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
              <CheckOk size={14} className="text-emerald-500 flex-shrink-0" />
              <span>Anyone with this link can view and download this document.</span>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Document Activity Panel (inside Preview Drawer) ───── */
function DocActivityPanel({ docName, siteId }) {
  const activities = useActivities(siteId, { filterTarget: docName })
  const sentinel = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore })

  if (activities.loading) {
    return (
      <div className="space-y-2">
        {[1,2].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
      </div>
    )
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
              <p className="text-xs text-slate-700 leading-tight">
                <span className="font-medium">{name}</span>{' '}{a.action}
              </p>
              <span className="text-[10px] text-slate-400">{timeAgo(a.created_at)}</span>
            </div>
          </div>
        )
      })}
      {activities.hasMore && <div ref={sentinel} className="h-4" />}
      {activities.loadingMore && <div className="h-6 bg-slate-100 rounded animate-pulse" />}
      {!activities.hasMore && activities.data.length > 0 && (
        <p className="text-[10px] text-slate-300 text-center">No more activity</p>
      )}
    </div>
  )
}

/* ───── Main Screen ───── */
export default function DocumentLibrary() {
  const { siteId } = useParams()
  const selectedFolder = useAppStore(s => s.selectedFolder)
  const setSelectedFolder = useAppStore(s => s.setSelectedFolder)
  const previewDoc = useAppStore(s => s.previewDoc)
  const setPreviewDoc = useAppStore(s => s.setPreviewDoc)
  const setScreen = useAppStore(s => s.setScreen)
  const currentUser = useAppStore(s => s.currentUser)
  const showToast = useToast()

  const [showNew, setShowNew] = useState(false)
  const [approveDoc, setApproveDoc] = useState(null)
  const [rejectDoc, setRejectDoc] = useState(null)
  const [shareDoc, setShareDoc] = useState(null)

  const { data: docs, loading, error, create, update, refetch, loadMore, hasMore, loadingMore } = useDocuments(siteId)

  useEffect(() => { setScreen('documents') }, [setScreen])

  const filteredDocs = docs.filter(d => d.folder === selectedFolder)
  const docsSentinel = useInfiniteScroll(loadMore, { enabled: hasMore })

  // Role-based permission check
  const userRole = currentUser?.email ? ROLES[currentUser.email] : null
  const canApproveDoc = (doc) => {
    if (!userRole) return false
    // Admin can approve anything not in 04
    if (userRole.canApproveFolder === null) return ['01','02','03'].includes(doc.folder)
    // Reviewer/Approver can approve only their assigned folder
    return doc.folder === userRole.canApproveFolder
  }

  /* ── New document submit ── */
  const handleNewSubmit = async ({ file, name, type, size_label, comment }) => {
    let file_path = null

    // Upload file to Supabase Storage if provided
    if (file) {
      const filePath = `${siteId}/${crypto.randomUUID()}_${file.name}`
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, file)
      if (uploadErr) return uploadErr.message
      file_path = filePath
    }

    const err = await create({
      site_id: siteId,
      name,
      type,
      size_label,
      folder: '01',
      owner_id: currentUser.id,
      file_path,
      comment: comment || null,
    })
    if (err) return err.message

    // Log upload activity
    await supabase.from('activities').insert({
      site_id: siteId,
      actor_id: currentUser.id,
      action: 'uploaded',
      target: name,
    })

    // Log comment activity if provided
    if (comment) {
      await supabase.from('activities').insert({
        site_id: siteId,
        actor_id: currentUser.id,
        action: `commented: "${comment}" on`,
        target: name,
      })
    }

    setShowNew(false)
    setSelectedFolder('01')
    showToast('Document created in Draft')
    return null
  }

  /* ── Approve ── */
  const handleApprove = async (doc) => {
    const nextFolder = doc.folder === '01' ? '02' : doc.folder === '02' ? '03' : '04'
    const docPatch = { folder: nextFolder }
    if (nextFolder === '04') docPatch.status = 'Final-Approved'
    await update(doc.id, docPatch)

    // Assign task for next reviewer
    if (nextFolder === '02' || nextFolder === '03') {
      const assigneeName = nextFolder === '02' ? 'Bob Chen' : 'Cathy Park'
      const assignee = DEMO_USERS.find(u => u.name === assigneeName)
      if (assignee) {
        await supabase.from('tasks').insert({
          site_id: siteId,
          document_id: doc.id,
          assignee_id: assignee.id,
          folder: nextFolder,
          priority: 'High',
        })
      }
    }

    await supabase.from('activities').insert({
      site_id: siteId,
      actor_id: currentUser.id,
      action: 'approved',
      target: doc.name,
    })

    setApproveDoc(null)
    showToast(`Document approved — moved to ${FOLDERS.find(f => f.id === nextFolder)?.label}`)
    refetch()
  }

  /* ── Reject ── */
  const handleReject = async (doc, reason) => {
    const prevFolder = doc.folder === '03' ? '02' : '01'
    await update(doc.id, { folder: prevFolder, status: null })

    await supabase.from('activities').insert({
      site_id: siteId,
      actor_id: currentUser.id,
      action: `rejected (${reason})`,
      target: doc.name,
    })

    setRejectDoc(null)
    showToast(`Document rejected — moved back to ${FOLDERS.find(f => f.id === prevFolder)?.label}`)
    refetch()
  }

  /* ── Preview / Download ── */
  const handlePreview = async (doc) => {
    if (doc.file_path) {
      const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path)
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank')
        return
      }
    }
    showToast('Preview: ' + doc.name + ' (no file uploaded)')
  }

  const handleDownload = async (doc) => {
    if (doc.file_path) {
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
    showToast('Download: ' + doc.name + ' (no file uploaded)')
  }

  return (
    <div className="flex h-full">
      {/* Pane 1: Folder Tree */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3">APPROVAL STAGES</p>
        <div className="space-y-1">
          {FOLDERS.map(f => {
            const count = docs.filter(d => d.folder === f.id).length
            const isActive = selectedFolder === f.id
            return (
              <button key={f.id} onClick={() => setSelectedFolder(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${f.dot} flex-shrink-0`} />
                <span className="flex-1 text-left">{f.id} · {f.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-xs text-slate-500">
          Documents flow 01→02→03→04 through the approval workflow.
        </div>
      </div>

      {/* Pane 2: File List */}
      <div className="flex-1 p-5 overflow-y-auto bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {FOLDERS.find(f => f.id === selectedFolder)?.label}
            </h2>
            <p className="text-xs text-slate-400">{filteredDocs.length} document(s)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm">{error.message}</div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Folder size={48} className="text-slate-300" />
            <p className="text-sm text-slate-400 mt-3">No documents in this stage</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.map(doc => {
              const isSelected = previewDoc?.id === doc.id
              const ownerName = ID_NAME_MAP[doc.owner_id] || 'Unknown'
              const showApproveReject = canApproveDoc(doc) && ['01','02','03'].includes(doc.folder)

              return (
                <div key={doc.id}
                  onClick={() => setPreviewDoc(isSelected ? null : doc)}
                  className={`bg-white border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-150 ${
                    isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}>
                  <FileChip type={doc.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{ownerName} · {doc.size_label}</p>
                  </div>
                  {doc.status && <Badge label={doc.status} color="emerald" />}

                  {/* View & Download */}
                  <button onClick={(e) => { e.stopPropagation(); handlePreview(doc) }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    title="View">
                    <Eye size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(doc) }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    title="Download">
                    <Download size={16} />
                  </button>

                  {/* Approve / Reject */}
                  {showApproveReject && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setApproveDoc(doc) }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                        ✓ Approve
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setRejectDoc(doc) }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
                        ✗ Reject
                      </button>
                    </>
                  )}

                  {/* Share for published */}
                  {doc.folder === '04' && (
                    <button onClick={(e) => { e.stopPropagation(); setShareDoc(doc) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                      <Share size={14} /> Share
                    </button>
                  )}
                </div>
              )
            })}

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={docsSentinel} className="h-6" />}
            {loadingMore && <div className="h-20 bg-white rounded-xl animate-pulse" />}
            {!hasMore && filteredDocs.length > 0 && (
              <p className="text-xs text-slate-300 text-center py-2">No more documents</p>
            )}
          </div>
        )}
      </div>

      {/* Pane 3: Preview Drawer */}
      {previewDoc && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
            <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600">
              <XClose size={16} />
            </button>
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
              <span className="text-slate-700">{previewDoc.size_label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stage</span>
              <span className="text-slate-700">{FOLDERS.find(f => f.id === previewDoc.folder)?.label}</span>
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
            <DocActivityPanel docName={previewDoc.name} siteId={siteId} />
          </div>

          {/* View + Download buttons */}
          <div className="mt-auto pt-4 flex gap-2">
            <button onClick={() => handlePreview(previewDoc)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
              <Eye size={14} /> Preview
            </button>
            <button onClick={() => handleDownload(previewDoc)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showNew && <NewDocModal onClose={() => setShowNew(false)} onSubmit={handleNewSubmit} />}
      {approveDoc && <ApproveModal doc={approveDoc} onClose={() => setApproveDoc(null)} onConfirm={handleApprove} />}
      {rejectDoc && <RejectModal doc={rejectDoc} onClose={() => setRejectDoc(null)} onConfirm={handleReject} />}
      {shareDoc && <ShareModal doc={shareDoc} siteId={siteId} currentUser={currentUser} onClose={() => setShareDoc(null)} />}
    </div>
  )
}
