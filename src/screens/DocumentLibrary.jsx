import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { ID_NAME_MAP, DEMO_USERS, ROLES } from '../lib/roles'
import { saveRevisionSnapshot, getNextRevision, fetchRevisionHistory } from '../lib/revisionHelper'
import { useDocuments } from '../hooks/useDocuments'
import { useWorkflowConfig, getStageStyles } from '../hooks/useWorkflowConfig'
import { useActivities } from '../hooks/useActivities'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import FileChip from '../components/FileChip'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Folder, Upload, Plus, Eye, Download, XClose, ChevronRight, CheckOk, Share, LinkChain, EditPen, EyeOff } from '../lib/icons'

/* STAGE_FOLDERS / FOLDERS are now computed dynamically from useWorkflowConfig */
const TRASH_FOLDER = { id: '00', label: 'Trash', dot: 'bg-rose-400' }

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

/** Try uploading file to Supabase Storage. Returns file_path or null (graceful). */
async function tryUploadFile(siteId, file) {
  if (!file) return null
  try {
    const filePath = `${siteId}/${crypto.randomUUID()}_${file.name}`
    const { error } = await supabase.storage.from('documents').upload(filePath, file)
    if (error) {
      console.warn('File upload skipped:', error.message)
      return null
    }
    return filePath
  } catch (e) {
    console.warn('File upload skipped:', e.message)
    return null
  }
}

/* ───── New Document Modal ───── */
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
            <button onClick={clearFile} className="text-slate-400 hover:text-slate-600"><XClose size={14} /></button>
          </div>
        )}

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
                  }`}>{ft.label}</button>
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

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5 mb-4">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
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

/* ───── Edit Document Modal (01 Draft only) ───── */
function EditDocModal({ doc, siteId, currentUser, onClose, onSave }) {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState(doc.name)
  const [fileType, setFileType] = useState(doc.type)
  const [comment, setComment] = useState(doc.comment || '')
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
    setError(null)
  }

  const handleSubmit = async () => {
    if (!fileName.trim()) return
    setSaving(true)
    setError(null)
    const err = await onSave({
      file,
      name: fileName.trim(),
      type: fileType,
      size_label: file ? formatBytes(file.size) : doc.size_label,
      comment: comment.trim(),
    })
    if (err) { setError(err); setSaving(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Edit Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>

        <input ref={fileInputRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.gif,.svg,.webp"
          onChange={handleFilePick} />

        {/* Current / replacement file */}
        {file ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 mb-3">
            <FileChip type={detectType(file.name)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)} (new file)</p>
            </div>
            <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              className="text-slate-400 hover:text-slate-600"><XClose size={14} /></button>
          </div>
        ) : doc.file_path ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 mb-3">
            <FileChip type={doc.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
              <p className="text-xs text-slate-500">{doc.size_label} (current file)</p>
            </div>
          </div>
        ) : null}

        <button onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-400 transition cursor-pointer mb-5 text-xs text-slate-500">
          <Upload size={18} className="mx-auto text-slate-300 mb-1" />
          {doc.file_path || file ? 'Click to replace file' : 'Click to upload a file'}
        </button>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Document Name *</label>
            <input value={fileName} onChange={e => setFileName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File Type</label>
            <div className="flex gap-2">
              {FILE_TYPES.map(ft => (
                <button key={ft.value} onClick={() => setFileType(ft.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    fileType === ft.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>{ft.label}</button>
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

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5 mb-4">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={!fileName.trim() || saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Submit Confirmation Modal (01 Draft → 02 In Review) ───── */
function SubmitModal({ doc, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const handleConfirm = async () => { setSaving(true); await onConfirm(doc) }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Submit Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-2">
          Are you sure you want to submit <span className="font-semibold">"{doc.name}"</span> for review?
        </p>
        <p className="text-xs text-slate-400 mb-6">This will move the document to <span className="font-medium text-slate-600">In Review</span>.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? 'Submitting…' : '✓ Submit'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Cancel Document Modal (01 Draft → 00 Trash) ───── */
function CancelDocModal({ doc, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const handleConfirm = async () => {
    if (!reason.trim()) return
    setSaving(true)
    await onConfirm(doc, reason.trim())
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Cancel Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-2">
          Cancelling <span className="font-semibold">"{doc.name}"</span> will move it to Trash.
        </p>
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Please explain why this document is being cancelled..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Back</button>
          <button onClick={handleConfirm} disabled={!reason.trim() || saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition">
            {saving ? 'Cancelling…' : '✗ Cancel Document'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Unpublish Document Modal ───── */
function UnpublishModal({ doc, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(doc); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Unpublish Document</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Unpublish <strong>"{doc.name}"</strong>?</p>
        <p className="text-xs text-slate-400 mb-5">The public share link will stop working. The document will move back to Draft.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60">
            {busy ? 'Unpublishing...' : <><EyeOff size={12} /> Unpublish</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Approve Confirmation Modal ───── */
function ApproveModal({ doc, onClose, onConfirm, nextLabel, isPublishing }) {
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')
  const handleConfirm = async () => { setSaving(true); await onConfirm(doc, comment) }

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
        <p className="text-xs text-slate-400 mb-4">This will move the document to <span className="font-medium text-slate-600">{nextLabel}</span>.</p>
        {isPublishing && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <span className="text-xs text-emerald-700 font-medium">Published Date:</span>
            <span className="text-xs text-emerald-600">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
          placeholder="Optional comment for the next reviewer..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
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
function RejectModal({ doc, onClose, onConfirm, prevLabel }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
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
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
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

/* ───── Put Back Modal (00 Trash → 01 Draft) ───── */
function PutBackModal({ doc, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const handleConfirm = async () => { setSaving(true); await onConfirm(doc) }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Restore Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-2">
          Are you sure you want to restore <span className="font-semibold">"{doc.name}"</span> to Draft?
        </p>
        <p className="text-xs text-slate-400 mb-6">This will move the document back to <span className="font-medium text-slate-600">01 · Draft</span>.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? 'Restoring…' : 'Put Back'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Delete Document Modal (Trash → permanent delete) ───── */
function DeleteDocModal({ doc, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const handleConfirm = async () => { setSaving(true); await onConfirm(doc) }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-rose-600">Delete Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-2">
          Permanently delete <span className="font-semibold">"{doc.name}"</span>?
        </p>
        <p className="text-xs text-rose-500 mb-6">⚠ This action cannot be undone. The document and all its data will be removed.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition">
            {saving ? 'Deleting…' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Share Document Modal ───── */
function ShareModal({ doc, siteId, currentUser, onClose }) {
  const [tokenRow, setTokenRow] = useState(null)   // { id, token, active }
  const [loading, setLoading]   = useState(true)
  const [toggling, setToggling] = useState(false)
  const [copied, setCopied]     = useState(false)
  const showToast = useToast()

  useEffect(() => {
    const init = async () => {
      // Check for existing token first
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

      // No existing token — generate new one
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

            {/* Toggle switch */}
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

        {!doc.file_path && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-2.5 mb-4">
            Note: No file is attached to this document. Recipients will see document info only.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Close</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ───── Document Activity Panel (Preview Drawer) ───── */
function DocActivityPanel({ docName, siteId }) {
  const activities = useActivities(siteId, { filterTarget: docName })
  const sentinel = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore })

  if (activities.loading) {
    return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}</div>
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

/* ═══════════════════════════════════════════════════════
   ───── Main Screen ─────
   ═══════════════════════════════════════════════════════ */
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
  const [editDoc, setEditDoc] = useState(null)
  const [submitDoc, setSubmitDoc] = useState(null)
  const [cancelDoc, setCancelDoc] = useState(null)
  const [approveDoc, setApproveDoc] = useState(null)
  const [rejectDoc, setRejectDoc] = useState(null)
  const [putBackDoc, setPutBackDoc] = useState(null)
  const [deleteDoc, setDeleteDoc] = useState(null)
  const [shareDoc, setShareDoc] = useState(null)
  const [unpublishDoc, setUnpublishDoc] = useState(null)
  const [revHistory, setRevHistory] = useState([])
  useEffect(() => {
    if (!previewDoc) { setRevHistory([]); return }
    fetchRevisionHistory(previewDoc.id).then(setRevHistory)
  }, [previewDoc?.id])
  const [shareFilter, setShareFilter] = useState('all')    // 'all' | 'shared' | 'not_shared'
  const [shareStatusMap, setShareStatusMap] = useState({})  // { docId: boolean }

  const { data: docs, loading, error, create, update, remove, refetch, loadMore, hasMore, loadingMore } = useDocuments(siteId)
  const wf = useWorkflowConfig(siteId)

  // Compute dynamic stage folders from workflow config
  const STAGE_FOLDERS = wf.stages.map((s, i) => ({
    id: s.stage_code,
    label: s.stage_name,
    orderNum: i + 1,
    dot: getStageStyles(s.color).dot,
  }))
  const OTHER_FOLDERS = [TRASH_FOLDER]
  const FOLDERS = [...STAGE_FOLDERS, ...OTHER_FOLDERS]

  useEffect(() => { setScreen('documents') }, [setScreen])

  // Reset share filter when switching away from Published
  const pubCode = wf.publishedStage?.stage_code || '04'
  useEffect(() => { if (selectedFolder !== pubCode) setShareFilter('all') }, [selectedFolder, pubCode])

  // Fetch share token status for Published docs
  useEffect(() => {
    if (selectedFolder !== pubCode) return
    const pubDocs = docs.filter(d => d.folder === pubCode)
    if (pubDocs.length === 0) { setShareStatusMap({}); return }
    const fetchStatus = async () => {
      const { data: tokens } = await supabase
        .from('share_tokens')
        .select('document_id')
        .in('document_id', pubDocs.map(d => d.id))
      const map = {}
      pubDocs.forEach(d => { map[d.id] = false })
      ;(tokens || []).forEach(t => { map[t.document_id] = true })
      setShareStatusMap(map)
    }
    fetchStatus()
  }, [selectedFolder, docs])

  const filteredDocs = docs.filter(d => d.folder === selectedFolder).filter(d => {
    if (selectedFolder !== pubCode || shareFilter === 'all') return true
    const isShared = shareStatusMap[d.id] === true
    return shareFilter === 'shared' ? isShared : !isShared
  })
  const docsSentinel = useInfiniteScroll(loadMore, { enabled: hasMore })

  const userRole = currentUser?.email ? ROLES[currentUser.email] : null
  const isAdmin = userRole?.canApproveFolder === null
  const isViewer = userRole?.role === 'Viewer'
  const canApproveDoc = (doc) => {
    if (!userRole) return false
    if (isAdmin) return true
    // Config-driven: user can approve if they are the stage's assignee
    const stage = wf.getStage(doc.folder)
    return stage && stage.assignee_id === currentUser?.id
  }

  /* ── Preview / Download with no-file check ── */
  const handlePreview = (doc) => {
    if (!doc.file_path) { showToast('No file attached to preview'); return }
    const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path)
    if (data?.publicUrl) window.open(data.publicUrl, '_blank')
  }

  const handleDownload = (doc) => {
    if (!doc.file_path) { showToast('No file attached to download'); return }
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
    }
  }

  /* ── New document ── */
  const handleNewSubmit = async ({ file, name, type, size_label, comment }) => {
    const file_path = await tryUploadFile(siteId, file)

    const draftCode = wf.draftStage?.stage_code || '01'
    const err = await create({
      site_id: siteId, name, type, size_label, folder: draftCode,
      owner_id: currentUser.id, file_path, comment: comment || null,
    })
    if (err) return err.message

    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'uploaded', target: name })
    if (comment) {
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: `commented: "${comment}" on`, target: name })
    }
    if (file && !file_path) showToast('Document created (file upload skipped — create Storage bucket in Supabase Dashboard)')
    else showToast('Document created in Draft')
    setShowNew(false)
    setSelectedFolder(draftCode)
    return null
  }

  /* ── Edit document (01 Draft) ── */
  const handleEditSave = async ({ file, name, type, size_label, comment }) => {
    const patch = { name, type, size_label, comment: comment || null }

    if (file) {
      const file_path = await tryUploadFile(siteId, file)
      if (file_path) {
        patch.file_path = file_path
        patch.size_label = formatBytes(file.size)
      }
    }

    const err = await update(editDoc.id, patch)
    if (err) return err.message

    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'edited', target: name })
    showToast('Document updated')
    setEditDoc(null)
    refetch()
    return null
  }

  /* ── Submit (Draft → first review stage) ── */
  const handleSubmit = async (doc) => {
    const firstReview = wf.getNextStage(wf.draftStage?.stage_code)
    if (!firstReview) return
    // Revision increment on re-submit after unpublish
    const nextRev = await getNextRevision(doc.id)
    const docPatch = { folder: firstReview.stage_code }
    if (nextRev) docPatch.revision = nextRev
    await update(doc.id, docPatch)
    if (firstReview.assignee_id) {
      await supabase.from('tasks').insert({ site_id: siteId, document_id: doc.id, assignee_id: firstReview.assignee_id, folder: firstReview.stage_code, priority: 'High' })
    }
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: `submitted for ${firstReview.stage_name}`, target: doc.name })
    setSubmitDoc(null)
    showToast(`Document submitted — moved to ${firstReview.stage_name}`)
    refetch()
  }

  /* ── Cancel (01 Draft → 00 Trash) ── */
  const handleCancel = async (doc, reason) => {
    await update(doc.id, { folder: '00', status: null })
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: `cancelled (${reason})`, target: doc.name })
    setCancelDoc(null)
    showToast('Document cancelled — moved to Trash')
    refetch()
  }

  /* ── Approve (current → next stage via config) ── */
  const handleApprove = async (doc, comment) => {
    const next = wf.getNextStage(doc.folder)
    if (!next) return

    // Mark current task as approved (sync with Tasks board)
    await supabase.from('tasks').update({ status: 'approved' }).eq('document_id', doc.id).eq('folder', doc.folder).eq('status', 'pending')

    const docPatch = { folder: next.stage_code }
    if (next.stage_type === 'published') {
      docPatch.status = 'Final-Approved'
      docPatch.published_at = new Date().toISOString()
    }
    await update(doc.id, docPatch)

    if (next.stage_type === 'review' && next.assignee_id) {
      await supabase.from('tasks').insert({ site_id: siteId, document_id: doc.id, assignee_id: next.assignee_id, folder: next.stage_code, priority: 'High' })
    }
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'approved', target: doc.name })
    if (comment && comment.trim()) {
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: `commented: "${comment}" on`, target: doc.name })
    }

    // Auto-share + revision snapshot on publish
    if (next.stage_type === 'published') {
      const { data: existing } = await supabase.from('share_tokens').select('id').eq('document_id', doc.id).maybeSingle()
      if (!existing) {
        const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12)
        await supabase.from('share_tokens').insert({ document_id: doc.id, token, created_by: currentUser.id })
        await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'auto-shared', target: doc.name })
      }
      // Save revision snapshot
      const { data: docRow } = await supabase.from('documents').select('revision, name, type, size_label, file_path, status').eq('id', doc.id).single()
      if (docRow) {
        await saveRevisionSnapshot('document', doc.id, docRow.revision, { name: docRow.name, type: docRow.type, size_label: docRow.size_label, file_path: docRow.file_path, status: docRow.status }, comment || null, currentUser.id)
      }
    }

    setApproveDoc(null)
    showToast(`Document approved — moved to ${next.stage_name}`)
    refetch()
  }

  /* ── Reject (current → prev stage via config) ── */
  const handleReject = async (doc, reason) => {
    const prev = wf.getPrevStage(doc.folder)
    if (!prev) return

    // Mark current task as rejected (sync with Tasks board)
    await supabase.from('tasks').update({ status: 'rejected' }).eq('document_id', doc.id).eq('folder', doc.folder).eq('status', 'pending')

    await update(doc.id, { folder: prev.stage_code, status: null })
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: `rejected (${reason})`, target: doc.name })
    setRejectDoc(null)
    showToast(`Document rejected — moved back to ${prev.stage_name}`)
    refetch()
  }

  /* ── Unpublish (Published → Draft) ── */
  const handleUnpublish = async (doc) => {
    const draftCode = wf.draftStage?.stage_code || '01'
    await update(doc.id, { folder: draftCode, status: null, published_at: null })
    // Deactivate share token
    await supabase.from('share_tokens').update({ active: false }).eq('document_id', doc.id)
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'unpublished', target: doc.name })
    setUnpublishDoc(null)
    showToast('Document unpublished — moved back to Draft')
    refetch()
  }

  /* ── Put Back (00 Trash → Draft) ── */
  const handlePutBack = async (doc) => {
    const draftCode = wf.draftStage?.stage_code || '01'
    await update(doc.id, { folder: draftCode, status: null })
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'restored from trash', target: doc.name })
    setPutBackDoc(null)
    showToast('Document restored to Draft')
    refetch()
  }

  /* ── Delete (permanent removal from Trash) ── */
  const handleDeleteDoc = async (doc) => {
    await remove(doc.id)
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action: 'permanently deleted', target: doc.name })
    setDeleteDoc(null)
    if (previewDoc?.id === doc.id) setPreviewDoc(null)
    showToast('Document deleted permanently')
    refetch()
  }

  // Loading guard: wait for workflow config before rendering
  if (wf.loading) {
    return (
      <div className="flex h-full animate-slide-in">
        <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4">
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        </div>
        <div className="flex-1 p-5">
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Pane 1: Folder Tree */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3">APPROVAL STAGES</p>
        <div className="space-y-1">
          {STAGE_FOLDERS.map(f => {
            const count = docs.filter(d => d.folder === f.id).length
            const isActive = selectedFolder === f.id
            return (
              <button key={f.id} onClick={() => setSelectedFolder(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${f.dot} flex-shrink-0`} />
                <span className="flex-1 text-left">{String(f.orderNum).padStart(2, '0')} · {f.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3 mt-5">OTHER</p>
        <div className="space-y-1">
          {OTHER_FOLDERS.map(f => {
            const count = docs.filter(d => d.folder === f.id).length
            const isActive = selectedFolder === f.id
            return (
              <button key={f.id} onClick={() => setSelectedFolder(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${f.dot} flex-shrink-0`} />
                <span className="flex-1 text-left">{f.label}</span>
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
          <div className="flex items-center gap-2">
            {/* Share filter (only for Published) */}
            {selectedFolder === pubCode && (
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'shared', label: 'Shared' },
                  { key: 'not_shared', label: 'Not Shared' },
                ].map(f => (
                  <button key={f.key} onClick={() => setShareFilter(f.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                      shareFilter === f.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            {!isViewer && (
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                <Plus size={14} /> New
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
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
              const docStage = wf.getStage(doc.folder)
              const isDraft = docStage?.stage_type === 'draft'
              const isTrash = doc.folder === '00'
              const isReviewStage = docStage?.stage_type === 'review'
              const isPublished = docStage?.stage_type === 'published'
              const showApproveReject = isReviewStage && canApproveDoc(doc)

              return (
                <div key={doc.id}
                  onClick={() => setPreviewDoc(isSelected ? null : doc)}
                  className={`bg-white border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-150 ${
                    isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}>
                  <FileChip type={doc.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{ownerName} · {doc.size_label || 'No file'}</p>
                  </div>
                  {doc.status && <Badge label={doc.status} color="emerald" />}
                  {(doc.revision || 1) > 1 && <Badge label={`Rev ${doc.revision}`} color="amber" />}

                  {/* View & Download */}
                  <button onClick={(e) => { e.stopPropagation(); handlePreview(doc) }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition" title="View">
                    <Eye size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(doc) }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition" title="Download">
                    <Download size={16} />
                  </button>

                  {/* 01 Draft: Edit + Submit + Cancel */}
                  {isDraft && !isViewer && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setEditDoc(doc) }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                        <EditPen size={12} /> Edit
                      </button>
                      {canApproveDoc(doc) && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setSubmitDoc(doc) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                            ✓ Submit
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setCancelDoc(doc) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
                            ✗ Cancel
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* 02/03: Approve + Reject */}
                  {showApproveReject && !isViewer && (
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

                  {/* 00 Trash: Put Back + Delete */}
                  {isTrash && !isViewer && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setPutBackDoc(doc) }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                        Put Back
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteDoc(doc) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                        <XClose size={14} />
                      </button>
                    </>
                  )}

                  {/* 04 Published: Share / Shared + Unpublish */}
                  {isPublished && !isViewer && (
                    <div className="flex items-center gap-1.5">
                      {shareStatusMap[doc.id] ? (
                        <button onClick={(e) => { e.stopPropagation(); setShareDoc(doc) }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 transition">
                          <CheckOk size={14} /> Shared
                        </button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setShareDoc(doc) }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition">
                          <Share size={14} /> Share
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setUnpublishDoc(doc) }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-amber-200 text-amber-600 bg-amber-50/50 hover:bg-amber-100 transition">
                        <EyeOff size={14} /> Unpublish
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {hasMore && <div ref={docsSentinel} className="h-6" />}
            {loadingMore && <div className="h-20 bg-white rounded-xl animate-pulse" />}
            {!hasMore && filteredDocs.length > 0 && <p className="text-xs text-slate-300 text-center py-2">No more documents</p>}
          </div>
        )}
      </div>

      {/* Pane 3: Preview Drawer */}
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
            {(previewDoc.revision || 1) > 1 && <Badge label={`Rev ${previewDoc.revision}`} color="amber" />}
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
              <span className="text-slate-700">{FOLDERS.find(f => f.id === previewDoc.folder)?.label}</span>
            </div>
            {previewDoc.published_at && (
              <div className="flex justify-between">
                <span className="text-slate-400">Published</span>
                <span className="text-emerald-600 font-medium">{new Date(previewDoc.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            )}
            {previewDoc.comment && (
              <div>
                <span className="text-slate-400 block mb-1">Comment</span>
                <p className="text-slate-600 bg-slate-50 rounded-lg p-2 text-xs">{previewDoc.comment}</p>
              </div>
            )}
          </div>

          {/* Revision History */}
          {revHistory.length > 0 && (
            <div className="border-t border-slate-100 pt-3 mt-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Revision History</p>
              <div className="space-y-2">
                {revHistory.map(rev => (
                  <div key={rev.id} className="flex items-start gap-2 text-xs">
                    <Badge label={`Rev ${rev.revision}`} color={rev.revision === (previewDoc?.revision || 1) ? 'indigo' : 'slate'} />
                    <div className="flex-1">
                      <span className="text-slate-500">{new Date(rev.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {rev.comment && <p className="text-slate-400 mt-0.5">"{rev.comment}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Activity History */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 mb-3">Document Activity</h4>
            <DocActivityPanel docName={previewDoc.name} siteId={siteId} />
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

      {/* Modals */}
      {showNew && <NewDocModal onClose={() => setShowNew(false)} onSubmit={handleNewSubmit} />}
      {editDoc && <EditDocModal doc={editDoc} siteId={siteId} currentUser={currentUser} onClose={() => setEditDoc(null)} onSave={handleEditSave} />}
      {submitDoc && <SubmitModal doc={submitDoc} onClose={() => setSubmitDoc(null)} onConfirm={handleSubmit} />}
      {cancelDoc && <CancelDocModal doc={cancelDoc} onClose={() => setCancelDoc(null)} onConfirm={handleCancel} />}
      {approveDoc && <ApproveModal doc={approveDoc} onClose={() => setApproveDoc(null)} onConfirm={handleApprove} nextLabel={wf.getNextStage(approveDoc.folder)?.stage_name || 'Next Stage'} isPublishing={wf.getNextStage(approveDoc.folder)?.stage_type === 'published'} />}
      {rejectDoc && <RejectModal doc={rejectDoc} onClose={() => setRejectDoc(null)} onConfirm={handleReject} prevLabel={wf.getPrevStage(rejectDoc.folder)?.stage_name || 'Previous Stage'} />}
      {putBackDoc && <PutBackModal doc={putBackDoc} onClose={() => setPutBackDoc(null)} onConfirm={handlePutBack} />}
      {deleteDoc && <DeleteDocModal doc={deleteDoc} onClose={() => setDeleteDoc(null)} onConfirm={handleDeleteDoc} />}
      {shareDoc && <ShareModal doc={shareDoc} siteId={siteId} currentUser={currentUser} onClose={() => {
        setShareDoc(null)
        // Refresh share status map so button updates
        if (selectedFolder === pubCode) {
          const pubDocs = docs.filter(d => d.folder === pubCode)
          if (pubDocs.length > 0) {
            supabase.from('share_tokens').select('document_id').in('document_id', pubDocs.map(d => d.id))
              .then(({ data: tokens }) => {
                const map = {}
                pubDocs.forEach(d => { map[d.id] = false })
                ;(tokens || []).forEach(t => { map[t.document_id] = true })
                setShareStatusMap(map)
              })
          }
        }
      }} />}
      {unpublishDoc && <UnpublishModal doc={unpublishDoc} onClose={() => setUnpublishDoc(null)} onConfirm={handleUnpublish} />}
    </div>
  )
}
